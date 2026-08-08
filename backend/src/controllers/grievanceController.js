import { GrievanceModel } from '../models/grievanceModel.js';

const generateTrackingId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomPart = '';
  for (let i = 0; i < 4; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `HAK-2026-${randomPart}`;
};

export const getGrievances = async (req, res) => {
  try {
    const grievances = await GrievanceModel.getAll();
    res.json({ success: true, data: grievances });
  } catch (error) {
    console.error('Error fetching grievances:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getGrievanceByTrackingId = async (req, res) => {
  try {
    const grievance = await GrievanceModel.getByTrackingId(req.params.trackingId);
    if (!grievance) {
      return res.status(404).json({ success: false, message: 'Grievance not found' });
    }
    res.json({ success: true, data: grievance });
  } catch (error) {
    console.error('Error fetching grievance:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const createGrievance = async (req, res) => {
  try {
    const { title, description, category, latitude, longitude } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({ success: false, message: 'Title, description, and category are required' });
    }

    const tracking_id = generateTrackingId();
    // Demo SLA: 2 minutes from now. In production, this would be e.g., 7 days.
    const sla_deadline = new Date(Date.now() + 2 * 60 * 1000).toISOString();
    
    // Store relative path if file exists, replacing backslashes with forward slashes for URL friendliness
    const attachment_path = req.file ? `uploads/${req.file.filename}` : null;

    const grievanceData = {
      tracking_id,
      title,
      description,
      category,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      attachment_path,
      sla_deadline
    };

    const id = await GrievanceModel.create(grievanceData);
    
    res.status(201).json({
      success: true,
      message: 'Grievance registered successfully',
      data: {
        id,
        tracking_id,
        status: 'Submitted',
        sla_deadline
      }
    });
  } catch (error) {
    console.error('Error creating grievance:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const updateGrievanceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, escalation_level, sla_deadline } = req.body;

    const grievance = await GrievanceModel.getById(id);
    if (!grievance) {
      return res.status(404).json({ success: false, message: 'Grievance not found' });
    }

    await GrievanceModel.updateStatus(id, status, escalation_level || 0, sla_deadline || null);
    res.json({ success: true, message: 'Grievance status updated successfully' });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const resolveGrievance = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution_notes } = req.body;

    if (!resolution_notes) {
      return res.status(400).json({ success: false, message: 'Resolution notes are required to resolve a grievance' });
    }

    const grievance = await GrievanceModel.getById(id);
    if (!grievance) {
      return res.status(404).json({ success: false, message: 'Grievance not found' });
    }

    await GrievanceModel.resolve(id, resolution_notes);
    res.json({ success: true, message: 'Grievance resolved successfully' });
  } catch (error) {
    console.error('Error resolving grievance:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
