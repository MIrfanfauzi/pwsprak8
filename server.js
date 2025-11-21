// server.js
const express = require('express');
const path = require('path');
const session = require('express-session');
const dotenv = require('dotenv');

dotenv.config();

const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public'))); 
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 

// Session setup (for admin login)
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-strong-secret-key-here', 
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false, 
    maxAge: 24 * 60 * 60 * 1000 
  }
}));

// Routes
app.use('/', adminRoutes); 

app.use((req, res) => {
  res.status(404).send('<h1>404 - Halaman Tidak Ditemukan</h1>');
});

app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).send('<h1>500 - Terjadi Kesalahan</h1>');
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server berjalan di http://localhost:${PORT}`);
});
