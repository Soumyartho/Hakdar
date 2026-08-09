import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, API_ROOT } from '../services/api';
import { Search, Calendar, FileText, CheckCircle, ShieldAlert, Clock, AlertTriangle, Play } from 'lucide-react';
import './TrackGrievance.css';

export default function TrackGrievance() {
  const [searchParams] = useSearchParams();
  const [trackingId, setTrackingId] = useState('');
  const [grievance, setGrievance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [timeLeft, setTimeLeft] = useState('');

  // Auto-search if ID is in URL query parameters (e.g. ?id=HAK-2026-X792)
  useEffect(() => {
    const idParam = searchParams.get('id');
    if (idParam) {
      setTrackingId(idParam);
      handleSearch(null, idParam);
    }
  }, [searchParams]);

  // SLA Timer Countdown effect
  useEffect(() => {
    if (!grievance || grievance.status === 'Resolved' || !grievance.sla_deadline) {
      setTimeLeft('');
      return;
    }

    const timer = setInterval(() => {
      const deadline = new Date(grievance.sla_deadline).getTime();
      const now = new Date().getTime();
      const difference = deadline - now;

      if (difference <= 0) {
        setTimeLeft('Overdue - Escalation Triggered');
        clearInterval(timer);
        // Silently reload grievance data to fetch new escalated status
        reloadGrievance();
      } else {
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes}m ${seconds}s remaining`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [grievance]);

  const reloadGrievance = async () => {
    try {
      const res = await api.get(`/grievances/${grievance.tracking_id}`);
      if (res.success) {
        setGrievance(res.data);
      }
    } catch (err) {
      console.error('Silently failed to reload:', err);
    }
  };

  const handleSearch = async (e, customId = null) => {
    if (e) e.preventDefault();
    const idToSearch = customId || trackingId;
    if (!idToSearch.trim()) return;

    setLoading(true);
    setErrorMsg('');
    setGrievance(null);

    try {
      const res = await api.get(`/grievances/${idToSearch}`);
      if (res.success) {
        setGrievance(res.data);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Grievance not found. Please verify the ID.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to get active step count based on status
  const getActiveStep = (status) => {
    switch (status) {
      case 'Submitted': return 1;
      case 'Under Review': return 2;
      case 'Escalated_Level_1': return 3;
      case 'Escalated_Level_2': return 4;
      case 'Resolved': return 5;
      default: return 1;
    }
  };

  const activeStep = grievance ? getActiveStep(grievance.status) : 1;

  return (
    <div className="track-page-container">
      <h1 className="page-header"><span className="gradient-text">Track Grievance Status</span></h1>
      <p className="page-subtext">Enter your 12-character unique tracking code to view the live timeline and resolution records.</p>

      {/* Search Bar */}
      <form onSubmit={(e) => handleSearch(e)} className="search-form glass-panel">
        <input 
          type="text" 
          value={trackingId}
          onChange={(e) => setTrackingId(e.target.value)}
          placeholder="Enter Tracking ID (e.g. HAK-2026-X11)"
          className="form-input search-input"
          required
        />
        <button type="submit" className="btn btn-primary search-btn" disabled={loading}>
          <Search size={18} /> <span>{loading ? 'Searching...' : 'Track'}</span>
        </button>
      </form>

      {errorMsg && (
        <div className="error-banner track-error">
          <ShieldAlert size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {grievance && (
        <div className="grievance-details-layout grid-2">
          {/* Left panel: Info & Media */}
          <div className="grievance-info-panel glass-panel">
            <div className="info-header">
              <span className="badge">{grievance.category}</span>
              <span className="tracking-code-badge">{grievance.tracking_id}</span>
            </div>
            
            <h2>{grievance.title}</h2>
            <p className="info-description">{grievance.description}</p>
            
            <div className="info-meta">
              <div className="meta-item">
                <Calendar size={16} />
                <span>Filed: {new Date(grievance.created_at).toLocaleString()}</span>
              </div>
              
              {grievance.status !== 'Resolved' && grievance.sla_deadline && (
                <div className="meta-item timer-item">
                  <Clock size={16} />
                  <span>SLA Timer: <strong className="timer-countdown">{timeLeft || 'Computing...'}</strong></span>
                </div>
              )}
            </div>

            {grievance.attachment_path && (
              <div className="attachment-preview-box">
                <h4>Media Evidence Attached</h4>
                {grievance.attachment_path.endsWith('.mp4') || grievance.attachment_path.endsWith('.mov') ? (
                  <video 
                    src={`${API_ROOT}/${grievance.attachment_path}`} 
                    controls 
                    className="attachment-media"
                  />
                ) : (
                  <img 
                    src={`${API_ROOT}/${grievance.attachment_path}`} 
                    alt="Evidence file" 
                    className="attachment-media" 
                  />
                )}
              </div>
            )}
          </div>

          {/* Right panel: SLA Timeline */}
          <div className="grievance-timeline-panel glass-panel">
            <h3>SLA Tracking Timeline</h3>
            
            <div className="timeline">
              {/* Step 1 */}
              <div className={`timeline-step ${activeStep >= 1 ? 'completed' : ''}`}>
                <div className="timeline-node">1</div>
                <div className="timeline-content">
                  <h4>Grievance Submitted</h4>
                  <p>Complaint registered anonymously. System has generated GPS markers and SLA deadlines.</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className={`timeline-step ${activeStep >= 2 ? 'completed' : ''}`}>
                <div className="timeline-node">2</div>
                <div className="timeline-content">
                  <h4>Under Review</h4>
                  <p>Assigned to the local ward / sanitation officer for physical inspection and action scheduling.</p>
                </div>
              </div>

              {/* Step 3 */}
              <div className={`timeline-step ${activeStep >= 3 ? 'completed' : ''}`}>
                <div className="timeline-node">3</div>
                <div className="timeline-content">
                  <h4>Escalated to Level 1</h4>
                  <p>SLA exceeded. Grievance auto-escalated to Sub-Divisional Officer (SDO) for direct review.</p>
                </div>
              </div>

              {/* Step 4 */}
              <div className={`timeline-step ${activeStep >= 4 ? 'completed' : ''}`}>
                <div className="timeline-node">4</div>
                <div className="timeline-content">
                  <h4>Escalated to Level 2</h4>
                  <p>SLA exceeded at Level 1. Grievance escalated to District Head / Chief Commissioner.</p>
                </div>
              </div>

              {/* Step 5 */}
              <div className={`timeline-step ${activeStep === 5 ? 'resolved' : ''}`}>
                <div className="timeline-node">✓</div>
                <div className="timeline-content">
                  <h4>Resolved</h4>
                  {grievance.status === 'Resolved' ? (
                    <div className="resolution-details">
                      <p className="resolution-date">Resolved on: {new Date(grievance.resolved_at).toLocaleString()}</p>
                      <div className="resolution-notes-box">
                        <strong>Official Resolution Notes:</strong>
                        <p>{grievance.resolution_notes}</p>
                      </div>
                    </div>
                  ) : (
                    <p>Municipal team reports completion and uploads resolution log file.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
