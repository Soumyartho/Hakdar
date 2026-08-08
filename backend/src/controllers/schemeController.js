import { SchemeModel } from '../models/schemeModel.js';
import { evaluateEligibility } from '../utils/eligibilityEngine.js';

export const getSchemes = async (req, res) => {
  try {
    const schemes = await SchemeModel.getAll();
    res.json({ success: true, data: schemes });
  } catch (error) {
    console.error('Error fetching schemes:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getSchemeById = async (req, res) => {
  try {
    const scheme = await SchemeModel.getById(req.params.id);
    if (!scheme) {
      return res.status(404).json({ success: false, message: 'Scheme not found' });
    }
    res.json({ success: true, data: scheme });
  } catch (error) {
    console.error('Error fetching scheme by id:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const matchSchemes = async (req, res) => {
  try {
    const profile = req.body; // { age, gender, income, occupation, pregnant_or_lactating, homeless_or_poor_housing }
    const schemes = await SchemeModel.getAll();

    const matchedSchemes = schemes.map(scheme => {
      const eligibility = evaluateEligibility(profile, scheme.rules);
      return {
        ...scheme,
        application_steps: JSON.parse(scheme.application_steps),
        required_documents: JSON.parse(scheme.required_documents),
        rules: JSON.parse(scheme.rules),
        eligibility
      };
    });

    res.json({ success: true, data: matchedSchemes });
  } catch (error) {
    console.error('Error matching schemes:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
