import React, { useState } from 'react';
import { Smartphone, Wifi, CheckCircle2, Share2, Download } from 'lucide-react';

export function ExternalBookModal({ onClose, onLogExternalReading }) {
  const [extQuery, setExtQuery] = useState('');
  const [extResults, setExtResults] = useState([]);
  const [extLoading, setExtLoading] = useState(false);
  const [extCustomTitle, setExtCustomTitle] = useState('');
  const [extCustomAuthor, setExtCustomAuthor] = useState('');
  const [extCustomSlot, setExtCustomSlot] = useState('story');

  async function searchOpenLibrary(e) {
    e.preventDefault();
    if (!extQuery.trim()) return;
    setExtLoading(true);
    try {
      const res = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(extQuery.trim())}&limit=5`
      );
      const data = await res.json();
      setExtResults(
        (data.docs || []).slice(0, 5).map((d) => ({
          key: d.key,
          title: d.title,
          author: Array.isArray(d.author_name) ? d.author_name[0] : 'Unknown Author',
          year: d.first_publish_year || ''
        }))
      );
    } catch {
      setExtResults([]);
    } finally {
      setExtLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h3 className="modal-heading">Log an External Book, Story, or Essay</h3>
        <p className="modal-subtext">
          Read a short story or essay from a physical anthology or Kindle tonight? Search Open
          Library or enter it directly to credit your streak.
        </p>

        <div className="form-field">
          <label htmlFor="ext-slot-select">Category</label>
          <select
            id="ext-slot-select"
            className="form-input"
            value={extCustomSlot}
            onChange={(e) => setExtCustomSlot(e.target.value)}
          >
            <option value="story">Short Story</option>
            <option value="poem">Poem</option>
            <option value="essay">Essay</option>
            <option value="personal">Personal (Korea / San Francisco)</option>
          </select>
        </div>

        <form onSubmit={searchOpenLibrary} className="form-field">
          <label htmlFor="ext-search-input">Search Open Library Catalog</label>
          <div className="search-row">
            <input
              id="ext-search-input"
              type="text"
              className="form-input"
              placeholder="e.g., The Illustrated Man, Borges Labyrinths..."
              value={extQuery}
              onChange={(e) => setExtQuery(e.target.value)}
            />
            <button type="submit" className="btn-secondary">
              {extLoading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        {extResults.length > 0 && (
          <div className="search-results-list">
            {extResults.map((r) => (
              <div key={r.key} className="search-result-item">
                <div>
                  <strong>{r.title}</strong> — {r.author} {r.year && `(${r.year})`}
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() =>
                    onLogExternalReading({
                      title: r.title,
                      author: r.author,
                      slotKey: extCustomSlot
                    })
                  }
                >
                  Log &amp; Credit
                </button>
              </div>
            ))}
          </div>
        )}

        <hr className="modal-divider" />

        <div className="form-field">
          <label htmlFor="ext-custom-title">Or Quick-Add Custom Title</label>
          <input
            id="ext-custom-title"
            type="text"
            className="form-input"
            placeholder="Story / Poem / Essay Title"
            value={extCustomTitle}
            onChange={(e) => setExtCustomTitle(e.target.value)}
            style={{ marginBottom: '0.5rem' }}
          />
          <input
            id="ext-custom-author"
            type="text"
            className="form-input"
            placeholder="Author Name"
            value={extCustomAuthor}
            onChange={(e) => setExtCustomAuthor(e.target.value)}
          />
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() =>
              onLogExternalReading({
                title: extCustomTitle,
                author: extCustomAuthor,
                slotKey: extCustomSlot
              })
            }
          >
            Log &amp; Credit Streak
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProfileSettingsModal({
  profile,
  onUpdateProfile,
  onClose,
  authUser,
  syncStatus,
  onSignIn,
  onSignOut
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h3 className="modal-heading">Reader Profile &amp; ElevenReader Settings</h3>

        <div className="form-field account-field">
          <label>Account</label>
          {authUser ? (
            <div className="account-row">
              {authUser.photoURL && (
                <img src={authUser.photoURL} alt="" className="avatar-img large" referrerPolicy="no-referrer" />
              )}
              <div className="account-text">
                <strong>{authUser.displayName || authUser.email}</strong>
                <span>{authUser.email}</span>
                <span className={`sync-note ${syncStatus}`}>
                  {syncStatus === 'error'
                    ? 'Could not reach the sync server — progress is saved on this device and will sync when it can.'
                    : syncStatus === 'syncing'
                    ? 'Syncing…'
                    : 'Progress, streaks & settings sync across every device you sign in on.'}
                </span>
              </div>
              <button type="button" className="btn-secondary" id="sign-out-btn" onClick={onSignOut}>
                Sign out
              </button>
            </div>
          ) : (
            <div className="account-row">
              <div className="account-text">
                <span>Sign in to keep the same progress and streaks on your phone and laptop.</span>
              </div>
              <button type="button" className="btn-primary" id="modal-sign-in-btn" onClick={onSignIn}>
                Sign in with Google
              </button>
            </div>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="profile-token-input">
            ElevenReader Session Token (<code>ELEVENREADER_TOKEN</code> — Optional)
          </label>
          <input
            id="profile-token-input"
            type="password"
            className="form-input"
            placeholder="Paste optional ElevenReader bearer token..."
            value={profile.elevenReaderToken}
            onChange={(e) => onUpdateProfile({ elevenReaderToken: e.target.value })}
          />
        </div>

        <div className="form-field">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={profile.includeAnalysisInEpub !== false}
              onChange={(e) => onUpdateProfile({ includeAnalysisInEpub: e.target.checked })}
            />
            <span>
              Include Literary &amp; Cultural Analysis in EPUB &amp; ElevenReader
              exports
            </span>
          </label>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-primary" onClick={onClose}>
            Save &amp; Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function PwaInstallModal({ deferredPrompt, onTriggerInstall, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        id="pwa-install-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="pwa-modal-header">
          <img
            src="/icons/icon-192.png"
            alt="Bradbury 1000 App Icon"
            className="pwa-app-icon-preview"
          />
          <div>
            <h3 className="modal-heading" style={{ marginBottom: '0.2rem' }}>
              Bradbury 1000 Standalone PWA
            </h3>
            <span className="pwa-status-pill">
              <CheckCircle2 size={13} />
              Offline Service Worker Active • 62 Works Cached
            </span>
          </div>
        </div>

        <p className="modal-subtext" style={{ marginTop: '0.85rem' }}>
          Install <strong>Bradbury 1000</strong> to your phone’s Home Screen for a full-screen,
          distraction-free bedside reading experience with complete offline access to all 14 Poems,
          14 Short Stories, 14 Essays, and 20 Korea &amp; San Francisco Chronicles.
        </p>

        <div className="pwa-steps-grid">
          <div className="pwa-step-box">
            <div className="pwa-step-title">
              <Smartphone size={15} />
              <span>iPhone / iPad (Safari)</span>
            </div>
            <p>
              Tap the <Share2 size={13} style={{ verticalAlign: 'middle' }} />{' '}
              <strong>Share</strong> button in Safari’s toolbar, then tap{' '}
              <strong>“Add to Home Screen”</strong>.
            </p>
          </div>

          <div className="pwa-step-box">
            <div className="pwa-step-title">
              <Wifi size={15} />
              <span>Android / Chrome Desktop</span>
            </div>
            <p>
              Tap <strong>Install App</strong> below or open the browser menu (⋮) and choose{' '}
              <strong>“Install Bradbury 1000”</strong>.
            </p>
          </div>
        </div>

        <div className="modal-actions">
          {deferredPrompt && (
            <button type="button" className="btn-primary" onClick={onTriggerInstall}>
              <Download size={15} />
              <span>Install App Now</span>
            </button>
          )}
          <button type="button" className="btn-secondary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
