import type { HttpMethod } from '../types';

/** Swagger UI opblock tag palette — saturated text + light translucent background. */
export interface HttpMethodBadgeStyle {
  color: string;
  bg: string;
}

const HTTP_METHOD_BADGE_STYLES: Record<HttpMethod, HttpMethodBadgeStyle> = {
  GET: { color: '#49cc90', bg: 'rgba(73, 204, 144, 0.16)' },
  POST: { color: '#4990e2', bg: 'rgba(73, 144, 226, 0.16)' },
  PUT: { color: '#fca130', bg: 'rgba(252, 161, 48, 0.16)' },
  PATCH: { color: '#50e3c2', bg: 'rgba(80, 227, 194, 0.16)' },
  DELETE: { color: '#f54336', bg: 'rgba(245, 67, 54, 0.16)' },
  HEAD: { color: '#9012fe', bg: 'rgba(144, 18, 254, 0.14)' },
  OPTIONS: { color: '#0d5aa7', bg: 'rgba(13, 90, 167, 0.16)' },
};

export function getHttpMethodBadgeStyle(method: HttpMethod): HttpMethodBadgeStyle {
  return HTTP_METHOD_BADGE_STYLES[method] ?? HTTP_METHOD_BADGE_STYLES.GET;
}
