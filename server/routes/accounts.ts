import { Router } from 'express';
import { db } from '../db';
import { companyAccounts } from '../../shared/schema';
import { eq, desc } from 'drizzle-orm';
import { requireAuth, requireAdmin } from '../auth';

const router = Router();
router.use(requireAuth);

// List all company accounts
router.get('/', async (_req, res) => {
  const rows = await db.select().from(companyAccounts).orderBy(companyAccounts.currency, companyAccounts.name);
  res.json(rows);
});

// Create account (admin only)
router.post('/', requireAdmin, async (req, res) => {
  const { name, currency, bankName, accountNumber, bsb, notes } = req.body;
  if (!name || !currency) return res.status(400).json({ error: 'Name and currency required' });
  const [acc] = await db.insert(companyAccounts).values({ name, currency, bankName, accountNumber, bsb, notes }).returning();
  res.json(acc);
});

// Update account
router.put('/:id', requireAdmin, async (req, res) => {
  const { name, currency, bankName, accountNumber, bsb, notes, active } = req.body;
  const [acc] = await db.update(companyAccounts)
    .set({ name, currency, bankName, accountNumber, bsb, notes, active })
    .where(eq(companyAccounts.id, parseInt(req.params.id)))
    .returning();
  res.json(acc);
});

// Delete account
router.delete('/:id', requireAdmin, async (req, res) => {
  await db.update(companyAccounts)
    .set({ active: false })
    .where(eq(companyAccounts.id, parseInt(req.params.id)));
  res.json({ ok: true });
});

export default router;
