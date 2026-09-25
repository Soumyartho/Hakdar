import bcrypt from 'bcryptjs';
import { run, get } from '../config/database.js';
import { hashPhone } from './cryptoUtil.js';

const OTP_TTL_MS = 5 * 60 * 1000;
const DEMO_MODE = process.env.DEMO_MODE !== 'false'; // defaults on - no SMS provider is wired up

// No SMS budget/API key exists for this project, so "sending" an OTP means logging it to the
// server console (clearly labelled) instead of dispatching a real text message. Swapping in a
// real provider (Twilio/MSG91/etc.) later is a one-function change confined to this file - nothing
// that calls generateAndSend()/verify() needs to change.
const smsProvider = {
  send: async (phone, otp) => {
    if (DEMO_MODE) {
      console.log(`[DEMO OTP] ${phone} -> ${otp} (would be sent via SMS in production)`);
      return { delivered: false, demo: true };
    }
    throw new Error('No real SMS provider is configured. Set DEMO_MODE=true or wire one up here.');
  }
};

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

export const generateAndSend = async (phone, purpose) => {
  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const phoneHash = hashPhone(phone);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

  await run(
    `INSERT INTO otp_verifications (phone_hash, otp_hash, purpose, expires_at) VALUES (?, ?, ?, ?)`,
    [phoneHash, otpHash, purpose, expiresAt]
  );

  const delivery = await smsProvider.send(phone, otp);
  // Only surfaced back to the caller when DEMO_MODE is on, so a frontend can display it during
  // development/demo instead of the citizen needing console access - never returned in production.
  return { expiresAt, demoOtp: DEMO_MODE ? otp : undefined, delivery };
};

export const verify = async (phone, purpose, otpAttempt) => {
  const phoneHash = hashPhone(phone);
  const record = await get(
    `SELECT * FROM otp_verifications
     WHERE phone_hash = ? AND purpose = ? AND consumed_at IS NULL
     ORDER BY id DESC LIMIT 1`,
    [phoneHash, purpose]
  );

  if (!record) return { valid: false, reason: 'No pending OTP for this phone number.' };
  if (new Date(record.expires_at) < new Date()) return { valid: false, reason: 'OTP has expired.' };

  const matches = await bcrypt.compare(otpAttempt, record.otp_hash);
  if (!matches) return { valid: false, reason: 'Incorrect OTP.' };

  await run(`UPDATE otp_verifications SET consumed_at = CURRENT_TIMESTAMP WHERE id = ?`, [record.id]);
  return { valid: true };
};
