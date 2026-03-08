import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from './db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'fx-ledger-jwt-secret-2024';

export interface JwtPayload {
  userId: number;
  role: string;
  username: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Invalid or expired token' });
  
  (req as any).jwtPayload = payload;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(403).json({ error: 'Forbidden' });
  
  const payload = verifyToken(token);
  if (!payload || payload.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  
  (req as any).jwtPayload = payload;
  next();
}

export async function ensureDefaultAdmin() {
  const existing = await db.select().from(users).where(eq(users.username, 'admin'));
  if (existing.length === 0) {
    const hashed = await hashPassword('admin123');
    await db.insert(users).values({
      username: 'admin',
      password: hashed,
      role: 'admin',
      active: true,
    });
    console.log('✅ Default admin created: admin / admin123');
  }
}
