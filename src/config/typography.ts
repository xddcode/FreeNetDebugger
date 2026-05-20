/**
 * Compact unified type scale — two steps only in the settings column.
 *
 * | Token | Size | Font | Use |
 * |-------|------|------|-----|
 * | 2xs   | 11px | mono | Field labels, tabs, meta, version |
 * | sm    | 12px | body/mono | Default UI: body, inputs, panel titles, options |
 * | lg    | 13px | body | App brand (sidebar only) |
 */
export const TYPE = {
  label: '2xs',
  base: 'sm',
  brand: 'lg',
} as const;

export type TypeToken = (typeof TYPE)[keyof typeof TYPE];
