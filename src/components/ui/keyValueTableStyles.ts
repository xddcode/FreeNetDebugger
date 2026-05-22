/** Shared visual shell for HTTP key-value tables (request params/headers + response headers). */

export const KEY_VALUE_TABLE_SHELL = {
  width: 'full',
} as const;

export const KEY_VALUE_TABLE_HEADER_CELL = {
  py: '2',
  px: '3',
  fontSize: '2xs',
  fontFamily: 'mono',
  color: 'fg.subtle',
  fontWeight: 'normal',
  letterSpacing: 'label',
} as const;

export const KEY_VALUE_TABLE_BODY_CELL = {
  py: '1.5',
  px: '3',
  verticalAlign: 'middle',
} as const;
