import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Button, Flex, Text } from '@chakra-ui/react';
import { invoke } from '../../utils/tauri';
import { useSessionStore } from '../../store';
import type { Session, SystemStats } from '../../types';
import { getProtocolAddress } from '../../utils/protocolConfig';
import { showToast } from '../../store/toastStore';

interface Props {
  session: Session | null;
}

function fmt(n: number): string {
  if (n < 1024) {
    return `${n} B`;
  }
  if (n < 1024 * 1024) {
    return `${(n / 1024).toFixed(1)} KB`;
  }
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function fmtDuration(ms: number): string {
  if (ms < 60000) {
    return `${Math.floor(ms / 1000)}s`;
  }
  if (ms < 3600000) {
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  }
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

function fmtMem(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export default function StatusBar({ session }: Props) {
  const { t } = useTranslation();
  const resetCounts = useSessionStore((s) => s.resetCounts);

  const [tick, setTick] = useState(0);
  const [sysStats, setSysStats] = useState<SystemStats | null>(null);

  const isConn = session?.status === 'connected';
  const isListen = session?.status === 'listening';
  const isError = session?.status === 'error';
  const isAlive = isConn || isListen;

  useEffect(() => {
    if (!isAlive) {
      return;
    }

    const timer = setInterval(() => setTick((v) => v + 1), 1000);
    return () => {
      clearInterval(timer);
      setTick(0);
    };
  }, [isAlive, session?.id]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const stats = (await invoke('get_system_stats')) as SystemStats;
        setSysStats(stats);
      } catch {
        // ignore
      }
    };
    fetchStats();
    const timer = setInterval(fetchStats, 3000);
    return () => clearInterval(timer);
  }, []);

  const statusLabel = () => {
    if (!session || session.status === 'idle') {
      return t('status.ready');
    }
    const m: Record<string, string> = {
      connecting: t('status.connecting'),
      connected: t('status.connected'),
      listening: t('status.listening'),
      error: t('status.error'),
      disconnecting: t('status.closing'),
    };
    return m[session.status] ?? t('status.ready');
  };

  const statusColor = isError ? 'danger' : isConn || isListen ? 'success' : 'fg.subtle';

  const addrText = () => {
    if (!session) {
      return '';
    }
    if (session.remoteAddr) {
      return session.remoteAddr;
    }
    return getProtocolAddress(session.config);
  };

  return (
    <Flex
      as="footer"
      position="relative"
      zIndex="20"
      align="center"
      justify="space-between"
      px="4"
      py="2"
      flexShrink={0}
      bg="bg.panel"
      borderTopWidth="1px"
      borderColor="border"
      fontFamily="mono"
      fontSize="sm"
      lineHeight="code"
    >
      <Flex align="center" gap="4">
        <Text color={statusColor}>
          {statusLabel()}
        </Text>
        {addrText() && (
          <Text color="fg.muted">
            {addrText()}
          </Text>
        )}
        {session && (
          <Text color="fg.subtle">
            {session.config.protocol.replace('_', ' ')}
          </Text>
        )}
        {isAlive && (
          <Text color="fg.subtle">
            {fmtDuration(tick * 1000)}
          </Text>
        )}
      </Flex>

      <Flex align="center" gap="4">
        {session && (
          <>
            <Text color="fg.muted">
              TX{' '}
              <Box as="span" color="accent">
                {fmt(session.txBytes)}
              </Box>
            </Text>
            <Text color="fg.muted">
              RX{' '}
              <Box as="span" color="success">
                {fmt(session.rxBytes)}
              </Box>
            </Text>
          </>
        )}
        {sysStats && (
          <>
            <Text color="fg.muted">
              CPU{' '}
              <Box as="span" color="fg">
              {sysStats.cpu_percent.toFixed(0)}%
              </Box>
            </Text>
            <Text color="fg.muted">
              MEM{' '}
              <Box as="span" color="fg">
                {fmtMem(sysStats.mem_used)}
              </Box>
            </Text>
          </>
        )}
      </Flex>

      {session && (
        <Button
          variant="ghost"
          size="xs"
          color="fg.subtle"
          _hover={{ color: 'fg' }}
          onClick={() => {
            resetCounts(session.id);
            showToast('info', t('toast.countersReset'));
          }}
        >
          {t('statusBar.resetCounts')}
        </Button>
      )}
    </Flex>
  );
}
