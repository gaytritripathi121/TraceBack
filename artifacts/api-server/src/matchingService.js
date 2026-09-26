import { randomUUID } from "node:crypto";
import { query } from "./db.js";

const weights = {
  category: 25,
  area: 20,
  date: 15,
  brand: 15,
  color: 10,
  description: 10,
  type: 5,
};

const normalise = (value) => String(value || "").trim().toLowerCase();

function wordOverlap(a, b) {
  const left = new Set(normalise(a).split(/\W+/).filter(Boolean));
  const right = new Set(normalise(b).split(/\W+/).filter(Boolean));
  if (!left.size || !right.size) return 0;
  const shared = [...left].filter((word) => right.has(word)).length;
  return shared / Math.max(left.size, right.size);
}

export function calculateCompatibility(source, candidate) {
  const shared = [];
  let score = 0;
  const same = (a, b) => normalise(a) && normalise(a) === normalise(b);

  if (same(source.category, candidate.category)) {
    score += weights.category;
    shared.push("Same category");
  }
  if (wordOverlap(source.area, candidate.area) >= 0.35) {
    score += weights.area;
    shared.push("Similar area");
  }
  if (source.report_date && candidate.report_date && source.report_date === candidate.report_date) {
    score += weights.date;
    shared.push("Same date");
  }
  if (same(source.brand, candidate.brand)) {
    score += weights.brand;
    shared.push("Same brand");
  }
  if (same(source.color, candidate.color)) {
    score += weights.color;
    shared.push("Same color");
  }
  if (wordOverlap(source.description, candidate.description) >= 0.2) {
    score += weights.description;
    shared.push("Related description");
  }
  if (source.type !== candidate.type) {
    score += weights.type;
  }

  return { score: Math.min(99, score), shared };
}

export async function findPotentialMatches(report) {
  const opposite = report.type === "lost" ? "found" : "lost";
  const candidates = await query(
    `SELECT * FROM tb_reports
     WHERE type = $1 AND status IN ('active', 'matched') AND owner_id <> $2
     ORDER BY created_at DESC LIMIT 100`,
    [opposite, report.owner_id],
  );

  const matches = [];
  for (const candidate of candidates.rows) {
    const lost = report.type === "lost" ? report : candidate;
    const found = report.type === "found" ? report : candidate;
    const { score, shared } = calculateCompatibility(lost, found);
    if (score < 45) continue;

    const existing = await query(
      `SELECT id FROM tb_matches WHERE lost_report_id = $1 AND found_report_id = $2`,
      [lost.id, found.id],
    );
    if (existing.rowCount) continue;

    const matchId = randomUUID();
    await query(
      `INSERT INTO tb_matches (id, lost_report_id, found_report_id, score, shared_attributes)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [matchId, lost.id, found.id, score, JSON.stringify(shared)],
    );
    await query(
      `UPDATE tb_reports SET status = 'matched' WHERE id = ANY($1::uuid[])`,
      [[lost.id, found.id]],
    );

    const body = `We found a found-item report that shares ${shared.length || "several"} characteristics with your ${report.type === "lost" ? "lost" : "found"} report.`;
    await Promise.all([
      query(
        `INSERT INTO tb_notifications (id, user_id, title, body, type)
         VALUES ($1, $2, 'Potential match found', $3, 'match')`,
        [randomUUID(), lost.owner_id, body],
      ),
      query(
        `INSERT INTO tb_notifications (id, user_id, title, body, type)
         VALUES ($1, $2, 'Potential match found', $3, 'match')`,
        [randomUUID(), found.owner_id, body],
      ),
    ]);
    matches.push({ id: matchId, score, shared });
  }
  return matches;
}