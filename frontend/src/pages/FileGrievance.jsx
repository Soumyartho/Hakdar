import React, { useState } from 'react';
import { api } from '../services/api';
import MapWidget from '../components/MapWidget';
import { FileText, MapPin, Image, Video, CheckCircle, Copy, AlertCircle } from 'lucide-react';
import './FileGrievance.css';

export default function FileGrievance() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    latitude: '',
    longitude: ''
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLocationSelect = (coords) => {
    setFormData(prev => ({
      ...prev,
      latitude: coords.lat.toFixed(6),
      longitude: coords.lng.toFixed(6)
    }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6)
        }));
        setGpsLoading(false);
      },
      (error) => {
        console.error('Error fetching GPS:', error);
        alert('Could not retrieve GPS location automatically. Please click manually on the map.');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.title || !formData.description || !formData.category) {
      setErrorMsg('Please fill in all required fields (Title, Description, Category).');
      return;
    }

    setLoading(true);
    
    // Create multipart formdata
    const submitForm = new FormData();
    submitForm.append('title', formData.title);
    submitForm.append('description', formData.description);
    submitForm.append('category', formData.category);
    if (formData.latitude) submitForm.append('latitude', formData.latitude);
    if (formData.longitude) submitForm.append('longitude', formData.longitude);
    if (file) submitForm.append('attachment', file);

    try {
      const res = await api.post('/grievances', submitForm, null, true);
      if (res.success) {
        setSubmittedData(res.data);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to file grievance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyTrackingId = () => {
    if (submittedData) {
      navigator.clipboard.writeText(submittedData.tracking_id);
      alert('Tracking ID copied to clipboard!');
    }
  };

  if (submittedData) {
    return (
      <div className="file-grievance-success glass-panel">
        <div className="success-icon"><CheckCircle size={48} /></div>
        <h2>Grievance Filed Successfully!</h2>
        <p className="anon-warning">
          <strong>Important:</strong> Your submission has been saved securely and is completely <strong>anonymous</strong>. No personal data or user accounts have been linked to this complaint.
        </p>

        <div className="tracking-code-box">
          <span className="tracking-label">Your Unique Tracking ID:</span>
          <div className="tracking-id-value">
            <code>{submittedData.tracking_id}</code>
            <button onClick={copyTrackingId} className="copy-btn" title="Copy ID">
              <Copy size={16} />
            </button>
          </div>
        </div>

        <div className="sla-alert glass-panel">
          <AlertCircle size={20} />
          <div>
            <h5>Auto-Escalation SLA Activated</h5>
            <p>For testing, if this complaint is not resolved within <strong>2 minutes</strong>, it will automatically escalate to the Sub-Divisional Officer (Level 1).</p>
          </div>
        </div>

        <div className="success-actions">
          <a href={`/#/grievance/track?id=${submittedData.tracking_id}`} className="btn btn-primary">
            Track Grievance Status
          </a>
          <button 
            onClick={() => {
              setSubmittedData(null);
              setFormData({ title: '', description: '', category: '', latitude: '', longitude: '' });
              setFile(null);
            }} 
            className="btn btn-secondary"
          >
            File Another Complaint
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="file-grievance-page">
      <h1 className="page-header"><span className="gradient-text">File Anonymous Grievance</span></h1>
      <p className="page-subtext">Report civic malfunctions, safety concerns, or corruption. All files are encrypted and submitted anonymously.</p>

      {errorMsg && (
        <div className="error-banner">
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grievance-form grid-2">
        {/* Form Inputs */}
        <div className="form-fields glass-panel">
          <h3>Complaint Information</h3>
          
          <div className="form-group">
            <label className="form-label">Category *</label>
            <select 
              name="category" 
              value={formData.category} 
              onChange={handleInputChange} 
              className="form-input"
              required
            >
              <option value="">Select Category</option>
              <option value="Sanitation">Sanitation / Waste Management</option>
              <option value="Water Supply">Water Supply / Pipeline Leakage</option>
              <option value="Road Safety">Road Safety / Streetlights</option>
              <option value="Electricity">Electricity / Open Wires</option>
              <option value="Corruption">Corruption / Bribery</option>
              <option value="Safety">Women &amp; Public Safety</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Subject / Title *</label>
            <input 
              type="text" 
              name="title" 
              value={formData.title} 
              onChange={handleInputChange} 
              placeholder="Brief description of the issue"
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Detailed Description *</label>
            <textarea 
              name="description" 
              value={formData.description} 
              onChange={handleInputChange} 
              placeholder="Describe the complaint in detail. Provide landmark, duration, and other context."
              className="form-input text-area"
              rows={5}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Media Evidence (Photo or Video)</label>
            <div className="file-upload-wrapper form-input">
              <input 
                type="file" 
                id="media-upload" 
                onChange={handleFileChange} 
                accept="image/*,video/*"
                className="hidden-file-input"
              />
              <label htmlFor="media-upload" className="file-upload-label">
                {file ? (
                  <span className="file-selected-name">Selected: {file.name}</span>
                ) : (
                  <>
                    <Image size={18} />
                    <span>Upload Image/Video Evidence</span>
                  </>
                )}
              </label>
            </div>
          </div>
        </div>

        {/* Geolocator Map placement */}
        <div className="form-map-panel glass-panel">
          <div className="map-header">
            <h3>Geotag Location</h3>
            <button 
              type="button" 
              onClick={detectLocation} 
              className="btn btn-secondary gps-btn"
              disabled={gpsLoading}
            >
              <MapPin size={16} /> <span>{gpsLoading ? 'Locating...' : 'Use My GPS'}</span>
            </button>
          </div>

          <div className="form-coords grid-2">
            <div className="form-group">
              <label className="form-label">Latitude</label>
              <input 
                type="text" 
                name="latitude" 
                value={formData.latitude} 
                readOnly
                placeholder="Click map to set"
                className="form-input readonly-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Longitude</label>
              <input 
                type="text" 
                name="longitude" 
                value={formData.longitude} 
                readOnly
                placeholder="Click map to set"
                className="form-input readonly-input"
              />
            </div>
          </div>

          <div className="map-widget-wrapper">
            <MapWidget 
              selectable={true} 
              onLocationSelect={handleLocationSelect}
              selectedPosition={
                formData.latitude && formData.longitude 
                  ? { lat: parseFloat(formData.latitude), lng: parseFloat(formData.longitude) } 
                  : null
              }
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary submit-grievance-btn"
            disabled={loading}
          >
            {loading ? 'Submitting Report...' : 'Submit Anonymous Grievance'}
          </button>
        </div>
      </form>
    </div>
  );
}
