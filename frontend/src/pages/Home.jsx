import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, ShieldCheck, Activity, Users, MapPin, Award, Clock } from 'lucide-react';
import './Home.css';

export default function Home() {
  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero-section glass-panel">
        <div className="hero-text">
          <div className="badge-featured">
            <span className="live-dot"></span> Sovereign Welfare &amp; Redressal Network
          </div>
          
          <h1 className="hero-title">
            Your Access to Welfare <br />
            &amp; <span className="gradient-text">Transparent Grievance Redressal</span>
          </h1>
          
          <p className="hero-description">
            Hakdar empowers eligible citizens to discover government benefits through profile-based matching while providing a safe, anonymous channel to report local civic and safety issues with automated SLA escalation.
          </p>
          
          <div className="hero-buttons">
            <Link to="/schemes" className="btn btn-primary">
              <span>Check Eligibility</span> <ArrowRight size={18} />
            </Link>
            <Link to="/grievance/file" className="btn btn-secondary">
              <span>Report Grievance</span>
            </Link>
            <Link to="/grievance/track" className="btn btn-secondary">
              <span>Track Status</span>
            </Link>
          </div>
        </div>

        {/* Live System Preview Card */}
        <div className="hero-preview-widget glass-panel">
          <div className="preview-header">
            <h4>Live SLA Monitoring Console</h4>
            <span className="live-badge">ACTIVE</span>
          </div>
          
          <div className="preview-items">
            <div className="preview-item">
              <div className="status-indicator success"></div>
              <div>
                <h5>PM-KISAN Scheme</h5>
                <p>Direct cash transfer seeded for 12,400+ farmers</p>
              </div>
            </div>

            <div className="preview-item">
              <div className="status-indicator warning"></div>
              <div>
                <h5>Water Supply Pipeline Leak</h5>
                <p>Auto-escalated to Sub-Divisional Officer (Level 1)</p>
              </div>
            </div>

            <div className="preview-item">
              <div className="status-indicator info"></div>
              <div>
                <h5>Ladli Behna Assistance</h5>
                <p>Monthly stipend matched for verified applicants</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live System Stats Ticker */}
      <section className="stats-ticker glass-panel">
        <div className="ticker-item">
          <h4>₹24.8 Cr+</h4>
          <p>Welfare Disbursed</p>
        </div>
        <div className="ticker-divider"></div>
        <div className="ticker-item">
          <h4>94.2%</h4>
          <p>SLA Resolution Rate</p>
        </div>
        <div className="ticker-divider"></div>
        <div className="ticker-item">
          <h4>2 Minutes</h4>
          <p>Demo SLA Escalation Interval</p>
        </div>
        <div className="ticker-divider"></div>
        <div className="ticker-item">
          <h4>100%</h4>
          <p>Anonymous Reporting Safety</p>
        </div>
      </section>

      {/* Structured Core Pillars (NO AI Icon Containers) */}
      <section className="pillars-section">
        <div className="section-header">
          <h2 className="section-title">Core Platform Capabilities</h2>
          <p className="section-subtitle">Engineered to eliminate administrative hurdles and bring public accountability to local governance.</p>
        </div>

        <div className="pillars-grid">
          <div className="pillar-card glass-panel">
            <h3 className="pillar-title">Rule-Based Eligibility Engine</h3>
            <p className="pillar-description">
              Instantly matches citizen parameters (age, gender, income, occupation) against hundreds of scheme criteria, explaining exactly why you qualify.
            </p>
            <Link to="/schemes" className="pillar-link">Run Profile Matcher &rarr;</Link>
          </div>

          <div className="pillar-card glass-panel">
            <h3 className="pillar-title">Multilingual Voice Assistant</h3>
            <p className="pillar-description">
              Integrated browser voice synthesis and speech recognition allowing low-literacy citizens to converse in native dialects to find benefits.
            </p>

            <span className="pillar-badge">Voice Enabled</span>
          </div>

          <div className="pillar-card glass-panel">
            <h3 className="pillar-title">Anonymous Geotagged Reporting</h3>
            <p className="pillar-description">
              Report civic failures, sanitation hazards, or corruption without revealing identity. Includes GPS coordinates and photo/video upload evidence.
            </p>
            <Link to="/grievance/file" className="pillar-link">File Anonymous Report &rarr;</Link>
          </div>

          <div className="pillar-card glass-panel">
            <h3 className="pillar-title">SLA Auto-Escalation Engine</h3>
            <p className="pillar-description">
              Transparent deadline tracking. Complaints unaddressed by local officers are automatically escalated to Sub-Divisional and District Heads.
            </p>
            <Link to="/grievance/track" className="pillar-link">Track Complaint SLA &rarr;</Link>
          </div>
        </div>
      </section>

      {/* How Hakdar Works - 4 Step Pipeline */}
      <section className="workflow-section glass-panel">
        <div className="section-header">
          <h2 className="section-title">How Hakdar Works</h2>
          <p className="section-subtitle">A transparent 4-step pipeline for citizens and municipal authorities.</p>
        </div>

        <div className="workflow-steps grid-2">
          <div className="workflow-step">
            <div className="step-number">01</div>
            <div>
              <h4>Input Profile Credentials</h4>
              <p>Citizens enter basic criteria (income, occupation, age) or speak to the voice assistant.</p>
            </div>
          </div>

          <div className="workflow-step">
            <div className="step-number">02</div>
            <div>
              <h4>Instant Scheme Matching</h4>
              <p>The system evaluates rules and details required documents, benefits, and application steps.</p>
            </div>
          </div>

          <div className="workflow-step">
            <div className="step-number">03</div>
            <div>
              <h4>Submit Anonymous Grievance</h4>
              <p>Citizens log safety or civic issues with media evidence and GPS location without login.</p>
            </div>
          </div>

          <div className="workflow-step">
            <div className="step-number">04</div>
            <div>
              <h4>Track SLA Auto-Escalation</h4>
              <p>If unresolved within SLA limits, the platform automatically escalates the issue to senior officials.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Target Beneficiaries & Impact Groups */}
      <section className="beneficiaries-section">
        <div className="section-header">
          <h2 className="section-title">Target Beneficiaries</h2>
          <p className="section-subtitle">Designed to serve vulnerable populations and empower local municipal bodies.</p>
        </div>

        <div className="beneficiaries-grid">
          <div className="beneficiary-card glass-panel">
            <h4>Underserved Citizens &amp; Farmers</h4>
            <p>Access direct cash transfers, seed subsidies, and healthcare cover without middlemen or bribery.</p>
          </div>

          <div className="beneficiary-card glass-panel">
            <h4>Women &amp; Vulnerable Groups</h4>
            <p>Safe anonymous reporting for harassment, sanitation, and safety issues with guaranteed officer review.</p>
          </div>

          <div className="beneficiary-card glass-panel">
            <h4>Municipal Governance Bodies</h4>
            <p>Visual analytics heatmaps and real-time category distribution bars for data-driven resolution.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
