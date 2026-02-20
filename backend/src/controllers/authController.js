import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

function isValidRole(role) {
  return ['user', 'doctor', 'admin'].includes(role);
}

export async function register(req, res, next) {
  try {
    const { name, email, password, role = 'user', isPremium } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email, password are required' });
    }
    if (!isValidRole(role)) {
      return res.status(400).json({ message: 'invalid role' });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Email already in use' });

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    let premiumStatus = 'free';
    let premiumUntil = undefined;
    if (role === 'user' && isPremium) {
      premiumStatus = 'premium';
      // leave premiumUntil undefined to indicate ongoing premium for now
    }

    const user = await User.create({ name, email, passwordHash, role, premiumStatus, premiumUntil });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        premiumStatus: user.premiumStatus,
        premiumUntil: user.premiumUntil,
        createdAt: user.createdAt
      },
      token
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password, role } = req.body || {};
    if (!email || !password || !role) {
      return res.status(400).json({ message: 'email, password, role are required' });
    }
    if (!isValidRole(role)) {
      return res.status(400).json({ message: 'invalid role' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    // Enforce role chosen at login matches stored role
    if (user.role !== role) {
      return res.status(403).json({ message: 'Role mismatch for this account' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        premiumStatus: user.premiumStatus,
        premiumUntil: user.premiumUntil,
        createdAt: user.createdAt
      },
      token
    });
  } catch (err) {
    next(err);
  }
}
