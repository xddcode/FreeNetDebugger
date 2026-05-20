import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Grid, Stack, Text } from '@chakra-ui/react';
import type { TrafficSample } from '../../types';
import { TRAFFIC_MAX_SAMPLES } from '../../config/constants';

interface SparklineProps {
  data: number[];
  stroke: string;
  fill: string;
  width: number;
  height: number;
}

function Sparkline({ data, stroke, fill, width, height }: SparklineProps) {
  const path = useMemo(() => {
    if (data.length < 2) { return { line: '', area: '' }; }
    const max = Math.max(...data, 1);
    const pts = data.map((v, i) => ({
      x: (i / (data.length - 1)) * width,
      y: height - (v / max) * (height - 2) - 1,
    }));
    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const area = `${line} L${width},${height} L0,${height} Z`;
    return { line, area };
  }, [data, width, height]);

  if (data.length < 2) { return null; }
  return (
    <g>
      <path d={path.area} fill={fill} />
      <path d={path.line} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
    </g>
  );
}

function formatRate(bps: number): string {
  if (bps >= 1024 * 1024) { return `${(bps / 1024 / 1024).toFixed(1)} MB/s`; }
  if (bps >= 1024) { return `${(bps / 1024).toFixed(1)} KB/s`; }
  return `${bps} B/s`;
}

function formatTotal(n: number): string {
  if (n >= 1024 * 1024) { return `${(n / 1024 / 1024).toFixed(2)} MB`; }
  if (n >= 1024) { return `${(n / 1024).toFixed(1)} KB`; }
  return `${n} B`;
}

function averageTail(data: number[], windowSize: number): number {
  if (data.length === 0) { return 0; }
  const tail = data.slice(-windowSize);
  const sum = tail.reduce((acc, v) => acc + v, 0);
  return Math.round(sum / tail.length);
}

interface StatCardProps {
  label: string;
  total: string;
  rateLine: string;
  colorPalette: 'green' | 'blue';
}

function StatCard({ label, total, rateLine, colorPalette }: StatCardProps) {
  return (
    <Box
      p="2.5"
      rounded="md"
      bg={`${colorPalette === 'green' ? 'success' : 'accent'}.subtle`}
      borderWidth="1px"
      borderColor="border"
      borderLeftWidth="2px"
      borderLeftColor={colorPalette === 'green' ? 'success' : 'accent'}
    >
      <Text
        fontSize="2xs"
        textTransform="uppercase"
        letterSpacing="wider"
        color={colorPalette === 'green' ? 'success' : 'accent'}
        opacity={0.85}
        fontFamily="mono"
        mb="1"
      >
        {label}
      </Text>
      <Text
        fontSize="sm"
        fontWeight="bold"
        color={colorPalette === 'green' ? 'success' : 'accent'}
        fontFamily="mono"
        lineHeight="1.2"
      >
        {total}
      </Text>
      <Text
        fontSize="2xs"
        color="fg.subtle"
        fontFamily="mono"
        mt="0.5"
        lineHeight="1.4"
      >
        {rateLine}
      </Text>
    </Box>
  );
}

interface Props {
  samples: TrafficSample[];
}

export default function TrafficChart({ samples }: Props) {
  const { t } = useTranslation();
  const W = 400;
  const H = 72;

  const { rxRate, txRate, rxPeak, txPeak, rxTotal, txTotal, rxPadded, txPadded } = useMemo(() => {
    const rx = samples.map((s) => s.rxRate);
    const tx = samples.map((s) => s.txRate);
    const last = samples[samples.length - 1];
    const rxR = averageTail(rx, 3);
    const txR = averageTail(tx, 3);
    const rxP = rx.length > 0 ? Math.max(...rx) : 0;
    const txP = tx.length > 0 ? Math.max(...tx) : 0;
    const rxT = last?.rxTotal ?? 0;
    const txT = last?.txTotal ?? 0;
    const rxPad = Array(Math.max(0, TRAFFIC_MAX_SAMPLES - rx.length)).fill(0).concat(rx);
    const txPad = Array(Math.max(0, TRAFFIC_MAX_SAMPLES - tx.length)).fill(0).concat(tx);
    return {
      rxRate: rxR,
      txRate: txR,
      rxPeak: rxP,
      txPeak: txP,
      rxTotal: rxT,
      txTotal: txT,
      rxPadded: rxPad,
      txPadded: txPad,
    };
  }, [samples]);

  const hasData = samples.length >= 2;

  return (
    <Stack gap="3" p="3">
      <Box
        position="relative"
        rounded="md"
        overflow="hidden"
        borderWidth="1px"
        borderColor="border"
        bg="bg.muted"
        minH={`${H}px`}
      >
        <Box
          position="absolute"
          inset="0"
          display="flex"
          alignItems="center"
          justifyContent="center"
          pointerEvents="none"
          userSelect="none"
        >
          <Text
            fontSize="2xs"
            fontFamily="mono"
            letterSpacing="0.2em"
            color="fg.subtle"
            opacity={0.35}
            fontWeight="bold"
          >
            {t('traffic.visualizer')}
          </Text>
        </Box>

        {hasData ? (
          <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: 'block' }}>
            {[0.25, 0.5, 0.75].map((f) => (
              <line
                key={f}
                x1="0"
                y1={H * f}
                x2={W}
                y2={H * f}
                stroke="var(--chakra-colors-border)"
                strokeWidth="1"
                opacity={0.5}
              />
            ))}
            <Sparkline
              data={rxPadded}
              stroke="var(--chakra-colors-success)"
              fill="color-mix(in srgb, var(--chakra-colors-success) 18%, transparent)"
              width={W}
              height={H}
            />
            <Sparkline
              data={txPadded}
              stroke="var(--chakra-colors-accent)"
              fill="color-mix(in srgb, var(--chakra-colors-accent) 15%, transparent)"
              width={W}
              height={H}
            />
          </svg>
        ) : (
          <ChartPlaceholder height={H} />
        )}
      </Box>

      <Grid templateColumns="1fr 1fr" gap="2">
        <StatCard
          label={t('traffic.totalIn')}
          total={formatTotal(rxTotal)}
          rateLine={`↓ ${formatRate(rxRate)} · ${t('traffic.peak')} ${formatRate(rxPeak)}`}
          colorPalette="green"
        />
        <StatCard
          label={t('traffic.totalOut')}
          total={formatTotal(txTotal)}
          rateLine={`↑ ${formatRate(txRate)} · ${t('traffic.peak')} ${formatRate(txPeak)}`}
          colorPalette="blue"
        />
      </Grid>
    </Stack>
  );
}

function ChartPlaceholder({ height }: { height: number }) {
  return (
    <Box
      height={`${height}px`}
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <Box
        width="full"
        height="1px"
        bg="border"
        opacity={0.6}
        mx="4"
      />
    </Box>
  );
}
