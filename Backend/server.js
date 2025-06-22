// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const emailRoutes = require('./routes/emailRoutes');
// require('dotenv').config();

// const app = express();

// // ✅ Enhanced CORS configuration for email tracking
// app.use(cors({
//   origin: '*', // Allow all origins for development
//   methods: ['GET', 'POST', 'OPTIONS'],
//   credentials: true,
//   allowedHeaders: [
//     'Content-Type', 
//     'Authorization', 
//     'Accept'
//   ],
// }));



// // app.use(cors());


// app.options('*', cors()); // Allow OPTIONS requests globally


// // Additional CORS headers for tracking pixel requests
// app.use((req, res, next) => {
//   res.setHeader("Access-Control-Allow-Origin", "*");
//   res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
//   res.setHeader("Access-Control-Allow-Headers", "Content-Type, ngrok-skip-browser-warning, Accept");
  
//   // Handle preflight requests
//   if (req.method === 'OPTIONS') {
//     res.status(200).end();
//     return;
//   }
  
//   next();
// });

// app.use(express.json());

// // ✅ Email tracking pixel route (CRITICAL - must be before other routes)
// app.get('/api/track/:emailId', async (req, res) => {
//   try {
//     const { emailId } = req.params;
//     console.log(`📧 Email opened: ${emailId}`);
    
//     // Import Email model (you'll need to create this)
//     const Email = require('./models/Email');
    
//     // Update email status to 'seen' in database
//     const updatedEmail = await Email.findOneAndUpdate(
//       { emailId: emailId },
//       { 
//         status: 'seen',
//         openedAt: new Date()
//       },
//       { new: true }
//     );
    
//     if (updatedEmail) {
//       console.log(`✅ Email marked as seen: ${updatedEmail.subject}`);
//     } else {
//       console.log(`⚠️ Email not found in database: ${emailId}`);
//     }
    
//     // Return a 1x1 transparent GIF pixel
//     const pixel = Buffer.from([
//       0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00,
//       0x00, 0x00, 0x00, 0x21, 0xF9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2C, 0x00, 0x00, 0x00, 0x00,
//       0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x0C, 0x0A, 0x00, 0x3B
//     ]);
    
//     res.set({
//       'Content-Type': 'image/gif',
//       'Content-Length': pixel.length,
//       'Cache-Control': 'no-cache, no-store, must-revalidate',
//       'Pragma': 'no-cache',
//       'Expires': '0',
//       'Access-Control-Allow-Origin': '*'
//     });
    
//     res.send(pixel);
    
//   } catch (error) {
//     console.error('❌ Error tracking email:', error);
    
//     // Still return pixel even if there's an error (important!)
//     const pixel = Buffer.from([
//       0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00,
//       0x00, 0x00, 0x00, 0x21, 0xF9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2C, 0x00, 0x00, 0x00, 0x00,
//       0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x0C, 0x0A, 0x00, 0x3B
//     ]);
    
//     res.set('Content-Type', 'image/gif');
//     res.send(pixel);
//   }
// });

// // ✅ Enhanced email routes
// app.use('/api/emails', emailRoutes);

// // ✅ Test route for debugging
// app.get('/api/test', (req, res) => {
//   res.json({ 
//     message: 'Email tracker API is working!', 
//     timestamp: new Date(),
//     env: process.env.NODE_ENV || 'development'
//   });
// });

// // ✅ Get all emails with tracking status
// app.get('/api/emails/status', async (req, res) => {
//   try {
//     const Email = require('./models/Email');
//     const emails = await Email.find({}).sort({ sentAt: -1 });
    
//     const stats = {
//       total: emails.length,
//       sent: emails.filter(e => e.status === 'sent').length,
//       seen: emails.filter(e => e.status === 'seen').length,
//       emails: emails
//     };
    
//     res.json(stats);
//   } catch (error) {
//     console.error('Error getting email status:', error);
//     res.status(500).json({ error: 'Failed to get email status' });
//   }
// });

// // ✅ MongoDB connection
// mongoose.connect(process.env.MONGO_URI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true
// }).then(() => {
//   console.log('✅ MongoDB connected successfully');
// }).catch(err => {
//   console.error('❌ MongoDB connection error:', err);
// });

// // ✅ Error handling middleware
// app.use((error, req, res, next) => {
//   console.error('Server error:', error);
//   res.status(500).json({ 
//     error: 'Internal server error',
//     message: error.message 
//   });
// });

// // ✅ 404 handler
// app.use('*', (req, res) => {
//   console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
//   res.status(404).json({ 
//     error: 'Route not found',
//     method: req.method,
//     url: req.originalUrl
//   });
// });

// // ✅ Server Start
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`🚀 Email Tracker Server running on http://localhost:5000`);
//   console.log(`📧 Tracking endpoint: http://localhost:5000/api/track/{emailId}`);
//   console.log(`📊 Status endpoint: http://localhost:5000/api/emails/status`);
// });

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
app.get('/track', async (req, res) => {
  const { mid, userId } = req.query;

  // Transparent PNG
  const pixel = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64'
  );

  try {
    if (mid && userId) {
      const Email = require('./models/Email');
      const email = await Email.findOne({ userId, messageId: mid });

      if (email) {
        email.status = 'read';
        email.lastReadAt = new Date();
        email.trackingPixelViews.push({
          timestamp: new Date(),
          recipientEmail: 'pixel',
          userAgent: req.get('User-Agent') || 'unknown',
          ipAddress: req.ip || 'unknown'
        });
        await email.save();
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

