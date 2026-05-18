interface Tab {
  id: string;
  label: string;
}

interface Props {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  className?: string;
}

export default function Tabs({ tabs, activeTab, onTabChange, className = '' }: Props) {
  const containerClasses = ['flex', 'border-b', 'border-[var(--color-border)]', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClasses} role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;

        const tabClasses = [
          'px-4',
          'py-2',
          'text-sm',
          'font-[family-name:var(--font-body)]',
          'cursor-pointer',
          'select-none',
          'border-b-2',
          'transition-colors',
          'duration-[var(--transition-base)]',
          'ease-[cubic-bezier(0.4,0,0.2,1)]',
          isActive
            ? 'text-[var(--color-text-primary)] border-[var(--color-primary)]'
            : 'text-[var(--color-text-secondary)] border-transparent hover:text-[var(--color-text-primary)]',
        ].join(' ');

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            className={tabClasses}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
