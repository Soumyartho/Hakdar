import React, { useState, useRef, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import GrainyGradient from './components/GrainyGradient';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Chatbot from './components/Chatbot';
import LiquidCursor from './components/LiquidCursor';
import Home from './pages/Home';
import Schemes from './pages/Schemes';
import FileGrievance from './pages/FileGrievance';
import TrackGrievance from './pages/TrackGrievance';
import AdminDashboard from './pages/AdminDashboard';
import './styles/variables.css';
import './styles/main.css';

// Drives --scroll-progress on the root element from the hero section's height.
// Written directly to the DOM (no React state) so it stays cheap on every scroll tick.
function ScrollGradientDriver() {
  const location = useLocation();

  useEffect(() => {
    let rafId = null;
    let pending = false;

    const measureAndSet = () => {
      pending = false;
      const heroEl = document.querySelector('.hero-cinemagraph');
      const root = document.documentElement;

      if (!heroEl) {
        root.style.setProperty('--scroll-progress', '1');
        return;
      }

      const heroHeight = heroEl.offsetHeight || window.innerHeight;
      const progress = Math.min(window.scrollY / (heroHeight * 0.85), 1);
      root.style.setProperty('--scroll-progress', String(Math.max(0, progress)));
    };

    const onScrollOrResize = () => {
      if (pending) return;
      pending = true;
      rafId = requestAnimationFrame(measureAndSet);
    };

    measureAndSet();
    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize);

    return () => {
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [location.pathname]);

  return null;
}

export default function App() {
  const [ripples, setRipples] = useState([]);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const timeRef = useRef(0);

  const handleTimeUpdate = (time) => {
    timeRef.current = time;
  };

  const handleMouseMove = (e) => {
    setMousePos({
      x: e.clientX / window.innerWidth,
      y: e.clientY / window.innerHeight
    });
  };

  const handleScreenClick = (e) => {
    const newRipple = {
      id: Date.now() + Math.random(),
      x: e.clientX,
      y: e.clientY,
      startTime: timeRef.current
    };
    setRipples(prev => {
      const now = timeRef.current;
      return [...prev, newRipple]
        .filter(r => now - r.startTime < 2.0)
        .slice(-10);
    });
  };

  return (
    <Router>
      <div 
        className="app-container" 
        onMouseMove={handleMouseMove} 
        onClick={handleScreenClick}
      >
        {/* Full-screen Shader Canvas Background */}
        <div className="shader-background-wrapper">
          <Canvas camera={{ position: [0, 0, 1] }}>
            <GrainyGradient ripples={ripples} mousePos={mousePos} onTimeUpdate={handleTimeUpdate} />
          </Canvas>
        </div>

        <div className="main-content">
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/schemes" element={<Schemes />} />
            <Route path="/grievance/file" element={<FileGrievance />} />
            <Route path="/grievance/track" element={<TrackGrievance />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>
          <Footer />
        </div>
        
        {/* Floating Voice Chatbot Assistant */}
        <Chatbot />

        {/* Cursor-following liquid-glass distortion lens */}
        <LiquidCursor />

        {/* Drives the tricolor gradient's scroll-linked opacity (writes --scroll-progress) */}
        <ScrollGradientDriver />
      </div>
    </Router>
  );
}
