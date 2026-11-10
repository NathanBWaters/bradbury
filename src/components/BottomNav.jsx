import React from 'react';
import { Feather, BookOpen, ScrollText, Compass, Download } from 'lucide-react';

const NAV_ITEMS = [
  { key: 'poem', label: 'Poems', icon: Feather },
  { key: 'story', label: 'Stories', icon: BookOpen },
  { key: 'essay', label: 'Essays', icon: ScrollText },
  { key: 'personal', label: 'Korea & SF', icon: Compass }
];

export default function BottomNav({
  selectedCategory,
  activeReader,
  unreadCounts,
  onSelectCategory,
  onDownloadUnreadBundle
}) {
  return (
    <nav className="mobile-bottom-nav" aria-label="Primary Mobile Navigation">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = !activeReader && selectedCategory === item.key;
        const count = unreadCounts[item.key] ?? 0;

        return (
          <button
            key={item.key}
            type="button"
            id={`bottom-nav-${item.key}`}
            className={`bottom-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => onSelectCategory(item.key)}
            aria-current={isActive ? 'page' : undefined}
          >
            <div className="bottom-nav-icon-wrap">
              <Icon size={19} strokeWidth={isActive ? 2.3 : 1.8} />
              {count > 0 && <span className="bottom-nav-badge">{count}</span>}
            </div>
            <span className="bottom-nav-label">{item.label}</span>
          </button>
        );
      })}

      <button
        type="button"
        id="bottom-nav-epub-bundle"
        className="bottom-nav-item accent-bundle"
        onClick={onDownloadUnreadBundle}
        title="Download Tonight's Unread Quartet (.epub)"
      >
        <div className="bottom-nav-icon-wrap">
          <Download size={19} strokeWidth={2} />
        </div>
        <span className="bottom-nav-label">Night .EPUB</span>
      </button>
    </nav>
  );
}
