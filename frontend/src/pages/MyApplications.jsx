import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { FileText, CheckCircle, XCircle, AlertTriangle, Clock, LogOut, Users } from 'lucide-react';
import { useToast } from '../components/Toast';
import './MyApplications.css';

const STATUS_META = {
  submitted: { label: 'Under Review', icon: Clock, className: 'status-pending' },
  approved: { label: 'Approved', icon: CheckCircle, className: 'status-approved' },
  rejected: { label: 'Rejected', icon: XCircle, className: 'status-rejected' },
  flagged: { label: 'Flagged for Re-verification', icon: AlertTriangle, className: 'status-flagged' },
  revoked: { label: 'Revoked', icon: XCircle, className: 'status-rejected' },
  pending_countersign: { label: 'Approved - Awaiting Second Sign-off', icon: Clock, className: 'status-pending' }
};

// Derived entirely from status/submitted_at/reviewed_at/review_notes - no dedicated timeline data
// exists server-side. resetForAppeal() (applicationModel.js) prepends "[APPEAL]" to review_notes
// and resets status back to 'submitted', which is the only signal available that a re-review
// cycle is happening rather than a first-time review.
const buildTimelineSteps = (app) => {
  const wasAppealed = typeof app.review_notes === 'string' && app.review_notes.includes('[APPEAL]');
  const isPending = app.status === 'submitted';
  const meta = STATUS_META[app.status] || STATUS_META.submitted;

  const steps = [
    { key: 'submitted', label: 'Submitted', state: 'done', date: app.submitted_at, icon: FileText }
  ];

  if (wasAppealed) {
    steps.push({ key: 'appealed', label: 'Appeal Submitted', state: 'done', date: null, icon: AlertTriangle });
  }

  steps.push({
    key: 'review',
    label: wasAppealed ? 'Under Re-review' : 'Under Review',
    state: isPending ? 'active' : 'done',
    date: null,
    icon: Clock
  });

  steps.push({
    key: 'decision',
    label: isPending ? 'Decision Pending' : meta.label,
    state: isPending ? 'upcoming' : 'done',
    date: isPending ? null : app.reviewed_at,
    icon: isPending ? Clock : meta.icon,
    tone: isPending ? '' : meta.className
  });

  return steps;
};

function ApplicationTimeline({ app }) {
  const steps = buildTimelineSteps(app);
  return (
    <div className="app-timeline">
      {steps.map((step, idx) => {
        const Icon = step.icon;
        return (
          <React.Fragment key={step.key}>
            <div className={`app-timeline-step app-timeline-${step.state} ${step.tone || ''}`}>
              <span className="app-timeline-dot"><Icon size={13} /></span>
              <span className="app-timeline-label">{step.label}</span>
              {step.date && <span className="app-timeline-date">{new Date(step.date).toLocaleDateString()}</span>}
            </div>
            {idx < steps.length - 1 && <span className={`app-timeline-connector ${step.state === 'done' ? 'done' : ''}`} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function MyApplications() {
  const navigate = useNavigate();
  const toast = useToast();
  const [token] = useState(localStorage.getItem('citizen_token') || '');
  const [citizen] = useState(JSON.parse(localStorage.getItem('citizen') || 'null'));
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [appealTarget, setAppealTarget] = useState(null);
  const [appealNotes, setAppealNotes] = useState('');

  useEffect(() => {
    if (!token) {
      navigate('/account/login');
      return;
    }
    fetchApplications();
  }, [token]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/applications/mine', token);
      if (res.success) setApplications(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('citizen_token');
    localStorage.removeItem('citizen');
    navigate('/');
  };

  const submitAppeal = async (e) => {
    e.preventDefault();
    if (!appealTarget || !appealNotes.trim()) return;
    try {
      const res = await api.post(`/applications/${appealTarget.id}/appeal`, { appeal_notes: appealNotes }, token);
      if (res.success) {
        toast.success('Appeal submitted. An officer will re-review your application.');
        setAppealTarget(null);
        setAppealNotes('');
        fetchApplications();
      }
    } catch (err) {
      toast.error('Error submitting appeal: ' + err.message);
    }
  };

  return (
    <div className="my-applications-container">
      <div className="my-applications-header">
        <div>
          <h1 className="page-header"><span className="gradient-text">My Scheme Applications</span></h1>
          <p className="page-subtext">
            {citizen ? `Welcome, ${citizen.full_name}.` : ''} Track the status of every scheme you've applied to.
          </p>
        </div>
        <div className="my-applications-header-actions">
          <Link to="/account/household" className="btn btn-secondary">
            <Users size={16} /> <span>Household</span>
          </Link>
          <button className="btn btn-secondary" onClick={handleLogout}>
            <LogOut size={16} /> <span>Sign Out</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Loading your applications...</div>
      ) : applications.length === 0 ? (
        <div className="empty-state glass-panel">
          <FileText size={48} />
          <h4>No applications yet.</h4>
          <p>
            <Link to="/schemes" className="gradient-text">Check your eligible schemes</Link> and apply directly
            from a matching scheme's card.
          </p>
        </div>
      ) : (
        <div className="applications-list">
          {applications.map((app) => {
            const meta = STATUS_META[app.status] || STATUS_META.submitted;
            const Icon = meta.icon;
            return (
              <div key={app.id} className={`application-card glass-panel ${meta.className}`}>
                <div className="application-card-header">
                  <div>
                    <span className="scheme-badge">{app.scheme_department}</span>
                    <h3>{app.scheme_title}</h3>
                  </div>
                  <span className={`status-tag ${meta.className}`}>
                    <Icon size={14} /> {meta.label}
                  </span>
                </div>

                <p className="application-meta">
                  Applied on {new Date(app.submitted_at).toLocaleDateString()} · {app.document_paths.length} document(s) submitted
                </p>

                <ApplicationTimeline app={app} />

                {app.review_notes && (
                  <div className="review-notes-box">
                    <strong>Officer notes:</strong>
                    <p>{app.review_notes}</p>
                  </div>
                )}

                {(app.status === 'flagged' || app.status === 'rejected') && (
                  appealTarget?.id === app.id ? (
                    <form onSubmit={submitAppeal} className="appeal-form">
                      <textarea
                        className="form-input"
                        rows={3}
                        placeholder="Explain why this decision should be reconsidered..."
                        value={appealNotes}
                        onChange={(e) => setAppealNotes(e.target.value)}
                        required
                      />
                      <div className="appeal-form-actions">
                        <button type="submit" className="btn btn-primary btn-sm">Submit Appeal</button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAppealTarget(null)}>Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <button className="btn btn-secondary btn-sm" onClick={() => setAppealTarget(app)}>
                      Submit an Appeal
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
