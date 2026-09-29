import fs from 'fs';
import { ApplicationModel } from '../models/applicationModel.js';
import { SchemeModel } from '../models/schemeModel.js';
import { CitizenModel } from '../models/citizenModel.js';
import { DocumentVerificationModel } from '../models/documentVerificationModel.js';
import { ApplicationVerificationModel } from '../models/applicationVerificationModel.js';
import { evaluateEligibility } from '../utils/eligibilityEngine.js';
import { verifyDocumentSignature } from '../utils/fileSignature.js';
import { verifyDocument } from '../utils/documentVerifier.js';

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
    // Citizen-declared "this file is my Aadhaar card / income proof / etc." tags, one per file in
    // the same order as `files` - sent as a JSON string over multipart form data since a plain
    // FormData field can't carry an array. Falls back to an empty tag per file if the client didn't
    // send one (older clients, or a request made directly against the API).
    let documentTypes = [];
    try {
      documentTypes = req.body.documents_meta ? JSON.parse(req.body.documents_meta) : [];
    } catch {
      documentTypes = [];
    }

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

    const documentPaths = files.map((f) => `uploads/documents/${f.filename}`);
    const applicationId = await ApplicationModel.create({
      citizen_id: req.user.id,
      scheme_id,
      declared_profile: profile,
      eligibility_result: eligibility,
      document_paths: documentPaths,
      document_types: documentTypes
    });

    // OCR cross-check runs after the application row exists (results attach to its id) and never
    // blocks submission on its own - a failed/mismatched check is stored as a signal for the
    // officer's verification checklist, never surfaced back to the citizen here (surfacing exactly
    // what the automated check looks for would just teach a fraudster how to dodge it next time).
    const citizen = await CitizenModel.getById(req.user.id);
    for (let i = 0; i < files.length; i++) {
      try {
        const result = await verifyDocument(files[i].path, documentTypes[i], citizen, profile);
        await DocumentVerificationModel.create(applicationId, documentPaths[i], documentTypes[i], result.checked, result.matched, result.reason);
      } catch (verifyError) {
        console.error('[createApplication] document verification failed:', verifyError.message);
      }
    }

    // Fetched back (rather than assembled from the request) so the receipt shown to the citizen
    // reflects the actual stored row - real submitted_at, real scheme title/department.
    const created = await ApplicationModel.getById(applicationId);
    res.status(201).json({
      success: true,
      message: 'Application submitted',
      data: {
        id: applicationId,
        scheme_title: created.scheme_title,
        scheme_department: created.scheme_department,
        submitted_at: created.submitted_at,
        document_count: files.length,
        document_types: documentTypes
      }
    });
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
  document_paths: JSON.parse(app.document_paths),
  // document_types predates apps created before this column existed, which store '[]' by default
  // via the migration - falls back to an empty array rather than throwing on old rows.
  document_types: app.document_types ? JSON.parse(app.document_types) : []
});

// flag_summary is "rule||severity;;rule||severity" from getFlaggedWithReasons' GROUP_CONCAT, or
// null/undefined when an application was flagged manually by an officer rather than by the fraud
// audit job (no open fraud_flags row to report).
const parseFlagSummary = (flagSummary) => {
  if (!flagSummary) return [];
  return flagSummary.split(';;').map((entry) => {
    const [rule_triggered, severity] = entry.split('||');
    return { rule_triggered, severity };
  });
};

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
    const flagged = await ApplicationModel.getFlaggedWithReasons(req.user.department);
    const data = flagged.map((app) => {
      const { flag_summary, ...rest } = parseApplication(app);
      return { ...rest, flags: parseFlagSummary(flag_summary) };
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error listing flagged applications:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// Both diagnostic panels an officer needs to actually verify an application, rather than just
// eyeball declared fields: the automated OCR cross-check results (3.1) and the officer's own
// previously-saved structured checklist if any (3.2), fetched together so selecting an
// application in the review console is a single round-trip.
export const getVerificationDetails = async (req, res) => {
  try {
    const [documents, checklist] = await Promise.all([
      DocumentVerificationModel.getForApplication(req.params.id),
      ApplicationVerificationModel.getForApplication(req.params.id)
    ]);
    res.json({ success: true, data: { documents, checklist: checklist || null } });
  } catch (error) {
    console.error('Error fetching verification details:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const saveChecklist = async (req, res) => {
  try {
    const { id } = req.params;
    const { identity_confirmed, income_confirmed, documents_authentic, notes } = req.body;

    const application = await ApplicationModel.getById(id);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    await ApplicationVerificationModel.upsert(id, req.user.id, {
      identity_confirmed, income_confirmed, documents_authentic, notes
    });
    res.json({ success: true, message: 'Verification checklist saved' });
  } catch (error) {
    console.error('Error saving verification checklist:', error);
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

    if (status === 'approved') {
      const checklist = await ApplicationVerificationModel.getForApplication(id);
      const complete = checklist && checklist.identity_confirmed && checklist.income_confirmed && checklist.documents_authentic;
      if (!complete) {
        return res.status(400).json({
          success: false,
          message: 'Complete the verification checklist (identity, income, documents) before approving.'
        });
      }

      // A previously fraud-flagged application can't be approved on one officer's say-so alone -
      // this records the first officer's decision but leaves final status as pending_countersign
      // until a second, different officer signs off (see countersignApplication below).
      const everFlagged = await ApplicationModel.hasEverBeenFlagged(id);
      if (everFlagged) {
        await ApplicationModel.setPendingCountersign(id, req.user.id, notes);
        return res.json({
          success: true,
          message: 'Approved pending a second officer\'s countersignature - this application was previously fraud-flagged.'
        });
      }
    }

    await ApplicationModel.updateStatus(id, status, req.user.id, notes);
    res.json({ success: true, message: 'Application updated' });
  } catch (error) {
    console.error('Error reviewing application:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const countersignApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const application = await ApplicationModel.getById(id);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }
    if (application.status !== 'pending_countersign') {
      return res.status(400).json({ success: false, message: 'This application is not awaiting a countersignature' });
    }
    if (application.reviewed_by === req.user.id) {
      return res.status(403).json({ success: false, message: 'You can\'t countersign your own review' });
    }

    await ApplicationModel.countersign(id, req.user.id, status);
    res.json({ success: true, message: 'Countersigned' });
  } catch (error) {
    console.error('Error countersigning application:', error);
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
