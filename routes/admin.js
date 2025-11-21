// routes/admin.js
const express = require('express');
const path = require('path'); 
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/db');

const router = express.Router();

function requireAuth(req, res, next) {
  if (req.session && req.session.adminId) {
    return next();
  }
  res.redirect('/login');
}

router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin-login.html'));
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await db.execute('SELECT * FROM admins WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Email atau password salah' });
    }

    const admin = rows[0];
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email atau password salah' });
    }

    req.session.adminId = admin.id;
    res.json({ success: true });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin-register.html'));
});

router.post('/register', async (req, res) => {
  const { email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.execute('INSERT INTO admins (email, password) VALUES (?, ?)', [email, hashedPassword]);
    res.json({ success: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Email sudah terdaftar' });
    }
    console.error('Register error:', err);
    res.status(500).json({ message: 'Gagal register' });
  }
});

router.get('/dashboard', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin-dashboard.html'));
});

router.get('/api/users', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT 
        u.id AS user_id,
        u.first_name,
        u.last_name,
        u.email,
        a.key_value AS api_key,
        CASE 
          WHEN NOW() <= a.expires_at THEN 'Aktif' 
          ELSE 'Kadaluarsa' 
        END AS status_key
      FROM users u
      LEFT JOIN apikeys a ON u.id = a.user_id
      ORDER BY u.id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Fetch users error:', err);
    res.status(500).json({ message: 'Gagal memuat data' });
  }
});

router.get('/user-register', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'user-register.html'));
});

router.post('/api/generate-key', (req, res) => {
  const apiKey = crypto.randomBytes(64).toString('hex'); 
  res.json({ apiKey });
});

router.post('/api/save-user', async (req, res) => {
  const { firstName, lastName, email } = req.body;

  if (!firstName || !lastName || !email) {
    return res.status(400).json({ message: 'Semua field wajib diisi' });
  }

  try {

    const [userResult] = await db.execute(
      'INSERT INTO users (first_name, last_name, email) VALUES (?, ?, ?)',
      [firstName, lastName, email]
    );
    const userId = userResult.insertId;

    const apiKey = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1); 

    await db.execute(
      'INSERT INTO apikeys (key_value, user_id, expires_at) VALUES (?, ?, ?)',
      [apiKey, userId, expiresAt]
    );

    res.json({ success: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Email sudah terdaftar' });
    }
    console.error('Save user error:', err);
    res.status(500).json({ message: 'Gagal menyimpan data' });
  }
});

router.delete('/api/delete-user/:id', requireAuth, async (req, res) => {
  const userId = req.params.id;

  try {
    const [result] = await db.execute('DELETE FROM users WHERE id = ?', [userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ message: 'Gagal menghapus user' });
  }
});

module.exports = router;




