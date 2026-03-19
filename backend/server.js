const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const HealthProfile = require('./models/HealthProfile');
const SavedScan = require('./models/SavedScan');
const User = require('./models/User');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const configuredFrontendOrigins = (
  process.env.FRONTEND_URL || 'http://localhost:5173'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) return false;
  if (configuredFrontendOrigins.includes(origin)) return true;

  if (process.env.NODE_ENV !== 'production') {
    return /^http:\/\/localhost:\d+$/.test(origin);
  }

  return false;
};

// Set CORS headers early so both preflight and error responses include them.
app.use((req, res, next) => {
  const requestOrigin = req.headers.origin;
  const allowOrigin = isAllowedOrigin(requestOrigin)
    ? requestOrigin
    : configuredFrontendOrigins[0];

  res.header("Access-Control-Allow-Origin", allowOrigin);
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Vary", "Origin");
  
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/analysis', require('./routes/analysis'));
app.use('/api/scans', require('./routes/scans'));

const syncDatabaseIndexes = async () => {
  const profileCollection = HealthProfile.collection;
  const indexes = await profileCollection.indexes();
  const legacyUserIndex = indexes.find(
    (index) => index.name === 'user_1' && index.unique,
  );

  if (legacyUserIndex) {
    await profileCollection.dropIndex('user_1');
    console.log('Dropped legacy unique index on HealthProfile.user');
  }

  await Promise.all([
    HealthProfile.syncIndexes(),
    SavedScan.syncIndexes(),
    User.syncIndexes(),
  ]);

  console.log('MongoDB indexes synchronized');
};

const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/innerverse');
    console.log('Connected to MongoDB');
    await syncDatabaseIndexes();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5050;
startServer();

module.exports = app;

