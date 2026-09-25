import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/authRoutes.js';
import schemeRoutes from './routes/schemeRoutes.js';
import grievanceRoutes from './routes/grievanceRoutes.js';
import citizenAuthRoutes from './routes/citizenAuthRoutes.js';
import applicationRoutes from './routes/applicationRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const JWT_SECRET = process.env.JWT_SECRET || 'hakdar_jwt_secret_key_123';

const app = express();

// Middlewares
app.use(helmet());

// Wide-open cors() previously accepted every origin. CORS_ORIGINS is a comma-separated allow-list;
// falls back to the Vite dev server origin so local development keeps working unconfigured.
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map((o) => o.trim());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Scheme application documents (Aadhaar copies, income certificates, etc.) are sensitive PII an
// officer reviews - unlike grievance attachments they must not be served to anonymous requests.
// This has to be declared before the general /uploads static mount below so it takes precedence
// for this one subpath.
app.get('/uploads/documents/:filename', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authorization token required' });
  }
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    if (decoded.type !== 'citizen' && decoded.type !== 'officer') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
  res.sendFile(path.join(__dirname, '../uploads/documents', req.params.filename), (err) => {
    if (err) res.status(404).json({ success: false, message: 'File not found' });
  });
});

// Serve uploaded files statically (grievance evidence photos/videos - public by original design,
// since grievances themselves are anonymous)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/schemes', schemeRoutes);
app.use('/api/grievances', grievanceRoutes);
app.use('/api/citizens', citizenAuthRoutes);
app.use('/api/applications', applicationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'healthy', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.message || err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

export default app;
