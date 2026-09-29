import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../components/Toast';
import { Home, Users, UserPlus, Check, X, ShieldCheck } from 'lucide-react';
import './Household.css';

export default function Household() {
  const navigate = useNavigate();
  const toast = useToast();
  const [token] = useState(localStorage.getItem('citizen_token') || '');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ household: null, members: [], sentInvites: [], incomingInvite: null });

  const [address, setAddress] = useState('');
  const [creating, setCreating] = useState(false);

  const [invitePhone, setInvitePhone] = useState('');
  const [inviting, setInviting] = useState(false);

  const [responding, setResponding] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate('/account/login');
      return;
    }
    fetchHousehold();
  }, [token]);

  const fetchHousehold = async () => {
    setLoading(true);
    try {
      const res = await api.get('/households/mine', token);
      if (res.success) setData(res.data);
    } catch (err) {
      toast.error('Could not load your household: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await api.post('/households', { address }, token);
      if (res.success) {
        toast.success('Household created.');
        setAddress('');
        fetchHousehold();
      }
    } catch (err) {
      toast.error('Error creating household: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviting(true);
    try {
      const res = await api.post('/households/invite', { phone: invitePhone }, token);
      if (res.success) {
        toast.success('Invite sent.');
        setInvitePhone('');
        fetchHousehold();
      }
    } catch (err) {
      toast.error('Error sending invite: ' + err.message);
    } finally {
      setInviting(false);
    }
  };

  const respondToInvite = async (accept) => {
    if (!data.incomingInvite) return;
    setResponding(true);
    try {
      const res = await api.post(`/households/invites/${data.incomingInvite.id}/respond`, { accept }, token);
      if (res.success) {
        toast.success(accept ? 'You joined the household.' : 'Invite declined.');
        fetchHousehold();
      }
    } catch (err) {
      toast.error('Error responding to invite: ' + err.message);
    } finally {
      setResponding(false);
    }
  };

  if (loading) {
    return <div className="household-container"><div className="loading-state">Loading household...</div></div>;
  }

  return (
    <div className="household-container">
      <h1 className="page-header"><span className="gradient-text">Household</span></h1>
      <p className="page-subtext">
        Link your account with family members so shared details auto-fill on scheme applications, and so
        household-scoped schemes (like housing assistance meant for one home per family) can tell your family
        apart from an unrelated duplicate claim.
      </p>

      {data.incomingInvite && (
        <div className="household-invite-banner glass-panel">
          <ShieldCheck size={22} />
          <div>
            <h4>You've been invited to join a household</h4>
            <p>Accepting will link your account to theirs - you'll show up as a member and share their registered address.</p>
          </div>
          <div className="household-invite-actions">
            <button className="btn btn-primary btn-sm" disabled={responding} onClick={() => respondToInvite(true)}>
              <Check size={14} /> Accept
            </button>
            <button className="btn btn-secondary btn-sm" disabled={responding} onClick={() => respondToInvite(false)}>
              <X size={14} /> Decline
            </button>
          </div>
        </div>
      )}

      {!data.household ? (
        <div className="household-empty glass-panel">
          <Home size={40} />
          <h4>You're not part of a household yet.</h4>
          <p>Create one to start linking family members.</p>
          <form onSubmit={handleCreate} className="household-create-form">
            <div className="form-group">
              <label className="form-label">Household Address (optional)</label>
              <input
                className="form-input"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 12 Test Lane, Salt Lake"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={creating}>
              {creating ? 'Creating...' : 'Create Household'}
            </button>
          </form>
        </div>
      ) : (
        <div className="household-panels">
          <div className="household-card glass-panel">
            <h3><Home size={18} /> {data.household.address || 'Household'}</h3>
            <p className="household-created-note">
              Created {new Date(data.household.created_at).toLocaleDateString()}
            </p>

            <h4 className="household-section-title"><Users size={14} /> Members ({data.members.length})</h4>
            <ul className="household-members-list">
              {data.members.map((m) => (
                <li key={m.id}>
                  <span className="household-member-name">{m.full_name}</span>
                  <span className="household-member-meta">Aadhaar ····{m.aadhaar_last4}</span>
                </li>
              ))}
            </ul>

            {data.sentInvites.length > 0 && (
              <>
                <h4 className="household-section-title">Pending Invites</h4>
                <ul className="household-members-list">
                  {data.sentInvites.map((inv) => (
                    <li key={inv.id}>
                      <span className="household-member-name">{inv.invited_full_name}</span>
                      <span className="household-pending-badge">Awaiting response</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className="household-card glass-panel">
            <h3><UserPlus size={18} /> Invite a Family Member</h3>
            <p className="household-created-note">
              They must already have a Hakdar citizen account under their own phone number and Aadhaar.
            </p>
            <form onSubmit={handleInvite} className="household-invite-form">
              <div className="form-group">
                <label className="form-label">Their Mobile Number</label>
                <input
                  className="form-input"
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={inviting}>
                {inviting ? 'Sending...' : 'Send Invite'}
              </button>
            </form>
          </div>
        </div>
      )}

      <p className="household-back-link"><Link to="/account/applications" className="gradient-text">← Back to My Applications</Link></p>
    </div>
  );
}
