import { describe, expect, it } from 'vitest';
import { commitHttpBodyContent, normalizeHttpBody, switchHttpBodyType } from './http';

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
