import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Mic, MicOff, Send, X, Volume2, VolumeX } from 'lucide-react';
import './Chatbot.css';
import { api } from '../services/api';

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Namaste! I am Hakdar Sahayak. I can help you find government schemes you are eligible for. You can speak to me or type your profile (e.g., "I am a female farmer, age 25, income 1 lakh").'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeakingEnabled, setIsSpeakingEnabled] = useState(true);
  
  const recognitionRef = useRef(null);
  const chatEndRef = useRef(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.lang = 'en-IN'; // Indian English, supports Hindi-English phrases
      rec.interimResults = false;

      rec.onstart = () => setIsListening(true);
      rec.onend = () => setIsListening(false);
      rec.onerror = (e) => {
        console.error('Speech recognition error:', e.error);
        setIsListening(false);
      };
      
      rec.onresult = (event) => {
        const text = event.results[0][0].transcript;
        setInputText(text);
        handleSend(text);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const speakText = (text) => {
    if (!isSpeakingEnabled) return;
    // Cancel ongoing speech
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-IN';
    window.speechSynthesis.speak(utterance);
  };

  const startVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Speech Recognition is not supported in your browser. Please try Chrome or Edge.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      window.speechSynthesis.cancel(); // Stop talking when user wants to speak
      recognitionRef.current.start();
    }
  };

  // Very basic heuristic parser to turn natural speech/text into eligibility parameters
  const parseProfileFromText = (text) => {
    const lower = text.toLowerCase();
    
    // 1. Detect Gender
    let gender = 'any';
    if (lower.includes('female') || lower.includes('woman') || lower.includes('girl') || lower.includes('behna') || lower.includes('mother')) {
      gender = 'female';
    } else if (lower.includes('male') || lower.includes('man') || lower.includes('boy')) {
      gender = 'male';
    }

    // 2. Detect Occupation
    let occupation = 'any';
    if (lower.includes('farmer') || lower.includes('kisan') || lower.includes('agriculture') || lower.includes('farming')) {
      occupation = 'farmer';
    } else if (lower.includes('labor') || lower.includes('worker') || lower.includes('informal') || lower.includes('maid')) {
      occupation = 'informal';
    }

    // 3. Detect Age
    let age = 30; // default average
    const ageMatch = lower.match(/age\s*(?:is)?\s*(\d+)/i) || lower.match(/(\d+)\s*(?:years|yr|years old)/i);
    if (ageMatch) {
      age = parseInt(ageMatch[1]);
    } else {
      // Look for any isolated number
      const numbers = lower.match(/\b\d+\b/g);
      if (numbers && numbers.length > 0) {
        // Assume smaller double digit number is age
        const possibleAge = numbers.map(Number).find(n => n > 5 && n < 100);
        if (possibleAge) age = possibleAge;
      }
    }

    // 4. Detect Income
    let income = 150000; // default average
    const incomeMatch = lower.match(/income\s*(?:is)?\s*(\d+)/i) || lower.match(/earn\s*(\d+)/i);
    if (incomeMatch) {
      income = parseInt(incomeMatch[1]);
    } else if (lower.includes('lakh') || lower.includes('lac')) {
      const lakhMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lac)/i);
      if (lakhMatch) {
        income = parseFloat(lakhMatch[1]) * 100000;
      }
    } else {
      const numbers = lower.match(/\b\d{4,6}\b/g);
      if (numbers && numbers.length > 0) {
        income = parseInt(numbers[0]);
      }
    }

    // 5. Special Flags
    const pregnant_or_lactating = lower.includes('pregnant') || lower.includes('lactating') || lower.includes('expecting') || lower.includes('baby');
    const homeless_or_poor_housing = lower.includes('homeless') || lower.includes('poor housing') || lower.includes('dilapidated') || lower.includes('slum') || lower.includes('kutcha');

    return { age, gender, income, occupation, pregnant_or_lactating, homeless_or_poor_housing };
  };

  const handleSend = async (customText = null) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim()) return;

    if (!customText) setInputText('');

    // Add user message
    setMessages(prev => [...prev, { sender: 'user', text: textToSend }]);

    try {
      // Parser heuristics
      const profile = parseProfileFromText(textToSend);
      
      // Call backend to match schemes
      const response = await api.post('/schemes/match', profile);

      if (response.success) {
        const eligibleSchemes = response.data.filter(s => s.eligibility.isEligible);
        
        let reply = '';
        if (eligibleSchemes.length === 0) {
          reply = `Based on what you said (Age: ${profile.age}, Gender: ${profile.gender}, Occupation: ${profile.occupation}, Income: ₹${profile.income.toLocaleString()}), I couldn't find any direct schemes. Please check the "Find Schemes" tab for a full list and adjustment.`;
        } else {
          const names = eligibleSchemes.map(s => s.title).join(', and ');
          reply = `Good news! Based on your profile (Age: ${profile.age}, Gender: ${profile.gender}, Occupation: ${profile.occupation}, Income: ₹${profile.income.toLocaleString()}), you might be eligible for ${eligibleSchemes.length} scheme(s): ${names}. You can apply through our Portal.`;
        }

        // Add bot message
        setMessages(prev => [...prev, { sender: 'bot', text: reply }]);
        speakText(reply);
      }
    } catch (error) {
      console.error(error);
      const errMsg = "I encountered an issue matching schemes. Please type clearly or use the Find Schemes page directly.";
      setMessages(prev => [...prev, { sender: 'bot', text: errMsg }]);
      speakText(errMsg);
    }
  };

  return (
    <div className="chatbot-wrapper">
      {/* Floating Action Button */}
      <button 
        onClick={() => {
          setIsOpen(!isOpen);
          if(!isOpen) speakText("Hello, how can I help you today?");
        }} 
        className="chatbot-fab"
        title="Voice Chatbot Assistant"
      >
        <MessageSquare size={26} />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="chatbot-window glass-panel">
          <div className="chatbot-header">
            <div className="chatbot-title">
              <span className="live-indicator"></span>
              <h4>Hakdar Voice Assistant</h4>
            </div>
            <div className="chatbot-actions">
              <button 
                onClick={() => setIsSpeakingEnabled(!isSpeakingEnabled)} 
                title={isSpeakingEnabled ? "Mute Bot Speech" : "Unmute Bot Speech"}
                className="chatbot-action-btn"
              >
                {isSpeakingEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>
              <button onClick={() => setIsOpen(false)} className="chatbot-action-btn close-btn">
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="chatbot-messages">
            {messages.map((m, idx) => (
              <div key={idx} className={`message-row ${m.sender}`}>
                <div className="message-bubble">
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="chatbot-input-panel">
            <button 
              onClick={startVoiceInput} 
              className={`mic-btn ${isListening ? 'listening' : ''}`}
              title={isListening ? "Listening..." : "Tap to Speak"}
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask anything or talk..."
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="chatbot-input"
            />
            <button onClick={() => handleSend()} className="send-btn">
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
