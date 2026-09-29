import path from 'path';
import { createWorker } from 'tesseract.js';

// Heuristic, offline, no-API-key document cross-check - same honesty ceiling as
// aadhaarValidator.js's Verhoeff checksum: this cannot confirm a document is genuine, only flag
// when its OCR'd content plainly contradicts what the citizen declared or tagged it as. Always a
// signal for the officer to weigh, never an auto-reject (mirrors fraudAuditJob.js's flag-not-block
// posture).

// Tesseract.js OCRs raster images; it has no PDF decoder built in, and adding one (pdf->image
// rendering) is a real native/canvas dependency this project deliberately avoids elsewhere (see
// aadhaarValidator's own "honest ceiling" note). PDFs are simply left unchecked rather than
// silently mis-scored.
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png']);

const AADHAAR_KEYWORDS = ['aadhaar', 'aadhar', 'uidai'];
const INCOME_KEYWORDS = ['income', 'salary', 'wage'];

const classifyDocumentType = (claimedType) => {
  const lower = (claimedType || '').toLowerCase();
  if (AADHAAR_KEYWORDS.some((k) => lower.includes(k))) return 'aadhaar';
  if (INCOME_KEYWORDS.some((k) => lower.includes(k))) return 'income';
  return null;
};

const ocrText = async (filePath) => {
  // tesseract.js rejects the recognize() promise on a failed job either way, but WITHOUT an
  // errorHandler it also synchronously re-throws inside its own internal message handler (see
  // createWorker.js) - outside this function's call stack, so no try/catch here can ever catch
  // it, and it crashes the whole Node process. A malformed/corrupt upload must never be able to
  // take the entire API down, so this no-op handler exists purely to suppress that second throw;
  // the real error handling still happens via the rejected promise below.
  const worker = await createWorker('eng', undefined, { errorHandler: () => {} });
  try {
    const { data } = await worker.recognize(filePath);
    return data.text || '';
  } finally {
    await worker.terminate();
  }
};

// Real Aadhaar cards print the number as three groups of four digits ("1234 5678 9012"), so that
// grouping is matched directly rather than hunting for any 12 digits in the document.
const checkAadhaar = (text, aadhaarLast4) => {
  const matches = text.match(/\d{4}[\s-]?\d{4}[\s-]?\d{4}/g) || [];
  if (matches.length === 0) {
    return { matched: false, reason: 'Could not find a 12-digit Aadhaar number on this document.' };
  }
  const found = matches.some((m) => m.replace(/[\s-]/g, '').slice(-4) === aadhaarLast4);
  return found
    ? { matched: true, reason: 'Aadhaar number on the document matches the citizen\'s account.' }
    : { matched: false, reason: `None of the Aadhaar-like numbers found match the account's number on file (····${aadhaarLast4}).` };
};

// Income certificates rarely print ONLY the income figure - the closest figure to the declared
// value (rather than e.g. the largest) is taken as the candidate, and obvious 4-digit years are
// excluded so a document date doesn't get mistaken for an income figure.
const checkIncome = (text, declaredIncome) => {
  const declared = Number(declaredIncome);
  if (!declared) return null;

  const raw = text.match(/[\d,]{4,}/g) || [];
  const numbers = raw
    .map((s) => Number(s.replace(/,/g, '')))
    .filter((n) => Number.isFinite(n) && n >= 1000 && !(n >= 1900 && n <= 2099));

  if (numbers.length === 0) {
    return { matched: false, reason: 'Could not find an income figure on this document.' };
  }

  const closest = numbers.reduce((best, n) => (Math.abs(n - declared) < Math.abs(best - declared) ? n : best));
  const ratio = closest / declared;
  const withinRange = ratio >= 0.5 && ratio <= 2;

  return withinRange
    ? { matched: true, reason: `Found a figure (₹${closest.toLocaleString()}) consistent with the declared income.` }
    : { matched: false, reason: `Closest figure found (₹${closest.toLocaleString()}) is inconsistent with the declared income (₹${declared.toLocaleString()}).` };
};

// citizen: { aadhaar_last4 }, declaredProfile: { income }. Returns { checked, matched, reason }
// where matched is null when checked is false (no applicable heuristic, or OCR itself failed).
export const verifyDocument = async (filePath, claimedType, citizen, declaredProfile) => {
  const ext = path.extname(filePath).toLowerCase();
  if (!IMAGE_EXTENSIONS.has(ext)) {
    return { checked: false, matched: null, reason: 'PDF documents are not automatically checked - please review manually.' };
  }

  const kind = classifyDocumentType(claimedType);
  if (!kind) {
    return { checked: false, matched: null, reason: 'No automated check exists for this document type.' };
  }

  try {
    const text = await ocrText(filePath);
    const result = kind === 'aadhaar' ? checkAadhaar(text, citizen.aadhaar_last4) : checkIncome(text, declaredProfile.income);
    if (!result) return { checked: false, matched: null, reason: 'No automated check exists for this document type.' };
    return { checked: true, ...result };
  } catch (error) {
    console.error('[documentVerifier] OCR failed:', error.message);
    return { checked: false, matched: null, reason: 'Automated check failed to run for this document.' };
  }
};
