import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Check, AlertCircle, FileText, ChevronDown, ChevronUp, Link as LinkIcon, Info, Send, Upload } from 'lucide-react';
import './Schemes.jsx.css';

export default function Schemes() {
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
  const [applyState, setApplyState] = useState({ loading: false, error: '', success: false });

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
      alert('Error searching: ' + err.message);
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

  const openApplyForm = (schemeId) => {
    setApplyingSchemeId(schemeId);
    setApplyFiles([]);
    setApplyState({ loading: false, error: '', success: false });
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
      applyFiles.forEach((file) => formData.append('documents', file));

      const res = await api.post('/applications', formData, citizenToken, true);
      if (res.success) {
        setApplyState({ loading: false, error: '', success: true });
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
                          ) : applyState.success ? (
                            <div className="apply-success">
                              <Check size={16} /> Application submitted! Track it under{' '}
                              <Link to="/account/applications" className="gradient-text">My Applications</Link>.
                            </div>
                          ) : (
                            <form className="apply-form" onSubmit={(e) => handleApplySubmit(e, scheme)}>
                              <label className="form-label"><Upload size={14} /> Supporting Documents (PDF/JPG/PNG)</label>
                              <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                multiple
                                onChange={(e) => setApplyFiles(Array.from(e.target.files))}
                                className="form-input"
                              />
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
