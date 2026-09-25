import fs from 'fs';

// multer's fileFilter only ever sees the client-supplied mimetype/extension (both trivially
// spoofable - a citizen could rename a script to "income.pdf"). These are the actual identity/
// income proof documents an officer will open and trust, so after upload this reads the real
// first bytes off disk and checks them against known magic numbers for the formats we claim to
// accept - genuine content sniffing, not just trusting the label on the file.
const SIGNATURES = [
  { ext: 'pdf', bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { ext: 'jpg', bytes: [0xff, 0xd8, 0xff] },
  { ext: 'png', bytes: [0x89, 0x50, 0x4e, 0x47] }
];

export const verifyDocumentSignature = (filePath) => {
  const fd = fs.openSync(filePath, 'r');
  try {
    const buffer = Buffer.alloc(8);
    fs.readSync(fd, buffer, 0, 8, 0);
    return SIGNATURES.some((sig) => sig.bytes.every((byte, i) => buffer[i] === byte));
  } finally {
    fs.closeSync(fd);
  }
};
