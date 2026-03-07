import { Router } from 'express';
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { hashPassword, verifyPassword, requireAuth, requireAdmin } from '../auth';

const router = Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const [user] = await db.select().from(users).where(eq(users.username, username));
  if (!user || !user.active) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await verifyPassword(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  req.session.userId = user.id;
  req.session.role = user.role;
  req.session.username = user.username;

  res.json({ id: user.id, username: user.username, role: user.role });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get('/me', requireAuth, async (req, res) => {
  const [user] = await db.select({ id: users.id, username: users.username, role: users.role })
    .from(users).where(eq(users.id, req.session.userId as number));
  if (!user) return res.status(401).json({ error: 'Not found' });
  res.json(user);
});

// Users management (admin only)
router.get('/users', requireAdmin, async (req, res) => {
  const rows = await db.select({ id: users.id, username: users.username, role: users.role, active: users.active, createdAt: users.createdAt }).from(users);
  res.json(rows);
});

router.post('/users', requireAdmin, async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  const hashed = await hashPassword(password);
  const [user] = await db.insert(users).values({ username, password: hashed, role: role || 'operator' }).returning({ id: users.id, username: users.username, role: users.role });
  res.json(user);
});

router.delete('/users/:id', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (id === (req.session.userId as number)) return res.status(400).json({ error: 'Cannot delete yourself' });
  await db.delete(users).where(eq(users.id, id));
  res.json({ ok: true });
});

export default router;
