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

app.use(cors({ origin: ['http://localhost:3000', 'http://127.0.0.1:3000'], credentials: true }));
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
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const match = bcrypt.compareSync(password, user.password_hash);
  if (!match) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1d' });
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 24 * 60 * 60 * 1000 });
  res.json({ token });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

// Shows API
app.get('/api/shows', (req, res) => {
  try {
    const shows = db.prepare('SELECT * FROM shows ORDER BY date ASC').all();
    res.json(shows);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/shows', authMiddleware, (req, res) => {
  const { date, venue, city, ticket_url, type } = req.body;
  try {
    const info = db.prepare(`
      INSERT INTO shows (date, venue, city, ticket_url, type) 
      VALUES (?, ?, ?, ?, ?)
    `).run(date, venue, city, ticket_url || '', type || 'show');
    res.status(201).json({ id: info.lastInsertRowid, date, venue, city, ticket_url, type });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.put('/api/shows/:id', authMiddleware, (req, res) => {
  const { date, venue, city, ticket_url, type } = req.body;
  try {
    db.prepare(`
      UPDATE shows SET date = ?, venue = ?, city = ?, ticket_url = ?, type = ?
      WHERE id = ?
    `).run(date, venue, city, ticket_url || '', type || 'show', req.params.id);
    res.json({ message: 'Updated' });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/api/shows/:id', authMiddleware, (req, res) => {
  try {
    db.prepare('DELETE FROM shows WHERE id = ?').run(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Karaoke API
app.get('/api/karaoke', (req, res) => {
  try {
    const karaoke = db.getKaraoke();
    res.json(karaoke);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.put('/api/karaoke', authMiddleware, (req, res) => {
  try {
    const { title, schedule, venue, btn_text, btn_link, enabled } = req.body;
    const updated = db.updateKaraoke({ title, schedule, venue, btn_text, btn_link, enabled });
    res.json({ message: 'Karaoke settings updated', karaoke: updated });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
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
