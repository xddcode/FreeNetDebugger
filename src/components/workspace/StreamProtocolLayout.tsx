import { useTranslation } from 'react-i18next';
import { Activity, PackageSearch } from 'lucide-react';
import { Box, Flex, Text } from '@chakra-ui/react';
import type { StreamSession } from '../../types';
import ConnectionPanel from '../sidebar/ConnectionPanel';
import { PanelCard, PanelHeader } from '../sidebar/ui';
import DataLog from '../log/DataLog';
import DataSend from '../send/DataSend';
import TrafficChart from '../traffic/TrafficChart';

interface Props {
  session: StreamSession;
}

function LiveIndicator() {
  return (
    <Box position="relative" width="2" height="2" flexShrink={0}>
      <Box
        position="absolute"
        inset="0"
        rounded="full"
        bg="success"
        opacity={0.75}
        className="animate-ping"
      />
      <Box position="relative" width="2" height="2" rounded="full" bg="success" />
    </Box>
  );
}

export default function StreamProtocolLayout({ session }: Props) {
  const { t } = useTranslation();
  const isAlive = session?.status === 'connected' || session?.status === 'listening';

  return (
    <>
      <Flex width="320px" flexShrink={0} direction="column" gap="3" overflowY="auto" minH="0">
        <Box className="glass-panel" flex="1" display="flex" flexDirection="column" minH="0" overflow="hidden">
          <ConnectionPanel session={session} />
        </Box>
      </Flex>

      <Flex flex="1" direction="column" gap="3" minW="0" minH="0">
        <Box className="glass-panel" flex="1" overflow="hidden" display="flex" flexDirection="column" minH="0">
          <DataLog session={session} />
        </Box>
        <Box className="glass-panel" overflow="hidden" flexShrink={0}>
          <DataSend session={session} />
        </Box>
      </Flex>

      <Flex width="280px" flexShrink={0} direction="column" gap="2" overflowY="auto" minH="0">
        <PanelCard>
          <Box position="relative" flexShrink={0}>
            <PanelHeader
              icon={<Activity size={13} strokeWidth={2} />}
              label={t('traffic.title')}
            />
            {isAlive ? (
              <Box position="absolute" right="3" top="50%" transform="translateY(-50%)">
                <LiveIndicator />
              </Box>
            ) : null}
          </Box>
          <TrafficChart samples={session.trafficSamples} />
        </PanelCard>

        <PanelCard flex="1" minH="200px" display="flex" flexDirection="column">
          <PanelHeader
            icon={<PackageSearch size={13} strokeWidth={2} />}
            label={t('inspector.title')}
          />
          <Flex
            flex="1"
            direction="column"
            align="center"
            justify="center"
            gap="3"
            p="6"
            minH="160px"
          >
            <Box
              p="3"
              rounded="full"
              bg="bg.subtle"
              borderWidth="1px"
              borderColor="border"
              color="fg.subtle"
            >
              <PackageSearch size={28} strokeWidth={1.25} />
            </Box>
            <Text
              fontSize="2xs"
              color="fg.subtle"
              fontFamily="mono"
              textAlign="center"
              maxW="200px"
              lineHeight="label"
              letterSpacing="label"
            >
              {t('inspector.placeholder')}
            </Text>
          </Flex>
        </PanelCard>
      </Flex>
    </>
  );
}
