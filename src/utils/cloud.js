/**
 * Google sign-in + per-account progress sync (Firebase Auth + Firestore).
 *
 * Bradbury shares the `noi-book-app` Firebase project with Noi Book; its data
 * lives in its own collection: bradbury/{uid}. Firestore rules restrict each
 * doc to its owner.
 */
import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut
} from 'firebase/auth';
import {
  doc,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { mergeProgress } from './progressMerge.js';

// Public web config (not a secret — access is enforced by Firestore rules).
const firebaseConfig = {
  apiKey: 'AIzaSyCp50GAU-QIFuKjHl6MZMfrLy2s-QwHCoU',
  authDomain: 'noi-book-app.firebaseapp.com',
  projectId: 'noi-book-app',
  storageBucket: 'noi-book-app.firebasestorage.app',
  messagingSenderId: '1010153752766',
  appId: '1:1010153752766:web:47c383761bb3f8233936ef'
};

// On the deployed site, auth runs through our own domain (/__/auth is proxied to
// Firebase by vercel.json). That keeps sign-in working in installed iOS PWAs and
// in browsers that block third-party storage, and the Google screen shows
// "continue to bradbury-sigma.vercel.app".
const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const app = initializeApp(
  { ...firebaseConfig, authDomain: isLocal ? firebaseConfig.authDomain : window.location.host },
  'bradbury'
);

export const auth = getAuth(app);
const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true,
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

// Surface errors from a redirect sign-in that finished on page load.
getRedirectResult(auth).catch((err) => console.warn('Sign-in redirect failed', err));

export function onUserChange(fn) {
  return onAuthStateChanged(auth, fn);
}

function isStandalonePwa() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
  );
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  // Installed PWAs can't reliably use popups; a full-page redirect works everywhere.
  if (isStandalonePwa()) {
    await signInWithRedirect(auth, provider);
    return;
  }
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    if (err?.code === 'auth/popup-blocked' || err?.code === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(auth, provider);
      return;
    }
    if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
      return;
    }
    throw err;
  }
}

export const signOut = () => fbSignOut(auth);

const progressDoc = (uid) => doc(db, 'bradbury', uid);

/** Only the parts of user state that belong to the account (and are synced). */
export function syncablePart(state) {
  const {
    theme,
    readerFontScale,
    readerLineHeight,
    includeAnalysisInEpub,
    soundEnabled
  } = state.profile || {};
  return {
    completedItems: state.completedItems || {},
    externalLogs: state.externalLogs || [],
    prefs: Object.fromEntries(
      Object.entries({
        theme,
        readerFontScale,
        readerLineHeight,
        includeAnalysisInEpub,
        soundEnabled
      }).filter(([, v]) => v !== undefined && v !== null)
    )
  };
}

/**
 * Subscribe to the account's progress doc. Calls onRemote(remoteSyncable | null)
 * on every change (including from other devices). Returns an unsubscribe fn.
 */
export function watchProgress(uid, onRemote, onError) {
  return onSnapshot(
    progressDoc(uid),
    (snap) => onRemote(snap.exists() ? snap.data() : null, snap.metadata.hasPendingWrites),
    onError
  );
}

export function writeProgress(uid, syncable) {
  return setDoc(progressDoc(uid), { ...syncable, updatedAt: serverTimestamp() });
}

export { mergeProgress };
