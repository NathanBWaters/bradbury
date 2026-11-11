import React from 'react';
import { Home, Sparkles, Compass, BookMarked } from 'lucide-react';

export default function BottomNav({
  currentView,
  totalCompleted,
  onNavigateHome,
  onNavigateTonight,
  onNavigateExplore,
  onNavigateJournal
}) {
  const isExplore =
    currentView === 'choose-type' ||
    currentView === 'choose-genre' ||
    currentView === 'shelf';

  const items = [
    {
      id: 'home',
      label: 'Ritual',
      icon: Home,
      active: currentView === 'home',
      onClick: onNavigateHome
    },
    {
      id: 'tonight',
      label: 'For You',
      icon: Sparkles,
      active: currentView === 'tonight',
      onClick: onNavigateTonight
    },
    {
      id: 'explore',
      label: 'Explore',
      icon: Compass,
      active: isExplore,
      onClick: onNavigateExplore
    },
    {
      id: 'journal',
      label: 'Ledger',
      icon: BookMarked,
      active: currentView === 'journal',
      badge: totalCompleted > 0 ? totalCompleted : null,
      onClick: onNavigateJournal
    }
  ];

  return (
    <nav className="mobile-bottom-nav" aria-label="Primary Mobile Navigation">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            id={`bottom-nav-${item.id}`}
            className={`bottom-nav-item ${item.active ? 'active' : ''}`}
            onClick={item.onClick}
            aria-current={item.active ? 'page' : undefined}
          >
            <div className="bottom-nav-icon-wrap">
              <Icon size={19} strokeWidth={item.active ? 2.3 : 1.75} />
              {item.badge ? <span className="bottom-nav-badge">{item.badge}</span> : null}
            </div>
            <span className="bottom-nav-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

