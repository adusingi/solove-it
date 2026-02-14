import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import cron from 'node-cron';
import { customAlphabet, nanoid } from 'nanoid';
import { db, initDb } from './db.js';
import { triggerNudges } from './nudge.js';

initDb();

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

const inviteCodeGenerator = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

const SORT_FIELDS = {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  priority: 'priority',
  timing: 'timing',
  budgetMin: 'budget_min',
  budgetMax: 'budget_max',
  status: 'status'
};

const VALID_PRIORITIES = new Set(['low', 'medium', 'high']);
const VALID_WISH_STATUSES = new Set(['pending', 'completed']);

function makeId(prefix) {
  return `${prefix}_${nanoid(10)}`;
}

function clampNudgeLevel(level) {
  if (level === undefined || level === null || level === '') return 1;
  const parsed = Number(level);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 3) {
    return null;
  }
  return parsed;
}

function fetchUser(userId) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
}

function fetchPair(pairId) {
  return db.prepare('SELECT * FROM pairs WHERE id = ?').get(pairId);
}

function normalizeEmail(email) {
  if (typeof email !== 'string') return null;
  const value = email.trim().toLowerCase();
  return value || null;
}

function normalizeText(text) {
  if (typeof text !== 'string') return null;
  const value = text.trim();
  return value || null;
}

function ensurePairMembership(pair, userId) {
  return pair && (pair.user1_id === userId || pair.user2_id === userId);
}

function parsePositiveInt(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.floor(parsed);
}

function buildWishFilters(pairId, query) {
  const clauses = ['pair_id = ?'];
  const params = [pairId];

  if (query.status) {
    clauses.push('status = ?');
    params.push(query.status);
  }

  if (query.category) {
    clauses.push('category = ?');
    params.push(query.category);
  }

  if (query.priority) {
    clauses.push('priority = ?');
    params.push(query.priority);
  }

  if (query.timing) {
    clauses.push('timing = ?');
    params.push(query.timing);
  }

  if (query.createdBy) {
    clauses.push('created_by = ?');
    params.push(query.createdBy);
  }

  if (query.q) {
    clauses.push('(title LIKE ? OR memo LIKE ?)');
    params.push(`%${query.q}%`, `%${query.q}%`);
  }

  if (query.minBudget !== undefined) {
    clauses.push('(budget_max IS NULL OR budget_max >= ?)');
    params.push(Number(query.minBudget));
  }

  if (query.maxBudget !== undefined) {
    clauses.push('(budget_min IS NULL OR budget_min <= ?)');
    params.push(Number(query.maxBudget));
  }

  return { whereClause: clauses.join(' AND '), params };
}

app.get('/health', async () => ({ ok: true }));

app.post('/users', async (request, reply) => {
  const body = request.body || {};
  const email = normalizeEmail(body.email);
  const deviceId = normalizeText(body.deviceId);
  const pushToken = normalizeText(body.pushToken);
  const nudgeLevel = clampNudgeLevel(body.nudgeLevel);

  if (!email && !deviceId) {
    return reply.code(400).send({ error: 'email or deviceId is required' });
  }

  if (nudgeLevel === null) {
    return reply.code(400).send({ error: 'nudgeLevel must be an integer between 0 and 3' });
  }

  const id = makeId('usr');

  try {
    db.prepare(
      `
      INSERT INTO users (id, email, device_id, push_token, nudge_level)
      VALUES (?, ?, ?, ?, ?)
      `
    ).run(id, email, deviceId, pushToken, nudgeLevel);
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) {
      return reply.code(409).send({ error: 'email or deviceId already exists' });
    }
    throw error;
  }

  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
});

app.get('/users/:userId', async (request, reply) => {
  const { userId } = request.params;
  const user = fetchUser(userId);
  if (!user) return reply.code(404).send({ error: 'user not found' });
  return user;
});

app.patch('/users/:userId', async (request, reply) => {
  const { userId } = request.params;
  if (!fetchUser(userId)) return reply.code(404).send({ error: 'user not found' });

  const body = request.body || {};
  const updates = [];
  const params = [];

  if (Object.hasOwn(body, 'email')) {
    updates.push('email = ?');
    params.push(normalizeEmail(body.email));
  }

  if (Object.hasOwn(body, 'deviceId')) {
    updates.push('device_id = ?');
    params.push(normalizeText(body.deviceId));
  }

  if (Object.hasOwn(body, 'pushToken')) {
    updates.push('push_token = ?');
    params.push(normalizeText(body.pushToken));
  }

  if (Object.hasOwn(body, 'nudgeLevel')) {
    const nudgeLevel = clampNudgeLevel(body.nudgeLevel);
    if (nudgeLevel === null) {
      return reply.code(400).send({ error: 'nudgeLevel must be an integer between 0 and 3' });
    }
    updates.push('nudge_level = ?');
    params.push(nudgeLevel);
  }

  if (!updates.length) {
    return reply.code(400).send({ error: 'no updatable fields provided' });
  }

  updates.push("updated_at = datetime('now')");
  params.push(userId);

  try {
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) {
      return reply.code(409).send({ error: 'email or deviceId already exists' });
    }
    throw error;
  }

  return fetchUser(userId);
});

app.post('/pairs/invite', async (request, reply) => {
  const { userId } = request.body || {};
  if (!userId) return reply.code(400).send({ error: 'userId is required' });

  const user = fetchUser(userId);
  if (!user) return reply.code(404).send({ error: 'user not found' });

  const existing = db
    .prepare(
      `
      SELECT *
      FROM pairs
      WHERE (user1_id = ? OR user2_id = ?)
        AND status IN ('awaiting', 'active')
      ORDER BY datetime(created_at) DESC
      LIMIT 1
      `
    )
    .get(userId, userId);

  if (existing && existing.status === 'active') {
    return reply.code(409).send({ error: 'user is already in an active pair', pair: existing });
  }

  if (existing && existing.status === 'awaiting' && existing.user1_id === userId) {
    return existing;
  }

  const pairId = makeId('pair');
  let inviteCode = inviteCodeGenerator();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const conflict = db.prepare('SELECT 1 FROM pairs WHERE invite_code = ?').get(inviteCode);
    if (!conflict) break;
    inviteCode = inviteCodeGenerator();
  }

  db.prepare(
    `
    INSERT INTO pairs (id, user1_id, invite_code, status)
    VALUES (?, ?, ?, 'awaiting')
    `
  ).run(pairId, userId, inviteCode);

  const pair = fetchPair(pairId);
  return {
    ...pair,
    shareText: `Invite code: ${inviteCode}`
  };
});

app.post('/pairs/join', async (request, reply) => {
  const body = request.body || {};
  const userId = body.userId;
  const inviteCode = String(body.inviteCode || '').trim().toUpperCase();

  if (!userId || !inviteCode) {
    return reply.code(400).send({ error: 'userId and inviteCode are required' });
  }

  if (!fetchUser(userId)) {
    return reply.code(404).send({ error: 'user not found' });
  }

  const pair = db
    .prepare("SELECT * FROM pairs WHERE invite_code = ? AND status = 'awaiting'")
    .get(inviteCode);

  if (!pair) {
    return reply.code(404).send({ error: 'valid invite pair not found' });
  }

  if (pair.user1_id === userId) {
    return reply.code(400).send({ error: 'cannot join your own invite' });
  }

  const updateResult = db
    .prepare(
      `
      UPDATE pairs
      SET user2_id = ?,
          status = 'active',
          updated_at = datetime('now')
      WHERE id = ? AND status = 'awaiting'
      `
    )
    .run(userId, pair.id);

  if (!updateResult.changes) {
    return reply.code(409).send({ error: 'pair was already joined' });
  }

  db.prepare(
    `
    INSERT INTO pair_nudge_state (pair_id, updated_at)
    VALUES (?, datetime('now'))
    ON CONFLICT(pair_id) DO NOTHING
    `
  ).run(pair.id);

  return fetchPair(pair.id);
});

app.get('/users/:userId/pair', async (request, reply) => {
  const { userId } = request.params;
  if (!fetchUser(userId)) return reply.code(404).send({ error: 'user not found' });

  const pair = db
    .prepare(
      `
      SELECT *
      FROM pairs
      WHERE (user1_id = ? OR user2_id = ?)
        AND status IN ('awaiting', 'active')
      ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, datetime(created_at) DESC
      LIMIT 1
      `
    )
    .get(userId, userId);

  if (!pair) return reply.code(404).send({ error: 'pair not found' });
  return pair;
});

app.post('/pairs/:pairId/wishes', async (request, reply) => {
  const { pairId } = request.params;
  const body = request.body || {};
  const pair = fetchPair(pairId);

  if (!pair || pair.status !== 'active') {
    return reply.code(404).send({ error: 'active pair not found' });
  }

  const createdBy = body.createdBy || request.headers['x-user-id'];
  if (!createdBy || !ensurePairMembership(pair, createdBy)) {
    return reply.code(400).send({ error: 'createdBy must be one of pair members' });
  }

  const title = normalizeText(body.title);
  if (!title) return reply.code(400).send({ error: 'title is required' });

  const wishId = makeId('wish');
  const priority = body.priority || 'medium';
  const status = body.status || 'pending';

  if (!VALID_PRIORITIES.has(priority)) {
    return reply.code(400).send({ error: 'priority must be low, medium, or high' });
  }

  if (!VALID_WISH_STATUSES.has(status)) {
    return reply.code(400).send({ error: 'status must be pending or completed' });
  }

  db.prepare(
    `
    INSERT INTO wishes (
      id, pair_id, created_by, title, category, priority,
      timing, budget_range, budget_min, budget_max, memo, status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
  ).run(
    wishId,
    pairId,
    createdBy,
    title,
    normalizeText(body.category),
    priority,
    normalizeText(body.timing),
    normalizeText(body.budgetRange),
    body.budgetMin ?? null,
    body.budgetMax ?? null,
    normalizeText(body.memo),
    status
  );

  return db.prepare('SELECT * FROM wishes WHERE id = ?').get(wishId);
});

app.get('/pairs/:pairId/wishes', async (request, reply) => {
  const { pairId } = request.params;
  const pair = fetchPair(pairId);
  if (!pair) return reply.code(404).send({ error: 'pair not found' });

  const query = request.query || {};

  if (query.priority && !VALID_PRIORITIES.has(query.priority)) {
    return reply.code(400).send({ error: 'priority filter must be low, medium, or high' });
  }

  if (query.status && !VALID_WISH_STATUSES.has(query.status)) {
    return reply.code(400).send({ error: 'status filter must be pending or completed' });
  }

  const { whereClause, params } = buildWishFilters(pairId, query);

  const sortBy = SORT_FIELDS[query.sortBy] || 'created_at';
  const sortOrder = String(query.order || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const limit = Math.min(parsePositiveInt(query.limit, 50), 200);
  const offset = parsePositiveInt(query.offset, 0);

  const sql = `
    SELECT *
    FROM wishes
    WHERE ${whereClause}
    ORDER BY ${sortBy} ${sortOrder}
    LIMIT ? OFFSET ?
  `;

  const items = db.prepare(sql).all(...params, limit, offset);
  const total = db.prepare(`SELECT COUNT(*) AS count FROM wishes WHERE ${whereClause}`).get(...params).count;

  return {
    total,
    limit,
    offset,
    items
  };
});

app.patch('/wishes/:wishId', async (request, reply) => {
  const { wishId } = request.params;
  const existing = db.prepare('SELECT * FROM wishes WHERE id = ?').get(wishId);
  if (!existing) return reply.code(404).send({ error: 'wish not found' });

  const body = request.body || {};

  if (Object.hasOwn(body, 'priority') && !VALID_PRIORITIES.has(body.priority)) {
    return reply.code(400).send({ error: 'priority must be low, medium, or high' });
  }

  if (Object.hasOwn(body, 'status') && !VALID_WISH_STATUSES.has(body.status)) {
    return reply.code(400).send({ error: 'status must be pending or completed' });
  }

  const updates = [];
  const params = [];

  const mapping = [
    ['title', 'title', normalizeText],
    ['category', 'category', normalizeText],
    ['priority', 'priority', (v) => v],
    ['timing', 'timing', normalizeText],
    ['budgetRange', 'budget_range', normalizeText],
    ['budgetMin', 'budget_min', (v) => v],
    ['budgetMax', 'budget_max', (v) => v],
    ['memo', 'memo', normalizeText],
    ['status', 'status', (v) => v]
  ];

  for (const [requestKey, columnName, transform] of mapping) {
    if (Object.hasOwn(body, requestKey)) {
      updates.push(`${columnName} = ?`);
      params.push(transform(body[requestKey]));
    }
  }

  if (!updates.length) {
    return reply.code(400).send({ error: 'no updatable fields provided' });
  }

  if (Object.hasOwn(body, 'status')) {
    const completed = body.status === 'completed';
    updates.push(`completed_at = ${completed ? "datetime('now')" : 'NULL'}`);
  }

  updates.push("updated_at = datetime('now')");
  params.push(wishId);

  db.prepare(`UPDATE wishes SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  return db.prepare('SELECT * FROM wishes WHERE id = ?').get(wishId);
});

app.post('/wishes/:wishId/complete', async (request, reply) => {
  const { wishId } = request.params;
  const existing = db.prepare('SELECT * FROM wishes WHERE id = ?').get(wishId);
  if (!existing) return reply.code(404).send({ error: 'wish not found' });

  const completed = (request.body || {}).completed !== false;

  db.prepare(
    `
    UPDATE wishes
    SET status = ?,
        completed_at = ${completed ? "datetime('now')" : 'NULL'},
        updated_at = datetime('now')
    WHERE id = ?
    `
  ).run(completed ? 'completed' : 'pending', wishId);

  return db.prepare('SELECT * FROM wishes WHERE id = ?').get(wishId);
});

app.delete('/wishes/:wishId', async (request, reply) => {
  const { wishId } = request.params;
  const result = db.prepare('DELETE FROM wishes WHERE id = ?').run(wishId);
  if (!result.changes) return reply.code(404).send({ error: 'wish not found' });
  return { ok: true };
});

app.post('/nudges/trigger', async (request, reply) => {
  const body = request.body || {};
  const force = body.force ?? true;
  const minAgeDays = Number(body.minAgeDays ?? process.env.NUDGE_MIN_AGE_DAYS ?? 3);

  if (!Number.isFinite(minAgeDays) || minAgeDays < 0) {
    return reply.code(400).send({ error: 'minAgeDays must be a non-negative number' });
  }

  const result = await triggerNudges({
    pairId: body.pairId || null,
    force: Boolean(force),
    minAgeDays
  });

  return result;
});

app.get('/nudges/config', async () => ({
  nudgeLevels: {
    0: 'weekly',
    1: 'every_3_days',
    2: 'daily',
    3: 'twice_daily'
  },
  scheduler: {
    enabled: process.env.NUDGE_CRON_ENABLED === 'true',
    cadence: 'hourly check, fires only when pair cadence is due'
  }
}));

if (process.env.NUDGE_CRON_ENABLED === 'true') {
  cron.schedule('0 * * * *', async () => {
    const minAgeDays = Number(process.env.NUDGE_MIN_AGE_DAYS ?? 3);
    try {
      const result = await triggerNudges({ force: false, minAgeDays });
      app.log.info({ result }, 'hourly nudge run completed');
    } catch (error) {
      app.log.error({ error }, 'hourly nudge run failed');
    }
  });
}

const port = Number(process.env.PORT || 8787);

app.listen({ host: '0.0.0.0', port }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
