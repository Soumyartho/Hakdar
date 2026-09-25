// Structural validation of a 12-digit Aadhaar-format number using the real Verhoeff checksum
// algorithm UIDAI uses. There is no live UIDAI/DigiLocker API access available to this app, so
// this cannot confirm a number belongs to a real, existing person - what it DOES genuinely do is
// reject malformed, mistyped, or fabricated numbers (a plain 12-digit regex would accept any of
// those), which is the honest ceiling of what's verifiable offline.

const MULTIPLICATION_TABLE = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
];

const PERMUTATION_TABLE = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
];

const verhoeffChecksum = (digits) => {
  let checksum = 0;
  const reversed = digits.split('').reverse();
  for (let i = 0; i < reversed.length; i++) {
    checksum = MULTIPLICATION_TABLE[checksum][PERMUTATION_TABLE[i % 8][Number(reversed[i])]];
  }
  return checksum;
};

// Aadhaar numbers never begin with 0 or 1, and a valid number's own checksum (via
// verhoeffChecksum on all 12 digits, including the trailing check digit) resolves to 0.
export const isValidAadhaar = (rawValue) => {
  if (typeof rawValue !== 'string') return false;
  const digits = rawValue.replace(/\s/g, '');
  if (!/^[2-9][0-9]{11}$/.test(digits)) return false;
  return verhoeffChecksum(digits) === 0;
};

export const lastFourOf = (rawValue) => rawValue.replace(/\s/g, '').slice(-4);
