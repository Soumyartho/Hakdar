import fs from 'fs';
import { ApplicationModel } from '../models/applicationModel.js';
import { SchemeModel } from '../models/schemeModel.js';
import { evaluateEligibility } from '../utils/eligibilityEngine.js';
import { verifyDocumentSignature } from '../utils/fileSignature.js';

const cleanupFiles = (files = []) => {
  for (const file of files) {
    fs.unlink(file.path, () => {});
  }
};

// A citizen may only ever apply against their own currently-declared eligibility - the server
// re-runs the same evaluateEligibility() the Schemes.jsx UI already used to show them the match,
// rather than trusting whatever eligibility verdict the client sends. This is the "genuine
// verification before a scheme is granted" the identity/fraud feature set exists for.
export const createApplication = async (req, res) => {
  const files = req.files || [];
  try {
    const { scheme_id } = req.body;
    const profile = {
      age: req.body.age,
      gender: req.body.gender,
      income: req.body.income,
      occupation: req.body.occupation,
      pregnant_or_lactating: req.body.pregnant_or_lactating,
      homeless_or_poor_housing: req.body.homeless_or_poor_housing
    };

    const scheme = await SchemeModel.getById(scheme_id);
    if (!scheme) {
      cleanupFiles(files);
      return res.status(404).json({ success: false, message: 'Scheme not found' });
    }

    const eligibility = evaluateEligibility(profile, scheme.rules);
    if (!eligibility.isEligible) {
      cleanupFiles(files);
      return res.status(400).json({ success: false, message: 'Declared profile does not meet this scheme\'s eligibility rules', eligibility });
    }

    for (const file of files) {
      if (!verifyDocumentSignature(file.path)) {
        cleanupFiles(files);
        return res.status(400).json({ success: false, message: `${file.originalname} is not a genuine PDF/JPG/PNG file` });
      }
    }

    const applicationId = await ApplicationModel.create({
      citizen_id: req.user.id,
      scheme_id,
      declared_profile: profile,
      eligibility_result: eligibility,
      document_paths: files.map((f) => `uploads/documents/${f.filename}`)
    });

    res.status(201).json({ success: true, message: 'Application submitted', data: { id: applicationId } });
  } catch (error) {
    cleanupFiles(files);
    console.error('Error creating application:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

const parseApplication = (app) => ({
  ...app,
  declared_profile: JSON.parse(app.declared_profile),
  eligibility_result: JSON.parse(app.eligibility_result),
  document_paths: JSON.parse(app.document_paths)
});

export const listMine = async (req, res) => {
  try {
    const applications = await ApplicationModel.getByCitizenId(req.user.id);
    res.json({ success: true, data: applications.map(parseApplication) });
  } catch (error) {
    console.error('Error listing citizen applications:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const listForOfficer = async (req, res) => {
  try {
    const applications = await ApplicationModel.getForDepartment(req.user.department);
    res.json({ success: true, data: applications.map(parseApplication) });
  } catch (error) {
    console.error('Error listing applications for officer:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const listFlagged = async (req, res) => {
  try {
    const flagged = await ApplicationModel.getFlagged(req.user.department);
    res.json({ success: true, data: flagged.map(parseApplication) });
  } catch (error) {
    console.error('Error listing flagged applications:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const reviewApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!['approved', 'rejected', 'flagged', 'revoked'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const application = await ApplicationModel.getById(id);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    await ApplicationModel.updateStatus(id, status, req.user.id, notes);
    res.json({ success: true, message: 'Application updated' });
  } catch (error) {
    console.error('Error reviewing application:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const appealApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { appeal_notes } = req.body;
    if (!appeal_notes) {
      return res.status(400).json({ success: false, message: 'Appeal notes are required' });
    }

    const application = await ApplicationModel.getById(id);
    if (!application || application.citizen_id !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }
    if (!['flagged', 'rejected'].includes(application.status)) {
      return res.status(400).json({ success: false, message: 'Only flagged or rejected applications can be appealed' });
    }

    await ApplicationModel.resetForAppeal(id, `[APPEAL] ${appeal_notes}`);
    res.json({ success: true, message: 'Appeal submitted for review' });
  } catch (error) {
    console.error('Error submitting appeal:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
