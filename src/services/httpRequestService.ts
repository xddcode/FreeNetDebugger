import { invoke } from '../utils/tauri';
import type { ParsedHttpResponse } from '../components/workspace/http/httpResponse';

export interface HttpRequestPayload {
  method: string;
  url: string;
  headers: Record<string, string>;
  params: Array<{ key: string; value: string; enabled: boolean }>;
  body?: string;
}

export interface HttpResponseDto {
  statusCode: number;
  statusText: string;
  elapsedMs: number;
  headers: Record<string, string>;
  body: string;
  bodySize: number;
  contentType: string;
}

export function toParsedHttpResponse(dto: HttpResponseDto, timestamp: number): ParsedHttpResponse {
  return {
    statusCode: dto.statusCode,
    statusText: dto.statusText,
    elapsedMs: dto.elapsedMs,
    headers: dto.headers,
    bodyText: dto.body,
    fullBodyText: dto.body,
    bodySize: dto.bodySize,
    bodyTruncated: false,
    contentType: dto.contentType,
    timestamp,
  };
}

export async function executeHttpRequest(payload: HttpRequestPayload): Promise<HttpResponseDto> {
  return invoke<HttpResponseDto>('http_request', { payload });
}
