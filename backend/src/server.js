import dotenv from 'dotenv';
import app from './app.js';
import { startEscalationJob, stopEscalationJob } from './utils/escalationJob.js';
import { seedIfEmpty } from './config/seed.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

const start = async () => {
  // Must finish before accepting requests - otherwise the first requests on a fresh instance
  // (e.g. after a free-tier spin-down, which wipes the ephemeral SQLite file) would hit tables
  // that don't exist yet.
  await seedIfEmpty();

  const server = app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(` Hakdar Backend Server running on port ${PORT}`);
    console.log(` Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log(` Time: ${new Date().toISOString()}`);
    console.log(`==================================================`);

    // Start the background auto-escalation check (checking every 10 seconds for demo responsiveness)
    startEscalationJob(10000);
  });

  // Graceful shutdown
  const gracefulShutdown = () => {
    console.log('Shutting down server gracefully...');
    stopEscalationJob();
    server.close(() => {
      console.log('Server closed. Process exiting.');
      process.exit(0);
    });
  };

  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);
};

start();
