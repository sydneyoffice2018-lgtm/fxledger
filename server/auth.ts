import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { db } from './db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

declare module 'express-session' {
  interface SessionData {
    userId: number;
    role: string;
    username: string;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId || req.session.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
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
