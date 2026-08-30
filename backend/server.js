import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Welcome Route
app.get('/', (req, res) => {
  res.json({ message: 'Payroll Automation Hub Local Backend is running!' });
});

// Payout Automation Endpoint with Chunked Streaming Logs
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

  sendLog('info', `Local Backend: Starting payout automation sequence for ${records.length} records.`);
  
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
        validateStatus: () => true, // resolve promise for any status code
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

  sendLog('info', `Local Backend Run complete! Success: ${successCount}, Failures: ${failureCount}`);
  res.end();
});

// Start Server
app.listen(PORT, () => {
  console.log(`Payroll Automation Backend running on http://localhost:${PORT}`);
});
