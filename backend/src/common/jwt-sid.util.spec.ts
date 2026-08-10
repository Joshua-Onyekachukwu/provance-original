import { decodeJwtPayloadSid } from './jwt-sid.util';

function makeToken(payload: Record<string, unknown>): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `header.${encoded}.signature`;
}

describe('decodeJwtPayloadSid', () => {
  it('reads the real GoTrue session_id claim', () => {
    expect(
      decodeJwtPayloadSid(
        makeToken({ session_id: '178b79ea-99dd-4fb1-94b4-cd1f0e0ec067', sub: 'u-1' }),
      ),
    ).toBe('178b79ea-99dd-4fb1-94b4-cd1f0e0ec067');
  });

  it('falls back to the legacy sid claim (e2e fakes / older issuers)', () => {
    expect(decodeJwtPayloadSid(makeToken({ sid: 'sid-legacy' }))).toBe('sid-legacy');
  });

  it('prefers session_id over sid when both are present', () => {
    expect(
      decodeJwtPayloadSid(makeToken({ session_id: 'sid-real', sid: 'sid-legacy' })),
    ).toBe('sid-real');
  });

  it('returns undefined when neither claim exists', () => {
    expect(decodeJwtPayloadSid(makeToken({ sub: 'u-1' }))).toBeUndefined();
  });

  it('returns undefined for a malformed token', () => {
    expect(decodeJwtPayloadSid('not-a-jwt')).toBeUndefined();
    expect(decodeJwtPayloadSid('a.b')).toBeUndefined();
    expect(decodeJwtPayloadSid('a.b.%%%')).toBeUndefined();
  });

  it('returns undefined for an empty value', () => {
    expect(decodeJwtPayloadSid(makeToken({ session_id: '' }))).toBeUndefined();
    expect(decodeJwtPayloadSid(makeToken({ sid: '' }))).toBeUndefined();
  });
});
