import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Flex, Stack, Text } from '@chakra-ui/react';
import { invoke } from '../../utils/tauri';
import { useSessionStore, getAllSessions } from '../../store';
import type { Session, ProtocolType } from '../../types';
import { PanelCard, PanelHeader, FieldLabel, FieldSelect } from './ui';
import { validateProtocolConfig, hasValidationErrors, buildConnectPayload } from '../../utils/protocolConfig';
import type { ProtocolValidationErrors } from '../../utils/protocolConfig';
import { showToast } from '../../store/toastStore';
import ConnectActionButton from '../ui/ConnectActionButton';

import TcpClientForm from './network/TcpClientForm';
import TcpServerForm from './network/TcpServerForm';
import UdpClientForm from './network/UdpClientForm';
import UdpServerForm from './network/UdpServerForm';
import WebSocketForm from './network/WebSocketForm';
import SerialForm from './network/SerialForm';
import HttpForm from './network/HttpForm';

interface Props {
  session: Session;
}

const PROTOCOLS: { value: ProtocolType; label: string }[] = [
  { value: 'TCP_CLIENT', label: 'TCP Client' },
  { value: 'TCP_SERVER', label: 'TCP Server' },
  { value: 'UDP_CLIENT', label: 'UDP Client' },
  { value: 'UDP_SERVER', label: 'UDP Server' },
  { value: 'WEBSOCKET', label: 'WebSocket' },
  { value: 'SERIAL', label: 'Serial' },
  { value: 'HTTP', label: 'HTTP' },
];

export default function NetworkPanel({ session }: Props) {
  const { t } = useTranslation();
  const setStatus = useSessionStore((s) => s.setStatus);
  const appendLog = useSessionStore((s) => s.appendLog);

  const [errors, setErrors] = useState<ProtocolValidationErrors>({});

  const { config } = session;
  const isActive = session.status === 'connected' || session.status === 'listening';
  const isBusy = session.status === 'connecting' || session.status === 'disconnecting';
  const isSrv = config.protocol === 'TCP_SERVER';

  const handleValidate = (fieldErrors: ProtocolValidationErrors) => {
    setErrors((prev) => ({ ...prev, ...fieldErrors }));
  };

  const handleConnect = async () => {
    if (isActive || isBusy) {
      try {
        await invoke('disconnect', { id: session.id });
        useSessionStore.getState().clearClients(session.id);
        showToast('success', t('toast.disconnectSuccess'));
      } catch (e) {
        setStatus(session.id, 'error', String(e));
        showToast('error', t('toast.disconnectFailed'));
        appendLog(session.id, {
          timestamp: Date.now(),
          direction: 'system',
          data: Array.from(new TextEncoder().encode(`Disconnect error: ${e}`)),
        });
      }
      return;
    }

    const liveConfig =
      getAllSessions(useSessionStore.getState()).find((s) => s.id === session.id)?.config ?? config;
    const newErrors = validateProtocolConfig(liveConfig);
    setErrors(newErrors);
    if (hasValidationErrors(newErrors)) {
      return;
    }

    try {
      setStatus(session.id, 'connecting');
      // connect only spawns the async task; success/error toast comes from net:status in App.tsx
      await invoke('connect', { id: session.id, config: buildConnectPayload(liveConfig) });
    } catch (e) {
      setStatus(session.id, 'error', String(e));
      showToast('error', t('toast.connectFailed'));
      appendLog(session.id, {
        timestamp: Date.now(),
        direction: 'system',
        data: Array.from(new TextEncoder().encode(`ERROR: ${e}`)),
      });
    }
  };

  const renderProtocolForm = () => {
    const props = { session, disabled: isActive || isBusy, errors, onValidate: handleValidate };
    switch (config.protocol) {
      case 'TCP_CLIENT':
        return <TcpClientForm {...props} />;
      case 'TCP_SERVER':
        return <TcpServerForm {...props} />;
      case 'UDP_CLIENT':
        return <UdpClientForm {...props} />;
      case 'UDP_SERVER':
        return <UdpServerForm {...props} />;
      case 'WEBSOCKET':
        return <WebSocketForm {...props} />;
      case 'SERIAL':
        return <SerialForm {...props} />;
      case 'HTTP':
        return <HttpForm {...props} />;
      default:
        return null;
    }
  };

  return (
    <PanelCard>
      <PanelHeader
        icon={
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        }
        label={t('network.title')}
      />
      <Stack gap="4" px="4" py="3" pt="2" className="settings-stack">
        <Box>
          <FieldLabel seq={1} label={t('network.protocolType')} />
          <FieldSelect value={config.protocol} onChange={() => {}} options={PROTOCOLS} disabled />
        </Box>

        {renderProtocolForm()}

        {isSrv && session.status === 'listening' && session.clients.length > 0 && (
          <Box borderWidth="1px" borderColor="border" rounded="lg" overflow="hidden">
            <Flex
              align="center"
              gap="2"
              px="3"
              py="1.5"
              bg="bg.subtle"
              borderBottomWidth="1px"
              borderColor="border"
            >
              <Box color="success">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="3" fill="currentColor" />
                </svg>
              </Box>
              <Text fontSize="2xs" color="fg.muted" fontFamily="mono">
                {t('network.clients')} ({session.clients.length})
              </Text>
            </Flex>
            <Box maxH="120px" overflowY="auto" className="sidebar-scroll">
              {session.clients.map((client) => (
                <Flex
                  key={client}
                  align="center"
                  justify="space-between"
                  px="3"
                  py="1.5"
                  fontSize="2xs"
                  fontFamily="mono"
                  color="fg.muted"
                  borderBottomWidth="1px"
                  borderColor="border"
                  _last={{ borderBottomWidth: 0 }}
                >
                  <Text truncate title={client}>
                    {client}
                  </Text>
                  <Box w="1.5" h="1.5" rounded="full" bg="success" flexShrink={0} ml="2" />
                </Flex>
              ))}
            </Box>
          </Box>
        )}

        <ConnectActionButton
          isActive={isActive}
          isBusy={isBusy}
          connectLabel={t('network.connect')}
          disconnectLabel={t('network.disconnect')}
          connectingLabel={t('network.connecting')}
          onClick={handleConnect}
        />
      </Stack>
    </PanelCard>
  );
}
