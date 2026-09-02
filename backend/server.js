import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const DB_PATH = path.join(__dirname, 'data', 'db.json');

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Helper: Password Hashing with SHA-256 and Salt
function hashPassword(password, salt = 'payroll_hub_salt') {
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

// Helper: Ensure Database Directory & File Exist
function ensureDb() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(DB_PATH)) {
    const defaultDb = {
      users: [
        {
          id: 'admin-1',
          email: process.env.ADMIN_EMAIL || 'admin@payroll.hub',
          passwordHash: hashPassword(process.env.ADMIN_PASSWORD || 'admin123456'),
          salt: 'payroll_hub_salt',
          role: 'admin',
          createdAt: new Date().toISOString(),
        },
      ],
      people: [],
      divisions: [],
      flaggedEmails: [],
      exchangeRate: 160,
      googleConfig: {
        clientId: '',
        apiKey: '',
        spreadsheetId: '',
      },
      mustIncludeEmails: '',
      mustExcludeEmails: '',
      autoConfig: {
        targetUrl: '',
        authHeader: '',
        delay: 1500,
        autoDetectLatestTab: true,
      },
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultDb, null, 2), 'utf-8');
  }
}

// Helper: Read Database safely
function readDb() {
  ensureDb();
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading db.json:', err);
    return null;
  }
}

// Helper: Write Database atomically
function writeDb(data) {
  ensureDb();
  data.updatedAt = new Date().toISOString();
  const tempPath = `${DB_PATH}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tempPath, DB_PATH);
}

// Simple Token Verification Helper
function generateToken(user) {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    iat: Date.now(),
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

function verifyToken(token) {
  try {
    if (!token) return null;
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
    const decoded = JSON.parse(Buffer.from(cleanToken, 'base64').toString('utf-8'));
    // Valid for 30 days
    if (Date.now() - decoded.iat > 30 * 24 * 60 * 60 * 1000) return null;
    return decoded;
  } catch (err) {
    return null;
  }
}

// -----------------------------------------------------------------------------
// ROUTES
// -----------------------------------------------------------------------------

// Welcome / Health Route
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Payroll Automation Hub Unified Backend & Database is running!',
    timestamp: new Date().toISOString(),
  });
});

// 1. AUTH: Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  const db = readDb();
  if (!db) {
    return res.status(500).json({ success: false, message: 'Failed to access database.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  
  // Check against env admin credentials as fallback override
  const envAdminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const envAdminPass = process.env.ADMIN_PASSWORD;
  if (envAdminEmail && envAdminPass && normalizedEmail === envAdminEmail && password === envAdminPass) {
    const token = generateToken({ id: 'env-admin', email: envAdminEmail, role: 'admin' });
    return res.json({
      success: true,
      token,
      user: { email: envAdminEmail, role: 'admin' },
      message: 'Authenticated successfully via system admin credentials.',
    });
  }

  // Find user in database
  const user = (db.users || []).find((u) => u.email.toLowerCase() === normalizedEmail);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  const hashed = hashPassword(password, user.salt || 'payroll_hub_salt');
  if (hashed !== user.passwordHash) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  const token = generateToken(user);
  return res.json({
    success: true,
    token,
    user: { email: user.email, role: user.role || 'admin' },
    message: 'Authenticated successfully.',
  });
});

// 2. AUTH: Change Password
app.post('/api/auth/change-password', (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const authHeader = req.headers['authorization'];
  const session = verifyToken(authHeader);

  if (!session) {
    return res.status(401).json({ success: false, message: 'Unauthorized session. Please log in again.' });
  }

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
  }

  const db = readDb();
  const user = (db.users || []).find((u) => u.email.toLowerCase() === session.email.toLowerCase());
  if (!user) {
    return res.status(404).json({ success: false, message: 'User account not found.' });
  }

  const hashedCurrent = hashPassword(currentPassword, user.salt || 'payroll_hub_salt');
  if (hashedCurrent !== user.passwordHash) {
    return res.status(400).json({ success: false, message: 'Incorrect current password.' });
  }

  user.passwordHash = hashPassword(newPassword, user.salt || 'payroll_hub_salt');
  writeDb(db);

  return res.json({ success: true, message: 'Password updated successfully!' });
});

// 3. DATABASE: Unified Sync (GET) - Load everything for any client
app.get('/api/db/sync', (req, res) => {
  const db = readDb();
  if (!db) {
    return res.status(500).json({ success: false, message: 'Failed to access database.' });
  }

  // Return full shared state (exclude sensitive password hashes)
  const sharedState = {
    people: db.people || [],
    divisions: db.divisions || [],
    flaggedEmails: db.flaggedEmails || [],
    exchangeRate: db.exchangeRate || 160,
    googleConfig: db.googleConfig || { clientId: '', apiKey: '', spreadsheetId: '' },
    mustIncludeEmails: db.mustIncludeEmails || '',
    mustExcludeEmails: db.mustExcludeEmails || '',
    autoConfig: db.autoConfig || { targetUrl: '', authHeader: '', delay: 1500, autoDetectLatestTab: true },
    updatedAt: db.updatedAt,
  };

  return res.json({ success: true, data: sharedState });
});

// 4. DATABASE: Unified Sync (POST) - Save state changes to unified backend
app.post('/api/db/sync', (req, res) => {
  const delta = req.body;
  if (!delta || typeof delta !== 'object') {
    return res.status(400).json({ success: false, message: 'Invalid payload.' });
  }

  const db = readDb();
  if (!db) {
    return res.status(500).json({ success: false, message: 'Failed to access database.' });
  }

  // Apply updates selectively
  if (Array.isArray(delta.people)) db.people = delta.people;
  if (Array.isArray(delta.divisions)) db.divisions = delta.divisions;
  if (Array.isArray(delta.flaggedEmails)) db.flaggedEmails = delta.flaggedEmails;
  if (typeof delta.exchangeRate === 'number') db.exchangeRate = delta.exchangeRate;
  if (delta.googleConfig && typeof delta.googleConfig === 'object') {
    db.googleConfig = { ...db.googleConfig, ...delta.googleConfig };
  }
  if (typeof delta.mustIncludeEmails === 'string') db.mustIncludeEmails = delta.mustIncludeEmails;
  if (typeof delta.mustExcludeEmails === 'string') db.mustExcludeEmails = delta.mustExcludeEmails;
  if (delta.autoConfig && typeof delta.autoConfig === 'object') {
    db.autoConfig = { ...db.autoConfig, ...delta.autoConfig };
  }

  writeDb(db);
  return res.json({ success: true, message: 'Unified database updated successfully.', updatedAt: db.updatedAt });
});

// 5. DATABASE: Bulk People Update/Merge
app.post('/api/db/people', (req, res) => {
  const { people = [] } = req.body;
  if (!Array.isArray(people)) {
    return res.status(400).json({ success: false, message: 'Invalid people array.' });
  }

  const db = readDb();
  const existingMap = new Map((db.people || []).map((p) => [p.email.toLowerCase(), p]));

  for (const newPerson of people) {
    if (!newPerson.email) continue;
    const emailKey = newPerson.email.toLowerCase();
    const existing = existingMap.get(emailKey);
    if (existing) {
      existingMap.set(emailKey, { ...existing, ...newPerson });
    } else {
      existingMap.set(emailKey, newPerson);
    }
  }

  db.people = Array.from(existingMap.values());
  writeDb(db);

  return res.json({ success: true, count: db.people.length, message: `Database now has ${db.people.length} people.` });
});

// 6. Payout Automation Endpoint with Chunked Streaming Logs (Preserved)
app.post('/api/run-automation', async (req, res) => {
  // Set headers for text streaming
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');

  const sendLog = (type, message) => {
    res.write(
      JSON.stringify({
        timestamp: new Date().toLocaleTimeString(),
        type,
        message,
      }) + '\n'
    );
  };

  const {
    records = [],
    loginUrl = process.env.TARGET_LOGIN_URL,
    targetUrl = process.env.TARGET_PAYOUT_URL,
    email = process.env.ADMIN_EMAIL,
    password = process.env.ADMIN_PASSWORD,
    delayMs = 1500,
    authHeader = '',
  } = req.body;

  if (records.length === 0) {
    sendLog('error', 'Abort: No payout records provided in the request body.');
    res.end();
    return;
  }

  if (!targetUrl) {
    sendLog('error', 'Abort: Payout target URL not configured.');
    res.end();
    return;
  }

  sendLog('info', `Server: Starting payout automation sequence for ${records.length} records.`);
  
  let authHeaders = {};

  // 1. Session Token Injection or Programmatic Login
  if (authHeader && authHeader.trim()) {
    const parts = authHeader.split(':');
    if (parts.length >= 2) {
      const name = parts[0].trim();
      const value = parts.slice(1).join(':').trim();
      authHeaders[name] = value;
      sendLog('info', `Custom session header "${name}" injected from frontend. Bypassing programmatic login.`);
    } else {
      // Fallback: treat as Authorization header
      authHeaders['Authorization'] = authHeader.trim().startsWith('Bearer ') 
        ? authHeader.trim() 
        : `Bearer ${authHeader.trim()}`;
      sendLog('info', 'Custom Authorization Bearer token injected from frontend. Bypassing programmatic login.');
    }
  } else if (loginUrl && loginUrl.trim()) {
    sendLog('info', `No session header injected. Attempting login to target admin portal: ${loginUrl}`);
    try {
      const loginResponse = await axios.post(
        loginUrl,
        {
          email,
          password,
          username: email,
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 8000,
          validateStatus: () => true,
        }
      );

      if (loginResponse.status >= 200 && loginResponse.status < 300) {
        sendLog('success', `Login successful! Status code: ${loginResponse.status}`);
        
        const data = loginResponse.data || {};
        const token = data.token || data.accessToken || (data.data && data.data.token);
        
        if (token) {
          authHeaders['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
          sendLog('info', 'Session token detected and saved for subsequent payout API headers.');
        }

        const setCookies = loginResponse.headers['set-cookie'];
        if (setCookies && setCookies.length > 0) {
          authHeaders['Cookie'] = setCookies.join('; ');
          sendLog('info', `${setCookies.length} session cookies detected and appended to header queue.`);
        }

        if (!token && (!setCookies || setCookies.length === 0)) {
          sendLog('info', 'No explicit token or cookie found in login response headers/body. Proceeding with anonymous payload.');
        }
      } else {
        sendLog('error', `Login rejected by server. Code: ${loginResponse.status} - ${JSON.stringify(loginResponse.data).substring(0, 100)}`);
        sendLog('info', 'Proceeding with payment execution sequence without credentials (might fail if endpoints are protected).');
      }
    } catch (err) {
      sendLog('error', `Login connection failed: ${err.message}. Proceeding without credentials.`);
    }
  } else {
    sendLog('info', 'No session header or login URL provided. Proceeding with anonymous payloads.');
  }

  // 2. Sequential Request Loop
  sendLog('info', `Commencing payout requests. Delay interval: ${delayMs}ms.`);

  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    sendLog('info', `[${i + 1}/${records.length}] Dispatching payment for ${record.email} (Row ${record.rowNumber}) - Amount: $${record.amount}`);

    try {
      const payload = {
        email: record.email,
        name: record.name,
        amountUSD: record.amount,
        status: 'paid',
        timestamp: new Date().toISOString(),
      };

      const response = await axios.post(targetUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        timeout: 8000,
        validateStatus: () => true,
      });

      if (response.status >= 200 && response.status < 300) {
        successCount++;
        sendLog('success', `[Success] Payout recorded for ${record.email} (Status: ${response.status})`);
      } else {
        failureCount++;
        sendLog('error', `[Failed] Server rejected payout for ${record.email}. Status: ${response.status} - Details: ${JSON.stringify(response.data).substring(0, 120)}`);
      }
    } catch (err) {
      failureCount++;
      sendLog('error', `[Error] Request failed for ${record.email}: ${err.message}`);
    }

    // Delay between calls (omit after last record)
    if (i < records.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  sendLog('info', `Run complete! Success: ${successCount}, Failures: ${failureCount}`);
  res.end();
});

// Start Server
app.listen(PORT, () => {
  console.log(`Payroll Automation Hub Backend & Database running on http://localhost:${PORT}`);
});
