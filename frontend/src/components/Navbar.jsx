import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, ShieldCheck, FileText, Search, Activity, User } from 'lucide-react';
import './Navbar.css';

export default function Navbar() {
  const location = useLocation();
  const token = localStorage.getItem('token');
  const citizenToken = localStorage.getItem('citizen_token');

  return (
    <nav className="navbar glass-panel">
      <div className="navbar-logo">
        <Link to="/">
          <span className="logo-icon"><ShieldCheck size={28} /></span>
          <span className="logo-text gradient-text">HAKDAR</span>
        </Link>
      </div>
      <div className="navbar-links">
        <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
          <Home size={18} /> <span>Home</span>
        </Link>
        <Link to="/schemes" className={location.pathname === '/schemes' ? 'active' : ''}>
          <Search size={18} /> <span>Find Schemes</span>
        </Link>
        <Link to="/grievance/file" className={location.pathname === '/grievance/file' ? 'active' : ''}>
          <FileText size={18} /> <span>File Grievance</span>
        </Link>
        <Link to="/grievance/track" className={location.pathname === '/grievance/track' ? 'active' : ''}>
          <Activity size={18} /> <span>Track Status</span>
        </Link>
      </div>
      <div className="navbar-auth">
        {citizenToken ? (
          <Link to="/account/applications" className="btn btn-secondary btn-nav-admin">
            <User size={18} /> <span>My Applications</span>
          </Link>
        ) : (
          <Link to="/account/login" className="btn btn-secondary btn-nav-login">
            <User size={18} /> <span>My Account</span>
          </Link>
        )}
        {token ? (
          <Link to="/admin" className="btn btn-secondary btn-nav-admin">
            <User size={18} /> <span>Dashboard</span>
          </Link>
        ) : (
          <Link to="/admin" className="btn btn-primary btn-nav-login">
            <User size={18} /> <span>Officer Login</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
