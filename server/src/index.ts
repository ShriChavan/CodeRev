/**
 * Main Express server entry point
 * Initializes Express app with middleware and routes
 */

import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import reviewRoutes from './routes/review.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load environment variables from .env file
config({ path: resolve(__dirname, '../.env') });
config({ path: resolve(__dirname, '../../.env') });

// Debug: Log environment status
console.log('🔍 Environment configuration:');
console.log(`   - GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? '✅ Set' : '❌ Not set'}`);
console.log(`   - NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`   - PORT: ${process.env.PORT || 5000}`);

const app = express();
const PORT = process.env.PORT || 5000;

// CORS middleware - Allow frontend to make requests
app.use(cors({
  origin: (origin, callback) => {
    // Allow all localhost origins for development
    if (!origin || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200,
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api', reviewRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.path}`,
  });
});

// Error handler - Must be last
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Unhandled error:', err.message);
  console.error('Stack:', err.stack);
  
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 CodeRev server running on http://localhost:${PORT}`);
  console.log(`📝 API: POST http://localhost:${PORT}/api/review`);
  console.log(`💚 Health: GET http://localhost:${PORT}/health`);
});

export default app;
