import React from 'react';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer glass-panel">
      <p>&copy; {new Date().getFullYear()} Hakdar Platform. All Rights Reserved.</p>
      <p className="footer-subtext">Empowering citizens through transparent scheme eligibility checking & automated grievance redressal.</p>
    </footer>
  );
}
