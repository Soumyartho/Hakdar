import crypto from 'crypto';

// PII-at-rest helpers. Aadhaar numbers are never stored in plaintext anywhere - only a salted
// SHA-256 hash (for uniqueness lookups, so we can still detect a duplicate registration) plus the
// last 4 digits (for display). Phone numbers are stored encrypted since, unlike Aadhaar, we do
// need the plaintext back (to send OTPs / display to officers), just not sitting readable in the
// database file itself.

const getEncryptionKey = () => {
  const key = process.env.PII_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('PII_ENCRYPTION_KEY is not set - cannot encrypt/decrypt PII');
  }
  // Accepts either a 32-byte hex string or any passphrase, hashed down to a 32-byte key.
  return /^[0-9a-fA-F]{64}$/.test(key) ? Buffer.from(key, 'hex') : crypto.createHash('sha256').update(key).digest();
};

const AADHAAR_SALT = process.env.AADHAAR_HASH_SALT || 'hakdar-aadhaar-salt-dev-only';
const PHONE_SALT = process.env.PHONE_HASH_SALT || 'hakdar-phone-salt-dev-only';

export const hashAadhaar = (rawValue) => {
  const digits = rawValue.replace(/\s/g, '');
  return crypto.createHash('sha256').update(`${AADHAAR_SALT}:${digits}`).digest('hex');
};

// Strips everything but digits, then normalizes the +91/91/0 country-code and trunk-prefix
// variants an Indian mobile number can arrive in (e.g. "+91 98765 43210", "919876543210",
// "09876543210", "9876543210") down to the bare 10-digit number, so the same real phone always
// hashes identically no matter how a citizen happens to type it.
const normalizePhone = (rawValue) => {
  let digits = rawValue.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits;
};

// AES-GCM ciphertext is non-deterministic (random IV per call), so it can't back a `WHERE phone =
// ?` lookup or a UNIQUE index. Phone gets the same split as Aadhaar: a deterministic hash for
// lookups/uniqueness, plus the AES-GCM value separately when the plaintext needs to be shown
// again (e.g. an officer viewing a citizen's contact details).
export const hashPhone = (rawValue) => {
  return crypto.createHash('sha256').update(`${PHONE_SALT}:${normalizePhone(rawValue)}`).digest('hex');
};

export const encryptPII = (plainText) => {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // iv + authTag + ciphertext, all base64 in one field - keeps the DB schema to a single column.
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
};

export const decryptPII = (encoded) => {
  const key = getEncryptionKey();
  const raw = Buffer.from(encoded, 'base64');
  const iv = raw.subarray(0, 12);
  const authTag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
};
