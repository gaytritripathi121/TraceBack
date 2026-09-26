import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

export async function query(text, params = []) {
  return pool.query(text, params);
}

export async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tb_users (
      id uuid PRIMARY KEY,
      name text NOT NULL,
      email text NOT NULL UNIQUE,
      password_hash text NOT NULL,
      role text NOT NULL DEFAULT 'user',
      avatar text,
      email_verified_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE tb_users ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;
    CREATE TABLE IF NOT EXISTS tb_email_verifications (
      token text PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES tb_users(id) ON DELETE CASCADE,
      expires_at timestamptz NOT NULL
    );
    CREATE TABLE IF NOT EXISTS tb_password_resets (
      token text PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES tb_users(id) ON DELETE CASCADE,
      expires_at timestamptz NOT NULL
    );
    CREATE TABLE IF NOT EXISTS tb_reports (
      id uuid PRIMARY KEY,
      owner_id uuid NOT NULL REFERENCES tb_users(id) ON DELETE CASCADE,
      type text NOT NULL CHECK (type IN ('lost', 'found')),
      title text NOT NULL,
      category text NOT NULL,
      description text NOT NULL,
      brand text,
      color text,
      area text NOT NULL,
      report_date date,
      report_time text,
      private_details text,
      status text NOT NULL DEFAULT 'active',
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS tb_reports_owner_idx ON tb_reports(owner_id);
    CREATE INDEX IF NOT EXISTS tb_reports_search_idx ON tb_reports(type, category, status);
    CREATE TABLE IF NOT EXISTS tb_matches (
      id uuid PRIMARY KEY,
      lost_report_id uuid NOT NULL REFERENCES tb_reports(id) ON DELETE CASCADE,
      found_report_id uuid NOT NULL REFERENCES tb_reports(id) ON DELETE CASCADE,
      score integer NOT NULL,
      shared_attributes jsonb NOT NULL DEFAULT '[]'::jsonb,
      status text NOT NULL DEFAULT 'pending',
      lost_response text,
      found_response text,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(lost_report_id, found_report_id)
    );
    CREATE TABLE IF NOT EXISTS tb_notifications (
      id uuid PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES tb_users(id) ON DELETE CASCADE,
      title text NOT NULL,
      body text NOT NULL,
      type text NOT NULL,
      read boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS tb_notifications_user_idx ON tb_notifications(user_id, read);
    CREATE TABLE IF NOT EXISTS tb_activity (
      id uuid PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES tb_users(id) ON DELETE CASCADE,
      title text NOT NULL,
      description text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS tb_recovery_cases (
      id uuid PRIMARY KEY,
      match_id uuid NOT NULL UNIQUE REFERENCES tb_matches(id) ON DELETE CASCADE,
      claimant_id uuid NOT NULL REFERENCES tb_users(id) ON DELETE CASCADE,
      finder_id uuid NOT NULL REFERENCES tb_users(id) ON DELETE CASCADE,
      status text NOT NULL DEFAULT 'verification',
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS tb_conversations (
      id uuid PRIMARY KEY,
      match_id uuid NOT NULL UNIQUE REFERENCES tb_matches(id) ON DELETE CASCADE,
      subject text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS tb_conversation_members (
      conversation_id uuid NOT NULL REFERENCES tb_conversations(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES tb_users(id) ON DELETE CASCADE,
      PRIMARY KEY (conversation_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS tb_messages (
      id uuid PRIMARY KEY,
      conversation_id uuid NOT NULL REFERENCES tb_conversations(id) ON DELETE CASCADE,
      sender_id uuid NOT NULL REFERENCES tb_users(id) ON DELETE CASCADE,
      body text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
}