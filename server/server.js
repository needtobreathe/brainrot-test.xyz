import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { kv } from '@vercel/kv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// DB Abstraction
const USERS_DB = path.join(__dirname, 'db', 'users.json');
const VISITORS_DB = path.join(__dirname, 'db', 'visitors.json');

// Helper to get data (File or KV)
const getDB = async (key, defaultVal) => {
  // 1. Try Vercel KV
  if (process.env.KV_REST_API_URL) {
    try {
      const data = await kv.get(key);
      return data || defaultVal;
    } catch (e) {
      console.warn('KV Error:', e);
    }
  }
  
  // 2. Fallback to Local JSON File (if not in serverless environment)
  if (process.env.VERCEL) {
    // In-memory fallback for Vercel without KV
    if (!global.memeDb) global.memeDb = {};
    return global.memeDb[key] || defaultVal;
  }

  // 3. Local Development (fs)
  // Ensure directory exists
  const dbDir = path.dirname(USERS_DB);
  if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
  }

  const filePath = key === 'users' ? USERS_DB : VISITORS_DB;
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
  return defaultVal;
};

// Helper to save data
const saveDB = async (key, data) => {
  // 1. Try Vercel KV
  if (process.env.KV_REST_API_URL) {
    try {
      await kv.set(key, data);
      return;
    } catch (e) {
      console.warn('KV Error:', e);
    }
  }

  // 2. Vercel In-Memory Fallback
  if (process.env.VERCEL) {
    if (!global.memeDb) global.memeDb = {};
    global.memeDb[key] = data;
    return;
  }

  // 3. Local Development (fs)
  const filePath = key === 'users' ? USERS_DB : VISITORS_DB;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};


// 1. Get User Data
app.get('/api/user/:name', async (req, res) => {
  const users = await getDB('users', {});
  const user = users[req.params.name];
  if (user) {
    res.json(user);
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// 2. Save/Update User Score
app.post('/api/user', async (req, res) => {
  const { name, highScore } = req.body;
  const users = await getDB('users', {});
  
  if (!users[name] || highScore > users[name].highScore) {
    users[name] = {
      highScore: highScore || 0,
      lastPlayed: new Date().toISOString()
    };
    await saveDB('users', users);
  }
  
  res.json({ success: true, user: users[name] });
});

// 3. Record Unique Visitor
app.post('/api/visit', async (req, res) => {
  const visitors = await getDB('visitors', { ips: [], count: 0 });
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  
  if (!visitors.ips.includes(ip)) {
    visitors.ips.push(ip);
    visitors.count++;
    await saveDB('visitors', visitors);
  }
  
  res.json({ success: true, count: visitors.count });
});

// 4. Get Stats
app.get('/api/stats', async (req, res) => {
  const visitors = await getDB('visitors', { ips: [], count: 0 });
  const users = await getDB('users', {});
  
  res.json({
    uniqueVisitors: visitors.count,
    totalUsers: Object.keys(users).length
  });
});

// 5. Get Leaderboard
app.get('/api/leaderboard', async (req, res) => {
  const users = await getDB('users', {});
  const leaderboard = Object.entries(users)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.highScore - a.highScore)
    .slice(0, 10);
  
  res.json(leaderboard);
});

// Serve static files (For Docker/Production outside Vercel)
if (!process.env.VERCEL) {
    const FRONTEND_DIST = path.join(__dirname, '../dist');
    app.use(express.static(FRONTEND_DIST));
    
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api')) return res.status(404).send('Not Found');
      res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
    });

    // Start Server Only if Local
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
}

// Export for Vercel
export default app;
