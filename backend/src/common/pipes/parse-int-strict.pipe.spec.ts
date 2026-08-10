import { BadRequestException } from '@nestjs/common';
import { ParseIntStrictPipe } from './parse-int-strict.pipe';

describe('ParseIntStrictPipe', () => {
  const pipe = new ParseIntStrictPipe();
  const metadata = { data: 'page' } as Parameters<typeof pipe.transform>[1];

  // ── Missing → pass through so DefaultValuePipe can supply the default ────

  it('passes undefined through untouched (omitted param → DefaultValuePipe)', () => {
    expect(pipe.transform(undefined, metadata)).toBeUndefined();
  });

  it('passes null through untouched', () => {
    expect(pipe.transform(null as unknown as undefined, metadata)).toBeNull();
  });

  // ── Garbage → 400 (the quirk this pipe exists to fix) ────────────────────

  it('rejects NaN — the value a garbage string (page=abc) becomes under implicit conversion', () => {
    expect(() => pipe.transform(Number.NaN, metadata)).toThrow(BadRequestException);
  });

  it('rejects a non-numeric string directly (pipe used without implicit conversion)', () => {
    expect(() => pipe.transform('abc', metadata)).toThrow(BadRequestException);
  });

  it('rejects a non-integer number (page=2.5)', () => {
    expect(() => pipe.transform(2.5, metadata)).toThrow(BadRequestException);
  });

  it('rejects a non-integer string (page=2.5)', () => {
    expect(() => pipe.transform('2.5', metadata)).toThrow(BadRequestException);
  });

  it('names the offending parameter in the message', () => {
    try {
      pipe.transform('abc', metadata);
      throw new Error('expected a BadRequestException');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).message).toContain('page');
    }
  });

  // ── Valid integers → pass through unchanged ──────────────────────────────

  it('passes a valid integer number through', () => {
    expect(pipe.transform(2, metadata)).toBe(2);
  });

  it('passes a valid integer string through (ParseIntPipe does the final parse)', () => {
    expect(pipe.transform('2', metadata)).toBe('2');
  });

  it('passes a negative integer through (service clamps later, as before)', () => {
    expect(pipe.transform(-1, metadata)).toBe(-1);
  });

  it('passes zero through (page=0 is clamped by the service)', () => {
    expect(pipe.transform(0, metadata)).toBe(0);
  });
});
