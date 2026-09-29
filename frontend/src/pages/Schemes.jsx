import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Check, AlertCircle, FileText, ChevronDown, ChevronUp, Link as LinkIcon, Info, Send, Upload, Printer, ClipboardList } from 'lucide-react';
import { useToast } from '../components/Toast';
import './Schemes.jsx.css';

export default function Schemes() {
  const toast = useToast();
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({
    age: '',
    gender: 'any',
    income: '',
    occupation: 'any',
    pregnant_or_lactating: false,
    homeless_or_poor_housing: false
  });
  const [hasSearched, setHasSearched] = useState(false);
  const [expandedScheme, setExpandedScheme] = useState(null);

  // "Apply" flow - a verified citizen session is required (see CitizenAuth.jsx), since applying
  // creates a real, identity-linked record an officer will review, unlike the anonymous match check.
  const citizenToken = localStorage.getItem('citizen_token');
  const [applyingSchemeId, setApplyingSchemeId] = useState(null);
  const [applyFiles, setApplyFiles] = useState([]);
  const [applyFileTypes, setApplyFileTypes] = useState([]);
  const [applyState, setApplyState] = useState({ loading: false, error: '', success: false });
  const [applyReceipt, setApplyReceipt] = useState(null);

  // Fetch initial list of all schemes on mount
  useEffect(() => {
    fetchInitialSchemes();
  }, []);

  const fetchInitialSchemes = async () => {
    setLoading(true);
    try {
      const res = await api.get('/schemes');
      if (res.success) {
        // Map data to parse rules and doc formats
        const mapped = res.data.map(s => ({
          ...s,
          application_steps: JSON.parse(s.application_steps),
          required_documents: JSON.parse(s.required_documents),
          rules: JSON.parse(s.rules),
          eligibility: null // No matching ran yet
        }));
        setSchemes(mapped);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/schemes/match', {
        ...profile,
        age: profile.age ? parseInt(profile.age) : undefined,
        income: profile.income ? parseFloat(profile.income) : undefined
      });
      if (res.success) {
        setSchemes(res.data);
        setHasSearched(true);
      }
    } catch (err) {
      console.error(err);
      toast.error('Error searching: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setProfile({
      age: '',
      gender: 'any',
      income: '',
      occupation: 'any',
      pregnant_or_lactating: false,
      homeless_or_poor_housing: false
    });
    setHasSearched(false);
    fetchInitialSchemes();
  };

  const toggleExpand = (id) => {
    setExpandedScheme(expandedScheme === id ? null : id);
  };

  // The backend's rejection reason already states both the limit and the declared income as text
  // (see eligibilityEngine.js) - this computes the actual gap between them so a citizen doesn't
  // have to do the subtraction themselves. Only meaningful for the income rule specifically since
  // it's the one figure citizens most often ask "how far off was I?" about.
  const getIncomeMargin = (scheme) => {
    const cap = scheme.rules?.max_income;
    const declared = Number(profile.income);
    if (!cap || !declared || declared <= cap) return null;
    return declared - cap;
  };

  const openApplyForm = (schemeId) => {
    setApplyingSchemeId(schemeId);
    setApplyFiles([]);
    setApplyFileTypes([]);
    setApplyState({ loading: false, error: '', success: false });
    setApplyReceipt(null);
  };

  const handleApplyFilesChange = (e) => {
    const files = Array.from(e.target.files);
    setApplyFiles(files);
    // Keep any type already picked for a file still present; default new ones to unset so the
    // citizen has to actively choose rather than silently leaving a document untagged.
    setApplyFileTypes((prev) => files.map((_, i) => prev[i] || ''));
  };

  const setFileType = (index, value) => {
    setApplyFileTypes((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleApplySubmit = async (e, scheme) => {
    e.preventDefault();
    setApplyState({ loading: true, error: '', success: false });
    try {
      const formData = new FormData();
      formData.append('scheme_id', scheme.id);
      formData.append('age', profile.age);
      formData.append('gender', profile.gender);
      formData.append('income', profile.income);
      formData.append('occupation', profile.occupation);
      formData.append('pregnant_or_lactating', profile.pregnant_or_lactating);
      formData.append('homeless_or_poor_housing', profile.homeless_or_poor_housing);
      formData.append('documents_meta', JSON.stringify(applyFileTypes));
      applyFiles.forEach((file) => formData.append('documents', file));

      const res = await api.post('/applications', formData, citizenToken, true);
      if (res.success) {
        setApplyState({ loading: false, error: '', success: true });
        setApplyReceipt(res.data);
      }
    } catch (err) {
      setApplyState({ loading: false, error: err.message || 'Failed to submit application', success: false });
    }
  };

  return (
    <div className="schemes-page-container">
      <h1 className="page-header"><span className="gradient-text">Welfare Scheme Eligibility Checker</span></h1>
      <p className="page-subtext">Fill in your profile credentials below to instantly match against available national and state schemes.</p>

      <div className="schemes-grid">
        {/* Profile Inputs panel */}
        <div className="profile-form-container glass-panel">
          <h3>Your Profile Parameters</h3>
          <form onSubmit={handleSearch} className="profile-form">
            <div className="form-group">
              <label className="form-label">Age (in years)</label>
              <input 
                type="number" 
                name="age" 
                value={profile.age} 
                onChange={handleInputChange} 
                placeholder="Enter age (e.g. 25)"
                className="form-input"
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select name="gender" value={profile.gender} onChange={handleInputChange} className="form-input">
                <option value="any">Any / Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Annual Household Income (₹)</label>
              <input 
                type="number" 
                name="income" 
                value={profile.income} 
                onChange={handleInputChange} 
                placeholder="Enter annual income"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Primary Occupation</label>
              <select name="occupation" value={profile.occupation} onChange={handleInputChange} className="form-input">
                <option value="any">Any / Select</option>
                <option value="farmer">Farmer (Agriculture)</option>
                <option value="informal">Informal / Laborer</option>
                <option value="other">Other / Corporate</option>
              </select>
            </div>

            <div className="form-checkboxes">
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  name="pregnant_or_lactating" 
                  checked={profile.pregnant_or_lactating} 
                  onChange={handleInputChange}
                />
                <span>Pregnant / Lactating Mother?</span>
              </label>

              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  name="homeless_or_poor_housing" 
                  checked={profile.homeless_or_poor_housing} 
                  onChange={handleInputChange}
                />
                <span>Homeless / In Poor Housing (Kutcha)?</span>
              </label>
            </div>

            <div className="form-buttons">
              <button type="submit" className="btn btn-primary btn-block">Find Matching Schemes</button>
              {hasSearched && (
                <button type="button" onClick={handleReset} className="btn btn-secondary btn-block">Clear Filter</button>
              )}
            </div>
          </form>
        </div>

        {/* Schemes Results panel */}
        <div className="results-container">
          {loading ? (
            <div className="loading-state">Matching database... Please wait.</div>
          ) : schemes.length === 0 ? (
            <div className="empty-state glass-panel">
              <Info size={48} />
              <h4>No schemes found matching the criteria.</h4>
              <p>Try lowering input parameters or check back later.</p>
            </div>
          ) : (
            <div className="schemes-list">
              {schemes.map((scheme) => {
                const isMatch = scheme.eligibility ? scheme.eligibility.isEligible : null;
                const isExpanded = expandedScheme === scheme.id;

                return (
                  <div 
                    key={scheme.id} 
                    className={`scheme-card glass-panel ${
                      isMatch === true ? 'eligible' : isMatch === false ? 'ineligible' : ''
                    }`}
                  >
                    <div className="scheme-card-header" onClick={() => toggleExpand(scheme.id)}>
                      <div className="scheme-title-block">
                        <div className="scheme-badge">{scheme.department}</div>
                        <h3>{scheme.title}</h3>
                      </div>
                      
                      <div className="scheme-header-right">
                        {isMatch === true && (
                          <span className="match-tag tag-eligible">
                            <Check size={14} /> Eligible
                          </span>
                        )}
                        {isMatch === false && (
                          <span className="match-tag tag-ineligible">
                            <AlertCircle size={14} /> Ineligible
                          </span>
                        )}
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>

                    <div className="scheme-card-body">
                      <p className="scheme-description">{scheme.description}</p>
                      
                      {isMatch === false && scheme.eligibility.reasons && (
                        <div className="rejection-box">
                          <strong>Why you do not qualify:</strong>
                          <ul>
                            {scheme.eligibility.reasons.map((r, i) => (
                              <li key={i}>{r}</li>
                            ))}
                          </ul>
                          {getIncomeMargin(scheme) != null && (
                            <p className="income-margin-note">
                              You're <strong>₹{getIncomeMargin(scheme).toLocaleString()}</strong> over the income limit for this scheme.
                            </p>
                          )}
                        </div>
                      )}

                      {isMatch === true && (
                        <div className="apply-section">
                          {!citizenToken ? (
                            <Link to="/account/login" className="btn btn-primary btn-sm">
                              <Send size={14} /> Log In to Apply
                            </Link>
                          ) : applyingSchemeId !== scheme.id ? (
                            <button className="btn btn-primary btn-sm" onClick={() => openApplyForm(scheme.id)}>
                              <Send size={14} /> Apply for This Scheme
                            </button>
                          ) : applyState.success && applyReceipt ? (
                            <div className="apply-receipt">
                              <div className="apply-receipt-header">
                                <Check size={18} /> Application Submitted
                              </div>
                              <dl className="apply-receipt-grid">
                                <dt>Reference</dt><dd>Application #{applyReceipt.id}</dd>
                                <dt>Scheme</dt><dd>{applyReceipt.scheme_title}</dd>
                                <dt>Department</dt><dd>{applyReceipt.scheme_department}</dd>
                                <dt>Submitted</dt><dd>{new Date(applyReceipt.submitted_at).toLocaleString()}</dd>
                                <dt>Documents</dt>
                                <dd>
                                  {applyReceipt.document_count === 0 ? 'None attached' : (
                                    <ul className="apply-receipt-doclist">
                                      {Array.from({ length: applyReceipt.document_count }).map((_, i) => (
                                        <li key={i}>{applyReceipt.document_types[i] || 'Untagged document'}</li>
                                      ))}
                                    </ul>
                                  )}
                                </dd>
                              </dl>
                              <p className="apply-receipt-note">Keep this reference number - you'll need it if you contact an officer about this application.</p>
                              <div className="apply-form-actions">
                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => window.print()}>
                                  <Printer size={14} /> Print / Save as PDF
                                </button>
                                <Link to="/account/applications" className="btn btn-primary btn-sm">
                                  View in My Applications
                                </Link>
                              </div>
                            </div>
                          ) : (
                            <form className="apply-form" onSubmit={(e) => handleApplySubmit(e, scheme)}>
                              <div className="required-docs-checklist">
                                <p className="required-docs-title"><ClipboardList size={14} /> You'll typically need:</p>
                                <ul>
                                  {scheme.required_documents.map((doc, idx) => (
                                    <li key={idx}>{doc}</li>
                                  ))}
                                </ul>
                              </div>

                              <label className="form-label"><Upload size={14} /> Supporting Documents (PDF/JPG/PNG)</label>
                              <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                multiple
                                onChange={handleApplyFilesChange}
                                className="form-input"
                              />

                              {applyFiles.length > 0 && (
                                <div className="apply-file-tags">
                                  {applyFiles.map((file, idx) => (
                                    <div key={idx} className="apply-file-tag-row">
                                      <span className="apply-file-name" title={file.name}>{file.name}</span>
                                      <select
                                        className="form-input"
                                        value={applyFileTypes[idx] || ''}
                                        onChange={(e) => setFileType(idx, e.target.value)}
                                        required
                                      >
                                        <option value="" disabled>This file is...</option>
                                        {scheme.required_documents.map((doc, dIdx) => (
                                          <option key={dIdx} value={doc}>{doc}</option>
                                        ))}
                                        <option value="Other">Other</option>
                                      </select>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {applyState.error && <div className="apply-error">{applyState.error}</div>}
                              <div className="apply-form-actions">
                                <button type="submit" className="btn btn-primary btn-sm" disabled={applyState.loading}>
                                  {applyState.loading ? 'Submitting...' : 'Submit Application'}
                                </button>
                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setApplyingSchemeId(null)}>
                                  Cancel
                                </button>
                              </div>
                            </form>
                          )}
                        </div>
                      )}

                      {isExpanded && (
                        <div className="scheme-expanded-content">
                          <div className="expanded-section">
                            <h4>Benefits</h4>
                            <p>{scheme.benefits}</p>
                          </div>

                          <div className="expanded-section grid-2">
                            <div>
                              <h4>Required Documents</h4>
                              <ul className="doc-list">
                                {scheme.required_documents.map((doc, idx) => (
                                  <li key={idx}><FileText size={14} /> {doc}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <h4>Application Steps</h4>
                              <ol className="step-list">
                                {scheme.application_steps.map((step, idx) => (
                                  <li key={idx}><strong>{idx + 1}.</strong> {step}</li>
                                ))}
                              </ol>
                            </div>
                          </div>

                          {scheme.external_link && (
                            <div className="expanded-action">
                              <a 
                                href={scheme.external_link} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="btn btn-primary btn-sm"
                              >
                                <LinkIcon size={14} /> Official Scheme Portal
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
