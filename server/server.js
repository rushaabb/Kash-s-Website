const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'kashmira-secret-key-2026';

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Serve static files
app.use(express.static(path.join(__dirname, '..')));

// Auth Middleware
const authMiddleware = (req, res, next) => {
  const token = req.cookies.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// API Routes
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const user = await db.getUser(username);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const match = bcrypt.compareSync(password, user.password_hash);
  if (!match) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.json({ token });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

// Shows API (no-cache headers to ensure immediate reflection on all devices)
app.get('/api/shows', async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  try {
    const shows = await db.getShows();
    res.json(shows);
  } catch (err) {
    console.error('GET /api/shows error:', err);
    res.status(500).json({ error: 'Database error', message: err.message });
  }
});

app.post('/api/shows', authMiddleware, async (req, res) => {
  const { date, venue, city, ticket_url, type } = req.body;
  try {
    const newShow = await db.addShow({ date, venue, city, ticket_url, type });
    res.status(201).json(newShow);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.put('/api/shows/:id', authMiddleware, async (req, res) => {
  const { date, venue, city, ticket_url, type } = req.body;
  try {
    const updated = await db.updateShow(req.params.id, { date, venue, city, ticket_url, type });
    if (!updated) return res.status(404).json({ error: 'Show not found' });
    res.json({ message: 'Updated', show: updated });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/api/shows/:id', authMiddleware, async (req, res) => {
  try {
    const deleted = await db.deleteShow(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Show not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Karaoke API
app.get('/api/karaoke', async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  try {
    const karaoke = await db.getKaraoke();
    res.json(karaoke);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.put('/api/karaoke', authMiddleware, async (req, res) => {
  try {
    const { title, schedule, venue, btn_text, btn_link, enabled } = req.body;
    const updated = await db.updateKaraoke({ title, schedule, venue, btn_text, btn_link, enabled });
    res.json({ message: 'Karaoke settings updated', karaoke: updated });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Upcoming Single API
app.get('/api/single', async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  try {
    const single = await db.getUpcomingSingle();
    res.json(single);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.put('/api/single', authMiddleware, async (req, res) => {
  try {
    const { title, release_date, presave_url, enabled } = req.body;
    const updated = await db.updateUpcomingSingle({ title, release_date, presave_url, enabled });
    res.json({ message: 'Upcoming single updated', single: updated });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Storage and Connection Status API
app.get('/api/status', (req, res) => {
  res.json({
    is_kv_connected: db.isKvConnected(),
    storage: db.isKvConnected() ? 'vercel-kv' : 'local-ephemeral'
  });
});

// Local mock for Vercel Web Analytics script in development
app.get('/_vercel/insights/script.js', (req, res) => {
  res.type('application/javascript').send('// Vercel Analytics dev placeholder');
});

// Admin fallback
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'admin.html'));
});

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Admin server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
