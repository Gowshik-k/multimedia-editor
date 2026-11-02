const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const dataStore = require('../models/dataStore');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');

function generateToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required' });
    }

    const existing = await dataStore.findUserByEmail(email);
    if (existing) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const user = await dataStore.createUser({ username, email, password });
    const token = generateToken(user);

    return res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (err) {
    console.error('[Auth Register Error]', err);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await dataStore.findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const isMatch = await dataStore.comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(user);
    return res.json({
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (err) {
    console.error('[Auth Login Error]', err);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// Demo Quick Login (allows instant collaborator creation for real-time testing!)
router.post('/demo', async (req, res) => {
  try {
    const demoNames = [
      'Alex Creator', 'Taylor Sound', 'Jordan Vision', 'Sam Editor',
      'Morgan Visuals', 'Riley Producer', 'Casey Director'
    ];
    const randomName = req.body.name || demoNames[Math.floor(Math.random() * demoNames.length)];
    const uniqueEmail = `demo_${Date.now()}_${Math.floor(Math.random() * 1000)}@omnimedia.studio`;
    const password = 'demoPassword123';

    const user = await dataStore.createUser({
      username: randomName,
      email: uniqueEmail,
      password,
      role: 'creator',
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(randomName)}`
    });

    const token = generateToken(user);
    return res.json({
      message: 'Demo login initialized',
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (err) {
    console.error('[Auth Demo Error]', err);
    return res.status(500).json({ message: 'Demo creation error', error: err.message });
  }
});

// Current User profile
router.get('/me', authMiddleware, async (req, res) => {
  return res.json({ user: req.user });
});

module.exports = router;

