import jwt from 'jsonwebtoken';
import { Users } from '../models/repositories.js';

const JWT_SECRET = process.env.JWT_SECRET || 'recallai-secret-key-production-ready-2025';

export async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await Users.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User session invalid or expired.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token is invalid or has expired.', details: err.message });
  }
}

export function generateToken(user) {
  const payload = {
    id: user._id || user.id,
    email: user.email,
    name: user.name,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}
