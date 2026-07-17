import { describe, expect, it } from 'vitest';
import { formatTimestamp, parseTimestamp } from '../../src/lib/time';

describe('parseTimestamp', () => {
  it('parses VTT hh:mm:ss.mmm', () => {
    expect(parseTimestamp('00:00:12.000')).toBe(12000);
    expect(parseTimestamp('01:02:03.450')).toBe(3723450);
  });
  it('parses SRT hh:mm:ss,mmm', () => {
    expect(parseTimestamp('00:00:12,500')).toBe(12500);
  });
  it('parses short mm:ss forms', () => {
    expect(parseTimestamp('02:30')).toBe(150000);
    expect(parseTimestamp('02:30.250')).toBe(150250);
  });
  it('rejects invalid values', () => {
    expect(parseTimestamp('hello')).toBeUndefined();
    expect(parseTimestamp('00:99:00')).toBeUndefined();
    expect(parseTimestamp('')).toBeUndefined();
  });
});

describe('formatTimestamp', () => {
  it('formats as hh:mm:ss per the spec example', () => {
    expect(formatTimestamp(12000)).toBe('00:00:12');
    expect(formatTimestamp(3723450)).toBe('01:02:03');
    expect(formatTimestamp(0)).toBe('00:00:00');
  });
});
