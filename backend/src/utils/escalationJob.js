import { GrievanceModel } from '../models/grievanceModel.js';

let intervalId = null;

export const startEscalationJob = (checkIntervalMs = 15000) => {
  if (intervalId) return;

  console.log(`Auto-escalation job started. Checking every ${checkIntervalMs / 1000}s...`);

  intervalId = setInterval(async () => {
    try {
      const pendingGrievances = await GrievanceModel.getPendingEscalation();

      for (const g of pendingGrievances) {
        let newStatus = g.status;
        let newEscalationLevel = g.escalation_level;
        let nextDeadline = g.sla_deadline;

        if (g.status === 'Submitted' || g.status === 'Under Review') {
          newStatus = 'Escalated_Level_1';
          newEscalationLevel = 1;
          // Set next deadline for 2 minutes from now for demo purposes
          nextDeadline = new Date(Date.now() + 2 * 60 * 1000).toISOString();
          console.log(`[Escalation Engine] Grievance ${g.tracking_id} escalated to Level 1 (SDE/Sub-Divisional).`);
        } else if (g.status === 'Escalated_Level_1') {
          newStatus = 'Escalated_Level_2';
          newEscalationLevel = 2;
          nextDeadline = null; // Max level reached
          console.log(`[Escalation Engine] Grievance ${g.tracking_id} escalated to Level 2 (District Head).`);
        }

        if (newStatus !== g.status) {
          await GrievanceModel.updateStatus(g.id, newStatus, newEscalationLevel, nextDeadline);
        }
      }
    } catch (error) {
      console.error('[Escalation Engine] Error running job:', error);
    }
  }, checkIntervalMs);
};

export const stopEscalationJob = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('Auto-escalation job stopped.');
  }
};
