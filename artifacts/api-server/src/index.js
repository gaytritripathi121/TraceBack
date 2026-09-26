```js
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomBytes, randomUUID } from "node:crypto";
import { ensureSchema, pool, query } from "./db.js";
import { findPotentialMatches } from "./matchingService.js";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const frontendPath = path.resolve(
  __dirname,
  "../../traceback/dist/public"
);

const JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.SESSION_SECRET ||
  "traceback-preview-secret";

const COOKIE = "traceback_session";

const safeUser = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role,
  avatar: row.avatar || null,
  emailVerified: Boolean(row.email_verified_at),
  createdAt: row.created_at,
});

const sendError = (res, status, error) =>
  res.status(status).json({ error });

app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));

function issueSession(res, userId) {
  const token = jwt.sign({ sub: userId }, JWT_SECRET, {
    expiresIn: "7d",
  });

  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

async function currentUser(req) {
  const token = req.cookies[COOKIE];

  if (!token) return null;

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    const result = await query(
      "SELECT * FROM tb_users WHERE id = $1",
      [payload.sub]
    );

    return result.rows[0] || null;
  } catch {
    return null;
  }
}

async function requireUser(req, res, next) {
  const user = await currentUser(req);

  if (!user) {
    return sendError(res, 401, "Please sign in to continue.");
  }

  req.user = user;
  next();
}

async function logActivity(userId, title, description) {
  await query(
    `INSERT INTO tb_activity
      (id, user_id, title, description)
     VALUES ($1, $2, $3, $4)`,
    [randomUUID(), userId, title, description]
  );
}

function reportView(row, userId) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    category: row.category,
    description: row.description,
    brand: row.brand || null,
    color: row.color || null,
    area: row.area,
    date: row.report_date || null,
    reportedAt: row.created_at,
    status: row.status,
    ownerId: row.owner_id,
    ownerName: row.owner_name,
    isMine: row.owner_id === userId,
  };
}

const reportSelect = `
  SELECT r.*, u.name AS owner_name
  FROM tb_reports r
  JOIN tb_users u ON u.id = r.owner_id
`;

app.get("/api/healthz", (_req, res) =>
  res.json({ status: "ok" })
);

app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name || !email || !password || password.length < 8) {
    return sendError(
      res,
      400,
      "Use a name, valid email, and password with at least 8 characters."
    );
  }

  const normalEmail = String(email).trim().toLowerCase();

  try {
    const existing = await query(
      "SELECT id FROM tb_users WHERE email = $1",
      [normalEmail]
    );

    if (existing.rowCount) {
      return sendError(
        res,
        409,
        "An account with that email already exists."
      );
    }

    const user = {
      id: randomUUID(),
      name: String(name).trim(),
      email: normalEmail,
      passwordHash: await bcrypt.hash(password, 12),
    };

    const result = await query(
      `INSERT INTO tb_users
        (id, name, email, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [user.id, user.name, user.email, user.passwordHash]
    );

    const verificationToken = randomBytes(24).toString("hex");

    await query(
      `INSERT INTO tb_email_verifications
        (token, user_id, expires_at)
       VALUES ($1, $2, now() + interval '24 hours')`,
      [verificationToken, user.id]
    );

    await logActivity(
      user.id,
      "Workspace created",
      "Your private TraceBack workspace is ready."
    );

    issueSession(res, user.id);

    res.status(201).json({
      user: safeUser(result.rows[0]),
      ...(process.env.NODE_ENV === "production"
        ? {}
        : { verificationToken }),
    });
  } catch (error) {
    res.status(500).json({
      error: "Unable to create the account.",
    });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};

  const result = await query(
    "SELECT * FROM tb_users WHERE email = $1",
    [String(email || "").trim().toLowerCase()]
  );

  const user = result.rows[0];

  if (
    !user ||
    !(await bcrypt.compare(
      String(password || ""),
      user.password_hash
    ))
  ) {
    return sendError(
      res,
      401,
      "Email or password is incorrect."
    );
  }

  issueSession(res, user.id);

  res.json({
    user: safeUser(user),
  });
});

app.post("/api/auth/logout", (_req, res) => {
  res.clearCookie(COOKIE);
  res.status(204).end();
});

app.post("/api/auth/forgot-password", async (req, res) => {
  const email = String(req.body?.email || "")
    .trim()
    .toLowerCase();

  const result = await query(
    "SELECT id FROM tb_users WHERE email = $1",
    [email]
  );

  const response = {
    message:
      "If an account exists, reset instructions are ready.",
  };

  if (
    result.rowCount &&
    process.env.NODE_ENV !== "production"
  ) {
    const token = randomBytes(24).toString("hex");

    await query(
      `INSERT INTO tb_password_resets
        (token, user_id, expires_at)
       VALUES ($1, $2, now() + interval '30 minutes')`,
      [token, result.rows[0].id]
    );

    response.previewToken = token;
  }

  res.json(response);
});

app.post("/api/auth/reset-password", async (req, res) => {
  const token = String(req.body?.token || "");
  const password = String(req.body?.password || "");

  if (password.length < 8 || !token) {
    return sendError(
      res,
      400,
      "Use a valid reset token and a password with at least 8 characters."
    );
  }

  const reset = await query(
    `SELECT user_id
     FROM tb_password_resets
     WHERE token = $1
       AND expires_at > now()`,
    [token]
  );

  if (!reset.rowCount) {
    return sendError(
      res,
      400,
      "That reset token is invalid or expired."
    );
  }

  await query(
    "UPDATE tb_users SET password_hash = $1 WHERE id = $2",
    [
      await bcrypt.hash(password, 12),
      reset.rows[0].user_id,
    ]
  );

  await query(
    "DELETE FROM tb_password_resets WHERE token = $1",
    [token]
  );

  res.json({
    message: "Password updated. You can sign in now.",
  });
});

app.get("/api/auth/verify-email", async (req, res) => {
  const token = String(req.query.token || "");

  const verification = await query(
    `SELECT user_id
     FROM tb_email_verifications
     WHERE token = $1
       AND expires_at > now()`,
    [token]
  );

  if (!verification.rowCount) {
    return sendError(
      res,
      400,
      "That verification link is invalid or expired."
    );
  }

  await query(
    "UPDATE tb_users SET email_verified_at = now() WHERE id = $1",
    [verification.rows[0].user_id]
  );

  await query(
    "DELETE FROM tb_email_verifications WHERE token = $1",
    [token]
  );

  res.json({
    message: "Email verified.",
  });
});

app.get("/api/auth/me", requireUser, (req, res) =>
  res.json(safeUser(req.user))
);

app.patch("/api/profile", requireUser, async (req, res) => {
  const name = String(req.body?.name || "").trim();

  if (name.length < 2) {
    return sendError(
      res,
      400,
      "Name must be at least 2 characters."
    );
  }

  const result = await query(
    `UPDATE tb_users
     SET name = $1
     WHERE id = $2
     RETURNING *`,
    [name, req.user.id]
  );

  res.json(safeUser(result.rows[0]));
});

app.get("/api/public/stats", async (_req, res) => {
  const result = await query(`
    SELECT
      (SELECT COUNT(*)::int FROM tb_reports) AS "itemsReported",
      (SELECT COUNT(*)::int FROM tb_matches) AS "potentialMatches",
      (SELECT COUNT(*)::int
       FROM tb_recovery_cases
       WHERE status = 'recovered') AS "successfulRecoveries",
      (SELECT COUNT(*)::int
       FROM tb_users
       WHERE role = 'organization') AS "organizations"
  `);

  res.json(result.rows[0]);
});

app.get("/api/workspace/summary", requireUser, async (req, res) => {
  const result = await query(
    `SELECT
      COUNT(*) FILTER (WHERE type = 'lost')::int AS lost,
      COUNT(*) FILTER (WHERE type = 'found')::int AS found,
      COUNT(*) FILTER (WHERE status = 'matched')::int AS recovered_matches,
      COUNT(*) FILTER (WHERE status = 'recovered')::int AS recovered
     FROM tb_reports
     WHERE owner_id = $1`,
    [req.user.id]
  );

  const matches = await query(
    `SELECT COUNT(*)::int AS count
     FROM tb_matches m
     JOIN tb_reports r
       ON r.id IN (m.lost_report_id, m.found_report_id)
     WHERE r.owner_id = $1
       AND m.status IN ('pending', 'interested')`,
    [req.user.id]
  );

  const cases = await query(
    `SELECT COUNT(*)::int AS count
     FROM tb_recovery_cases
     WHERE (claimant_id = $1 OR finder_id = $1)
       AND status NOT IN ('recovered', 'closed')`,
    [req.user.id]
  );

  const unread = await query(
    `SELECT COUNT(*)::int AS count
     FROM tb_notifications
     WHERE user_id = $1
       AND read = false`,
    [req.user.id]
  );

  const row = result.rows[0];

  res.json({
    lost: row.lost,
    found: row.found,
    matches: matches.rows[0].count,
    activeCases: cases.rows[0].count,
    recovered: row.recovered,
    unreadNotifications: unread.rows[0].count,
  });
});

app.get("/api/workspace/activity", requireUser, async (req, res) => {
  const result = await query(
    `SELECT
      id,
      title,
      description,
      created_at AS "createdAt"
     FROM tb_activity
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 12`,
    [req.user.id]
  );

  res.json(result.rows);
});

app.get("/api/reports", requireUser, async (req, res) => {
  const values = [];
  const filters = ["r.status <> 'archived'"];

  if (req.query.type) {
    values.push(req.query.type);
    filters.push(`r.type = $${values.length}`);
  }

  if (req.query.category) {
    values.push(req.query.category);
    filters.push(`r.category = $${values.length}`);
  }

  if (req.query.search) {
    values.push(
      `%${String(req.query.search).toLowerCase()}%`
    );

    filters.push(
      `(LOWER(r.title) LIKE $${values.length}
        OR LOWER(r.description) LIKE $${values.length}
        OR LOWER(r.area) LIKE $${values.length})`
    );
  }

  const result = await query(
    `${reportSelect}
     WHERE ${filters.join(" AND ")}
     ORDER BY r.created_at DESC
     LIMIT 100`,
    values
  );

  res.json(
    result.rows.map((row) =>
      reportView(row, req.user.id)
    )
  );
});

app.post("/api/reports", requireUser, async (req, res) => {
  const {
    type,
    title,
    category,
    description,
    brand,
    color,
    area,
    date,
    time,
    privateDetails,
  } = req.body || {};

  if (
    !["lost", "found"].includes(type) ||
    !title ||
    !category ||
    !description ||
    !area
  ) {
    return sendError(
      res,
      400,
      "Add the item type, title, category, description, and general area."
    );
  }

  const result = await query(
    `INSERT INTO tb_reports
      (
        id,
        owner_id,
        type,
        title,
        category,
        description,
        brand,
        color,
        area,
        report_date,
        report_time,
        private_details
      )
     VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      randomUUID(),
      req.user.id,
      type,
      title.trim(),
      category,
      description.trim(),
      brand || null,
      color || null,
      area.trim(),
      date || null,
      time || null,
      privateDetails || null,
    ]
  );

  const report = result.rows[0];

  await logActivity(
    req.user.id,
    `${type === "lost" ? "Lost" : "Found"} item reported`,
    `${report.title} was added to your workspace.`
  );

  await findPotentialMatches(report);

  const view = await query(
    `${reportSelect} WHERE r.id = $1`,
    [report.id]
  );

  res.status(201).json(
    reportView(view.rows[0], req.user.id)
  );
});

app.get("/api/reports/:id", requireUser, async (req, res) => {
  const view = await query(
    `${reportSelect} WHERE r.id = $1`,
    [req.params.id]
  );

  if (!view.rowCount) {
    return sendError(res, 404, "Report not found.");
  }

  res.json(reportView(view.rows[0], req.user.id));
});

app.patch("/api/reports/:id", requireUser, async (req, res) => {
  const { title, description, status } = req.body || {};

  const result = await query(
    `UPDATE tb_reports
     SET
       title = COALESCE($1, title),
       description = COALESCE($2, description),
       status = COALESCE($3, status)
     WHERE id = $4
       AND owner_id = $5
     RETURNING id`,
    [
      title || null,
      description || null,
      status || null,
      req.params.id,
      req.user.id,
    ]
  );

  if (!result.rowCount) {
    return sendError(res, 404, "Report not found.");
  }

  const view = await query(
    `${reportSelect} WHERE r.id = $1`,
    [req.params.id]
  );

  res.json(reportView(view.rows[0], req.user.id));
});

app.delete("/api/reports/:id", requireUser, async (req, res) => {
  const result = await query(
    `DELETE FROM tb_reports
     WHERE id = $1
       AND owner_id = $2`,
    [req.params.id, req.user.id]
  );

  if (!result.rowCount) {
    return sendError(res, 404, "Report not found.");
  }

  res.status(204).end();
});

app.get("/api/matches", requireUser, async (req, res) => {
  const result = await query(
    `SELECT
      m.*,
      r.id AS report_id,
      r.type,
      r.title,
      r.category,
      r.description,
      r.brand,
      r.color,
      r.area,
      r.report_date,
      r.created_at,
      r.status AS report_status,
      r.owner_id,
      u.name AS owner_name
     FROM tb_matches m
     JOIN tb_reports r
       ON r.id = CASE
         WHEN r.type = 'lost'
         THEN m.found_report_id
         ELSE m.lost_report_id
       END
     JOIN tb_reports owned
       ON owned.id = CASE
         WHEN owned.type = 'lost'
         THEN m.lost_report_id
         ELSE m.found_report_id
       END
     JOIN tb_users u
       ON u.id = r.owner_id
     WHERE owned.owner_id = $1
     ORDER BY m.created_at DESC`,
    [req.user.id]
  );

  res.json(
    result.rows.map((row) => ({
      id: row.id,
      score: row.score,
      sharedAttributes: row.shared_attributes,
      status: row.status,
      report: {
        id: row.report_id,
        type: row.type,
        title: row.title,
        category: row.category,
        description: row.description,
        brand: row.brand,
        color: row.color,
        area: row.area,
        date: row.report_date,
        reportedAt: row.created_at,
        status: row.report_status,
        ownerId: row.owner_id,
        ownerName: row.owner_name,
        isMine: false,
      },
    }))
  );
});

app.post("/api/matches/:id/respond", requireUser, async (req, res) => {
  const response = req.body?.response;

  if (
    !["interested", "declined", "unsure"].includes(response)
  ) {
    return sendError(
      res,
      400,
      "Choose a valid response."
    );
  }

  const match = await query(
    `SELECT
      m.*,
      lost.owner_id AS claimant_id,
      found.owner_id AS finder_id
     FROM tb_matches m
     JOIN tb_reports lost
       ON lost.id = m.lost_report_id
     JOIN tb_reports found
       ON found.id = m.found_report_id
     WHERE m.id = $1
       AND (lost.owner_id = $2 OR found.owner_id = $2)`,
    [req.params.id, req.user.id]
  );

  if (!match.rowCount) {
    return sendError(res, 404, "Match not found.");
  }

  const field =
    match.rows[0].claimant_id === req.user.id
      ? "lost_response"
      : "found_response";

  const updated = await query(
    `UPDATE tb_matches
     SET
       ${field} = $1,
       status = CASE
         WHEN $1 = 'declined'
           THEN 'declined'
         WHEN (
           CASE
             WHEN $2 = 'lost_response'
             THEN found_response
             ELSE lost_response
           END
         ) = 'interested'
         AND $1 = 'interested'
           THEN 'verified'
         ELSE status
       END
     WHERE id = $3
     RETURNING *`,
    [response, field, req.params.id]
  );

  const row = updated.rows[0];

  if (row.status === "verified") {
    const exists = await query(
      "SELECT id FROM tb_recovery_cases WHERE match_id = $1",
      [row.id]
    );

    if (!exists.rowCount) {
      await query(
        `INSERT INTO tb_recovery_cases
          (id, match_id, claimant_id, finder_id)
         VALUES ($1, $2, $3, $4)`,
        [
          randomUUID(),
          row.id,
          match.rows[0].claimant_id,
          match.rows[0].finder_id,
        ]
      );

      const conversationId = randomUUID();

      await query(
        `INSERT INTO tb_conversations
          (id, match_id, subject)
         VALUES ($1, $2, $3)`,
        [
          conversationId,
          row.id,
          "TraceBack recovery conversation",
        ]
      );

      await query(
        `INSERT INTO tb_conversation_members
          (conversation_id, user_id)
         VALUES ($1, $2), ($1, $3)`,
        [
          conversationId,
          match.rows[0].claimant_id,
          match.rows[0].finder_id,
        ]
      );

      await query(
        `INSERT INTO tb_notifications
          (id, user_id, title, body, type)
         VALUES (
           $1,
           $2,
           'Recovery case opened',
           'Both sides expressed interest. Secure verification is ready to begin.',
           'recovery'
         )`,
        [randomUUID(), req.user.id]
      );
    }
  }

  res.json({
    id: row.id,
    score: row.score,
    sharedAttributes: row.shared_attributes,
    status: row.status,
  });
});

app.get("/api/notifications", requireUser, async (req, res) => {
  const result = await query(
    `UPDATE tb_notifications
     SET read = true
     WHERE user_id = $1
     RETURNING
       id,
       title,
       body,
       type,
       read,
       created_at AS "createdAt"`,
    [req.user.id]
  );

  res.json(result.rows);
});

app.get("/api/recovery", requireUser, async (req, res) => {
  const result = await query(
    `SELECT
      c.id,
      c.status,
      c.updated_at AS "updatedAt",
      lost.title AS title
     FROM tb_recovery_cases c
     JOIN tb_matches m
       ON m.id = c.match_id
     JOIN tb_reports lost
       ON lost.id = m.lost_report_id
     WHERE c.claimant_id = $1
        OR c.finder_id = $1
     ORDER BY c.updated_at DESC`,
    [req.user.id]
  );

  res.json(result.rows);
});

app.get("/api/conversations", requireUser, async (req, res) => {
  const result = await query(
    `SELECT
      c.id,
      c.subject,
      c.updated_at AS "updatedAt",
      (
        SELECT body
        FROM tb_messages
        WHERE conversation_id = c.id
        ORDER BY created_at DESC
        LIMIT 1
      ) AS last_message,
      (
        SELECT u.name
        FROM tb_conversation_members cm
        JOIN tb_users u
          ON u.id = cm.user_id
        WHERE cm.conversation_id = c.id
          AND cm.user_id <> $1
        LIMIT 1
      ) AS participant_name
     FROM tb_conversations c
     JOIN tb_conversation_members mine
       ON mine.conversation_id = c.id
      AND mine.user_id = $1
     ORDER BY c.updated_at DESC`,
    [req.user.id]
  );

  res.json(
    result.rows.map((row) => ({
      id: row.id,
      subject: row.subject,
      participantName:
        row.participant_name || "TraceBack member",
      lastMessage:
        row.last_message || "No messages yet",
      updatedAt: row.updatedAt,
    }))
  );
});

app.get(
  "/api/conversations/:id/messages",
  requireUser,
  async (req, res) => {
    const allowed = await query(
      `SELECT 1
       FROM tb_conversation_members
       WHERE conversation_id = $1
         AND user_id = $2`,
      [req.params.id, req.user.id]
    );

    if (!allowed.rowCount) {
      return sendError(
        res,
        404,
        "Conversation not found."
      );
    }

    const result = await query(
      `SELECT
        id,
        body,
        sender_id AS "senderId",
        created_at AS "createdAt"
       FROM tb_messages
       WHERE conversation_id = $1
       ORDER BY created_at`,
      [req.params.id]
    );

    res.json(result.rows);
  }
);

app.post(
  "/api/conversations/:id/messages",
  requireUser,
  async (req, res) => {
    const body = String(req.body?.body || "").trim();

    const allowed = await query(
      `SELECT 1
       FROM tb_conversation_members
       WHERE conversation_id = $1
         AND user_id = $2`,
      [req.params.id, req.user.id]
    );

    if (!allowed.rowCount) {
      return sendError(
        res,
        404,
        "Conversation not found."
      );
    }

    if (!body) {
      return sendError(
        res,
        400,
        "Message cannot be empty."
      );
    }

    const result = await query(
      `INSERT INTO tb_messages
        (id, conversation_id, sender_id, body)
       VALUES ($1, $2, $3, $4)
       RETURNING
        id,
        body,
        sender_id AS "senderId",
        created_at AS "createdAt"`,
      [
        randomUUID(),
        req.params.id,
        req.user.id,
        body,
      ]
    );

    await query(
      "UPDATE tb_conversations SET updated_at = now() WHERE id = $1",
      [req.params.id]
    );

    res.status(201).json(result.rows[0]);
  }
);

/*
 * Serve the React/Vite frontend.
 *
 * The Vite build is created at:
 * artifacts/traceback/dist/public
 *
 * API routes above remain available at /api/*
 */
app.use(express.static(frontendPath));

/*
 * Express 5 does NOT accept app.get("*").
 *
 * /{*splat} is the Express 5-compatible catch-all route.
 */
app.get("/{*splat}", (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return next();
  }

  res.sendFile(
    path.join(frontendPath, "index.html")
  );
});

app.use((err, _req, res, _next) => {
  res.status(500).json({
    error: "Something went wrong. Please try again.",
  });
});

const port = Number(process.env.PORT || 5000);

await ensureSchema();

app.listen(port, "0.0.0.0", () => {
  process.stdout.write(
    `TraceBack API listening on ${port}\n`
  );
});

process.on("SIGTERM", async () => {
  await pool.end();
  process.exit(0);
});
```
