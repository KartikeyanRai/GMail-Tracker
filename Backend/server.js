

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const emailRoutes = require('./routes/emailRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  'chrome-extension://bcnancnjgoihbikpfepneiglmhjlmaoi',
  'http://localhost:5000',
  'https://mail.google.com'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like curl or Postman)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`❌ CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));


app.options('*', (req, res) => {
  res.sendStatus(204);
});

app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gmail-tracker', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
mongoose.connection.on('connected', () => console.log('📦 MongoDB Connected'));
mongoose.connection.on('error', err => {
  console.error(' MongoDB Error:', err);
  process.exit(1);
});


app.use('/api/emails', emailRoutes);


app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    ts: new Date().toISOString(),
    db: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});


app.get('/track', async (req, res) => {
  const { mid, userId } = req.query;

  const pixel = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64'
  );

  try {
    const Email = require('./models/Email');

    if (mid && userId) {
      const email = await Email.findOne({ userId, messageId: mid });

      if (email) {
        console.log(`[Pixel] Found email. Calling addPixelView.`);
        await email.addPixelView(
          email.to?.[0] || 'unknown',
          req.get('User-Agent') || 'unknown',
          req.ip || req.headers['x-forwarded-for'] || 'unknown'
        );
        console.log(`[Pixel] Read logged for messageId=${mid}, userId=${userId}`);
      } else {
        console.log(`[Pixel] Email not found for userId=${userId}, mid=${mid}`);
      }
    } else {
      console.log(`[Pixel] Served anonymous pixel (missing params) mid=${mid}, userId=${userId}`);
    }
  } catch (err) {
    console.error('Pixel tracking error:', err);
  }

  res.set({
    'Content-Type': 'image/png',
    'Cache-Control': 'no-store',
    'Pragma': 'no-cache',
    'Expires': '0'
  }).send(pixel);
});




app.get('/', (req, res) => {
  res.json({
    message: 'Gmail Tracker API',
    version: '1.0.0',
    routes: { emails: '/api/emails', health: '/health' , track:"/track" }
  });
});


app.use('*', (req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error('💥 Server Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});


['SIGINT', 'SIGTERM'].forEach(sig => {
  process.on(sig, async () => {
    console.log(`🔽 Received ${sig}, shutting down...`);
    await mongoose.connection.close();
    process.exit();
  });
});

app.listen(PORT, () => {
  console.log(` Gmail Tracker API Server running on port ${PORT}`);
  console.log(` Health check: http://localhost:${PORT}/health`);
  console.log(` Email API:    http://localhost:${PORT}/api/emails`);
});

