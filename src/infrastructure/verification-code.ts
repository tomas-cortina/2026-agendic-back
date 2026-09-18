import { createHash, randomInt } from 'node:crypto';

/** Excludes 0/O and 1/I, which are easy to mix up when read off an email. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

/** Matches a well-formed code, before it's looked up. */
export const CODE_PATTERN = new RegExp(`^[${ALPHABET}]{${CODE_LENGTH}}$`);

export const generateVerificationCode = () =>
  Array.from(
    { length: CODE_LENGTH },
    () => ALPHABET[randomInt(ALPHABET.length)],
  ).join('');

/** Stores only a hash of each verification code, so a leaked table can't be used to verify an email. */
export const hashVerificationCode = (code: string) =>
  createHash('sha256').update(code).digest('base64url');
