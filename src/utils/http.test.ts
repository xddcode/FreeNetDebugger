import { describe, expect, it } from 'vitest';
import {
  commitHttpBodyContent,
  normalizeHttpBody,
  switchHttpBodyType,
  mergePathParamsFromUrl,
  buildUrlWithPathParams,
  resolveHttpRequestUrl,
  extractUrlPathname,
  segmentUrlForPathHighlight,
  findPathnameStartInUrl,
} from './http';

describe('normalizeHttpBody', () => {
  it('keeps cached text and json when type is none', () => {
    const n = normalizeHttpBody({ type: 'none', textContent: 'plain', jsonContent: '{"a":1}' });
    expect(n.textContent).toBe('plain');
    expect(n.jsonContent).toBe('{"a":1}');
  });
});

describe('switchHttpBodyType', () => {
  it('preserves json when switching json → text → json', () => {
    const json = '{"name":"test"}';
    const fromJson = normalizeHttpBody({ type: 'json', content: json });
    const asText = switchHttpBodyType(fromJson, 'text', json);
    expect(asText).toEqual({ type: 'text', content: '', jsonContent: json });

    const textNorm = normalizeHttpBody(asText);
    const backToJson = switchHttpBodyType(textNorm, 'json');
    expect(backToJson).toEqual({ type: 'json', content: json, textContent: '' });
  });

  it('uses pending draft for active type before switch', () => {
    const n = normalizeHttpBody({ type: 'json', content: '{}' });
    const switched = switchHttpBodyType(n, 'text', '{"pending":true}');
    expect(switched).toMatchObject({ type: 'text', jsonContent: '{"pending":true}' });
  });
});

describe('commitHttpBodyContent', () => {
  it('updates json without clearing text cache', () => {
    const n = normalizeHttpBody({ type: 'json', content: '{}', textContent: 'hello' });
    expect(commitHttpBodyContent(n, '{"x":1}')).toEqual({
      type: 'json',
      content: '{"x":1}',
      textContent: 'hello',
    });
  });
});

describe('path params', () => {
  it('extracts pathname without treating host port as path param', () => {
    expect(extractUrlPathname('http://127.0.0.1:8080/:a')).toBe('/:a');
  });

  it('merges :name placeholders from URL into path param rows', () => {
    expect(mergePathParamsFromUrl('http://127.0.0.1:8080/:a')).toEqual([
      { key: 'a', value: '', enabled: true },
    ]);
  });

  it('preserves existing path param values when URL still contains placeholder', () => {
    expect(
      mergePathParamsFromUrl('http://127.0.0.1:8080/users/:id', [
        { key: 'id', value: '42', enabled: true },
      ]),
    ).toEqual([{ key: 'id', value: '42', enabled: true }]);
  });

  it('merges numeric placeholder names from URL', () => {
    expect(mergePathParamsFromUrl('http://127.0.0.1:8080/:12')).toEqual([
      { key: '12', value: '', enabled: true },
    ]);
  });

  it('substitutes path params when sending', () => {
    const url = 'http://127.0.0.1:8080/:a';
    const pathParams = [{ key: 'a', value: 'hello', enabled: true }];
    expect(buildUrlWithPathParams(url, pathParams)).toBe('http://127.0.0.1:8080/hello');
    expect(
      resolveHttpRequestUrl(url, pathParams, [{ key: 'q', value: '1', enabled: true }]),
    ).toBe('http://127.0.0.1:8080/hello?q=1');
    expect(
      buildUrlWithPathParams('http://127.0.0.1:8080/:12', [{ key: '12', value: 'x', enabled: true }]),
    ).toBe('http://127.0.0.1:8080/x');
  });

  it('highlights only pathname placeholders, not host port', () => {
    expect(findPathnameStartInUrl('http://127.0.0.1:8080/:a')).toBe('http://127.0.0.1:8080'.length);
    expect(segmentUrlForPathHighlight('http://127.0.0.1:8080/:12')).toEqual([
      { kind: 'text', text: 'http://127.0.0.1:8080' },
      { kind: 'pathParam', text: ':12' },
    ]);
  });
});
