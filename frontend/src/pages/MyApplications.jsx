import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { FileText, CheckCircle, XCircle, AlertTriangle, Clock, LogOut } from 'lucide-react';
import './MyApplications.css';

const STATUS_META = {
  submitted: { label: 'Under Review', icon: Clock, className: 'status-pending' },
  approved: { label: 'Approved', icon: CheckCircle, className: 'status-approved' },
  rejected: { label: 'Rejected', icon: XCircle, className: 'status-rejected' },
  flagged: { label: 'Flagged for Re-verification', icon: AlertTriangle, className: 'status-flagged' },
  revoked: { label: 'Revoked', icon: XCircle, className: 'status-rejected' }
};

export default function MyApplications() {
  const navigate = useNavigate();
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
        alert('Appeal submitted. An officer will re-review your application.');
        setAppealTarget(null);
        setAppealNotes('');
        fetchApplications();
      }
    } catch (err) {
      alert('Error submitting appeal: ' + err.message);
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
        <button className="btn btn-secondary" onClick={handleLogout}>
          <LogOut size={16} /> <span>Sign Out</span>
        </button>
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
