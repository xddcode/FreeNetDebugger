import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Flex, Tabs } from '@chakra-ui/react';
import type { Session } from '../../types';
import NetworkPanel from './NetworkPanel';
import ReceivePanel from './ReceivePanel';
import SendSettingsPanel from './SendSettingsPanel';
import ProfilePanel from './ProfilePanel';

interface Props {
  session: Session;
}

type SidebarTab = 'network' | 'receive' | 'send' | 'importExport';

export default function ConnectionPanel({ session }: Props) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<SidebarTab>('network');

  const isTcp = session.config.protocol === 'TCP_CLIENT' || session.config.protocol === 'TCP_SERVER';

  const tabs: { key: SidebarTab; label: string }[] = [
    { key: 'network', label: t('sidebar.tabs.network') },
    { key: 'receive', label: t('sidebar.tabs.receive') },
    { key: 'send', label: t('sidebar.tabs.send') },
    { key: 'importExport', label: t('sidebar.tabs.importExport') },
  ];

  return (
    <Flex direction="column" height="full" minH="0">
      {!isTcp && (
        <Tabs.Root
          value={activeTab}
          onValueChange={(details) => setActiveTab(details.value as SidebarTab)}
          variant="subtle"
          size="sm"
          flexShrink={0}
        >
          <Tabs.List
            px="3"
            pt="3"
            pb="3"
            borderBottomWidth="1px"
            borderColor="border"
            gap="1"
            bg="bg.subtle"
          >
            {tabs.map((tab) => (
              <Tabs.Trigger
                key={tab.key}
                value={tab.key}
                flex="1"
                minH="8"
                rounded="md"
                fontSize="2xs"
                fontFamily="mono"
                letterSpacing="label"
                color="fg.muted"
                _selected={{ bg: 'accent.subtle', color: 'accent' }}
                _hover={{ color: 'fg' }}
              >
                {tab.label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </Tabs.Root>
      )}

      <Box flex="1" minH="0" overflowY="auto" className="sidebar-scroll" p="4">
        <Flex direction="column" gap="4">
          {isTcp ? (
            <>
              <NetworkPanel session={session} />
              <ReceivePanel session={session} />
              <SendSettingsPanel session={session} />
              <ProfilePanel session={session} />
            </>
          ) : (
            <>
              {activeTab === 'network' && <NetworkPanel session={session} />}
              {activeTab === 'receive' && <ReceivePanel session={session} />}
              {activeTab === 'send' && <SendSettingsPanel session={session} />}
              {activeTab === 'importExport' && <ProfilePanel session={session} />}
            </>
          )}
        </Flex>
      </Box>
    </Flex>
  );
}
