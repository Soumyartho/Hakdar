import { ApplicationModel } from '../models/applicationModel.js';
import { FraudFlagModel } from '../models/fraudFlagModel.js';
import { DocumentVerificationModel } from '../models/documentVerificationModel.js';
import { evaluateEligibility } from './eligibilityEngine.js';

let intervalId = null;

// The same "SLA-enforced accountability" idea this app already applies to grievances
// (escalationJob.js), applied to scheme beneficiaries instead: a routine, unattended sweep that
// catches people who no longer (or never genuinely did) qualify for a scheme they're holding,
// rather than relying on someone manually re-checking every approved application by hand.
const STALE_REVERIFICATION_MS = Number(process.env.STALE_REVERIFICATION_MS) || 180 * 24 * 60 * 60 * 1000;

const flagIfNotAlreadyOpen = async (applicationId, rule, severity, reason) => {
  const existing = await FraudFlagModel.getOpenForApplication(applicationId, rule);
  if (existing.length > 0) return; // already flagged and awaiting officer review - don't spam
  await FraudFlagModel.create(applicationId, rule, severity);
  await ApplicationModel.updateStatus(applicationId, 'flagged', null, reason);
};

const runReEligibilitySweep = async () => {
  const approved = await ApplicationModel.getApproved();
  for (const app of approved) {
    const profile = JSON.parse(app.declared_profile);
    const eligibility = evaluateEligibility(profile, app.scheme_rules);
    if (!eligibility.isEligible) {
      await flagIfNotAlreadyOpen(
        app.id,
        'reeligibility_failed',
        'high',
        `Routine re-check: declared profile no longer meets "${app.scheme_title}" rules — ${eligibility.reasons.join(' ')}`
      );
    }
  }
};

const runDuplicateClaimSweep = async () => {
  const rows = await ApplicationModel.getApprovedGroupedByAadhaar();
  const bySchemeAndIdentity = new Map();
  for (const row of rows) {
    const key = `${row.aadhaar_hash}:${row.scheme_id}`;
    if (!bySchemeAndIdentity.has(key)) bySchemeAndIdentity.set(key, []);
    bySchemeAndIdentity.get(key).push(row);
  }
  for (const claims of bySchemeAndIdentity.values()) {
    if (claims.length <= 1) continue;
    for (const claim of claims) {
      await flagIfNotAlreadyOpen(
        claim.application_id,
        'duplicate_claim',
        'critical',
        `Routine check: the same identity holds ${claims.length} approved applications for "${claim.scheme_title}"`
      );
    }
  }
};

const runStaleReverificationSweep = async () => {
  const approved = await ApplicationModel.getApproved();
  const now = Date.now();
  for (const app of approved) {
    if (!app.reviewed_at) continue;
    if (now - new Date(app.reviewed_at).getTime() > STALE_REVERIFICATION_MS) {
      await flagIfNotAlreadyOpen(
        app.id,
        'stale_reverification',
        'medium',
        `Routine check: approval for "${app.scheme_title}" has not been re-confirmed since ${app.reviewed_at}`
      );
    }
  }
};

// Same shape as runDuplicateClaimSweep, grouped by household instead of Aadhaar identity - catches
// separate family members (separate citizen records, separate Aadhaar numbers, so the identity
// sweep above can't see it) each holding an approved claim on a scheme meant for one grant per
// household (rules.household_scoped - see PMAY-G's seeded rules).
const runHouseholdDuplicateSweep = async () => {
  const rows = await ApplicationModel.getApprovedGroupedByHousehold();
  const byHouseholdAndScheme = new Map();
  for (const row of rows) {
    let rules;
    try {
      rules = JSON.parse(row.scheme_rules);
    } catch {
      continue;
    }
    if (!rules.household_scoped) continue;
    const key = `${row.household_id}:${row.scheme_id}`;
    if (!byHouseholdAndScheme.has(key)) byHouseholdAndScheme.set(key, []);
    byHouseholdAndScheme.get(key).push(row);
  }
  for (const claims of byHouseholdAndScheme.values()) {
    if (claims.length <= 1) continue;
    for (const claim of claims) {
      await flagIfNotAlreadyOpen(
        claim.application_id,
        'household_duplicate_benefit',
        'critical',
        `Routine check: ${claims.length} household members hold approved applications for "${claim.scheme_title}", a scheme meant for one claim per household`
      );
    }
  }
};

// A citizen's declared income shouldn't swing wildly between applications submitted around the
// same time - a genuine income change is possible, but a >1.5x spread is worth an officer's eyes
// rather than trusting whichever declaration happened to get reviewed first.
const INCOME_INCONSISTENCY_RATIO = 1.5;

const runIncomeConsistencySweep = async () => {
  const rows = await ApplicationModel.getIncomeDeclarationsByCitizen();
  const byCitizen = new Map();
  for (const row of rows) {
    let profile;
    try {
      profile = JSON.parse(row.declared_profile);
    } catch {
      continue;
    }
    const income = Number(profile.income);
    if (!income) continue;
    if (!byCitizen.has(row.citizen_id)) byCitizen.set(row.citizen_id, []);
    byCitizen.get(row.citizen_id).push({ applicationId: row.application_id, income });
  }
  for (const declarations of byCitizen.values()) {
    if (declarations.length <= 1) continue;
    const incomes = declarations.map((d) => d.income);
    const min = Math.min(...incomes);
    const max = Math.max(...incomes);
    if (min <= 0 || max / min <= INCOME_INCONSISTENCY_RATIO) continue;
    for (const d of declarations) {
      await flagIfNotAlreadyOpen(
        d.applicationId,
        'income_inconsistency',
        'medium',
        `Routine check: declared income varies from ₹${min.toLocaleString()} to ₹${max.toLocaleString()} across this citizen's applications`
      );
    }
  }
};

// Catches the case where the automated document check (documentVerifier.js, run at submission
// time) explicitly found a mismatch but an officer approved the application anyway - a signal that
// got overridden or missed at review time, surfaced again for a second look.
const runDocumentConsistencySweep = async () => {
  const mismatches = await DocumentVerificationModel.getFailedForApprovedApplications();
  const seen = new Set();
  for (const row of mismatches) {
    if (seen.has(row.application_id)) continue;
    seen.add(row.application_id);
    await flagIfNotAlreadyOpen(
      row.application_id,
      'document_mismatch',
      'high',
      `Routine check: an automated document check failed (${row.claimed_type || 'untagged document'} — ${row.ocr_reason}) but the application was approved anyway`
    );
  }
};

export const startFraudAuditJob = (checkIntervalMs = 30000) => {
  if (intervalId) return;
  console.log(`Fraud audit job started. Sweeping every ${checkIntervalMs / 1000}s...`);

  intervalId = setInterval(async () => {
    try {
      await runReEligibilitySweep();
      await runDuplicateClaimSweep();
      await runStaleReverificationSweep();
      await runHouseholdDuplicateSweep();
      await runIncomeConsistencySweep();
      await runDocumentConsistencySweep();
    } catch (error) {
      console.error('[Fraud Audit] Error running sweep:', error);
    }
  }, checkIntervalMs);
};

export const stopFraudAuditJob = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('Fraud audit job stopped.');
  }
};
