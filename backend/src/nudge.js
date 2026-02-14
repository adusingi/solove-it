import { db } from './db.js';

const NUDGE_HOURS_BY_LEVEL = {
  0: 24 * 7,
  1: 24 * 3,
  2: 24,
  3: 12
};

function hoursForLevel(level) {
  const normalized = Number.isInteger(level) ? level : 1;
  return NUDGE_HOURS_BY_LEVEL[normalized] ?? NUDGE_HOURS_BY_LEVEL[1];
}

function randomNudgeBody(wishTitle) {
  const templates = [
    `ねえ、「${wishTitle}」忘れてない？`,
    `そろそろ「${wishTitle}」どう？`,
    `今日こそ「${wishTitle}」を実行しよう`,
    `未達成Wish: 「${wishTitle}」`
  ];

  const idx = Math.floor(Math.random() * templates.length);
  return templates[idx];
}

function isDue(lastNudgedAt, nudgeLevel) {
  if (!lastNudgedAt) return true;

  const lastAt = new Date(lastNudgedAt).getTime();
  if (Number.isNaN(lastAt)) return true;

  const elapsedHours = (Date.now() - lastAt) / (1000 * 60 * 60);
  return elapsedHours >= hoursForLevel(nudgeLevel);
}

function pickRandomWish(pairId, minAgeDays) {
  const wishes = db
    .prepare(
      `
      SELECT *
      FROM wishes
      WHERE pair_id = ?
        AND status = 'pending'
        AND priority = 'high'
        AND datetime(created_at) <= datetime('now', ?)
      `
    )
    .all(pairId, `-${minAgeDays} days`);

  if (!wishes.length) return null;
  return wishes[Math.floor(Math.random() * wishes.length)];
}

async function sendExpoPush(messages) {
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(messages)
  });

  if (!response.ok) {
    throw new Error(`Expo push request failed: ${response.status}`);
  }

  const json = await response.json();
  return json.data || [];
}

function ensurePairState(pairId) {
  db.prepare(
    `
    INSERT INTO pair_nudge_state (pair_id, updated_at)
    VALUES (?, datetime('now'))
    ON CONFLICT(pair_id) DO NOTHING
    `
  ).run(pairId);
}

async function deliverNudge(pairRow, wish) {
  const body = randomNudgeBody(wish.title);

  const recipients = [
    {
      userId: pairRow.user1_id,
      pushToken: pairRow.user1_push_token,
      nudgeLevel: pairRow.user1_nudge_level
    },
    {
      userId: pairRow.user2_id,
      pushToken: pairRow.user2_push_token,
      nudgeLevel: pairRow.user2_nudge_level
    }
  ].filter((entry) => entry.userId);

  const expoEnabled = process.env.EXPO_PUSH_ENABLED === 'true';
  const expoCandidates = recipients.filter(
    (entry) =>
      typeof entry.pushToken === 'string' &&
      (entry.pushToken.startsWith('ExponentPushToken') || entry.pushToken.startsWith('ExpoPushToken'))
  );

  let expoResponses = [];
  if (expoEnabled && expoCandidates.length > 0) {
    const messages = expoCandidates.map((entry) => ({
      to: entry.pushToken,
      sound: 'default',
      title: 'Wish Nudge',
      body,
      data: {
        pairId: pairRow.pair_id,
        wishId: wish.id
      }
    }));

    try {
      expoResponses = await sendExpoPush(messages);
    } catch (error) {
      return recipients.map((entry) => ({
        userId: entry.userId,
        channel: 'expo',
        sent: false,
        reason: String(error.message || error)
      }));
    }
  }

  return recipients.map((entry, idx) => {
    if (!expoEnabled) {
      return {
        userId: entry.userId,
        channel: 'simulated',
        sent: true,
        message: body
      };
    }

    if (!entry.pushToken) {
      return {
        userId: entry.userId,
        channel: 'simulated',
        sent: true,
        reason: 'missing_push_token',
        message: body
      };
    }

    const expoIndex = expoCandidates.findIndex((candidate) => candidate.userId === entry.userId);
    if (expoIndex === -1) {
      return {
        userId: entry.userId,
        channel: 'simulated',
        sent: true,
        reason: 'invalid_push_token',
        message: body
      };
    }

    const expoResult = expoResponses[expoIndex] || {};
    return {
      userId: entry.userId,
      channel: 'expo',
      sent: expoResult.status === 'ok',
      expo: expoResult,
      message: body
    };
  });
}

export async function triggerNudges({ pairId = null, force = false, minAgeDays = 3 } = {}) {
  const queryBase = `
    SELECT
      p.id AS pair_id,
      p.user1_id,
      p.user2_id,
      s.last_nudged_at,
      u1.push_token AS user1_push_token,
      u2.push_token AS user2_push_token,
      COALESCE(u1.nudge_level, 1) AS user1_nudge_level,
      COALESCE(u2.nudge_level, 1) AS user2_nudge_level
    FROM pairs p
    JOIN users u1 ON u1.id = p.user1_id
    JOIN users u2 ON u2.id = p.user2_id
    LEFT JOIN pair_nudge_state s ON s.pair_id = p.id
    WHERE p.status = 'active'
  `;

  const pairs = pairId
    ? db.prepare(`${queryBase} AND p.id = ?`).all(pairId)
    : db.prepare(queryBase).all();

  const results = [];

  for (const pair of pairs) {
    ensurePairState(pair.pair_id);

    const effectiveLevel = Math.max(pair.user1_nudge_level, pair.user2_nudge_level);
    if (!force && !isDue(pair.last_nudged_at, effectiveLevel)) {
      results.push({
        pairId: pair.pair_id,
        status: 'skipped',
        reason: 'cadence_not_due',
        nudgeLevel: effectiveLevel
      });
      continue;
    }

    const wish = pickRandomWish(pair.pair_id, minAgeDays);
    if (!wish) {
      results.push({
        pairId: pair.pair_id,
        status: 'skipped',
        reason: 'no_pending_high_priority_wish_older_than_threshold',
        nudgeLevel: effectiveLevel
      });
      continue;
    }

    const deliveries = await deliverNudge(pair, wish);

    db.prepare(
      `
      INSERT INTO pair_nudge_state (pair_id, last_nudged_at, last_wish_id, updated_at)
      VALUES (?, datetime('now'), ?, datetime('now'))
      ON CONFLICT(pair_id) DO UPDATE SET
        last_nudged_at = excluded.last_nudged_at,
        last_wish_id = excluded.last_wish_id,
        updated_at = excluded.updated_at
      `
    ).run(pair.pair_id, wish.id);

    results.push({
      pairId: pair.pair_id,
      status: 'nudged',
      nudgeLevel: effectiveLevel,
      wish: {
        id: wish.id,
        title: wish.title,
        priority: wish.priority,
        createdAt: wish.created_at
      },
      deliveries
    });
  }

  return {
    force,
    minAgeDays,
    processedPairs: pairs.length,
    results
  };
}
