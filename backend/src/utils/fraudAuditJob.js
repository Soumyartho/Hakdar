import { ApplicationModel } from '../models/applicationModel.js';
import { FraudFlagModel } from '../models/fraudFlagModel.js';
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

export const startFraudAuditJob = (checkIntervalMs = 30000) => {
  if (intervalId) return;
  console.log(`Fraud audit job started. Sweeping every ${checkIntervalMs / 1000}s...`);

  intervalId = setInterval(async () => {
    try {
      await runReEligibilitySweep();
      await runDuplicateClaimSweep();
      await runStaleReverificationSweep();
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
