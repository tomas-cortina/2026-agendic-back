import {
  CODE_PATTERN,
  generateVerificationCode,
  hashVerificationCode,
} from '../verification-code';

describe('generateVerificationCode', () => {
  it('generates a 6-character code matching CODE_PATTERN, excluding 0/O/1/I', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateVerificationCode();
      expect(code).toMatch(CODE_PATTERN);
      expect(code).not.toMatch(/[01OI]/);
    }
  });
});

describe('CODE_PATTERN', () => {
  it.each(['ABCDEF', 'A2B3C9'])('matches a well-formed code %s', (code) => {
    expect(code).toMatch(CODE_PATTERN);
  });

  it.each([
    ['too short', 'ABCDE'],
    ['too long', 'ABCDEFG'],
    ['lowercase', 'abcdef'],
    ['containing 0', 'ABCDE0'],
    ['containing O', 'ABCDEO'],
    ['containing 1', 'ABCDE1'],
    ['containing I', 'ABCDEI'],
  ])('rejects a code %s', (_, code) => {
    expect(code).not.toMatch(CODE_PATTERN);
  });
});

describe('hashVerificationCode', () => {
  it('hashes deterministically, without leaking the code itself', () => {
    const hash = hashVerificationCode('ABCDEF');

    expect(hash).not.toContain('ABCDEF');
    expect(hashVerificationCode('ABCDEF')).toBe(hash);
  });

  it('hashes different codes differently', () => {
    expect(hashVerificationCode('ABCDEF')).not.toBe(
      hashVerificationCode('GHJKLM'),
    );
  });
});
