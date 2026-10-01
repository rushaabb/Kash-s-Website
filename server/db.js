const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const bundledDataFile = path.join(__dirname, 'kashmira_data.json');
const tmpDataFile = path.join('/tmp', 'kashmira_data.json');

function getDataFilePath() {
  if (process.env.VERCEL) {
    if (!fs.existsSync(tmpDataFile) && fs.existsSync(bundledDataFile)) {
      try {
        fs.copyFileSync(bundledDataFile, tmpDataFile);
      } catch (e) {}
    }
    return fs.existsSync(tmpDataFile) ? tmpDataFile : bundledDataFile;
  }
  return bundledDataFile;
}

function loadData() {
  const dataFile = getDataFilePath();
  if (!fs.existsSync(dataFile)) {
    const initialData = {
      users: [
        {
          id: 1,
          username: 'kashmirakhot',
          password_hash: bcrypt.hashSync('kash@ford1969', 10)
        }
      ],
      shows: [
        {
          id: 1,
          date: '2026-10-15',
          venue: 'The Blue Room',
          city: 'Mumbai, India',
          ticket_url: '#contact',
          type: 'show',
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          date: '2026-11-02',
          venue: 'Underground Cafe',
          city: 'Pune, India',
          ticket_url: '#contact',
          type: 'show',
          created_at: new Date().toISOString()
        },
        {
          id: 3,
          date: '2026-12-12',
          venue: 'Rhythm Festival',
          city: 'Goa, India',
          ticket_url: '#contact',
          type: 'show',
          created_at: new Date().toISOString()
        },
        {
          id: 4,
          date: '2026-10-23',
          venue: 'The Melody Lounge',
          city: 'Mumbai, India',
          ticket_url: '#contact',
          type: 'karaoke',
          created_at: new Date().toISOString()
        }
      ],
      karaoke: {
        title: 'Karaoke Nights',
        schedule: 'Every Friday • 8 PM onwards',
        venue: 'The Melody Lounge, Mumbai',
        btn_text: 'Reserve a Spot',
        btn_link: '#contact',
        enabled: true
      },
      nextShowId: 5
    };
    try {
      fs.writeFileSync(dataFile, JSON.stringify(initialData, null, 2));
    } catch (_) {}
    return initialData;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    let changed = false;

    if (!parsed.users || !parsed.users.some(u => u.username === 'kashmirakhot')) {
      parsed.users = [
        {
          id: 1,
          username: 'kashmirakhot',
          password_hash: bcrypt.hashSync('kash@ford1969', 10)
        }
      ];
      changed = true;
    }

    if (!parsed.karaoke) {
      parsed.karaoke = {
        title: 'Karaoke Nights',
        schedule: 'Every Friday • 8 PM onwards',
        venue: 'The Melody Lounge, Mumbai',
        btn_text: 'Reserve a Spot',
        btn_link: '#contact',
        enabled: true
      };
      changed = true;
    }

    if (changed) {
      saveData(parsed);
    }
    return parsed;
  } catch (err) {
    console.error('Error reading data file, using fallback', err);
    return {
      users: [
        {
          id: 1,
          username: 'kashmirakhot',
          password_hash: bcrypt.hashSync('kash@ford1969', 10)
        }
      ],
      shows: [],
      nextShowId: 1
    };
  }
}

function saveData(data) {
  const dataFile = getDataFilePath();
  try {
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
  } catch (err) {
    try {
      fs.writeFileSync(tmpDataFile, JSON.stringify(data, null, 2));
    } catch (e) {
      console.error('Failed to write data to /tmp', e);
    }
  }
}

// Initialize file on startup
loadData();

const db = {
  prepare(sql) {
    const normalized = sql.trim().toUpperCase();
    return {
      get(...params) {
        const data = loadData();
        if (normalized.includes('FROM USERS WHERE USERNAME =')) {
          const username = params[0];
          return data.users.find(u => u.username === username);
        }
        if (normalized.includes('COUNT(*)')) {
          return { count: data.shows.length };
        }
        return null;
      },
      all(...params) {
        const data = loadData();
        if (normalized.includes('FROM SHOWS')) {
          return [...data.shows].sort((a, b) => (a.date > b.date ? 1 : -1));
        }
        return [];
      },
      run(...params) {
        const data = loadData();
        if (normalized.startsWith('INSERT INTO SHOWS')) {
          const [date, venue, city, ticket_url, type] = params;
          const newShow = {
            id: data.nextShowId++,
            date: date || '',
            venue: venue || '',
            city: city || '',
            ticket_url: ticket_url || '',
            type: type || 'show',
            created_at: new Date().toISOString()
          };
          data.shows.push(newShow);
          saveData(data);
          return { lastInsertRowid: newShow.id };
        }
        if (normalized.startsWith('UPDATE SHOWS')) {
          const [date, venue, city, ticket_url, type, id] = params;
          const numId = parseInt(id, 10);
          const show = data.shows.find(s => s.id === numId);
          if (show) {
            show.date = date;
            show.venue = venue;
            show.city = city;
            show.ticket_url = ticket_url || '';
            show.type = type || 'show';
            saveData(data);
          }
          return { changes: show ? 1 : 0 };
        }
        if (normalized.startsWith('DELETE FROM SHOWS')) {
          const numId = parseInt(params[0], 10);
          const idx = data.shows.findIndex(s => s.id === numId);
          if (idx !== -1) {
            data.shows.splice(idx, 1);
            saveData(data);
            return { changes: 1 };
          }
          return { changes: 0 };
        }
        return { changes: 0 };
      }
    };
  },
  getKaraoke() {
    const data = loadData();
    return data.karaoke || {
      title: 'Karaoke Nights',
      schedule: 'Every Friday • 8 PM onwards',
      venue: 'The Melody Lounge, Mumbai',
      btn_text: 'Reserve a Spot',
      btn_link: '#contact',
      enabled: true
    };
  },
  updateKaraoke(updates) {
    const data = loadData();
    if (!data.karaoke) {
      data.karaoke = {};
    }
    if (updates.title !== undefined) data.karaoke.title = updates.title;
    if (updates.schedule !== undefined) data.karaoke.schedule = updates.schedule;
    if (updates.venue !== undefined) data.karaoke.venue = updates.venue;
    if (updates.btn_text !== undefined) data.karaoke.btn_text = updates.btn_text;
    if (updates.btn_link !== undefined) data.karaoke.btn_link = updates.btn_link;
    if (updates.enabled !== undefined) data.karaoke.enabled = Boolean(updates.enabled);

    saveData(data);
    return data.karaoke;
  }
};

module.exports = db;
