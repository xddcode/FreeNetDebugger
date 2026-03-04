import { useMemo } from 'react';
import type { TrafficSample } from '../../types';

interface SparklineProps {
  data: number[];
  color: string;
  fill: string;
  width: number;
  height: number;
}

function Sparkline({ data, color, fill, width, height }: SparklineProps) {
  const path = useMemo(() => {
    if (data.length < 2) return { line: '', area: '' };
    const max = Math.max(...data, 1);
    const pts = data.map((v, i) => ({
      x: (i / (data.length - 1)) * width,
      y: height - (v / max) * (height - 2) - 1,
    }));
    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const area = `${line} L${width},${height} L0,${height} Z`;
    return { line, area };
  }, [data, width, height]);

  if (data.length < 2) return null;
  return (
    <g>
      <path d={path.area} fill={fill} />
      <path d={path.line} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </g>
  );
}

function formatRate(bps: number): string {
  if (bps >= 1024 * 1024) return `${(bps / 1024 / 1024).toFixed(1)} MB/s`;
  if (bps >= 1024) return `${(bps / 1024).toFixed(1)} KB/s`;
  return `${bps} B/s`;
}

function formatTotal(n: number): string {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}

interface Props {
  samples: TrafficSample[];
}

export default function TrafficChart({ samples }: Props) {
  const W = 400;
  const H = 64;
  const CHART_W = W;
  const CHART_H = H;

  const rxData = samples.map(s => s.rxRate);
  const txData = samples.map(s => s.txRate);

  const lastSample = samples[samples.length - 1];
  const rxRate  = lastSample?.rxRate  ?? 0;
  const txRate  = lastSample?.txRate  ?? 0;
  const rxTotal = lastSample?.rxTotal ?? 0;
  const txTotal = lastSample?.txTotal ?? 0;

  // Pad to TRAFFIC_MAX_SAMPLES so chart fills the full width
  const PAD = 60;
  const rxPadded = Array(Math.max(0, PAD - rxData.length)).fill(0).concat(rxData);
  const txPadded = Array(Math.max(0, PAD - txData.length)).fill(0).concat(txData);

  return (
    <div
      className="flex flex-col gap-2 p-3"
      style={{ background: 'rgba(16,34,34,0.6)' }}
    >
      {/* SVG chart */}
      <div
        className="relative rounded overflow-hidden"
        style={{
          border: '1px solid rgba(19,236,236,0.15)',
          background: 'rgba(10,20,20,0.8)',
          boxShadow: 'inset 0 0 12px rgba(0,0,0,0.6)',
        }}
      >
        {/* Watermark label */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
          style={{
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.2em',
            color: 'rgba(19,236,236,0.08)',
            fontWeight: 700,
          }}
        >
          DATA FLOW VISUALIZER
        </div>

        {/* Grid lines */}
        <svg
          width="100%" height={H}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          style={{ display: 'block' }}
        >
          {/* Horizontal grid */}
          {[0.25, 0.5, 0.75].map(f => (
            <line
              key={f}
              x1="0" y1={H * f}
              x2={W} y2={H * f}
              stroke="rgba(19,236,236,0.06)"
              strokeWidth="1"
            />
          ))}

          {/* RX — green */}
          <Sparkline
            data={rxPadded}
            color="#00ff00"
            fill="rgba(0,255,0,0.12)"
            width={CHART_W}
            height={CHART_H}
          />

          {/* TX — magenta */}
          <Sparkline
            data={txPadded}
            color="#ff00ff"
            fill="rgba(255,0,255,0.1)"
            width={CHART_W}
            height={CHART_H}
          />

          {/* Right-edge glow line */}
          <line
            x1={W} y1="0" x2={W} y2={H}
            stroke="rgba(19,236,236,0.2)"
            strokeWidth="1"
          />
        </svg>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2">
        {/* RX stat */}
        <div
          className="flex flex-col gap-0.5 p-2 rounded"
          style={{
            background: 'rgba(0,255,0,0.05)',
            border: '1px solid rgba(0,255,0,0.15)',
          }}
        >
          <div
            className="flex items-center gap-1 uppercase"
            style={{ fontSize: 9, letterSpacing: '0.12em', color: 'rgba(0,255,0,0.6)', fontFamily: 'var(--font-mono)' }}
          >
            <span
              className="inline-block rounded-full"
              style={{ width: 5, height: 5, background: '#00ff00', boxShadow: '0 0 4px #00ff00' }}
            />
            Total In
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#00ff00', fontFamily: 'var(--font-mono)' }}>
            {formatTotal(rxTotal)}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(0,255,0,0.5)', fontFamily: 'var(--font-mono)' }}>
            ↓ {formatRate(rxRate)}
          </div>
        </div>

        {/* TX stat */}
        <div
          className="flex flex-col gap-0.5 p-2 rounded"
          style={{
            background: 'rgba(255,0,255,0.05)',
            border: '1px solid rgba(255,0,255,0.15)',
          }}
        >
          <div
            className="flex items-center gap-1 uppercase"
            style={{ fontSize: 9, letterSpacing: '0.12em', color: 'rgba(255,0,255,0.6)', fontFamily: 'var(--font-mono)' }}
          >
            <span
              className="inline-block rounded-full"
              style={{ width: 5, height: 5, background: '#ff00ff', boxShadow: '0 0 4px #ff00ff' }}
            />
            Total Out
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#ff00ff', fontFamily: 'var(--font-mono)' }}>
            {formatTotal(txTotal)}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,0,255,0.5)', fontFamily: 'var(--font-mono)' }}>
            ↑ {formatRate(txRate)}
          </div>
        </div>
      </div>
    </div>
  );
}
