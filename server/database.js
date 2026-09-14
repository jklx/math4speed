const crypto = require('crypto');
const { Pool } = require('pg');

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const STUDENT_SESSION_TTL_MS = 180 * 24 * 60 * 60 * 1000;

let pool = null;

function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

function getPool() {
  if (!isDatabaseConfigured()) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined
    });
  }
  return pool;
}

function newId() {
  return crypto.randomUUID();
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('base64url')) {
  const derived = crypto.scryptSync(password, salt, 64).toString('base64url');
  return `scrypt$${salt}$${derived}`;
}

function verifyPassword(password, stored) {
  const [algorithm, salt, expected] = String(stored || '').split('$');
  if (algorithm !== 'scrypt' || !salt || !expected) return false;
  const actual = hashPassword(password, salt).split('$')[2];
  return crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

function createSessionToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function initializeDatabase() {
  const db = getPool();
  if (!db) return false;

  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'teacher')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS auth_sessions (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS classes (
      id UUID PRIMARY KEY,
      teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (teacher_id, name)
    );

    CREATE TABLE IF NOT EXISTS students (
      id UUID PRIMARY KEY,
      class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      display_name TEXT NOT NULL,
      access_code TEXT NOT NULL UNIQUE,
      access_code_normalized TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS assignments (
      id UUID PRIMARY KEY,
      class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      settings JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      archived_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS exams (
      id UUID PRIMARY KEY,
      class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      settings JSONB NOT NULL DEFAULT '{}'::jsonb,
      duration_seconds INTEGER NOT NULL CHECK (duration_seconds BETWEEN 60 AND 7200),
      seb_required BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      archived_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS exam_rooms (
      id UUID PRIMARY KEY,
      exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
      access_token_hash TEXT NOT NULL UNIQUE,
      access_token TEXT,
      seb_config_key TEXT,
      status TEXT NOT NULL CHECK (status IN ('waiting', 'code_released', 'running', 'finished')) DEFAULT 'waiting',
      start_code_hash TEXT,
      start_code_expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      started_at TIMESTAMPTZ,
      finished_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS exam_room_students (
      room_id UUID NOT NULL REFERENCES exam_rooms(id) ON DELETE CASCADE,
      student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
      status TEXT NOT NULL CHECK (status IN ('pending', 'ready', 'absent', 'started', 'finished')) DEFAULT 'pending',
      ready_at TIMESTAMPTZ,
      started_at TIMESTAMPTZ,
      finished_at TIMESTAMPTZ,
      correct_count INTEGER NOT NULL DEFAULT 0 CHECK (correct_count >= 0),
      wrong_count INTEGER NOT NULL DEFAULT 0 CHECK (wrong_count >= 0),
      task_plan JSONB,
      current_position INTEGER NOT NULL DEFAULT 0 CHECK (current_position >= 0),
      remaining_seconds INTEGER CHECK (remaining_seconds >= 0),
      last_progress_at TIMESTAMPTZ,
      PRIMARY KEY (room_id, student_id)
    );

    CREATE TABLE IF NOT EXISTS exam_attempts (
      room_id UUID NOT NULL REFERENCES exam_rooms(id) ON DELETE CASCADE,
      student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      finished_at TIMESTAMPTZ,
      correct_count INTEGER NOT NULL DEFAULT 0 CHECK (correct_count >= 0),
      wrong_count INTEGER NOT NULL DEFAULT 0 CHECK (wrong_count >= 0),
      PRIMARY KEY (room_id, student_id)
    );

    CREATE TABLE IF NOT EXISTS exam_answers (
      room_id UUID NOT NULL REFERENCES exam_rooms(id) ON DELETE CASCADE,
      student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
      position INTEGER NOT NULL CHECK (position >= 0),
      task JSONB NOT NULL,
      submitted_answer JSONB NOT NULL,
      is_correct BOOLEAN NOT NULL,
      assisted BOOLEAN NOT NULL DEFAULT FALSE,
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (room_id, student_id, position)
    );

    CREATE TABLE IF NOT EXISTS practice_sessions (
      id UUID PRIMARY KEY,
      student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL,
      category TEXT NOT NULL,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ,
      duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
      correct_count INTEGER NOT NULL DEFAULT 0 CHECK (correct_count >= 0),
      wrong_count INTEGER NOT NULL DEFAULT 0 CHECK (wrong_count >= 0)
    );

    CREATE TABLE IF NOT EXISTS student_sessions (
      id UUID PRIMARY KEY,
      student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE classes ADD COLUMN IF NOT EXISTS is_rehearsal BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE exams ADD COLUMN IF NOT EXISTS rehearsal_source_id UUID REFERENCES exams(id) ON DELETE CASCADE;
    ALTER TABLE classes ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
    ALTER TABLE students ADD COLUMN IF NOT EXISTS rehearsal_bot_profile TEXT CHECK (rehearsal_bot_profile IN ('fast', 'steady'));
    CREATE UNIQUE INDEX IF NOT EXISTS students_rehearsal_bot_per_class ON students (class_id, rehearsal_bot_profile) WHERE rehearsal_bot_profile IS NOT NULL;
    ALTER TABLE students ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
    ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL;
    ALTER TABLE assignments ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb;
    ALTER TABLE assignments ADD COLUMN IF NOT EXISTS policy JSONB NOT NULL DEFAULT '{}'::jsonb;
    ALTER TABLE exams ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb;
    ALTER TABLE exams ADD COLUMN IF NOT EXISTS seb_required BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE exam_rooms ADD COLUMN IF NOT EXISTS seb_config_key TEXT;
    ALTER TABLE exam_rooms ADD COLUMN IF NOT EXISTS access_token TEXT;
    ALTER TABLE exam_room_students ADD COLUMN IF NOT EXISTS correct_count INTEGER NOT NULL DEFAULT 0 CHECK (correct_count >= 0);
    ALTER TABLE exam_room_students ADD COLUMN IF NOT EXISTS wrong_count INTEGER NOT NULL DEFAULT 0 CHECK (wrong_count >= 0);
    ALTER TABLE exam_room_students ADD COLUMN IF NOT EXISTS task_plan JSONB;
    ALTER TABLE exam_room_students ADD COLUMN IF NOT EXISTS current_position INTEGER NOT NULL DEFAULT 0 CHECK (current_position >= 0);
    ALTER TABLE exam_room_students ADD COLUMN IF NOT EXISTS remaining_seconds INTEGER CHECK (remaining_seconds >= 0);
    ALTER TABLE exam_room_students ADD COLUMN IF NOT EXISTS last_progress_at TIMESTAMPTZ;
    CREATE INDEX IF NOT EXISTS exam_answers_by_student ON exam_answers (room_id, student_id, position);
    UPDATE students
       SET access_code = REPLACE(access_code, '-', ''),
           access_code_normalized = LOWER(REPLACE(access_code, '-', ''))
     WHERE access_code LIKE '%-%';
    CREATE UNIQUE INDEX IF NOT EXISTS exam_rooms_one_active_execution_per_exam ON exam_rooms (exam_id) WHERE access_token IS NOT NULL;
    UPDATE exam_room_students ers SET correct_count = ea.correct_count, wrong_count = ea.wrong_count, finished_at = COALESCE(ers.finished_at, ea.finished_at)
      FROM exam_attempts ea WHERE ea.room_id = ers.room_id AND ea.student_id = ers.student_id;
    -- Repair rooms whose participants were saved but whose final status update was interrupted.
    UPDATE exam_rooms r SET status = 'finished', finished_at = COALESCE(r.finished_at, NOW())
      WHERE r.status = 'running'
        AND EXISTS (SELECT 1 FROM exam_room_students ers WHERE ers.room_id = r.id AND ers.status = 'finished')
        AND NOT EXISTS (SELECT 1 FROM exam_room_students ers WHERE ers.room_id = r.id AND ers.status NOT IN ('finished', 'absent'));
    ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email') THEN
        ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
      END IF;
    END $$;
    CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique ON users (username) WHERE username IS NOT NULL;
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'users'::regclass AND contype = 'u' AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'users'::regclass AND attname = 'username')]) THEN
        ALTER TABLE users ADD CONSTRAINT users_username_key UNIQUE (username);
      END IF;
    END $$;
  `);

  const adminUsername = String(process.env.ADMIN_USERNAME || '').trim().toLowerCase();
  const adminPassword = String(process.env.ADMIN_PASSWORD || '');
  if (adminUsername && /^[a-z0-9][a-z0-9._-]{2,39}$/.test(adminUsername) && adminPassword.length >= 12) {
    await db.query(
      `INSERT INTO users (id, username, display_name, password_hash, role)
       VALUES ($1, $2, $3, $4, 'admin') ON CONFLICT (username) DO NOTHING`,
      [newId(), adminUsername, process.env.ADMIN_DISPLAY_NAME || 'Administration', hashPassword(adminPassword)]
    );
  }
  return true;
}

async function createUser({ username, displayName, password, role }) {
  const db = getPool();
  const result = await db.query(
    `INSERT INTO users (id, username, display_name, password_hash, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, username, display_name AS "displayName", role`,
    [newId(), username.toLowerCase(), displayName, hashPassword(password), role]
  );
  return result.rows[0];
}

async function findUserByUsername(username) {
  const db = getPool();
  const result = await db.query(
    `SELECT id, username, display_name AS "displayName", password_hash AS "passwordHash", role
     FROM users WHERE username = $1`, [username.toLowerCase()]
  );
  return result.rows[0] || null;
}

async function createSession(userId) {
  const db = getPool();
  const token = createSessionToken();
  await db.query('DELETE FROM auth_sessions WHERE expires_at <= NOW()');
  await db.query(
    `INSERT INTO auth_sessions (id, user_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [newId(), userId, hashToken(token), new Date(Date.now() + SESSION_TTL_MS)]
  );
  return token;
}

async function findSessionUser(token) {
  if (!token) return null;
  const db = getPool();
  const result = await db.query(
    `SELECT u.id, u.username, u.display_name AS "displayName", u.role
     FROM auth_sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > NOW()`, [hashToken(token)]
  );
  return result.rows[0] || null;
}

async function deleteSession(token) {
  if (!token) return;
  await getPool().query('DELETE FROM auth_sessions WHERE token_hash = $1', [hashToken(token)]);
}

async function createStudentSession(studentId) {
  const db = getPool();
  const token = createSessionToken();
  await db.query('DELETE FROM student_sessions WHERE expires_at <= NOW()');
  await db.query(
    `INSERT INTO student_sessions (id, student_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [newId(), studentId, hashToken(token), new Date(Date.now() + STUDENT_SESSION_TTL_MS)]
  );
  return token;
}

async function findStudentByCode(accessCode) {
  const db = getPool();
  const result = await db.query(
    `SELECT s.id, s.display_name AS "displayName", s.class_id AS "classId", c.name AS "className"
     FROM students s JOIN classes c ON c.id = s.class_id
     WHERE s.access_code_normalized = $1 AND s.archived_at IS NULL AND c.archived_at IS NULL`, [accessCode]
  );
  return result.rows[0] || null;
}

async function findStudentSession(token) {
  if (!token) return null;
  const db = getPool();
  const result = await db.query(
    `SELECT s.id, s.display_name AS "displayName", s.class_id AS "classId", c.name AS "className"
     FROM student_sessions ss JOIN students s ON s.id = ss.student_id
     JOIN classes c ON c.id = s.class_id
     WHERE ss.token_hash = $1 AND ss.expires_at > NOW() AND s.archived_at IS NULL AND c.archived_at IS NULL`, [hashToken(token)]
  );
  return result.rows[0] || null;
}

async function deleteStudentSession(token) {
  if (!token) return;
  await getPool().query('DELETE FROM student_sessions WHERE token_hash = $1', [hashToken(token)]);
}

module.exports = {
  createSession,
  createStudentSession,
  createUser,
  deleteSession,
  deleteStudentSession,
  findSessionUser,
  findStudentByCode,
  findStudentSession,
  findUserByUsername,
  getPool,
  initializeDatabase,
  isDatabaseConfigured,
  newId,
  verifyPassword
};
