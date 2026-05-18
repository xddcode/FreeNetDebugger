import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Session } from '../../types';
import NetworkPanel from './NetworkPanel';
import ReceivePanel from './ReceivePanel';
import SendSettingsPanel from './SendSettingsPanel';
import HttpPanel from './HttpPanel';
import HttpResponsePanel from './HttpResponsePanel';
import ProfilePanel from './ProfilePanel';

interface Props {
  session: Session;
}

type SidebarTab = 'network' | 'receive' | 'send' | 'profile';

export default function ConnectionPanel({ session }: Props) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<SidebarTab>('network');

  const tabs: { key: SidebarTab; label: string }[] = [
    { key: 'network', label: t('sidebar.tabs.network') },
    { key: 'receive', label: t('sidebar.tabs.receive') },
    { key: 'send', label: t('sidebar.tabs.send') },
    { key: 'profile', label: t('sidebar.tabs.profile') },
  ];

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Tab bar */}
      <div className="flex items-center gap-0.5 px-2 pt-2 pb-1 shrink-0 border-b border-[var(--color-border)]">
        {tabs.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-2 py-1.5 rounded text-[12px] font-medium transition-colors btn-interactive focus-ring whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-y-auto sidebar-scroll p-2 flex flex-col gap-2">
        {activeTab === 'network' && (
          <>
            <NetworkPanel session={session} />
            {session.config.protocol === 'HTTP' && <HttpPanel session={session} />}
            {session.config.protocol === 'HTTP' && <HttpResponsePanel session={session} />}
          </>
        )}
        {activeTab === 'receive' && <ReceivePanel session={session} />}
        {activeTab === 'send' && <SendSettingsPanel session={session} />}
        {activeTab === 'profile' && <ProfilePanel session={session} />}
      </div>
    </div>
  );
}
