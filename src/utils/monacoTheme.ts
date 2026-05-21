import type { Monaco } from '@monaco-editor/react';

function getCssVar(name: string): string {
  return window.getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function withAlpha(color: string, alpha: number): string {
  const c = color.trim();
  if (c.startsWith('#') && c.length === 7) {
    const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
    return `${c}${a}`;
  }
  if (c.startsWith('rgb(')) {
    return c.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
  }
  if (c.startsWith('rgba(')) {
    return c.replace(/[\d.]+\)$/, `${alpha})`);
  }
  return c;
}

function buildThemeColors() {
  return {
    bg: getCssVar('--color-bg'),
    surface: getCssVar('--color-surface'),
    surfaceDim: getCssVar('--color-surface-dim'),
    surfaceContainer: getCssVar('--color-surface-container'),
    surfaceContainerHigh: getCssVar('--color-surface-container-high'),
    surfaceContainerHighest: getCssVar('--color-surface-container-highest'),
    textPrimary: getCssVar('--color-text-primary'),
    textSecondary: getCssVar('--color-text-secondary'),
    textMuted: getCssVar('--color-text-muted'),
    primary: getCssVar('--color-primary'),
    secondary: getCssVar('--color-secondary'),
    error: getCssVar('--color-error'),
    borderSubtle: getCssVar('--color-border-subtle'),
  };
}

function buildThemeColorsRecord(): Record<string, string> {
  const c = buildThemeColors();

  return {
    'editor.background': c.surface,
    'editor.foreground': c.textPrimary,
    'editorGutter.background': c.surface,
    'minimap.background': c.surfaceContainer,
    'editorLineNumber.foreground': c.textMuted,
    'editor.selectionBackground': withAlpha(c.primary, 0.25),
    'editor.inactiveSelectionBackground': withAlpha(c.primary, 0.15),
    'editorCursor.foreground': c.primary,
    'editorWhitespace.foreground': '#00000000',
    'editorIndentGuide.background': c.borderSubtle,
    'editorIndentGuide.activeBackground': c.borderSubtle,
    'editorLineHighlightBackground': withAlpha(c.surfaceContainer, 0.5),
    'editor.findMatchBackground': withAlpha(c.primary, 0.35),
    'editor.findMatchHighlightBackground': withAlpha(c.primary, 0.2),
    'editor.findRangeHighlightBackground': withAlpha(c.primary, 0.15),
    'editor.selectionHighlightBackground': withAlpha(c.surfaceContainer, 0.4),
    'editorOverviewRuler.selectionHighlightForeground': withAlpha(c.primary, 0.3),
    'editor.bracketMatchBackground': withAlpha(c.surfaceContainer, 0.5),
    'editor.bracketMatchBorder': c.borderSubtle,
    'scrollbarSlider.background': c.surfaceContainerHighest,
    'scrollbarSlider.hoverBackground': c.primary,
    'scrollbarSlider.activeBackground': withAlpha(c.primary, 0.6),
    'editorWidget.background': c.surfaceContainer,
    'editorWidget.border': c.borderSubtle,
    'editorWidget.foreground': c.textPrimary,
    'input.background': c.surfaceContainerHigh,
    'input.foreground': c.textPrimary,
    'input.border': c.borderSubtle,
    'inputOption.activeBorder': c.primary,
    'list.hoverBackground': c.surfaceContainerHigh,
    'list.focusBackground': withAlpha(c.primary, 0.2),
    'list.activeSelectionBackground': withAlpha(c.primary, 0.25),
    'list.activeSelectionForeground': c.textPrimary,
    'dropdown.background': c.surface,
    'dropdown.border': c.borderSubtle,
    'dropdown.foreground': c.textPrimary,
    'editorHoverWidget.background': c.surface,
    'editorHoverWidget.border': c.borderSubtle,
    'editorError.foreground': c.error,
    'editorWarning.foreground': c.secondary,
    'editorOverviewRuler.errorForeground': c.error,
    'editorOverviewRuler.warningForeground': c.secondary,
    'diffEditor.insertedTextBackground': withAlpha(c.secondary, 0.15),
    'diffEditor.removedTextBackground': withAlpha(c.error, 0.15),
  };
}

export function defineAppMonacoThemeSync(monaco: Monaco, theme: 'dark' | 'light') {
  const c = buildThemeColors();
  const colors = buildThemeColorsRecord();

  monaco.editor.defineTheme(`app-${theme}`, {
    base: theme === 'dark' ? 'vs-dark' : 'vs',
    inherit: true,
    rules: [
      { token: 'string', foreground: c.secondary.replace('#', '') },
      { token: 'number', foreground: c.primary.replace('#', '') },
      { token: 'keyword', foreground: c.secondary.replace('#', '') },
      { token: 'comment', foreground: c.textMuted.replace('#', '') },
    ],
    colors,
  });

  monaco.editor.setTheme(`app-${theme}`);
}

export async function defineAppMonacoTheme(theme: 'dark' | 'light') {
  const { loader } = await import('@monaco-editor/react');
  const monaco = await loader.init();
  defineAppMonacoThemeSync(monaco, theme);
}

/** Shared Monaco options — hides scrollbar overview-ruler markers, keeps code folding. */
export const MONACO_BASE_EDITOR_OPTIONS = {
  contextmenu: false,
  minimap: { enabled: false },
  overviewRulerLanes: 0,
  overviewRulerBorder: false,
  hideCursorInOverviewRuler: true,
  renderValidationDecorations: 'off' as const,
  glyphMargin: false,
  folding: true,
  showFoldingControls: 'always' as const,
  fontSize: 13,
  fontFamily: 'var(--font-mono)',
  lineNumbers: 'on' as const,
  renderWhitespace: 'none' as const,
  scrollBeyondLastLine: false,
  automaticLayout: true,
  padding: { top: 8 },
  wordWrap: 'on' as const,
};
