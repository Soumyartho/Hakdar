import jwt from 'jsonwebtoken';
import { CitizenModel } from '../models/citizenModel.js';
import { isValidAadhaar, lastFourOf } from '../utils/aadhaarValidator.js';
import { hashAadhaar, hashPhone, encryptPII } from '../utils/cryptoUtil.js';
import * as otpService from '../utils/otpService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'hakdar_jwt_secret_key_123';

const signCitizenToken = (citizen) =>
  jwt.sign({ id: citizen.id, full_name: citizen.full_name, type: 'citizen' }, JWT_SECRET, { expiresIn: '12h' });

// Step 1 of registration: validate identity fields and send the OTP. The citizen row itself is
// only created once the OTP is verified (verifyRegistration below), so an abandoned/failed
// registration never leaves a half-verified account behind.
export const requestRegistrationOtp = async (req, res) => {
  try {
    const { full_name, phone, aadhaar_number, dob, gender, address } = req.body;

    if (!full_name || !phone || !aadhaar_number) {
      return res.status(400).json({ success: false, message: 'Full name, phone and Aadhaar number are required' });
    }

    if (!isValidAadhaar(aadhaar_number)) {
      return res.status(400).json({ success: false, message: 'Aadhaar number failed format/checksum validation' });
    }

    const aadhaarHash = hashAadhaar(aadhaar_number);
    const existingByAadhaar = await CitizenModel.getByAadhaarHash(aadhaarHash);
    if (existingByAadhaar) {
      return res.status(409).json({ success: false, message: 'An account already exists for this Aadhaar number' });
    }

    const phoneHash = hashPhone(phone);
    const existingByPhone = await CitizenModel.getByPhoneHash(phoneHash);
    if (existingByPhone) {
      return res.status(409).json({ success: false, message: 'An account already exists for this phone number' });
    }

    const { expiresAt, demoOtp } = await otpService.generateAndSend(phone, 'register');

    res.json({
      success: true,
      message: 'OTP sent to your phone number',
      expiresAt,
      demoOtp, // only populated when DEMO_MODE is on - see otpService.js
      pendingProfile: { full_name, phone, aadhaar_number, dob, gender, address }
    });
  } catch (error) {
    console.error('Error requesting registration OTP:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const verifyRegistration = async (req, res) => {
  try {
    const { full_name, phone, aadhaar_number, dob, gender, address, otp } = req.body;

    if (!full_name || !phone || !aadhaar_number || !otp) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    if (!isValidAadhaar(aadhaar_number)) {
      return res.status(400).json({ success: false, message: 'Aadhaar number failed format/checksum validation' });
    }

    const otpCheck = await otpService.verify(phone, 'register', otp);
    if (!otpCheck.valid) {
      return res.status(400).json({ success: false, message: otpCheck.reason });
    }

    const aadhaarHash = hashAadhaar(aadhaar_number);
    const phoneHash = hashPhone(phone);

    // Re-check uniqueness at verify-time too - the request-otp check happened before the OTP round
    // trip, leaving a window for a duplicate registration to sneak in with the same identity.
    if (await CitizenModel.getByAadhaarHash(aadhaarHash)) {
      return res.status(409).json({ success: false, message: 'An account already exists for this Aadhaar number' });
    }
    if (await CitizenModel.getByPhoneHash(phoneHash)) {
      return res.status(409).json({ success: false, message: 'An account already exists for this phone number' });
    }

    const citizenId = await CitizenModel.create({
      full_name,
      phone_hash: phoneHash,
      phone_encrypted: encryptPII(phone),
      dob,
      gender,
      address,
      aadhaar_hash: aadhaarHash,
      aadhaar_last4: lastFourOf(aadhaar_number)
    });
    await CitizenModel.markPhoneVerified(citizenId);

    const citizen = await CitizenModel.getById(citizenId);
    const token = signCitizenToken(citizen);

    res.status(201).json({ success: true, message: 'Registration complete', token, citizen });
  } catch (error) {
    console.error('Error verifying registration:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// Returning citizens log in passwordless, via phone + OTP.
export const requestLoginOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    const citizen = await CitizenModel.getByPhoneHash(hashPhone(phone));
    if (!citizen) {
      return res.status(404).json({ success: false, message: 'No account found for this phone number' });
    }

    const { expiresAt, demoOtp } = await otpService.generateAndSend(phone, 'login');
    res.json({ success: true, message: 'OTP sent to your phone number', expiresAt, demoOtp });
  } catch (error) {
    console.error('Error requesting login OTP:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const verifyLogin = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ success: false, message: 'Phone number and OTP are required' });
    }

    const otpCheck = await otpService.verify(phone, 'login', otp);
    if (!otpCheck.valid) {
      return res.status(400).json({ success: false, message: otpCheck.reason });
    }

    const citizen = await CitizenModel.getByPhoneHash(hashPhone(phone));
    if (!citizen) {
      return res.status(404).json({ success: false, message: 'No account found for this phone number' });
    }
    if (citizen.status !== 'active') {
      return res.status(403).json({ success: false, message: `Account is ${citizen.status}` });
    }

    const token = signCitizenToken(citizen);
    res.json({ success: true, message: 'Login successful', token, citizen: await CitizenModel.getById(citizen.id) });
  } catch (error) {
    console.error('Error verifying login:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getMe = async (req, res) => {
  try {
    const citizen = await CitizenModel.getById(req.user.id);
    if (!citizen) {
      return res.status(404).json({ success: false, message: 'Citizen not found' });
    }
    res.json({ success: true, data: citizen });
  } catch (error) {
    console.error('Error in citizen getMe:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
