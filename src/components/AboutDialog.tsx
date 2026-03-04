import { openUrl } from '@tauri-apps/plugin-opener';
import { APP } from '../config/app';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AboutDialog({ open, onClose }: Props) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center cursor-pointer"
      onClick={onClose}
    >
      {/* 遮罩 */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-hidden
      />
      {/* 弹窗 */}
      <div
        className="relative w-[360px] rounded-lg shadow-2xl neon-card overflow-hidden cursor-default"
        onClick={e => e.stopPropagation()}
        style={{
          background: 'rgba(22,46,46,0.98)',
          border: '1px solid rgba(19,236,236,0.3)',
          boxShadow: '0 0 30px rgba(19,236,236,0.15), 0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        <div className="p-6">
          {/* 图标 + 标题 */}
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: 'rgba(19,236,236,0.15)',
                border: '1px solid rgba(19,236,236,0.3)',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.8">
                <circle cx="12" cy="12" r="3"/>
                <circle cx="4" cy="6" r="2"/><circle cx="20" cy="6" r="2"/>
                <circle cx="4" cy="18" r="2"/><circle cx="20" cy="18" r="2"/>
                <line x1="12" y1="9" x2="5" y2="7"/><line x1="12" y1="9" x2="19" y2="7"/>
                <line x1="12" y1="15" x2="5" y2="17"/><line x1="12" y1="15" x2="19" y2="17"/>
              </svg>
            </div>
            <div>
              <h2
                className="text-lg font-bold uppercase tracking-tight"
                style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-display)' }}
              >
                {APP.name}
              </h2>
              <p className="text-xs" style={{ color: 'rgba(19,236,236,0.7)' }}>
                v{APP.version}
              </p>
            </div>
          </div>

          <p className="text-sm mb-5" style={{ color: '#94a3b8', lineHeight: 1.6 }}>
            {APP.description}
          </p>

          {/* GitHub 链接 */}
          <button
            type="button"
            onClick={() => openUrl(APP.github)}
            className="flex items-center gap-2 w-full px-4 py-2.5 rounded transition-colors mb-5"
            style={{
              background: 'rgba(19,236,236,0.1)',
              border: '1px solid rgba(19,236,236,0.3)',
              color: 'var(--color-primary)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(19,236,236,0.2)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(19,236,236,0.1)';
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            <span className="text-sm font-medium">GitHub</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded text-sm font-medium transition-colors"
            style={{
              background: 'rgba(19,236,236,0.2)',
              border: '1px solid rgba(19,236,236,0.4)',
              color: 'var(--color-primary)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(19,236,236,0.3)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(19,236,236,0.2)';
            }}
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
}
