import React, { useState, useEffect } from 'react';
import { api, API_ROOT } from '../services/api';
import MapWidget from '../components/MapWidget';
import { ShieldCheck, LogOut, AlertCircle, Eye, RefreshCw, HelpCircle, ShieldAlert, FileCheck } from 'lucide-react';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('grievances'); // 'grievances' | 'applications' | 'flagged'

  // Login Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Grievance data
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedGrievance, setSelectedGrievance] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [statusUpdate, setStatusUpdate] = useState('');

  // Scheme application data (citizen identity verification + fraud review)
  const [applications, setApplications] = useState([]);
  const [flagged, setFlagged] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    if (token) {
      fetchDashboardData();
    }
  }, [token]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await api.post('/auth/login', { username, password });
      if (res.success) {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        setToken(res.token);
        setUser(res.user);
      }
    } catch (err) {
      console.error(err);
      setLoginError(err.message || 'Login failed. Please check credentials.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
    setGrievances([]);
    setApplications([]);
    setFlagged([]);
    setSelectedGrievance(null);
    setSelectedApplication(null);
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const userRes = await api.get('/auth/me', token);
      if (userRes.success) {
        setUser(userRes.data);
      }

      const complaintsRes = await api.get('/grievances');
      if (complaintsRes.success) {
        setGrievances(complaintsRes.data);
      }

      const applicationsRes = await api.get('/applications', token);
      if (applicationsRes.success) {
        setApplications(applicationsRes.data);
      }

      const flaggedRes = await api.get('/applications/flagged', token);
      if (flaggedRes.success) {
        setFlagged(flaggedRes.data);
      }
    } catch (err) {
      console.error(err);
      if (err.message.includes('401') || err.message.includes('token')) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (e) => {
    e.preventDefault();
    if (!selectedGrievance || !statusUpdate) return;

    try {
      const res = await api.patch(`/grievances/${selectedGrievance.id}/status`, {
        status: statusUpdate,
        escalation_level: statusUpdate.includes('Level_1') ? 1 : statusUpdate.includes('Level_2') ? 2 : 0,
        sla_deadline: new Date(Date.now() + 2 * 60 * 1000).toISOString()
      }, token);

      if (res.success) {
        alert('Grievance status updated successfully.');
        setSelectedGrievance(prev => ({ ...prev, status: statusUpdate }));
        fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
      alert('Error updating status: ' + err.message);
    }
  };

  const handleResolve = async (e) => {
    e.preventDefault();
    if (!selectedGrievance || !resolutionNotes.trim()) return;

    try {
      const res = await api.patch(`/grievances/${selectedGrievance.id}/resolve`, {
        resolution_notes: resolutionNotes
      }, token);

      if (res.success) {
        alert('Grievance marked as Resolved.');
        setResolutionNotes('');
        setSelectedGrievance(null);
        fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
      alert('Error resolving grievance: ' + err.message);
    }
  };

  const handleApplicationReview = async (status) => {
    if (!selectedApplication) return;
    try {
      const res = await api.patch(`/applications/${selectedApplication.id}/review`, { status, notes: reviewNotes }, token);
      if (res.success) {
        alert(`Application marked as ${status}.`);
        setReviewNotes('');
        setSelectedApplication(null);
        fetchDashboardData();
      }
    } catch (err) {
      alert('Error updating application: ' + err.message);
    }
  };

  // Helper values for analytics
  const totalCount = grievances.length;
  const resolvedCount = grievances.filter(g => g.status === 'Resolved').length;
  const pendingCount = totalCount - resolvedCount;
  const escalatedCount = grievances.filter(g => g.status.startsWith('Escalated')).length;

  // Department filter logic: some officers only see their department
  const filteredGrievances = grievances.filter(g => {
    if (!user || user.role === 'admin' || user.department === 'All') return true;
    if (user.department === 'Sanitation' && g.category === 'Sanitation') return true;
    if (user.department === 'Water Supply' && g.category === 'Water Supply') return true;
    if (user.department === 'Social Welfare' && (g.category === 'Corruption' || g.category === 'Safety')) return true;
    return false;
  });

  const categoryCounts = filteredGrievances.reduce((acc, g) => {
    acc[g.category] = (acc[g.category] || 0) + 1;
    return acc;
  }, {});

  // Render Login Form if no token
  if (!token) {
    return (
      <div className="login-page-container">
        <div className="login-card glass-panel">
          <div className="login-logo">
            <ShieldCheck size={36} className="logo-icon" />
            <h2 className="gradient-text">Officer Portal</h2>
          </div>
          <p className="login-subtext">Access restricted to local governance bodies and municipal administrators.</p>

          {loginError && <div className="error-banner">{loginError}</div>}

          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. sanitation_officer"
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="form-input"
                required
              />
            </div>

            <button type="submit" className="btn btn-primary login-submit-btn">
              Access Control Console
            </button>
          </form>

          <div className="demo-credentials-box">
            <h5>Demo Credentials:</h5>
            <p>Admin: <code>admin</code> / <code>adminpassword</code></p>
            <p>Sanitation Officer: <code>sanitation_officer</code> / <code>officerpassword</code></p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Dashboard Top Header */}
      <header className="dashboard-header glass-panel">
        <div className="officer-profile">
          <div className="profile-indicator"></div>
          <div>
            <h3>{user?.username}</h3>
            <p>Role: {user?.role.toUpperCase()} | Dept: {user?.department}</p>
          </div>
        </div>

        <div className="header-actions">
          <button onClick={fetchDashboardData} className="btn btn-secondary refresh-btn" title="Refresh Log">
            <RefreshCw size={16} />
          </button>
          <button onClick={handleLogout} className="btn btn-danger logout-btn">
            <LogOut size={16} /> <span>Sign Out</span>
          </button>
        </div>
      </header>

      <div className="dashboard-tabs">
        <button className={activeTab === 'grievances' ? 'active' : ''} onClick={() => setActiveTab('grievances')}>
          Grievances
        </button>
        <button className={activeTab === 'applications' ? 'active' : ''} onClick={() => setActiveTab('applications')}>
          Scheme Applications {applications.length > 0 && <span className="tab-count">{applications.length}</span>}
        </button>
        <button className={activeTab === 'flagged' ? 'active' : ''} onClick={() => setActiveTab('flagged')}>
          <ShieldAlert size={14} /> Flagged for Review {flagged.length > 0 && <span className="tab-count tab-count-alert">{flagged.length}</span>}
        </button>
      </div>

      {activeTab === 'grievances' && (
        <>
          <section className="stats-grid">
            <div className="stat-card glass-panel">
              <span className="card-label">Total Logged</span>
              <h3>{filteredGrievances.length}</h3>
            </div>
            <div className="stat-card glass-panel">
              <span className="card-label">Active SLA cases</span>
              <h3>{filteredGrievances.filter(g => g.status !== 'Resolved').length}</h3>
            </div>
            <div className="stat-card glass-panel escalated-card">
              <span className="card-label">Escalated</span>
              <h3>{filteredGrievances.filter(g => g.status.startsWith('Escalated')).length}</h3>
            </div>
            <div className="stat-card glass-panel resolved-card">
              <span className="card-label">Resolved</span>
              <h3>{filteredGrievances.filter(g => g.status === 'Resolved').length}</h3>
            </div>
          </section>

          <section className="dashboard-map-section grid-2">
            <div className="dashboard-map-card glass-panel">
              <h3>Regional Grievance Distribution Heatmap</h3>
              <div className="admin-map-wrapper">
                <MapWidget grievances={filteredGrievances} />
              </div>
            </div>

            <div className="dashboard-charts-card glass-panel">
              <h3>Complaints Category Distribution</h3>
              <div className="custom-charts-bars">
                {Object.keys(categoryCounts).length === 0 ? (
                  <p className="no-chart-data">No data available.</p>
                ) : (
                  Object.entries(categoryCounts).map(([cat, count]) => {
                    const percentage = Math.round((count / filteredGrievances.length) * 100);
                    return (
                      <div key={cat} className="bar-row">
                        <div className="bar-row-label">
                          <span>{cat}</span>
                          <span>{count} ({percentage}%)</span>
                        </div>
                        <div className="bar-outer">
                          <div className="bar-inner" style={{ width: `${percentage}%` }}></div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </section>

          <section className="complaints-section grid-2">
            <div className="complaints-list-card glass-panel">
              <h3>Active Grievance Logs</h3>

              {loading ? (
                <div className="loading-data">Syncing logs...</div>
              ) : filteredGrievances.length === 0 ? (
                <p className="empty-logs">No logged complaints match your department scope.</p>
              ) : (
                <div className="logs-table-container">
                  <table className="logs-table">
                    <thead>
                      <tr>
                        <th>Tracking ID</th>
                        <th>Subject</th>
                        <th>Category</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredGrievances.map((g) => (
                        <tr key={g.id} className={selectedGrievance?.id === g.id ? 'active-row' : ''}>
                          <td className="tracking-code"><code>{g.tracking_id}</code></td>
                          <td className="subject-text">{g.title}</td>
                          <td>{g.category}</td>
                          <td>
                            <span className={`badge status-${g.status.toLowerCase()}`}>
                              {g.status.replace('Escalated_Level_1', 'L1 Escalated').replace('Escalated_Level_2', 'L2 Escalated')}
                            </span>
                          </td>
                          <td>
                            <button
                              onClick={() => {
                                setSelectedGrievance(g);
                                setStatusUpdate(g.status);
                              }}
                              className="btn btn-secondary view-row-btn"
                            >
                              <Eye size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="complaints-action-card glass-panel">
              <h3>Action Control Console</h3>

              {selectedGrievance ? (
                <div className="action-details">
                  <div className="details-header">
                    <span className="tracking-code-badge">{selectedGrievance.tracking_id}</span>
                    <span className={`badge status-${selectedGrievance.status.toLowerCase()}`}>{selectedGrievance.status}</span>
                  </div>

                  <h4>{selectedGrievance.title}</h4>
                  <p className="details-description">{selectedGrievance.description}</p>

                  {selectedGrievance.attachment_path && (
                    <div className="media-preview">
                      <a
                        href={`${API_ROOT}/${selectedGrievance.attachment_path}`}
                        target="_blank"
                        rel="noreferrer"
                        className="view-media-link"
                      >
                        View Uploaded Evidence ({selectedGrievance.attachment_path.split('.').pop().toUpperCase()})
                      </a>
                    </div>
                  )}

                  {selectedGrievance.status !== 'Resolved' && (
                    <form onSubmit={handleStatusChange} className="status-update-form">
                      <div className="form-group">
                        <label className="form-label">Update Grievance Status</label>
                        <div className="input-group">
                          <select
                            value={statusUpdate}
                            onChange={(e) => setStatusUpdate(e.target.value)}
                            className="form-input"
                          >
                            <option value="Submitted">Submitted</option>
                            <option value="Under Review">Under Review</option>
                            <option value="Escalated_Level_1">Level 1 Escalated</option>
                            <option value="Escalated_Level_2">Level 2 Escalated</option>
                          </select>
                          <button type="submit" className="btn btn-secondary">Apply</button>
                        </div>
                      </div>
                    </form>
                  )}

                  {selectedGrievance.status !== 'Resolved' ? (
                    <form onSubmit={handleResolve} className="resolve-form">
                      <div className="form-group">
                        <label className="form-label">Resolution Comments</label>
                        <textarea
                          value={resolutionNotes}
                          onChange={(e) => setResolutionNotes(e.target.value)}
                          placeholder="Write notes detailing physical fixes or administrative closures..."
                          className="form-input"
                          rows={3}
                          required
                        />
                      </div>
                      <button type="submit" className="btn btn-primary resolve-submit-btn">
                        Resolve and Close Case
                      </button>
                    </form>
                  ) : (
                    <div className="resolution-summary">
                      <h5>Case Resolved &amp; Closed</h5>
                      <p><strong>Notes:</strong> {selectedGrievance.resolution_notes}</p>
                      <p className="resolution-date">Closed on: {new Date(selectedGrievance.resolved_at).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="empty-details">
                  <HelpCircle size={40} />
                  <p>Select a grievance from the log list to inspect evidence, modify statuses, or upload resolution comments.</p>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {(activeTab === 'applications' || activeTab === 'flagged') && (
        <section className="complaints-section grid-2">
          <div className="complaints-list-card glass-panel">
            <h3>{activeTab === 'flagged' ? 'Flagged for Review' : 'Scheme Applications'}</h3>

            {(() => {
              const list = activeTab === 'flagged' ? flagged : applications;
              if (loading) return <div className="loading-data">Syncing records...</div>;
              if (list.length === 0) return <p className="empty-logs">Nothing here for your department scope.</p>;

              return (
                <div className="logs-table-container">
                  <table className="logs-table">
                    <thead>
                      <tr>
                        <th>Scheme</th>
                        <th>Status</th>
                        <th>Submitted</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((a) => (
                        <tr key={a.id} className={selectedApplication?.id === a.id ? 'active-row' : ''}>
                          <td className="subject-text">{a.scheme_title}</td>
                          <td>
                            <span className={`badge status-${a.status}`}>{a.status}</span>
                          </td>
                          <td>{new Date(a.submitted_at).toLocaleDateString()}</td>
                          <td>
                            <button
                              onClick={() => { setSelectedApplication(a); setReviewNotes(''); }}
                              className="btn btn-secondary view-row-btn"
                            >
                              <Eye size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>

          <div className="complaints-action-card glass-panel">
            <h3>Application Review Console</h3>

            {selectedApplication ? (
              <div className="action-details">
                <div className="details-header">
                  <span className="tracking-code-badge">Application #{selectedApplication.id}</span>
                  <span className={`badge status-${selectedApplication.status}`}>{selectedApplication.status}</span>
                </div>

                <h4>{selectedApplication.scheme_title}</h4>
                <p className="details-description">Department: {selectedApplication.scheme_department}</p>

                <div className="declared-profile-box">
                  <h5>Declared Profile</h5>
                  <ul>
                    <li>Age: {selectedApplication.declared_profile.age}</li>
                    <li>Gender: {selectedApplication.declared_profile.gender}</li>
                    <li>Annual Income: ₹{Number(selectedApplication.declared_profile.income).toLocaleString()}</li>
                    <li>Occupation: {selectedApplication.declared_profile.occupation}</li>
                  </ul>
                </div>

                {selectedApplication.document_paths.length > 0 && (
                  <div className="media-preview">
                    <h5>Submitted Documents</h5>
                    {selectedApplication.document_paths.map((docPath, idx) => (
                      <a
                        key={idx}
                        href={`${API_ROOT}/${docPath}`}
                        target="_blank"
                        rel="noreferrer"
                        className="view-media-link"
                      >
                        <FileCheck size={14} /> Document {idx + 1} ({docPath.split('.').pop().toUpperCase()})
                      </a>
                    ))}
                  </div>
                )}

                {selectedApplication.review_notes && (
                  <div className="review-notes-box">
                    <strong>Previous notes:</strong>
                    <p>{selectedApplication.review_notes}</p>
                  </div>
                )}

                <form className="resolve-form" onSubmit={(e) => e.preventDefault()}>
                  <div className="form-group">
                    <label className="form-label">Review Notes</label>
                    <textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Reason for this decision..."
                      className="form-input"
                      rows={3}
                    />
                  </div>
                  <div className="review-action-buttons">
                    <button type="button" className="btn btn-primary" onClick={() => handleApplicationReview('approved')}>
                      Approve
                    </button>
                    <button type="button" className="btn btn-danger" onClick={() => handleApplicationReview('rejected')}>
                      Reject
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => handleApplicationReview('revoked')}>
                      Revoke
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="empty-details">
                <AlertCircle size={40} />
                <p>Select an application to inspect the declared profile, documents and any fraud-flag reasons before deciding.</p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
