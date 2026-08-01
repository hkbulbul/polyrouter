import crypto from "node:crypto";
import { getAdapter } from "../driver.js";

function mapIdentity(row) {
  if (!row) return null;
  return {
    installationId: row.installationId,
    createdAt: row.createdAt,
    lastSentAt: row.lastSentAt || null,
  };
}

export async function getInstallationIdentity() {
  const db = await getAdapter();
  return mapIdentity(db.get(`SELECT installationId, createdAt, lastSentAt FROM installationIdentity WHERE id = 1`));
}

export async function getOrCreateInstallationIdentity() {
  const db = await getAdapter();
  let identity;
  let created = false;

  db.transaction(() => {
    const existing = db.get(`SELECT installationId, createdAt, lastSentAt FROM installationIdentity WHERE id = 1`);
    if (existing) {
      identity = mapIdentity(existing);
      return;
    }

    const createdAt = new Date().toISOString();
    identity = { installationId: crypto.randomUUID(), createdAt, lastSentAt: null };
    db.run(
      `INSERT INTO installationIdentity(id, installationId, createdAt, lastSentAt) VALUES(1, ?, ?, NULL)`,
      [identity.installationId, createdAt]
    );
    created = true;
  });

  return { ...identity, created };
}

export async function enqueueInstallationTelemetryEvent(event) {
  const db = await getAdapter();
  const now = new Date().toISOString();
  const target = event.target === "public" ? "public" : "private";

  db.transaction(() => {
    // A startup heartbeat represents current liveness; one queued heartbeat per destination is enough.
    if (event.eventType === "startup") {
      db.run(`DELETE FROM installationTelemetryQueue WHERE eventType = 'startup' AND target = ?`, [target]);
    }
    db.run(
      `INSERT OR IGNORE INTO installationTelemetryQueue(eventId, eventType, occurredAt, ipHash, appVersion, createdAt, attempts, nextAttemptAt, target)
       VALUES(?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [event.eventId, event.eventType, event.occurredAt, event.ipHash || null, event.appVersion || null, now, now, target]
    );
  });
}

export async function getPendingInstallationTelemetryEvents(limit = 20, target = null) {
  const db = await getAdapter();
  const values = [new Date().toISOString()];
  let targetFilter = "";
  if (target === "public" || target === "private") {
    targetFilter = " AND target = ?";
    values.push(target);
  }
  values.push(limit);
  return db.all(
    `SELECT eventId, eventType, occurredAt, ipHash, appVersion, attempts, target
     FROM installationTelemetryQueue
     WHERE nextAttemptAt <= ?${targetFilter}
     ORDER BY createdAt ASC
     LIMIT ?`,
    values
  ).map((row) => ({
    eventId: row.eventId,
    eventType: row.eventType,
    occurredAt: row.occurredAt,
    ipHash: row.ipHash || null,
    appVersion: row.appVersion || null,
    attempts: Number(row.attempts) || 0,
    target: row.target === "public" ? "public" : "private",
  }));
}

export async function discardInstallationTelemetryEventsByTarget(target) {
  if (target !== "public" && target !== "private") return;
  const db = await getAdapter();
  db.run(`DELETE FROM installationTelemetryQueue WHERE target = ?`, [target]);
}

export async function getNextInstallationTelemetryAttemptAt(target = null) {
  const db = await getAdapter();
  if (target === "public" || target === "private") {
    return db.get(`SELECT MIN(nextAttemptAt) AS nextAttemptAt FROM installationTelemetryQueue WHERE target = ?`, [target])?.nextAttemptAt || null;
  }
  return db.get(`SELECT MIN(nextAttemptAt) AS nextAttemptAt FROM installationTelemetryQueue`)?.nextAttemptAt || null;
}

export async function acknowledgeInstallationTelemetryEvent(eventId) {
  const db = await getAdapter();
  db.transaction(() => {
    db.run(`DELETE FROM installationTelemetryQueue WHERE eventId = ?`, [eventId]);
    db.run(`UPDATE installationIdentity SET lastSentAt = ? WHERE id = 1`, [new Date().toISOString()]);
  });
}

export async function deferInstallationTelemetryEvent(eventId, attempts) {
  const db = await getAdapter();
  const delayMs = Math.min(60 * 60 * 1000, 1000 * (2 ** Math.min(attempts, 10)));
  db.run(
    `UPDATE installationTelemetryQueue SET attempts = ?, nextAttemptAt = ? WHERE eventId = ?`,
    [attempts, new Date(Date.now() + delayMs).toISOString(), eventId]
  );
}

export async function discardInstallationTelemetryEvent(eventId) {
  const db = await getAdapter();
  db.run(`DELETE FROM installationTelemetryQueue WHERE eventId = ?`, [eventId]);
}
