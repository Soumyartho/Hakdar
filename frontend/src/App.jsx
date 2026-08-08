import React, { useState, useRef } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import GrainyGradient from './components/GrainyGradient';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Chatbot from './components/Chatbot';
import Home from './pages/Home';
import Schemes from './pages/Schemes';
import FileGrievance from './pages/FileGrievance';
import TrackGrievance from './pages/TrackGrievance';
import AdminDashboard from './pages/AdminDashboard';
import './styles/variables.css';
import './styles/main.css';

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
      </div>
    </Router>
  );
}
