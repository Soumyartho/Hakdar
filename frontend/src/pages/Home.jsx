import React, { useState, useLayoutEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, ShieldCheck, Activity, Users, Search, AlertCircle, Clock, FileText, Lock } from 'lucide-react';
import './Home.css';
import { api } from '../services/api';
import useVideoAutoplay from '../hooks/useVideoAutoplay';

export default function Home() {
  // Keeps both cinemagraphs looping even when Safari blocks autoplay (Low Power Mode).
  const heroVideoRef = useVideoAutoplay();
  const closingVideoRef = useVideoAutoplay();

  // Quick eligibility estimator state on home page
  const [quickProfile, setQuickProfile] = useState({
    age: '25',
    gender: 'female',
    income: '120000',
    occupation: 'farmer'
  });
  const [quickResults, setQuickResults] = useState(null);
  const [quickLoading, setQuickLoading] = useState(false);

  // The hero has to start at the very top of the document so the navbar floats over it as
  // translucent glass. Rather than adding up paddings/margins (offsetTop misreports for the
  // sticky navbar), zero the pull and read the hero's own natural document offset - that is
  // exactly how far it needs to move up, whatever the layout above it happens to be.
  useLayoutEffect(() => {
    const root = document.documentElement;

    const measure = () => {
      const hero = document.querySelector('.hero-video-stage');
      if (!hero) return;

      root.style.setProperty('--hero-pull', '0px');
      const naturalTop = hero.getBoundingClientRect().top + window.scrollY;
      root.style.setProperty('--hero-pull', `${naturalTop}px`);
    };

    measure();
    // The navbar's height shifts by a couple of pixels when the display font swaps in, which
    // would otherwise leave a thin sliver of background above the hero.
    document.fonts?.ready.then(measure).catch(() => {});
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('resize', measure);
      root.style.removeProperty('--hero-pull');
      root.style.removeProperty('--hero-media-inset');
    };
  }, []);

  const handleQuickEstimate = async (e) => {
    e.preventDefault();
    setQuickLoading(true);
    try {
      const res = await api.post('/schemes/match', {
        age: parseInt(quickProfile.age),
        gender: quickProfile.gender,
        income: parseFloat(quickProfile.income),
        occupation: quickProfile.occupation
      });
      if (res.success) {
        setQuickResults(res.data.filter(s => s.eligibility.isEligible));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setQuickLoading(false);
    }
  };

  return (
    <div className="home-container">
      {/* Full-screen cinemagraph hero. The video is 16:9 and is shown complete (object-fit: contain)
          so its own baked-in Hindi headline stays intact; a blurred copy of the same artwork fills
          the side gaps so it still reads as edge-to-edge. Our copy sits in the lower half, clear of
          that baked-in text. The media layer is masked at the bottom so it dissolves into the
          shader gradient instead of ending on a hard horizontal cut. */}
      <section className="hero-video-stage">
        <div className="hero-media-layer">
          <video
            ref={heroVideoRef}
            className="hero-video-stage-media"
            autoPlay
            muted
            loop
            playsInline
            poster="/images/sustainable_agriculture.jpg"
          >
            <source src="/Video/Animate_this_watercolor_illust.mp4" type="video/mp4" />
          </video>
          <div className="hero-media-scrim"></div>
        </div>

        <div className="hero-copy">
          <div className="badge-featured">
            <span className="live-dot"></span> Sovereign Citizen Welfare &amp; Redressal Network
          </div>

          <h1 className="hero-title">
            RIGHTFUL WELFARE SCHEME ACCESS <br />
            &amp; <span className="gradient-text">TRANSPARENT GRIEVANCE REDRESSAL</span>
          </h1>

          <p className="hero-tagline">
            Bridging the gap between government welfare benefits and the citizens who need them—with zero corruption, voice-assisted eligibility matching, and SLA-enforced municipal accountability.
          </p>

          <div className="hero-buttons">
            <Link to="/schemes" className="btn btn-primary">
              <span>Find Eligible Schemes</span> <ArrowRight size={18} />
            </Link>
            <Link to="/grievance/file" className="btn btn-secondary">
              <span>Report Anonymous Grievance</span>
            </Link>
            <Link to="/grievance/track" className="btn btn-secondary">
              <span>Track SLA Status</span>
            </Link>
          </div>
        </div>

        <div className="hero-scroll-cue" aria-hidden="true"></div>
      </section>

      {/* Official Governance Trust Band */}
      <section className="trust-band glass-panel" data-reveal>
        <div className="trust-item">
          <Lock size={20} className="trust-icon" />
          <div>
            <h5>100% Anonymous</h5>
            <p>Encrypted reporting without identity link</p>
          </div>
        </div>
        <div className="trust-divider"></div>
        <div className="trust-item">
          <Clock size={20} className="trust-icon" />
          <div>
            <h5>Automated SLA Escalation</h5>
            <p>Auto-escalates unaddressed civic issues</p>
          </div>
        </div>
        <div className="trust-divider"></div>
        <div className="trust-item">
          <ShieldCheck size={20} className="trust-icon" />
          <div>
            <h5>DBT &amp; Govt Verified</h5>
            <p>Direct Benefit Transfer compliance</p>
          </div>
        </div>
      </section>

      {/* Pushed Down Live SLA Monitoring Console Showcase */}
      <section className="live-console-showcase glass-panel" data-reveal>
        <div className="section-header">
          <h2 className="section-title">Live Municipal SLA Monitor</h2>
          <p className="section-subtitle">Real-time public tracking console ensuring municipal authorities respond within strict time limits.</p>
        </div>

        <div className="console-items-grid">
          <div className="console-card">
            <div className="console-card-header">
              <span className="status-dot success"></span>
              <span className="ticket-id">HAK-2026-X11</span>
              <span className="status-tag status-submitted">Under Local Review</span>
            </div>
            <h4>Broken Water Pipeline Leaking</h4>
            <p>Sector 4 Community Hall area water main pipeline rupture reported anonymously.</p>
            <div className="console-card-footer">
              <span>Assigned: Water Supply Dept</span>
              <span className="timer-text">SLA: 1m 45s left</span>
            </div>
          </div>

          <div className="console-card">
            <div className="console-card-header">
              <span className="status-dot danger"></span>
              <span className="ticket-id">HAK-2026-Z33</span>
              <span className="status-tag status-escalated">Escalated to Level 1 (SDO)</span>
            </div>
            <h4>Non-Functioning Streetlights</h4>
            <p>Bypass road stretch light outages creating safety hazard for women at night.</p>
            <div className="console-card-footer">
              <span>Escalated: Sub-Divisional Officer</span>
              <span className="timer-text alert">OVERDUE - AUTO-ESCALATED</span>
            </div>
          </div>

          <div className="console-card">
            <div className="console-card-header">
              <span className="status-dot resolved"></span>
              <span className="ticket-id">HAK-2026-W44</span>
              <span className="status-tag status-resolved">Case Resolved</span>
            </div>
            <h4>Open Manhole Near School</h4>
            <p>Sanitation crew dispatched, cover replaced and sealed properly.</p>
            <div className="console-card-footer">
              <span>Resolved by Ward Sanitation</span>
              <span className="timer-text success-text">Closed in 45 mins</span>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Quick Scheme Estimator Component */}
      <section className="quick-estimator-section glass-panel grid-2" data-reveal>
        <div className="estimator-info">
          <h2 className="section-title">Instant Eligibility Calculator</h2>
          <p className="section-subtitle">Test your profile parameters right now to see how many government welfare schemes you qualify for.</p>

          <form onSubmit={handleQuickEstimate} className="quick-form">
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Age</label>
                <input 
                  type="number" 
                  value={quickProfile.age} 
                  onChange={(e) => setQuickProfile({ ...quickProfile, age: e.target.value })} 
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Gender</label>
                <select 
                  value={quickProfile.gender} 
                  onChange={(e) => setQuickProfile({ ...quickProfile, gender: e.target.value })} 
                  className="form-input"
                >
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </select>
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Annual Income (₹)</label>
                <input 
                  type="number" 
                  value={quickProfile.income} 
                  onChange={(e) => setQuickProfile({ ...quickProfile, income: e.target.value })} 
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Occupation</label>
                <select 
                  value={quickProfile.occupation} 
                  onChange={(e) => setQuickProfile({ ...quickProfile, occupation: e.target.value })} 
                  className="form-input"
                >
                  <option value="farmer">Farmer</option>
                  <option value="informal">Informal Worker</option>
                  <option value="other">Corporate / Other</option>
                </select>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={quickLoading}>
              {quickLoading ? 'Matching Database...' : 'Calculate Eligible Schemes'}
            </button>
          </form>
        </div>

        <div className="estimator-results-box">
          <h4>Matched Scheme Results</h4>
          {quickResults === null ? (
            <div className="empty-results-placeholder">
              <Search size={36} />
              <p>Click "Calculate Eligible Schemes" to run instant matching against seeded national database.</p>
            </div>
          ) : quickResults.length === 0 ? (
            <div className="no-matches">
              <AlertCircle size={32} />
              <p>No schemes matched for these specific criteria. Try checking the full Schemes page.</p>
            </div>
          ) : (
            <div className="results-list">
              {quickResults.map(s => (
                <div key={s.id} className="quick-result-card">
                  <div className="result-header">
                    <span className="scheme-dept">{s.department}</span>
                    <span className="eligible-badge">Eligible</span>
                  </div>
                  <h5>{s.title}</h5>
                  <p>{s.benefits}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Core Platform Capabilities Grid - Styled with Bespoke Watercolor Graphics */}
      <section className="pillars-section" data-reveal>
        <div className="section-header">
          <h2 className="section-title">Core Platform Architecture</h2>
          <p className="section-subtitle">Designed to eliminate administrative complexity and enforce SLA accountability.</p>
        </div>

        <div className="pillars-grid">
          <div className="pillar-card glass-panel">
            <div className="pillar-image-container">
              <img src="/images/digital_access.jpg" alt="Rule-Based Eligibility" className="pillar-graphic" />
            </div>
            <div className="pillar-text-content">
              <h3 className="pillar-title">Rule-Based Eligibility Engine</h3>
              <p className="pillar-description">
                Evaluates citizen parameters (income, age, gender, occupation) against rule logic to detail why you qualify and exact documents required.
              </p>
              <Link to="/schemes" className="pillar-link">Run Full Scheme Search &rarr;</Link>
            </div>
          </div>

          <div className="pillar-card glass-panel">
            <div className="pillar-image-container">
              <img src="/images/education_empowerment.jpg" alt="Voice Assistant" className="pillar-graphic" />
            </div>
            <div className="pillar-text-content">
              <h3 className="pillar-title">Multilingual Voice Assistant</h3>
              <p className="pillar-description">
                Browser-native speech synthesis and voice recognition allowing low-literacy users to speak queries directly in native dialects.
              </p>
              <span className="pillar-badge">Speech Enabled</span>
            </div>
          </div>

          <div className="pillar-card glass-panel">
            <div className="pillar-image-container">
              <img src="/images/green_energy.jpg" alt="Anonymous Reporting" className="pillar-graphic" />
            </div>
            <div className="pillar-text-content">
              <h3 className="pillar-title">Geotagged Anonymous Grievance</h3>
              <p className="pillar-description">
                File sanitation, safety, or corruption reports anonymously. Includes GPS coordinates capture and media evidence attachments.
              </p>
              <Link to="/grievance/file" className="pillar-link">Submit Anonymous Report &rarr;</Link>
            </div>
          </div>

          <div className="pillar-card glass-panel">
            <div className="pillar-image-container">
              <img src="/images/skill_development.jpg" alt="SLA Redressal" className="pillar-graphic" />
            </div>
            <div className="pillar-text-content">
              <h3 className="pillar-title">SLA Auto-Escalation Engine</h3>
              <p className="pillar-description">
                Transparent deadline tracking. Unresolved grievances are automatically escalated to Sub-Divisional Officers and District Heads.
              </p>
              <Link to="/grievance/track" className="pillar-link">Track Complaint SLA &rarr;</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Target Beneficiaries - Styled with Watercolor Card Headers */}
      <section className="beneficiaries-section" data-reveal>
        <div className="section-header">
          <h2 className="section-title">Target Beneficiaries</h2>
          <p className="section-subtitle">Built to empower marginalized citizens and streamline municipal administration.</p>
        </div>

        <div className="beneficiaries-grid">
          <div className="beneficiary-card glass-panel">
            <div className="beneficiary-image-container">
              <img src="/images/safe_housing.jpg" alt="Underserved Citizens & Farmers" className="beneficiary-graphic" />
            </div>
            <div className="beneficiary-text-content">
              <h4>Underserved Citizens &amp; Farmers</h4>
              <p>Access direct cash transfers, seed subsidies, and healthcare cover without middlemen or bribery.</p>
            </div>
          </div>

          <div className="beneficiary-card glass-panel">
            <div className="beneficiary-image-container">
              <img src="/images/women_empowerment.jpg" alt="Women & Vulnerable Groups" className="beneficiary-graphic" />
            </div>
            <div className="beneficiary-text-content">
              <h4>Women &amp; Vulnerable Groups</h4>
              <p>Safe anonymous reporting for harassment, sanitation, and safety issues with guaranteed officer review.</p>
            </div>
          </div>

          <div className="beneficiary-card glass-panel">
            <div className="beneficiary-image-container">
              <img src="/images/transparent_redressal.jpg" alt="Municipal Governance Bodies" className="beneficiary-graphic" />
            </div>
            <div className="beneficiary-text-content">
              <h4>Municipal Governance Bodies</h4>
              <p>Visual analytics heatmaps and real-time category distribution bars for data-driven resolution.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Closing full-bleed cinemagraph - masked top and bottom so it melts in and out of the gradient */}
      <section className="closing-cinemagraph">
        <div className="closing-cinemagraph-media">
          <video
            ref={closingVideoRef}
            className="closing-cinemagraph-video"
            autoPlay
            muted
            loop
            playsInline
            poster="/images/green_energy.jpg"
          >
            <source src="/Video/Animate_this_watercolor_illust-2.mp4" type="video/mp4" />
          </video>
          <div className="closing-cinemagraph-scrim"></div>
        </div>

        <div className="closing-cinemagraph-copy">
          <h2 className="section-title">Welfare That Reaches Every Village</h2>
          <p className="section-subtitle">
            From the last mile to the district headquarters—entitlements delivered, grievances answered, accountability enforced.
          </p>
        </div>
      </section>
    </div>
  );
}
