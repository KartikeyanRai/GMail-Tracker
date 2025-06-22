
//..................................................

// require('dotenv').config();
// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const emailRoutes = require('./routes/emailRoutes');

// const app = express();
// const PORT = process.env.PORT || 5000;

// // ---- Middleware ----
// app.use(cors({
//   origin: [
//     'chrome-extension://<YOUR_EXTENSION_ID>',
//     'http://localhost:3000',
//     'https://mail.google.com'
//   ],
//   credentials: true
// }));
// app.use(express.json({ limit: '10mb' }));

// // ---- Logging ----
// app.use((req, res, next) => {
//   console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
//   next();
// });

// // ---- DB Connection ----
// mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gmail-tracker', {
//   useNewUrlParser: true,
//   useUnifiedTopology: true
// });
// mongoose.connection.on('connected', () => console.log('📦 MongoDB Connected'));
// mongoose.connection.on('error', err => {
//   console.error('❌ MongoDB Error:', err);
//   process.exit(1);
// });

// // ---- Routes ----
// app.use('/api/emails', emailRoutes);

// // Health & Root
// app.get('/health', (req, res) => {
//   res.json({
//     status: 'OK',
//     ts: new Date().toISOString(),
//     db: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
//   });
// });
// app.get('/', (req, res) => {
//   res.json({
//     message: 'Gmail Tracker API',
//     version: '1.0.0',
//     routes: { emails: '/api/emails', health: '/health' }
//   });
// });

// // ---- Catch-alls ----
// app.use('*', (req, res) => res.status(404).json({ error: 'Route not found' }));
// app.use((err, req, res, next) => {
//   console.error('💥 Server Error:', err);
//   res.status(500).json({ error: 'Internal server error' });
// });

// // ---- Graceful Shutdown ----
// ['SIGINT', 'SIGTERM'].forEach(sig => {
//   process.on(sig, async () => {
//     console.log(`🔽 Received ${sig}, shutting down...`);
//     await mongoose.connection.close();
//     process.exit();
//   });
// });


// app.listen(PORT, () => {
//   console.log(`🚀 Gmail Tracker API Server running on port ${PORT}`);
//   console.log(`📊 Health check: http://localhost:${PORT}/health`);
//   console.log(`📧 Email API:    http://localhost:${PORT}/api/emails`);
// });

//.............................................

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const emailRoutes = require('./routes/emailRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// ---- CORS Configuration ----
const allowedOrigins = [
  'chrome-extension://bcnancnjgoihbikpfepneiglmhjlmaoi',
  'http://localhost:5000',
  'https://mail.google.com'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight requests for all routes
app.options('*', cors());

// ---- Body Parsing ----
app.use(express.json({ limit: '10mb' }));

// ---- Logging ----
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// ---- DB Connection ----
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gmail-tracker', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
mongoose.connection.on('connected', () => console.log('📦 MongoDB Connected'));
mongoose.connection.on('error', err => {
  console.error('❌ MongoDB Error:', err);
  process.exit(1);
});

// ---- Routes ----
app.use('/api/emails', emailRoutes);

// ---- Health & Root ----
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    ts: new Date().toISOString(),
    db: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// ---- Tracking Pixel Route (/track?mid=...&userId=...)
// app.get('/track', async (req, res) => {
//   const { mid, userId } = req.query;

//   // Transparent PNG
//   const pixel = Buffer.from(
//     'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
//     'base64'
//   );

//   try {
//     if (mid && userId) {
//       const Email = require('./models/Email');
//       const email = await Email.findOne({ userId, messageId: mid });

//       if (email) {
//         email.status = 'read';
//         email.lastReadAt = new Date();
//         email.trackingPixelViews.push({
//           timestamp: new Date(),
//           recipientEmail: 'pixel',
//           userAgent: req.get('User-Agent') || 'unknown',
//           ipAddress: req.ip || 'unknown'
//         });
//         await email.save();
//         console.log(`[Pixel] Read logged for messageId=${mid}, userId=${userId}`);
//       }
//     } else {
//       console.log(`[Pixel] Served anonymous pixel for mid=${mid}`);
//     }
//   } catch (err) {
//     console.error('Pixel tracking error:', err.message);
//   }

//   res.set({
//     'Content-Type': 'image/png',
//     'Cache-Control': 'no-store',
//     'Pragma': 'no-cache',
//     'Expires': '0'
//   }).send(pixel);
// });
app.get('/track', async (req, res) => {
  const { mid, userId } = req.query;

  const pixel = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64'
  );

  try {
    if (mid && userId) {
      const Email = require('./models/Email');
      const email = await Email.findOne({ userId, messageId: mid });

      if (email) {
        await email.addPixelView(
          'pixel',
          req.get('User-Agent') || 'unknown',
          req.ip || 'unknown'
        );
        console.log(`[Pixel] Read logged for messageId=${mid}, userId=${userId}`);
      }
    } else {
      console.log(`[Pixel] Served anonymous pixel for mid=${mid}`);
    }
  } catch (err) {
    console.error('Pixel tracking error:', err.message);
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

// ---- Catch-alls ----
app.use('*', (req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error('💥 Server Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ---- Graceful Shutdown ----
['SIGINT', 'SIGTERM'].forEach(sig => {
  process.on(sig, async () => {
    console.log(`🔽 Received ${sig}, shutting down...`);
    await mongoose.connection.close();
    process.exit();
  });
});

// ---- Start Server ----
app.listen(PORT, () => {
  console.log(`🚀 Gmail Tracker API Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📧 Email API:    http://localhost:${PORT}/api/emails`);
});

