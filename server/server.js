const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const QRCode = require('qrcode');
const { generateReport } = require('./pdfReport');
const {
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
} = require('./database');
const { createStudentCode, normalizeStudentCode } = require('./studentCodes');
const { validateAssignmentPolicy } = require('./assignmentPolicy');
const { PROFILES: BOT_PROFILES, createRehearsalBots } = require('./rehearsalBots');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
const httpServer = createServer(app);
const rehearsalBots = createRehearsalBots({ getPool, createStudentSession, origin: () => `http://127.0.0.1:${httpServer.address().port}` });

const AUTH_COOKIE = 'math4speed_session';
const STUDENT_COOKIE = 'math4speed_student';
const studentLoginAttempts = new Map();

function readCookies(request) {
  const rawCookies = typeof request === 'string' ? request : request?.headers?.cookie || '';
  return Object.fromEntries(String(rawCookies)
    .split(';')
    .map(part => part.trim().split('='))
    .filter(([key, value]) => key && value)
    .map(([key, value]) => [key, decodeURIComponent(value)]));
}

function setSessionCookie(response, token) {
  response.setHeader('Set-Cookie', `${AUTH_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${12 * 60 * 60}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
}

function setStudentCookie(response, token) {
  response.setHeader('Set-Cookie', `${STUDENT_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${180 * 24 * 60 * 60}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
}

async function requireUser(request, response, next) {
  if (!isDatabaseConfigured()) return response.status(503).json({ error: 'Die Kontoverwaltung ist noch nicht eingerichtet.' });
  try {
    const user = await findSessionUser(readCookies(request)[AUTH_COOKIE]);
    if (!user) return response.status(401).json({ error: 'Anmeldung erforderlich.' });
    request.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

function requireRole(role) {
  return (request, response, next) => {
    if (request.user?.role !== role) return response.status(403).json({ error: 'Keine Berechtigung.' });
    return next();
  };
}

async function requireStudent(request, response, next) {
  if (!isDatabaseConfigured()) return response.status(503).json({ error: 'Die Schülerverwaltung ist noch nicht eingerichtet.' });
  try {
    const student = await findStudentSession(readCookies(request)[STUDENT_COOKIE]);
    if (!student) return response.status(401).json({ error: 'Bitte gib deine Kennung ein.' });
    request.student = student;
    return next();
  } catch (error) {
    return next(error);
  }
}

function validPassword(password) {
  return typeof password === 'string' && password.length >= 12 && password.length <= 200;
}

function allowStudentLogin(ip) {
  const now = Date.now();
  const windowMs = 5 * 60 * 1000;
  const record = studentLoginAttempts.get(ip) || [];
  const recent = record.filter(timestamp => timestamp > now - windowMs);
  if (recent.length >= 120) return false;
  recent.push(now);
  studentLoginAttempts.set(ip, recent);
  return true;
}

function randomRoomToken() {
  return crypto.randomBytes(24).toString('base64url');
}

function hashRoomToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function sameHash(left, right) {
  const first = Buffer.from(String(left || ''));
  const second = Buffer.from(String(right || ''));
  return first.length === second.length && crypto.timingSafeEqual(first, second);
}

function publicOrigin(request) {
  return (process.env.PUBLIC_ORIGIN || `${request.protocol}://${request.get('host')}`).replace(/\/$/, '');
}

function xmlEscape(value) {
  return String(value).replace(/[<>&'\"]/g, character => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[character]));
}

function sebExamSettings(startUrl) {
  return { sebConfigPurpose: 1, startURL: startUrl, allowPreferencesWindow: false, allowQuit: false, showTaskBar: false, showTime: true, browserWindowAllowReload: false, URLFilterEnable: false, sendBrowserExamKey: false, browserWindowWebView: 3 };
}

function orderedValue(value) {
  if (Array.isArray(value)) return value.map(orderedValue);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })).map(key => [key, orderedValue(value[key])]));
  return value;
}

function sebConfigKey(settings) {
  return crypto.createHash('sha256').update(JSON.stringify(orderedValue(settings)), 'utf8').digest('hex');
}

function examSebConfiguration(startUrl) {
  const settings = sebExamSettings(startUrl);
  const values = Object.entries(settings).map(([key, value]) => `<key>${key}</key>${typeof value === 'boolean' ? `<${value}/>` : typeof value === 'number' ? `<integer>${value}</integer>` : `<string>${xmlEscape(value)}</string>`}`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict>${values}</dict></plist>`;
}

function expectedSebRequestHash(startUrl, configKey) {
  return crypto.createHash('sha256').update(`${startUrl}${configKey}`, 'utf8').digest('hex');
}

function validSebRequest(request, room, token, receivedHash) {
  if (!room.sebRequired) return true;
  const startUrl = `${publicOrigin(request)}/pruefung/${room.id}?token=${encodeURIComponent(token)}`;
  return Boolean(room.sebConfigKey) && sameHash(expectedSebRequestHash(startUrl, room.sebConfigKey), receivedHash);
}

function randomStartCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

function sanitizeActivitySettings(category, input) {
  const categoryConfig = require('../shared/categories.json')[category];
  if (!categoryConfig) return {};
  return Object.fromEntries((categoryConfig.settings || []).map(setting => [setting.key,
    typeof input?.[setting.key] === 'boolean' ? input[setting.key] : setting.defaultValue
  ]));
}

async function findStudentRoom(roomId, token, studentId) {
  const result = await getPool().query(
    `SELECT r.id, r.status, r.start_code_hash AS "startCodeHash", r.start_code_expires_at AS "startCodeExpiresAt",
       e.class_id AS "classId", (e.rehearsal_source_id IS NOT NULL) AS "isRehearsal", e.title, e.category, e.settings, e.duration_seconds AS "durationSeconds", e.seb_required AS "sebRequired", r.seb_config_key AS "sebConfigKey", ers.status AS "studentStatus", ers.started_at AS "studentStartedAt"
     FROM exam_rooms r JOIN exams e ON e.id = r.exam_id
     JOIN exam_room_students ers ON ers.room_id = r.id
     WHERE r.id = $1 AND r.access_token_hash = $2 AND ers.student_id = $3`,
    [roomId, hashRoomToken(token), studentId]
  );
  return result.rows[0] || null;
}

async function examResumeState(roomId, studentId, durationSeconds, startedAt) {
  const result = await getPool().query(
    `SELECT ers.task_plan AS "taskPlan", ers.current_position AS "currentPosition", ers.remaining_seconds AS "remainingSeconds", ers.last_progress_at AS "lastProgressAt",
            COALESCE(json_agg(json_build_object(
              'position', ea.position, 'task', ea.task, 'submittedAnswer', ea.submitted_answer,
              'isCorrect', ea.is_correct, 'assisted', ea.assisted, 'submittedAt', ea.submitted_at
            ) ORDER BY ea.position) FILTER (WHERE ea.position IS NOT NULL), '[]'::json) AS answers
       FROM exam_room_students ers
       LEFT JOIN exam_answers ea ON ea.room_id = ers.room_id AND ea.student_id = ers.student_id
      WHERE ers.room_id = $1 AND ers.student_id = $2
      GROUP BY ers.task_plan, ers.current_position, ers.remaining_seconds, ers.last_progress_at`, [roomId, studentId]
  );
  const state = result.rows[0] || { taskPlan: null, currentPosition: 0, answers: [] };
  const initialElapsed = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  const savedRemaining = Number.isInteger(state.remainingSeconds) ? state.remainingSeconds : Math.max(0, Number(durationSeconds) - initialElapsed);
  const sinceCheckpoint = state.lastProgressAt ? Math.max(0, Math.floor((Date.now() - new Date(state.lastProgressAt).getTime()) / 1000)) : 0;
  return { ...state, remainingSeconds: Math.max(0, savedRemaining - sinceCheckpoint) };
}

async function uniqueStudentCode() {
  const db = getPool();
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = createStudentCode();
    const normalized = normalizeStudentCode(code);
    const existing = await db.query('SELECT 1 FROM students WHERE access_code_normalized = $1', [normalized]);
    if (existing.rowCount === 0) return { code, normalized };
  }
  throw new Error('Schülerkennung konnte nicht erzeugt werden.');
}

app.get('/api/health', (_req, res) => {
  res.status(200).json({ ok: true });
});

// QR codes for temporary rooms are restricted to the browser which created
// the room.  The code itself intentionally contains only the public join URL.
app.get('/api/rooms/:roomId/qr', async (request, response, next) => {
  try {
    const roomId = String(request.params.roomId || '').toLowerCase();
    const room = rooms.get(roomId);
    if (!room || room.persistent || !sameHash(request.query.adminToken, room.adminToken)) {
      return response.status(404).json({ error: 'Raum nicht gefunden.' });
    }
    const joinUrl = `${publicOrigin(request)}/room/${roomId}`;
    const svg = await QRCode.toString(joinUrl, { type: 'svg', errorCorrectionLevel: 'M', margin: 1, width: 480 });
    return response.set('Cache-Control', 'no-store').type('image/svg+xml').send(svg);
  } catch (error) {
    return next(error);
  }
});

app.post('/api/auth/login', async (request, response, next) => {
  try {
    if (!isDatabaseConfigured()) return response.status(503).json({ error: 'Die Kontoverwaltung ist noch nicht eingerichtet.' });
    const username = String(request.body?.username || '').trim().toLowerCase();
    const password = String(request.body?.password || '');
    const user = await findUserByUsername(username);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return response.status(401).json({ error: 'Nutzername oder Passwort ist nicht korrekt.' });
    }
    setSessionCookie(response, await createSession(user.id));
    return response.json({ user: { id: user.id, username: user.username, displayName: user.displayName, role: user.role } });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/auth/logout', requireUser, async (request, response, next) => {
  try {
    await deleteSession(readCookies(request)[AUTH_COOKIE]);
    response.setHeader('Set-Cookie', `${AUTH_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
    return response.status(204).end();
  } catch (error) {
    return next(error);
  }
});

app.get('/api/auth/me', requireUser, (request, response) => response.json({ user: request.user }));

app.post('/api/student/login', async (request, response, next) => {
  try {
    if (!isDatabaseConfigured()) return response.status(503).json({ error: 'Die Schülerverwaltung ist noch nicht eingerichtet.' });
    if (!allowStudentLogin(request.ip)) return response.status(429).json({ error: 'Zu viele Anmeldeversuche. Bitte warte kurz.' });
    const student = await findStudentByCode(normalizeStudentCode(request.body?.accessCode));
    if (!student) return response.status(401).json({ error: 'Diese Kennung ist nicht bekannt.' });
    setStudentCookie(response, await createStudentSession(student.id));
    return response.json({ student });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/student/logout', requireStudent, async (request, response, next) => {
  try {
    await deleteStudentSession(readCookies(request)[STUDENT_COOKIE]);
    response.setHeader('Set-Cookie', `${STUDENT_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
    return response.status(204).end();
  } catch (error) {
    return next(error);
  }
});

app.get('/api/student/me', requireStudent, (request, response) => response.json({ student: request.student }));

app.post('/api/student/practice-sessions', requireStudent, async (request, response, next) => {
  try {
    const category = String(request.body?.category || '');
    const durationSeconds = Number(request.body?.durationSeconds);
    const correctCount = Number(request.body?.correctCount);
    const wrongCount = Number(request.body?.wrongCount);
    const assignmentId = request.body?.assignmentId ? String(request.body.assignmentId) : null;
    if (!VALID_CATEGORIES.includes(category) || !Number.isInteger(durationSeconds) || durationSeconds < 0 || durationSeconds > 7200 ||
      !Number.isInteger(correctCount) || correctCount < 0 || !Number.isInteger(wrongCount) || wrongCount < 0) {
      return response.status(400).json({ error: 'Ungültiges Trainingsergebnis.' });
    }
    if (assignmentId) {
      const assignment = await getPool().query(
        `SELECT 1 FROM assignments WHERE id = $1 AND class_id = $2 AND category = $3 AND archived_at IS NULL`,
        [assignmentId, request.student.classId, category]
      );
      if (!assignment.rowCount) return response.status(400).json({ error: 'Diese Übung ist nicht verfügbar.' });
    }
    await getPool().query(
      `INSERT INTO practice_sessions (id, student_id, assignment_id, category, completed_at, duration_seconds, correct_count, wrong_count)
       VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7)`,
      [newId(), request.student.id, assignmentId, category, durationSeconds, correctCount, wrongCount]
    );
    return response.status(201).json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

app.delete('/api/student/practice-sessions/:sessionId', requireStudent, async (request, response, next) => {
  try {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(request.params.sessionId)) {
      return response.status(400).json({ error: 'Ungültiger Übungsversuch.' });
    }
    const result = await getPool().query(
      `DELETE FROM practice_sessions WHERE id = $1 AND student_id = $2 AND completed_at IS NOT NULL RETURNING id`,
      [request.params.sessionId, request.student.id]
    );
    if (!result.rowCount) return response.status(404).json({ error: 'Dieser Übungsversuch ist nicht verfügbar.' });
    return response.status(204).end();
  } catch (error) { return next(error); }
});

app.get('/api/admin/teachers', requireUser, requireRole('admin'), async (_request, response, next) => {
  try {
    const result = await getPool().query(`SELECT id, username, display_name AS "displayName", created_at AS "createdAt" FROM users WHERE role = 'teacher' ORDER BY display_name`);
    return response.json({ teachers: result.rows });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/admin/teachers', requireUser, requireRole('admin'), async (request, response, next) => {
  try {
    const username = String(request.body?.username || '').trim().toLowerCase();
    const displayName = String(request.body?.displayName || '').trim();
    const password = request.body?.password;
    if (!/^[a-z0-9][a-z0-9._-]{2,39}$/.test(username) || !displayName || !validPassword(password)) {
      return response.status(400).json({ error: 'Bitte Name, einen Nutzernamen mit 3–40 Zeichen und ein Passwort mit mindestens 12 Zeichen angeben.' });
    }
    const teacher = await createUser({ username, displayName: displayName.slice(0, 120), password, role: 'teacher' });
    return response.status(201).json({ teacher });
  } catch (error) {
    if (error.code === '23505') return response.status(409).json({ error: 'Dieser Nutzername wird bereits verwendet.' });
    return next(error);
  }
});

app.get('/api/classes', requireUser, requireRole('teacher'), async (request, response, next) => {
  try {
    const result = await getPool().query(
      `SELECT c.id, c.name, c.created_at AS "createdAt", c.archived_at AS "archivedAt", COUNT(s.id)::int AS "studentCount"
       FROM classes c LEFT JOIN students s ON s.class_id = c.id
       WHERE c.teacher_id = $1 AND c.archived_at IS NULL AND c.is_rehearsal = FALSE
       GROUP BY c.id ORDER BY c.created_at DESC`, [request.user.id]
    );
    return response.json({ classes: result.rows });
  } catch (error) {
    return next(error);
  }
});

app.delete('/api/classes/:classId', requireUser, requireRole('teacher'), async (request, response, next) => {
  try {
    const result = await getPool().query('DELETE FROM classes WHERE id = $1 AND teacher_id = $2 RETURNING id', [request.params.classId, request.user.id]);
    if (!result.rowCount) return response.status(404).json({ error: 'Klasse nicht gefunden.' });
    return response.status(204).end();
  } catch (error) { return next(error); }
});

app.post('/api/classes', requireUser, requireRole('teacher'), async (request, response, next) => {
  try {
    const name = String(request.body?.name || '').trim();
    if (!name || name.length > 120) return response.status(400).json({ error: 'Bitte einen Klassennamen mit höchstens 120 Zeichen angeben.' });
    const result = await getPool().query(
      `INSERT INTO classes (id, teacher_id, name) VALUES ($1, $2, $3)
       RETURNING id, name, created_at AS "createdAt"`, [newId(), request.user.id, name]
    );
    return response.status(201).json({ class: { ...result.rows[0], studentCount: 0 } });
  } catch (error) {
    if (error.code === '23505') return response.status(409).json({ error: 'Eine Klasse mit diesem Namen gibt es bereits.' });
    return next(error);
  }
});

app.get('/api/classes/:classId/students', requireUser, requireRole('teacher'), async (request, response, next) => {
  try {
    const classResult = await getPool().query('SELECT id, name FROM classes WHERE id = $1 AND teacher_id = $2', [request.params.classId, request.user.id]);
    if (!classResult.rowCount) return response.status(404).json({ error: 'Klasse nicht gefunden.' });
    const students = await getPool().query(
      `SELECT id, display_name AS "displayName", access_code AS "accessCode", created_at AS "createdAt"
       FROM students WHERE class_id = $1 ORDER BY display_name`, [request.params.classId]
    );
    return response.json({ class: classResult.rows[0], students: students.rows });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/classes/:classId/progress', requireUser, requireRole('teacher'), async (request, response, next) => {
  try {
    const ownership = await getPool().query('SELECT 1 FROM classes WHERE id = $1 AND teacher_id = $2', [request.params.classId, request.user.id]);
    if (!ownership.rowCount) return response.status(404).json({ error: 'Klasse nicht gefunden.' });
    const result = await getPool().query(
      `SELECT s.id AS "studentId", COUNT(p.id)::int AS "sessionCount", COALESCE(SUM(p.duration_seconds), 0)::int AS "durationSeconds",
        COALESCE(SUM(p.correct_count), 0)::int AS "correctCount", COALESCE(SUM(p.wrong_count), 0)::int AS "wrongCount"
       FROM students s LEFT JOIN practice_sessions p ON p.student_id = s.id AND p.completed_at IS NOT NULL
       WHERE s.class_id = $1 GROUP BY s.id`, [request.params.classId]
    );
    return response.json({ progress: result.rows });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/classes/:classId/assignments', requireUser, requireRole('teacher'), async (request, response, next) => {
  try {
    const ownership = await getPool().query('SELECT 1 FROM classes WHERE id = $1 AND teacher_id = $2', [request.params.classId, request.user.id]);
    if (!ownership.rowCount) return response.status(404).json({ error: 'Klasse nicht gefunden.' });
    const result = await getPool().query(
      `SELECT id, title, category, settings, policy, created_at AS "createdAt", archived_at AS "archivedAt"
       FROM assignments WHERE class_id = $1 ORDER BY archived_at NULLS FIRST, created_at DESC`, [request.params.classId]
    );
    return response.json({ assignments: result.rows });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/classes/:classId/assignments', requireUser, requireRole('teacher'), async (request, response, next) => {
  let policy;
  try { policy = validateAssignmentPolicy(request.body?.policy); }
  catch (error) { return response.status(400).json({ error: error.message }); }
  try {
    const title = String(request.body?.title || '').trim();
    const category = String(request.body?.category || '');
    const settings = sanitizeActivitySettings(category, request.body?.settings);
    if (!title || title.length > 120 || !VALID_CATEGORIES.includes(category)) return response.status(400).json({ error: 'Bitte Titel und gültige Kategorie angeben.' });
    const ownership = await getPool().query('SELECT 1 FROM classes WHERE id = $1 AND teacher_id = $2 AND archived_at IS NULL', [request.params.classId, request.user.id]);
    if (!ownership.rowCount) return response.status(404).json({ error: 'Aktive Klasse nicht gefunden.' });
    const result = await getPool().query(
      `INSERT INTO assignments (id, class_id, title, category, settings, policy) VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, title, category, settings, policy, created_at AS "createdAt", archived_at AS "archivedAt"`,
      [newId(), request.params.classId, title, category, JSON.stringify(settings), JSON.stringify(policy)]
    );
    return response.status(201).json({ assignment: result.rows[0] });
  } catch (error) { return next(error); }
});

app.get('/api/classes/:classId/assignments/:assignmentId/progress', requireUser, requireRole('teacher'), async (request, response, next) => {
  try {
    const assignment = await getPool().query(
      `SELECT a.id, a.title, a.category, a.policy, a.archived_at AS "archivedAt", c.name AS "className"
       FROM assignments a JOIN classes c ON c.id = a.class_id
       WHERE a.id = $1 AND c.id = $2 AND c.teacher_id = $3`,
      [request.params.assignmentId, request.params.classId, request.user.id]
    );
    if (!assignment.rowCount) return response.status(404).json({ error: 'Übung nicht gefunden.' });
    const students = await getPool().query(
      `SELECT s.id, s.display_name AS "displayName", COALESCE(history.attempts, '[]'::json) AS attempts
       FROM students s
       LEFT JOIN LATERAL (
         SELECT json_agg(json_build_object(
           'id', p.id, 'completedAt', p.completed_at, 'durationSeconds', p.duration_seconds,
           'correctCount', p.correct_count, 'wrongCount', p.wrong_count
         ) ORDER BY p.completed_at DESC, p.id DESC) AS attempts
         FROM practice_sessions p
         WHERE p.student_id = s.id AND p.assignment_id = $1 AND p.completed_at IS NOT NULL
       ) history ON TRUE
       WHERE s.class_id = $2 ORDER BY s.display_name, s.id`,
      [request.params.assignmentId, request.params.classId]
    );
    return response.json({ assignment: assignment.rows[0], students: students.rows });
  } catch (error) { return next(error); }
});

app.patch('/api/assignments/:assignmentId', requireUser, requireRole('teacher'), async (request, response, next) => {
  const title = String(request.body?.title || '').trim();
  if (!title || title.length > 120) return response.status(400).json({ error: 'Bitte einen Titel mit höchstens 120 Zeichen angeben.' });
  let policy;
  try { policy = validateAssignmentPolicy(request.body?.policy); }
  catch (error) { return response.status(400).json({ error: error.message }); }
  try {
    const assignment = await getPool().query(
      `SELECT a.category FROM assignments a JOIN classes c ON c.id = a.class_id
       WHERE a.id = $1 AND c.teacher_id = $2`, [request.params.assignmentId, request.user.id]
    );
    if (!assignment.rowCount) return response.status(404).json({ error: 'Übung nicht gefunden.' });
    const settings = sanitizeActivitySettings(assignment.rows[0].category, request.body?.settings);
    const result = await getPool().query(
      `UPDATE assignments a SET title = $1, settings = $2::jsonb, policy = $3::jsonb FROM classes c
       WHERE a.id = $4 AND a.class_id = c.id AND c.teacher_id = $5
       RETURNING a.id, a.title, a.category, a.settings, a.policy, a.created_at AS "createdAt", a.archived_at AS "archivedAt"`,
      [title, JSON.stringify(settings), JSON.stringify(policy), request.params.assignmentId, request.user.id]
    );
    if (!result.rowCount) return response.status(404).json({ error: 'Übung nicht gefunden.' });
    return response.json({ assignment: result.rows[0] });
  } catch (error) { return next(error); }
});

app.patch('/api/assignments/:assignmentId/policy', requireUser, requireRole('teacher'), async (request, response, next) => {
  let policy;
  try { policy = validateAssignmentPolicy(request.body?.policy); }
  catch (error) { return response.status(400).json({ error: error.message }); }
  try {
    const result = await getPool().query(
      `UPDATE assignments a SET policy = $1::jsonb FROM classes c
       WHERE a.id = $2 AND a.class_id = c.id AND c.teacher_id = $3 RETURNING a.*`,
      [JSON.stringify(policy), request.params.assignmentId, request.user.id]
    );
    if (!result.rowCount) return response.status(404).json({ error: 'Übung nicht gefunden.' });
    return response.json({ policy: result.rows[0].policy });
  } catch (error) { return next(error); }
});

app.post('/api/assignments/:assignmentId/archive', requireUser, requireRole('teacher'), async (request, response, next) => {
  try {
    const result = await getPool().query(
      `UPDATE assignments a SET archived_at = NOW() FROM classes c
       WHERE a.id = $1 AND a.class_id = c.id AND c.teacher_id = $2 AND a.archived_at IS NULL
       RETURNING a.id, a.archived_at AS "archivedAt"`, [request.params.assignmentId, request.user.id]
    );
    if (!result.rowCount) return response.status(404).json({ error: 'Aktive Übung nicht gefunden.' });
    return response.json({ assignment: result.rows[0] });
  } catch (error) { return next(error); }
});

app.post('/api/assignments/:assignmentId/restore', requireUser, requireRole('teacher'), async (request, response, next) => {
  try {
    const result = await getPool().query(
      `UPDATE assignments a SET archived_at = NULL FROM classes c
       WHERE a.id = $1 AND a.class_id = c.id AND c.teacher_id = $2 AND a.archived_at IS NOT NULL
       RETURNING a.id, a.archived_at AS "archivedAt"`, [request.params.assignmentId, request.user.id]
    );
    if (!result.rowCount) return response.status(404).json({ error: 'Archivierte Übung nicht gefunden.' });
    return response.json({ assignment: result.rows[0] });
  } catch (error) { return next(error); }
});

app.delete('/api/assignments/:assignmentId', requireUser, requireRole('teacher'), async (request, response, next) => {
  try {
    const result = await getPool().query(
      `DELETE FROM assignments a USING classes c WHERE a.id = $1 AND a.class_id = c.id AND c.teacher_id = $2 RETURNING a.id`,
      [request.params.assignmentId, request.user.id]
    );
    if (!result.rowCount) return response.status(404).json({ error: 'Übung nicht gefunden.' });
    return response.status(204).end();
  } catch (error) { return next(error); }
});

app.get('/api/student/assignments/:assignmentId', requireStudent, async (request, response, next) => {
  try {
    const result = await getPool().query(
      `SELECT id, title, category, settings, policy FROM assignments
       WHERE id = $1 AND class_id = $2 AND archived_at IS NULL`,
      [request.params.assignmentId, request.student.classId]
    );
    if (!result.rowCount) return response.status(404).json({ error: 'Diese Übung ist nicht verfügbar.' });
    return response.json({ assignment: result.rows[0] });
  } catch (error) { return next(error); }
});

app.get('/api/student/assignments', requireStudent, async (request, response, next) => {
  try {
    const result = await getPool().query(
      `SELECT a.id, a.title, a.category, a.settings, a.policy,
         COALESCE(history.attempts, '[]'::json) AS attempts
       FROM assignments a
       LEFT JOIN LATERAL (
         SELECT json_agg(json_build_object(
           'id', p.id, 'completedAt', p.completed_at,
           'durationSeconds', p.duration_seconds,
           'correctCount', p.correct_count, 'wrongCount', p.wrong_count
         ) ORDER BY p.completed_at DESC, p.id DESC) AS attempts
         FROM practice_sessions p
         WHERE p.assignment_id = a.id AND p.student_id = $2 AND p.completed_at IS NOT NULL
       ) history ON TRUE
       WHERE a.class_id = $1 AND a.archived_at IS NULL ORDER BY a.created_at DESC`,
      [request.student.classId, request.student.id]
    );
    return response.json({ assignments: result.rows });
  } catch (error) { return next(error); }
});

app.get('/api/classes/:classId/exams', requireUser, requireRole('teacher'), async (request, response, next) => {
  try {
    const result = await getPool().query(
      `SELECT e.id, e.title, e.category, e.settings, e.duration_seconds AS "durationSeconds", e.seb_required AS "sebRequired", e.archived_at AS "archivedAt", e.created_at AS "createdAt", r.status AS "roomStatus"
       FROM exams e JOIN classes c ON c.id = e.class_id
       LEFT JOIN LATERAL (SELECT status FROM exam_rooms WHERE exam_id = e.id ORDER BY created_at DESC LIMIT 1) r ON TRUE
       WHERE e.class_id = $1 AND c.teacher_id = $2
       ORDER BY e.archived_at NULLS FIRST, e.created_at DESC`, [request.params.classId, request.user.id]
    );
    return response.json({ exams: result.rows });
  } catch (error) { return next(error); }
});

app.post('/api/classes/:classId/exams', requireUser, requireRole('teacher'), async (request, response, next) => {
  try {
    const title = String(request.body?.title || '').trim();
    const category = String(request.body?.category || '');
    const settings = sanitizeActivitySettings(category, request.body?.settings);
    const durationSeconds = Number(request.body?.durationSeconds);
    const sebRequired = request.body?.sebRequired === true;
    if (!title || title.length > 120 || !VALID_CATEGORIES.includes(category) || !Number.isInteger(durationSeconds) || durationSeconds < 60 || durationSeconds > 7200) {
      return response.status(400).json({ error: 'Bitte Titel, Kategorie und ein Zeitlimit zwischen 1 und 120 Minuten angeben.' });
    }
    const ownership = await getPool().query('SELECT 1 FROM classes WHERE id = $1 AND teacher_id = $2 AND archived_at IS NULL', [request.params.classId, request.user.id]);
    if (!ownership.rowCount) return response.status(404).json({ error: 'Aktive Klasse nicht gefunden.' });
    const result = await getPool().query(
      `INSERT INTO exams (id, class_id, title, category, settings, duration_seconds, seb_required) VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, title, category, settings, duration_seconds AS "durationSeconds", seb_required AS "sebRequired", created_at AS "createdAt", archived_at AS "archivedAt"`,
      [newId(), request.params.classId, title, category, JSON.stringify(settings), durationSeconds, sebRequired]
    );
    return response.status(201).json({ exam: result.rows[0] });
  } catch (error) { return next(error); }
});

app.post('/api/exams/:examId/archive', requireUser, requireRole('teacher'), async (request, response, next) => {
  try {
    const result = await getPool().query(
      `UPDATE exams e SET archived_at = NOW() FROM classes c
       WHERE e.id = $1 AND e.class_id = c.id AND c.teacher_id = $2 AND e.archived_at IS NULL
       RETURNING e.id`, [request.params.examId, request.user.id]
    );
    if (!result.rowCount) return response.status(404).json({ error: 'Aktiver Test nicht gefunden.' });
    return response.status(204).end();
  } catch (error) { return next(error); }
});

app.post('/api/exams/:examId/restore', requireUser, requireRole('teacher'), async (request, response, next) => {
  try {
    const result = await getPool().query(
      `UPDATE exams e SET archived_at = NULL FROM classes c
       WHERE e.id = $1 AND e.class_id = c.id AND c.teacher_id = $2 AND e.archived_at IS NOT NULL
       RETURNING e.id, e.archived_at AS "archivedAt"`, [request.params.examId, request.user.id]
    );
    if (!result.rowCount) return response.status(404).json({ error: 'Archivierter Test nicht gefunden.' });
    return response.json({ exam: result.rows[0] });
  } catch (error) { return next(error); }
});

app.delete('/api/exams/:examId', requireUser, requireRole('teacher'), async (request, response, next) => {
  try {
    const result = await getPool().query(
      `DELETE FROM exams e USING classes c WHERE e.id = $1 AND e.class_id = c.id AND c.teacher_id = $2 RETURNING e.id`,
      [request.params.examId, request.user.id]
    );
    if (!result.rowCount) return response.status(404).json({ error: 'Test nicht gefunden.' });
    return response.status(204).end();
  } catch (error) { return next(error); }
});

// Rehearsals use the normal exam flow, with an isolated class and student.
app.post('/api/exams/:examId/rehearsal', requireUser, requireRole('teacher'), async (request, response, next) => {
  let db;
  try {
    db = await getPool().connect();
    await db.query('BEGIN');
    const source = await db.query(
      `SELECT e.* FROM exams e JOIN classes c ON c.id = e.class_id
       WHERE e.id = $1 AND c.teacher_id = $2 AND NOT c.is_rehearsal
         AND e.archived_at IS NULL AND c.archived_at IS NULL FOR UPDATE OF e`,
      [request.params.examId, request.user.id]);
    if (!source.rowCount) { await db.query('ROLLBACK'); return response.status(404).json({ error: 'Aktiver Test nicht gefunden.' }); }
    const exam = source.rows[0];
    const sebRequired = exam.seb_required && request.body?.mode === 'seb';
    const existing = await db.query(
      `SELECT r.id, r.access_token AS "accessToken" FROM exams e JOIN exam_rooms r ON r.exam_id = e.id
       WHERE e.rehearsal_source_id = $1 AND e.seb_required = $2`, [exam.id, sebRequired]);
    if (existing.rowCount) { await db.query('COMMIT'); return response.json({ room: existing.rows[0] }); }
    const classId = newId(), examId = newId(), studentId = newId(), roomId = newId();
    const token = randomRoomToken();
    const { code, normalized } = await uniqueStudentCode();
    const startUrl = `${publicOrigin(request)}/pruefung/${roomId}?token=${encodeURIComponent(token)}`;
    await db.query('INSERT INTO classes (id, teacher_id, name, is_rehearsal) VALUES ($1, $2, $3, TRUE)', [classId, request.user.id, 'Probedurchlauf ' + roomId]);
    await db.query(`INSERT INTO students (id, class_id, display_name, access_code, access_code_normalized) VALUES ($1, $2, 'Probe-Schüler', $3, $4)`, [studentId, classId, code, normalized]);
    await db.query(`INSERT INTO exams (id, class_id, title, category, settings, duration_seconds, seb_required, rehearsal_source_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [examId, classId, 'Probedurchlauf · ' + exam.title, exam.category, exam.settings, exam.duration_seconds, sebRequired, exam.id]);
    await db.query('INSERT INTO exam_rooms (id, exam_id, access_token_hash, access_token, seb_config_key) VALUES ($1, $2, $3, $4, $5)', [roomId, examId, hashRoomToken(token), token, sebRequired ? sebConfigKey(sebExamSettings(startUrl)) : null]);
    await db.query('INSERT INTO exam_room_students (room_id, student_id) VALUES ($1, $2)', [roomId, studentId]);
    await db.query('COMMIT');
    return response.status(201).json({ room: { id: roomId, accessToken: token } });
  } catch (error) { if (db) await db.query('ROLLBACK').catch(() => {}); return next(error); }
  finally { db?.release(); }
});

app.post('/api/exam-rooms/:roomId/bots', requireUser, requireRole('teacher'), async (request, response, next) => {
  let db;
  try {
    db = await getPool().connect();
    await db.query('BEGIN');
    const owned = await db.query(`SELECT e.class_id FROM exam_rooms r JOIN exams e ON e.id=r.exam_id JOIN classes c ON c.id=e.class_id
      WHERE r.id=$1 AND c.teacher_id=$2 AND c.is_rehearsal AND NOT e.seb_required AND r.status='waiting' FOR UPDATE OF r`, [request.params.roomId, request.user.id]);
    if (!owned.rowCount) { await db.query('ROLLBACK'); return response.status(409).json({ error: 'Automatische Schüler können nur vor dem Start einer Browserprobe hinzugefügt werden.' }); }
    for (const [profile, config] of Object.entries(BOT_PROFILES)) {
      const existing = await db.query('SELECT id FROM students WHERE class_id=$1 AND rehearsal_bot_profile=$2', [owned.rows[0].class_id, profile]);
      let studentId = existing.rows[0]?.id;
      if (!studentId) {
        studentId = newId();
        const { code, normalized } = await uniqueStudentCode();
        await db.query('INSERT INTO students (id,class_id,display_name,access_code,access_code_normalized,rehearsal_bot_profile) VALUES ($1,$2,$3,$4,$5,$6)', [studentId, owned.rows[0].class_id, config.name, code, normalized, profile]);
      }
      await db.query('INSERT INTO exam_room_students (room_id,student_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [request.params.roomId, studentId]);
    }
    await db.query('COMMIT');
    await rehearsalBots.prepare(request.params.roomId);
    return response.status(204).end();
  } catch (error) { if (db) await db.query('ROLLBACK').catch(() => {}); return next(error); }
  finally { db?.release(); }
});

app.post('/api/exam-rooms/:roomId/reset-rehearsal', requireUser, requireRole('teacher'), async (request, response, next) => {
  let db;
  try {
    const permission = await getPool().query(`SELECT r.id FROM exam_rooms r JOIN exams e ON e.id=r.exam_id JOIN classes c ON c.id=e.class_id
      WHERE r.id=$1 AND c.teacher_id=$2 AND c.is_rehearsal`, [request.params.roomId, request.user.id]);
    if (!permission.rowCount) return response.status(404).json({ error: 'Probedurchlauf nicht gefunden.' });
    // Drain in-flight bot requests before acquiring the room lock and clearing results.
    await rehearsalBots.stop(request.params.roomId);
    db = await getPool().connect();
    await db.query('BEGIN');
    const owned = await db.query(`SELECT r.id FROM exam_rooms r JOIN exams e ON e.id = r.exam_id JOIN classes c ON c.id = e.class_id
      WHERE r.id = $1 AND c.teacher_id = $2 AND c.is_rehearsal FOR UPDATE OF r`, [request.params.roomId, request.user.id]);
    if (!owned.rowCount) { await db.query('ROLLBACK'); return response.status(404).json({ error: 'Probedurchlauf nicht gefunden.' }); }
    const id = request.params.roomId;
    await db.query('DELETE FROM exam_answers WHERE room_id = $1', [id]);
    await db.query('DELETE FROM exam_attempts WHERE room_id = $1', [id]);
    await db.query(`UPDATE exam_room_students SET status = 'pending', ready_at = NULL, started_at = NULL, finished_at = NULL,
      correct_count = 0, wrong_count = 0, task_plan = NULL, current_position = 0, remaining_seconds = NULL, last_progress_at = NULL WHERE room_id = $1`, [id]);
    await db.query(`UPDATE exam_rooms SET status = 'waiting', start_code_hash = NULL, start_code_expires_at = NULL,
      started_at = NULL, finished_at = NULL WHERE id = $1`, [id]);
    // Revoke the old student session so a still-open game cannot submit into the next run.
    await db.query('DELETE FROM student_sessions WHERE student_id IN (SELECT student_id FROM exam_room_students WHERE room_id = $1)', [id]);
    await db.query('COMMIT');
    const previous = rooms.get(id);
    for (const player of previous?.players?.values() || []) {
      if (player.socketId) io.sockets.sockets.get(player.socketId)?.disconnect(true);
    }
    rooms.delete(id);
    await rehearsalBots.prepare(id);
    return response.status(204).end();
  } catch (error) { if (db) await db.query('ROLLBACK').catch(() => {}); return next(error); }
  finally { db?.release(); }
});

app.post('/api/exams/:examId/rooms', requireUser, requireRole('teacher'), async (request, response, next) => {
  const db = getPool();
  try {
    const exam = await db.query(
      `SELECT e.id, e.class_id AS "classId", e.seb_required AS "sebRequired" FROM exams e JOIN classes c ON c.id = e.class_id
       WHERE e.id = $1 AND c.teacher_id = $2 AND e.archived_at IS NULL AND c.archived_at IS NULL`, [request.params.examId, request.user.id]
    );
    if (!exam.rowCount) return response.status(404).json({ error: 'Aktiver Test nicht gefunden.' });
    const existing = await db.query('SELECT id, access_token AS "accessToken" FROM exam_rooms WHERE exam_id = $1 ORDER BY created_at DESC LIMIT 1', [exam.rows[0].id]);
    if (existing.rowCount && existing.rows[0].accessToken) return response.json({ room: { id: existing.rows[0].id, accessToken: existing.rows[0].accessToken } });
    const token = randomRoomToken();
    const roomId = existing.rows[0]?.id || newId();
    await db.query('BEGIN');
    const startUrl = `${publicOrigin(request)}/pruefung/${roomId}?token=${encodeURIComponent(token)}`;
    const configKey = exam.rows[0].sebRequired ? sebConfigKey(sebExamSettings(startUrl)) : null;
    if (existing.rowCount) {
      await db.query('UPDATE exam_rooms SET access_token_hash = $1, access_token = $2, seb_config_key = $3 WHERE id = $4', [hashRoomToken(token), token, configKey, roomId]);
    } else {
      await db.query('INSERT INTO exam_rooms (id, exam_id, access_token_hash, access_token, seb_config_key) VALUES ($1, $2, $3, $4, $5)', [roomId, exam.rows[0].id, hashRoomToken(token), token, configKey]);
      await db.query(`INSERT INTO exam_room_students (room_id, student_id) SELECT $1, id FROM students WHERE class_id = $2 AND archived_at IS NULL`, [roomId, exam.rows[0].classId]);
    }
    await db.query('COMMIT');
    return response.status(existing.rowCount ? 200 : 201).json({ room: { id: roomId, accessToken: token } });
  } catch (error) {
    await db.query('ROLLBACK').catch(() => {});
    return next(error);
  }
});

app.get('/api/exam-rooms/:roomId', requireUser, requireRole('teacher'), async (request, response, next) => {
  try {
    const room = await getPool().query(
      `SELECT r.id, r.status, r.start_code_expires_at AS "startCodeExpiresAt", e.title, e.category, e.duration_seconds AS "durationSeconds", e.seb_required AS "sebRequired", c.is_rehearsal AS "isRehearsal"
       FROM exam_rooms r JOIN exams e ON e.id = r.exam_id JOIN classes c ON c.id = e.class_id
       WHERE r.id = $1 AND c.teacher_id = $2`, [request.params.roomId, request.user.id]
    );
    if (!room.rowCount) return response.status(404).json({ error: 'Testraum nicht gefunden.' });
    const students = await getPool().query(
      `SELECT s.id, s.display_name AS "displayName", ers.status, ers.ready_at AS "readyAt", s.rehearsal_bot_profile AS "botProfile", CASE WHEN $2 THEN s.access_code ELSE NULL END AS "accessCode"
       FROM exam_room_students ers JOIN students s ON s.id = ers.student_id WHERE ers.room_id = $1 ORDER BY s.display_name`, [request.params.roomId, room.rows[0].isRehearsal]
    );
    return response.json({ room: room.rows[0], students: students.rows, automation: rehearsalBots.snapshot(request.params.roomId) });
  } catch (error) { return next(error); }
});

app.get('/api/exam-rooms/:roomId/qr', requireUser, requireRole('teacher'), async (request, response, next) => {
  try {
    const token = String(request.query.token || '');
    const ownership = await getPool().query(
      `SELECT e.seb_required AS "sebRequired" FROM exam_rooms r JOIN exams e ON e.id = r.exam_id JOIN classes c ON c.id = e.class_id
       WHERE r.id = $1 AND c.teacher_id = $2 AND r.access_token_hash = $3`, [request.params.roomId, request.user.id, hashRoomToken(token)]
    );
    if (!ownership.rowCount) return response.status(404).json({ error: 'Testraum nicht gefunden.' });
    const origin = publicOrigin(request);
    let url;
    if (ownership.rows[0].sebRequired) {
      const sebOrigin = origin.replace(/^https:/, 'sebs:').replace(/^http:/, 'seb:');
      url = `${sebOrigin.replace(/\/$/, '')}/api/exam-rooms/${request.params.roomId}/seb-config?token=${encodeURIComponent(token)}`;
    } else {
      url = `${origin.replace(/\/$/, '')}/pruefung/${request.params.roomId}?token=${encodeURIComponent(token)}`;
    }
    const svg = await QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'M', margin: 1, width: 480 });
    response.set('Cache-Control', 'no-store').type('image/svg+xml').send(svg);
  } catch (error) { return next(error); }
});

app.get('/api/exam-rooms/:roomId/seb-config', async (request, response, next) => {
  try {
    const token = String(request.query.token || '');
    const room = await getPool().query(
      `SELECT r.id FROM exam_rooms r JOIN exams e ON e.id = r.exam_id
       WHERE r.id = $1 AND r.access_token_hash = $2 AND r.status IN ('waiting', 'code_released')`,
      [request.params.roomId, hashRoomToken(token)]
    );
    if (!room.rowCount) return response.status(404).type('text/plain').send('Testraum nicht gefunden.');
    const startUrl = `${publicOrigin(request)}/pruefung/${request.params.roomId}?token=${encodeURIComponent(token)}`;
    response.type('application/seb').attachment(`pruefung-${request.params.roomId}.seb`).send(examSebConfiguration(startUrl));
  } catch (error) { return next(error); }
});

app.patch('/api/exam-rooms/:roomId/students/:studentId/attendance', requireUser, requireRole('teacher'), async (request, response, next) => {
  try {
    const status = request.body?.absent === true ? 'absent' : 'pending';
    const result = await getPool().query(
      `UPDATE exam_room_students ers SET status = $1
       FROM exam_rooms r JOIN exams e ON e.id = r.exam_id JOIN classes c ON c.id = e.class_id
       WHERE ers.room_id = r.id AND r.id = $2 AND ers.student_id = $3 AND c.teacher_id = $4 AND r.status = 'waiting' AND ers.status IN ('pending', 'absent')
       RETURNING ers.student_id, ers.status`, [status, request.params.roomId, request.params.studentId, request.user.id]
    );
    if (!result.rowCount) return response.status(409).json({ error: 'Der Status konnte nicht geändert werden.' });
    await broadcastPersistentRoom(request.params.roomId);
    return response.json({ student: { id: result.rows[0].student_id, status: result.rows[0].status } });
  } catch (error) { return next(error); }
});

app.post('/api/exam-rooms/:roomId/release-code', requireUser, requireRole('teacher'), async (request, response, next) => {
  try {
    const pending = await getPool().query(
      `SELECT COUNT(*)::int AS count FROM exam_room_students ers JOIN exam_rooms r ON r.id = ers.room_id
       JOIN exams e ON e.id = r.exam_id JOIN classes c ON c.id = e.class_id
       WHERE r.id = $1 AND c.teacher_id = $2 AND ers.status = 'pending'`, [request.params.roomId, request.user.id]
    );
    if (pending.rows[0].count) return response.status(409).json({ error: 'Bitte alle Schüler:innen anmelden oder als abwesend markieren.' });
    const code = randomStartCode();
    const result = await getPool().query(
      `UPDATE exam_rooms r SET status = 'code_released', start_code_hash = $1, start_code_expires_at = NOW() + INTERVAL '60 seconds'
       FROM exams e JOIN classes c ON c.id = e.class_id
       WHERE r.id = $2 AND r.exam_id = e.id AND c.teacher_id = $3 AND r.status = 'waiting'
       RETURNING r.start_code_expires_at AS "expiresAt"`, [hashRoomToken(code), request.params.roomId, request.user.id]
    );
    if (!result.rowCount) return response.status(409).json({ error: 'Der Code kann nicht mehr freigegeben werden.' });
    await broadcastPersistentRoom(request.params.roomId);
    rehearsalBots.release(request.params.roomId, code);
    return response.json({ code, expiresAt: result.rows[0].expiresAt });
  } catch (error) { return next(error); }
});

app.get('/api/exam-rooms/:roomId/wait', requireStudent, async (request, response, next) => {
  try {
    const room = await findStudentRoom(request.params.roomId, request.query.token, request.student.id);
    if (!room) return response.status(404).json({ error: 'Testraum nicht gefunden.' });
    return response.json({ room: { id: room.id, title: room.title, category: room.category, durationSeconds: room.durationSeconds, status: room.status, studentStatus: room.studentStatus, startCodeExpiresAt: room.startCodeExpiresAt } });
  } catch (error) { return next(error); }
});

app.post('/api/exam-rooms/:roomId/ready', requireStudent, async (request, response, next) => {
  try {
    const room = await findStudentRoom(request.params.roomId, request.body?.token, request.student.id);
    if (!room || room.status !== 'waiting' || room.studentStatus !== 'pending') return response.status(409).json({ error: 'Anmeldung für diesen Testraum ist nicht möglich.' });
    if (!validSebRequest(request, room, request.body?.token, request.body?.sebRequestHash)) return response.status(403).json({ error: 'Für diesen Test muss die bereitgestellte Safe-Exam-Browser-Konfiguration verwendet werden.' });
    await getPool().query(`UPDATE exam_room_students SET status = 'ready', ready_at = NOW() WHERE room_id = $1 AND student_id = $2`, [request.params.roomId, request.student.id]);
    await broadcastPersistentRoom(request.params.roomId);
    return response.status(204).end();
  } catch (error) { return next(error); }
});

app.post('/api/exam-rooms/:roomId/start', requireStudent, async (request, response, next) => {
  const db = getPool();
  try {
    const room = await findStudentRoom(request.params.roomId, request.body?.token, request.student.id);
    const code = String(request.body?.code || '');
    if (!room || !['code_released', 'running'].includes(room.status) || room.studentStatus !== 'ready' || !room.startCodeExpiresAt || new Date(room.startCodeExpiresAt) <= new Date() ||
      !sameHash(hashRoomToken(code), room.startCodeHash)) {
      return response.status(409).json({ error: 'Der Startcode ist ungültig oder abgelaufen.' });
    }
    await db.query('BEGIN');
    const student = await db.query(`UPDATE exam_room_students SET status = 'started', started_at = NOW() WHERE room_id = $1 AND student_id = $2 AND status = 'ready' RETURNING started_at AS "startedAt"`, [request.params.roomId, request.student.id]);
    if (!student.rowCount) { await db.query('ROLLBACK'); return response.status(409).json({ error: 'Der Teststart ist nicht mehr verfügbar.' }); }
    await db.query(`UPDATE exam_rooms SET status = 'running', started_at = COALESCE(started_at, NOW()) WHERE id = $1 AND status IN ('code_released', 'running')`, [request.params.roomId]);
    await db.query('COMMIT');
    await broadcastPersistentRoom(request.params.roomId);
    return response.json({ exam: { category: room.category, settings: room.settings, durationSeconds: room.durationSeconds, startedAt: student.rows[0].startedAt } });
  } catch (error) { await db.query('ROLLBACK').catch(() => {}); return next(error); }
});

app.get('/api/exam-rooms/:roomId/current', requireStudent, async (request, response, next) => {
  try {
    const room = await findStudentRoom(request.params.roomId, request.query.token, request.student.id);
    if (!room || room.status !== 'running' || room.studentStatus !== 'started') return response.status(409).json({ error: 'Der Test wurde noch nicht gestartet.' });
    const resume = await examResumeState(request.params.roomId, request.student.id, room.durationSeconds, room.studentStartedAt);
    return response.json({ exam: { category: room.category, settings: room.settings, durationSeconds: room.durationSeconds, startedAt: room.studentStartedAt, isRehearsal: room.isRehearsal, ...resume } });
  } catch (error) { return next(error); }
});

app.post('/api/exam-rooms/:roomId/progress', requireStudent, async (request, response, next) => {
  try {
    const room = await findStudentRoom(request.params.roomId, request.body?.token, request.student.id);
    const taskPlan = Array.isArray(request.body?.taskPlan) ? request.body.taskPlan : null;
    const currentPosition = Number(request.body?.currentPosition);
    const remainingSeconds = Number(request.body?.remainingSeconds);
    if (!room || room.status !== 'running' || room.studentStatus !== 'started' || !Number.isInteger(currentPosition) || currentPosition < 0 ||
      !Number.isInteger(remainingSeconds) || remainingSeconds < 0 || (taskPlan && JSON.stringify(taskPlan).length > 500000)) return response.status(400).json({ error: 'Der Bearbeitungsstand ist ungültig.' });
    await getPool().query(
      `UPDATE exam_room_students ers
          SET task_plan = COALESCE(task_plan, $1::jsonb),
              current_position = GREATEST(current_position, $2),
              remaining_seconds = LEAST($3, GREATEST(0, COALESCE(ers.remaining_seconds, e.duration_seconds) - FLOOR(EXTRACT(EPOCH FROM NOW() - COALESCE(ers.last_progress_at, ers.started_at)))::int)),
              last_progress_at = NOW()
         FROM exam_rooms r JOIN exams e ON e.id = r.exam_id
        WHERE ers.room_id = r.id AND ers.room_id = $4 AND ers.student_id = $5 AND ers.status = 'started'`,
      [taskPlan ? JSON.stringify(taskPlan) : null, currentPosition, remainingSeconds, request.params.roomId, request.student.id]
    );
    return response.status(204).end();
  } catch (error) { return next(error); }
});

app.post('/api/exam-rooms/:roomId/answers', requireStudent, async (request, response, next) => {
  try {
    const room = await findStudentRoom(request.params.roomId, request.body?.token, request.student.id);
    const position = Number(request.body?.position);
    if (!room || room.status !== 'running' || room.studentStatus !== 'started' || !Number.isInteger(position) || position < 0) {
      return response.status(400).json({ error: 'Diese Aufgabe kann nicht gespeichert werden.' });
    }
    await persistExamAnswer(request.params.roomId, request.student.id, position, request.body?.entry);
    await broadcastPersistentRoom(request.params.roomId);
    return response.status(204).end();
  } catch (error) { return next(error); }
});

app.post('/api/exam-rooms/:roomId/finish', requireStudent, async (request, response, next) => {
  try {
    const room = await findStudentRoom(request.params.roomId, request.body?.token, request.student.id);
    if (!room || !['started', 'finished'].includes(room.studentStatus)) return response.status(409).json({ error: 'Der Test wurde noch nicht gestartet.' });
    if (!await finishPersistentAttempt(request.params.roomId, request.student.id)) return response.status(409).json({ error: 'Die Abgabe ist nicht verfügbar.' });
    await broadcastPersistentRoom(request.params.roomId);
    return response.status(204).end();
  } catch (error) { return next(error); }
});

app.post('/api/classes/:classId/students', requireUser, requireRole('teacher'), async (request, response, next) => {
  try {
    const displayName = String(request.body?.displayName || '').trim();
    if (!displayName || displayName.length > 120) return response.status(400).json({ error: 'Bitte einen Schülernamen mit höchstens 120 Zeichen angeben.' });
    const ownership = await getPool().query('SELECT 1 FROM classes WHERE id = $1 AND teacher_id = $2 AND archived_at IS NULL', [request.params.classId, request.user.id]);
    if (!ownership.rowCount) return response.status(404).json({ error: 'Aktive Klasse nicht gefunden.' });
    const { code, normalized } = await uniqueStudentCode();
    const result = await getPool().query(
      `INSERT INTO students (id, class_id, display_name, access_code, access_code_normalized)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, display_name AS "displayName", access_code AS "accessCode", created_at AS "createdAt"`,
      [newId(), request.params.classId, displayName, code, normalized]
    );
    return response.status(201).json({ student: result.rows[0] });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/classes/:classId/students/:studentId/regenerate-code', requireUser, requireRole('teacher'), async (request, response, next) => {
  try {
    const db = getPool();
    const params = [request.params.studentId, request.params.classId, request.user.id];
    const ownership = await db.query(
      `SELECT 1 FROM students s JOIN classes c ON c.id = s.class_id
       WHERE s.id = $1 AND c.id = $2 AND c.teacher_id = $3
         AND s.archived_at IS NULL AND c.archived_at IS NULL`, params
    );
    if (!ownership.rowCount) return response.status(404).json({ error: 'Schüler:in nicht gefunden.' });
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const { code, normalized } = await uniqueStudentCode();
      try {
        const result = await db.query(
          `UPDATE students s SET access_code = $4, access_code_normalized = $5
           FROM classes c WHERE s.id = $1 AND s.class_id = c.id AND c.id = $2 AND c.teacher_id = $3
             AND s.archived_at IS NULL AND c.archived_at IS NULL
           RETURNING s.id, s.access_code AS "accessCode"`, [...params, code, normalized]
        );
        if (!result.rowCount) return response.status(404).json({ error: 'Schüler:in nicht gefunden.' });
        return response.json({ student: result.rows[0] });
      } catch (error) {
        if (error.code !== '23505') throw error;
      }
    }
    throw new Error('Schülerkennung konnte nicht erzeugt werden.');
  } catch (error) { return next(error); }
});

app.delete('/api/classes/:classId/students/:studentId', requireUser, requireRole('teacher'), async (request, response, next) => {
  try {
    const result = await getPool().query(
      `DELETE FROM students s USING classes c WHERE s.id = $1 AND s.class_id = c.id AND c.id = $2 AND c.teacher_id = $3 RETURNING s.id`,
      [request.params.studentId, request.params.classId, request.user.id]
    );
    if (!result.rowCount) return response.status(404).json({ error: 'Schüler:in nicht gefunden.' });
    return response.status(204).end();
  } catch (error) { return next(error); }
});

app.post('/api/classes/:classId/students/import', requireUser, requireRole('teacher'), async (request, response, next) => {
  const names = Array.isArray(request.body?.names) ? request.body.names
    .map(name => String(name || '').trim())
    .filter(Boolean) : [];
  if (!names.length || names.length > 100 || names.some(name => name.length > 120)) {
    return response.status(400).json({ error: 'Bitte zwischen 1 und 100 Schülernamen mit jeweils höchstens 120 Zeichen übergeben.' });
  }
  try {
    const db = getPool();
    const ownership = await db.query('SELECT 1 FROM classes WHERE id = $1 AND teacher_id = $2 AND archived_at IS NULL', [request.params.classId, request.user.id]);
    if (!ownership.rowCount) return response.status(404).json({ error: 'Aktive Klasse nicht gefunden.' });
    const students = [];
    for (const displayName of names) {
      const { code, normalized } = await uniqueStudentCode();
      const result = await db.query(
        `INSERT INTO students (id, class_id, display_name, access_code, access_code_normalized)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, display_name AS "displayName", access_code AS "accessCode", created_at AS "createdAt"`,
        [newId(), request.params.classId, displayName, code, normalized]
      );
      students.push(result.rows[0]);
    }
    return response.status(201).json({ students });
  } catch (error) {
    return next(error);
  }
});

// ── Leaderboard persistence ──────────────────────────────────────────────────
const LEADERBOARD_FILE = process.env.LEADERBOARD_FILE || path.join(__dirname, 'leaderboard.json');
const VALID_CATEGORIES = Object.keys(require('../shared/categories.json'));

function loadLeaderboard() {
  try {
    return JSON.parse(fs.readFileSync(LEADERBOARD_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveLeaderboard(data) {
  fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(data, null, 2));
}

const REJOIN_GRACE_MS = 60000;

function createSessionId() {
  return Math.random().toString(36).substring(2, 14);
}

function getPlayerBySocket(room, socketId) {
  for (const [playerId, player] of room.players.entries()) {
    if (player.socketId === socketId) return { playerId, player };
  }
  return null;
}

function finishRoomIfAllPlayersDone(room) {
  const players = Array.from(room.players.values());
  if (players.length > 0 && players.every(player => player.score !== null)) {
    room.status = 'finished';
  }
}

function attachPlayerToSocket(room, playerId, socket, roomId) {
  const player = room.players.get(playerId);
  if (!player) return null;

  player.socketId = socket.id;
  delete player.disconnectedAt;
  socket.join(roomId);
  return player;
}

function serializeRoom(room) {
  return {
    admin: room.admin,
    adminName: room.adminName,
    persistent: Boolean(room.persistent),
    databaseStatus: room.databaseStatus || null,
    status: room.status,
    settings: room.settings || null,
    players: Array.from(room.players.entries()).map(([id, data]) => ({
      id,
      username: data.username,
      status: data.status || null,
      score: data.score,
      progress: data.progress,
      solved: data.solved || [],
      connected: Boolean(data.socketId)
    }))
  };
}

app.get('/api/leaderboard', (req, res) => {
  const category = String(req.query.category || '').trim();
  if (category && !VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'invalid category' });
  }
  let board = loadLeaderboard();
  if (category) board = board.filter(e => e.category === category);
  board.sort((a, b) => b.score - a.score || a.wrongCount - b.wrongCount);
  res.json(board.slice(0, 20));
});

app.post('/api/leaderboard', (req, res) => {
  const { username, category, score, wrongCount } = req.body;
  if (typeof username !== 'string' || !VALID_CATEGORIES.includes(category) ||
      !Number.isInteger(score) || score < 0 ||
      !Number.isInteger(wrongCount) || wrongCount < 0) {
    return res.status(400).json({ error: 'invalid data' });
  }
  const sanitized = username.trim().slice(0, 30).replace(/[<>"']/g, '');
  if (!sanitized) return res.status(400).json({ error: 'invalid username' });
  const board = loadLeaderboard();
  board.push({ username: sanitized, category, score, wrongCount, date: new Date().toISOString() });
  saveLeaderboard(board);
  res.json({ ok: true });
});
// ─────────────────────────────────────────────────────────────────────────────
const ORIGIN = process.env.ORIGIN || '*';
const io = new Server(httpServer, {
  cors: {
    origin: ORIGIN,
    methods: ["GET", "POST"]
  }
});

// Room state management.  Temporary rooms only live here.  Persistent test
// rooms are hydrated from PostgreSQL and use this map solely for live state
// (connections, current progress and websocket broadcasts).
const rooms = new Map();

async function hydratePersistentRoom(roomId) {
  const db = getPool();
  const result = await db.query(
    `SELECT r.id, r.status, e.title, e.category, e.settings, e.duration_seconds AS "durationSeconds"
       FROM exam_rooms r JOIN exams e ON e.id = r.exam_id
      WHERE r.id = $1`, [roomId]
  );
  if (!result.rowCount) return null;

  const roomData = result.rows[0];
  const students = await db.query(
    `SELECT s.id, s.display_name AS "displayName", ers.status, ers.correct_count AS "correctCount",
            ers.wrong_count AS "wrongCount"
       FROM exam_room_students ers JOIN students s ON s.id = ers.student_id
      WHERE ers.room_id = $1 ORDER BY s.display_name`, [roomId]
  );
  const answers = await db.query(
    'SELECT student_id, task, submitted_answer, is_correct, assisted FROM exam_answers WHERE room_id = $1 ORDER BY position', [roomId]);
  const savedAnswers = new Map();
  for (const answer of answers.rows) {
    const solved = savedAnswers.get(answer.student_id) || [];
    solved.push({ ...answer.task, user: answer.submitted_answer?.value, schriftlichSnapshot: answer.submitted_answer?.schriftlichSnapshot,
      isCorrect: answer.is_correct, assisted: answer.assisted });
    savedAnswers.set(answer.student_id, solved);
  }
  const existing = rooms.get(roomId);
  const players = new Map();
  for (const student of students.rows) {
    const previous = existing?.players?.get(student.id);
    players.set(student.id, {
      username: student.displayName,
      status: student.status,
      score: student.status === 'finished' ? { time: student.correctCount, wrongCount: student.wrongCount } : null,
      progress: student.status === 'finished' ? 100 : previous?.progress || 0,
      solved: (previous?.solved?.length || 0) > (savedAnswers.get(student.id)?.length || 0) ? previous.solved : savedAnswers.get(student.id) || [],
      socketId: previous?.socketId || null
    });
  }
  const room = {
    ...existing,
    id: roomId,
    persistent: true,
    adminName: roomData.title,
    status: ({ waiting: 'waiting', code_released: 'waiting', running: 'playing', finished: 'finished' })[roomData.status] || 'waiting',
    databaseStatus: roomData.status,
    settings: { ...roomData.settings, category: roomData.category, durationSeconds: roomData.durationSeconds },
    players
  };
  rooms.set(roomId, room);
  return room;
}

async function persistExamAnswer(roomId, studentId, position, entry) {
  if (!Number.isInteger(position) || position < 0 || !entry || typeof entry !== 'object') return;
  const serialized = JSON.stringify(entry);
  if (!serialized || serialized.length > 100000) return;
  const { user, isCorrect, assisted, schriftlichSnapshot, ...task } = entry;
  const saved = await getPool().query(
    `INSERT INTO exam_answers (room_id, student_id, position, task, submitted_answer, is_correct, assisted, submitted_at)
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, NOW())
     ON CONFLICT (room_id, student_id, position) DO NOTHING`,
    [roomId, studentId, position, JSON.stringify(task), JSON.stringify({ value: user ?? null, schriftlichSnapshot: schriftlichSnapshot ?? null }), Boolean(isCorrect), Boolean(assisted)]
  );
  if (saved.rowCount) {
    await getPool().query(
      `UPDATE exam_room_students SET current_position = GREATEST(current_position, $1), last_progress_at = NOW()
        WHERE room_id = $2 AND student_id = $3 AND status = 'started'`,
      [position + 1, roomId, studentId]
    );
  }
}

async function persistentRoomForTeacher(roomId, cookie) {
  const user = await findSessionUser(readCookies(cookie)[AUTH_COOKIE]);
  if (!user || user.role !== 'teacher') return null;
  const ownership = await getPool().query(
    `SELECT 1 FROM exam_rooms r JOIN exams e ON e.id = r.exam_id JOIN classes c ON c.id = e.class_id
      WHERE r.id = $1 AND c.teacher_id = $2`, [roomId, user.id]
  );
  if (!ownership.rowCount) return null;
  const room = await hydratePersistentRoom(roomId);
  return room ? { room, user } : null;
}

async function persistentRoomForStudent(roomId, token, cookie) {
  const student = await findStudentSession(readCookies(cookie)[STUDENT_COOKIE]);
  if (!student) return null;
  const participant = await getPool().query(
    `SELECT ers.status FROM exam_room_students ers JOIN exam_rooms r ON r.id = ers.room_id
      WHERE r.id = $1 AND r.access_token_hash = $2 AND ers.student_id = $3`,
    [roomId, hashRoomToken(token), student.id]
  );
  if (!participant.rowCount || !['started', 'finished'].includes(participant.rows[0].status)) return null;
  const room = await hydratePersistentRoom(roomId);
  return room ? { room, student } : null;
}

async function broadcastPersistentRoom(roomId) {
  const room = await hydratePersistentRoom(roomId);
  if (room) updateRoomState(roomId);
}

// Serialize submissions in one room so the last commit always closes the room.
// Retrying a confirmed submission is harmless; counts come from stored answers.
async function finishPersistentAttempt(roomId, studentId) {
  const db = await getPool().connect();
  try {
    await db.query('BEGIN');
    await db.query('SELECT id FROM exam_rooms WHERE id = $1 FOR UPDATE', [roomId]);
    const participant = await db.query('SELECT status FROM exam_room_students WHERE room_id = $1 AND student_id = $2 FOR UPDATE', [roomId, studentId]);
    if (!['started', 'finished'].includes(participant.rows[0]?.status)) { await db.query('ROLLBACK'); return false; }
    await db.query(`UPDATE exam_room_students SET status = 'finished', finished_at = COALESCE(finished_at, NOW()),
      correct_count = (SELECT COUNT(*) FROM exam_answers WHERE room_id = $1 AND student_id = $2 AND is_correct),
      wrong_count = (SELECT COUNT(*) FROM exam_answers WHERE room_id = $1 AND student_id = $2 AND NOT is_correct)
      WHERE room_id = $1 AND student_id = $2`, [roomId, studentId]);
    await finishPersistentRoomIfComplete(roomId, db);
    await db.query('COMMIT');
    return true;
  } catch (error) { await db.query('ROLLBACK').catch(() => {}); throw error; }
  finally { db.release(); }
}

async function finishPersistentRoomIfComplete(roomId, db = getPool()) {
  await db.query(
    `UPDATE exam_rooms r SET status = 'finished', finished_at = NOW()
      WHERE r.id = $1 AND r.status = 'running'
        AND NOT EXISTS (
          SELECT 1 FROM exam_room_students ers
           WHERE ers.room_id = r.id AND ers.status NOT IN ('finished', 'absent')
        )`, [roomId]
  );
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('createRoom', (input) => {
    // Temporary rooms are fully configured before their code is issued.  The
    // category is also their display name, so no separate room name is needed.
    const category = VALID_CATEGORIES.includes(input?.settings?.category) ? input.settings.category : 'einmaleins';
    const settings = { category, ...sanitizeActivitySettings(category, input?.settings) };
    const roomName = require('../shared/categories.json')[category]?.label || 'Mehrspieler-Raum';
    // generate a lowercase 6-char room id
    const roomId = Math.random().toString(36).substring(2, 8).toLowerCase();
    // generate a simple admin token so the admin can rejoin after reload
    const adminToken = Math.random().toString(36).substring(2, 14);
    // store admin separately; do NOT include admin in the players map
    rooms.set(roomId, {
      admin: socket.id,
      adminName: roomName,
      adminToken,
      players: new Map(),
      status: 'waiting', // waiting, playing, finished
      startTime: null,
      settings
    });
    socket.join(roomId);
    socket.emit('roomCreated', { roomId, isAdmin: true, adminName: roomName, adminToken });
    updateRoomState(roomId);
  });

  // allow an admin to rejoin using the secret token
  socket.on('rejoinAsAdmin', ({ roomId, adminToken, username }) => {
    console.log('[Server] rejoinAsAdmin requested for room:', roomId, 'by socket:', socket.id);
    const rid = String(roomId).toLowerCase();
    const room = rooms.get(rid);
    if (!room) {
      console.log('[Server] Room not found:', rid);
      socket.emit('error', 'Room not found');
      return;
    }
    if (!adminToken || adminToken !== room.adminToken) {
      console.log('[Server] Invalid admin token for room:', rid);
      socket.emit('error', 'Invalid admin token');
      return;
    }

    // assign this socket as admin
    room.admin = socket.id;
    if (username) room.adminName = username;
    
    // Clear the grace period flag if it exists
    if (room.adminDisconnectedAt) {
      console.log('[Server] Admin reconnected, clearing grace period for room:', rid);
      delete room.adminDisconnectedAt;
    }
    
    // ensure socket is in room
    socket.join(rid);
    console.log('[Server] Admin rejoined room:', rid);
    socket.emit('roomRejoined', { roomId: rid, isAdmin: true, adminName: room.adminName });
    updateRoomState(rid);
  });

  // Persistent test rooms authenticate the teacher through the normal
  // HttpOnly session cookie; unlike a temporary room, no browser token is
  // stored in localStorage.
  socket.on('openPersistentRoom', async ({ roomId }) => {
    try {
      const persistent = await persistentRoomForTeacher(String(roomId), socket.handshake.headers.cookie || '');
      if (!persistent) return socket.emit('error', 'Keine Berechtigung für diesen Testraum.');
      persistent.room.admin = socket.id;
      persistent.room.adminDisconnectedAt = null;
      socket.join(String(roomId));
      socket.emit('persistentRoomOpened', { roomId: String(roomId) });
      updateRoomState(String(roomId));
    } catch (error) {
      console.error('Persistent room could not be opened:', error);
      socket.emit('error', 'Testraum konnte nicht geladen werden.');
    }
  });

  // A student reaches this only after the existing code-based test start.
  // The database therefore remains the authorization source, while the
  // websocket map contributes live connection and progress information.
  socket.on('joinPersistentRoom', async ({ roomId, token }) => {
    try {
      const persistent = await persistentRoomForStudent(String(roomId), token, socket.handshake.headers.cookie || '');
      if (!persistent) return socket.emit('error', 'Der Testzugang ist nicht verfügbar.');
      attachPlayerToSocket(persistent.room, persistent.student.id, socket, String(roomId));
      socket.emit('roomJoined', { roomId: String(roomId), isAdmin: false, persistent: true, playerId: persistent.student.id, username: persistent.student.displayName });
      updateRoomState(String(roomId));
    } catch (error) {
      console.error('Persistent room could not be joined:', error);
      socket.emit('error', 'Testzugang konnte nicht hergestellt werden.');
    }
  });

  socket.on('joinRoom', ({ roomId, username, playerId }) => {
    const rid = String(roomId).toLowerCase();
    const room = rooms.get(rid);
    if (!room) {
      socket.emit('error', 'Room not found');
      return;
    }
    if (room.status !== 'waiting') {
      socket.emit('error', 'Game already in progress');
      return;
    }

    const sessionId = String(playerId || createSessionId());
    const existingPlayer = room.players.get(sessionId);
    if (existingPlayer) {
      existingPlayer.username = username;
      attachPlayerToSocket(room, sessionId, socket, rid);
      socket.emit('roomJoined', { roomId: rid, isAdmin: false, playerId: sessionId, username });
      updateRoomState(rid);
      return;
    }

    socket.join(rid);
    room.players.set(sessionId, { username, score: null, progress: 0, socketId: socket.id });
    socket.emit('roomJoined', { roomId: rid, isAdmin: false, playerId: sessionId, username });
    updateRoomState(rid);
  });

  socket.on('rejoinPlayer', ({ roomId, playerId }) => {
    const rid = String(roomId).toLowerCase();
    const sessionId = String(playerId || '');
    const room = rooms.get(rid);
    if (!room || !sessionId) return;

    const player = attachPlayerToSocket(room, sessionId, socket, rid);
    if (!player) return;

    socket.emit('roomRejoined', {
      roomId: rid,
      isAdmin: false,
      playerId: sessionId,
      username: player.username
    });
    updateRoomState(rid);
  });

  socket.on('updateSettings', ({ roomId, settings }) => {
    const rid = String(roomId).toLowerCase();
    const room = rooms.get(rid);
    if (!room || room.admin !== socket.id) return;

    // Merge new settings
    room.settings = {
      ...room.settings,
      ...settings
    };
    
    // Broadcast update to all (so admin gets confirmation, and potential other views update)
    updateRoomState(rid);
  });

  socket.on('startGame', (data) => {
    // Handle both old format (just roomId) and new format ({ roomId, settings })
    const roomId = typeof data === 'string' ? data : data.roomId;
    const settings = typeof data === 'object' ? data.settings : {};
    
    const rid = String(roomId).toLowerCase();
    const room = rooms.get(rid);
    if (!room || room.admin !== socket.id) return;
    
    // Store settings in room state
    const category = settings && typeof settings.category === 'string'
      ? settings.category
      : (room.settings?.category || 'einmaleins');
    
    // Use provided settings but ensure category is correct
    room.settings = {
      ...settings,
      category
    };
    
    room.status = 'playing';
    room.startTime = Date.now();
    
    console.log('[Server] Game started for room:', rid, 'with settings:', room.settings);
    
    // Emit gameStarted with settings so clients can generate problems
    io.to(rid).emit('gameStarted', { settings: room.settings });
    updateRoomState(rid);
  });

  // allow clients to check whether a room exists and its status
  // allow clients to check whether a room exists and its status
  socket.on('checkRoom', (roomId) => {
    const rid = String(roomId).toLowerCase();
    const room = rooms.get(rid);
    if (!room) {
      socket.emit('roomCheckResult', { roomId: rid, exists: false, status: null });
      return;
    }
    socket.emit('roomCheckResult', { roomId: rid, exists: true, status: room.status, settings: room.settings || null });
  });

  // Allow clients (especially admin) to request current room state
  socket.on('getRoomState', (roomId) => {
    console.log('[Server] getRoomState requested for:', roomId, 'by socket:', socket.id);
    const rid = String(roomId).toLowerCase();
    const room = rooms.get(rid);
    if (!room) {
      console.log('[Server] Room not found:', rid);
      socket.emit('error', 'Room not found');
      return;
    }
    // Send room state directly to this socket
    const state = serializeRoom(room);
    console.log('[Server] Sending roomState to socket:', socket.id, 'state:', state);
    socket.emit('roomState', state);
  });

  socket.on('updateProgress', ({ roomId, progress, solved }) => {
    const rid = String(roomId).toLowerCase();
    const room = rooms.get(rid);
    if (!room || room.status === 'finished') return;
    
    const playerEntry = getPlayerBySocket(room, socket.id);
    const player = playerEntry?.player;
    if (player && !player.score) { // only update if player hasn't finished
      player.progress = progress;
      // Store solved problems (array) for admin view
      if (Array.isArray(solved)) {
        player.solved = solved;
      }
      updateRoomState(rid);
    }
  });

  socket.on('finishGame', ({ roomId, score, wrongCount }) => {
    const rid = String(roomId).toLowerCase();
    const room = rooms.get(rid);
    if (!room || room.status === 'finished') return;
    
    const playerEntry = getPlayerBySocket(room, socket.id);
    const player = playerEntry?.player;
    if (player && !player.score) { // only allow finishing once
      if (room.persistent) {
        finishPersistentAttempt(rid, playerEntry.playerId)
          .then(() => broadcastPersistentRoom(rid))
          .catch(error => { console.error('Could not persist test result:', error); socket.emit('error', 'Die Abgabe konnte nicht gespeichert werden. Bitte erneut versuchen.'); });
      } else {
        player.score = { time: score, wrongCount };
        player.progress = 100;
        finishRoomIfAllPlayersDone(room);
        updateRoomState(rid);
      }
    }
  });

  socket.on('recordExamAnswer', ({ roomId, position, entry }) => {
    const rid = String(roomId).toLowerCase();
    const room = rooms.get(rid);
    const playerEntry = room ? getPlayerBySocket(room, socket.id) : null;
    if (!room?.persistent || room.status !== 'playing' || !playerEntry || playerEntry.player.score) return;
    persistExamAnswer(rid, playerEntry.playerId, Number(position), entry)
      .catch(error => console.error('Could not persist exam answer:', error));
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    // Walk rooms and clean up any references
    for (const [roomId, room] of rooms.entries()) {
      // If the admin disconnected
      if (room.admin === socket.id) {
        if (room.persistent) { room.admin = null; continue; }
        // Set a grace period before deleting the room
        // This allows admin to reload/reconnect without losing the room
        console.log(`[Server] Admin disconnected from room ${roomId}, setting 60s grace period`);
        room.adminDisconnectedAt = Date.now();
        room.previousAdminId = socket.id;
        
        // Delete an unfinished room after 60 seconds if admin hasn't rejoined.
        // Finished rooms keep their results available for the admin.
        setTimeout(() => {
          const currentRoom = rooms.get(roomId);
          if (!currentRoom || !currentRoom.adminDisconnectedAt) {
            // Room was deleted or admin already rejoined
            return;
          }

          if (currentRoom.status === 'finished') {
            console.log(`[Server] Keeping finished room ${roomId} so results remain available`);
            return;
          }
          
          console.log(`[Server] Grace period expired for room ${roomId}, deleting room`);
          rooms.delete(roomId);
        }, REJOIN_GRACE_MS); // 60 second grace period
        
        continue;
      }

      // If a regular player disconnects before the game starts, remove them after
      // the grace period. Once play has started, keep the row visible for the admin.
      const playerEntry = getPlayerBySocket(room, socket.id);
      if (playerEntry) {
        playerEntry.player.socketId = null;
        playerEntry.player.disconnectedAt = Date.now();
        console.log(`[Server] Player disconnected from room ${roomId}`);

        if (room.status === 'waiting') {
          setTimeout(() => {
            const currentRoom = rooms.get(roomId);
            const currentPlayer = currentRoom?.players.get(playerEntry.playerId);
            if (!currentRoom || !currentPlayer || !currentPlayer.disconnectedAt) return;
            if (currentRoom.status !== 'waiting') return;

            currentRoom.players.delete(playerEntry.playerId);
            updateRoomState(roomId);
          }, REJOIN_GRACE_MS);
        }

        updateRoomState(roomId);
      }
    }
  });
});

function updateRoomState(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  const state = serializeRoom(room);
  
  io.to(roomId).emit('roomState', state);
}

// PDF Report generation endpoint
app.get('/api/report/:roomId', (req, res) => {
  const roomId = String(req.params.roomId || '').toLowerCase();
  const room = rooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const finishedPlayers = Array.from(room.players.values()).filter(p => p.score !== null);
  // sanitize / minimal copy to avoid leaking sockets or functions
  const exportPlayers = finishedPlayers.map(p => ({
    username: p.username,
    score: p.score,
    // The report needs the task type and display fields to describe every current game mode.
    solved: (p.solved || []).map(s => ({
      type: s.type,
      operation: s.operation,
      a: s.a,
      b: s.b,
      number: s.number,
      expression: s.expression,
      text: s.text,
      unit: s.unit,
      variant: s.variant,
      exampleEquation: s.exampleEquation,
      summandsDigits: s.summandsDigits,
      user: s.user,
      correct: s.correct,
      isCorrect: s.isCorrect,
      assisted: s.assisted
    }))
  }));

  generateReport(res, { id: roomId, category: room.settings?.category }, exportPlayers);
});

// In production the Node process serves the Vite build as well. The Vite
// development server still proxies API and Socket.IO traffic during local work.
const frontendDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(frontendDir)) {
  app.use(express.static(frontendDir));
  app.get('*', (_req, res) => res.sendFile(path.join(frontendDir, 'index.html')));
}

const PORT = Number(process.env.PORT) || 3000;

app.use((error, _request, response, _next) => {
  console.error('Request failed:', error);
  response.status(500).json({ error: 'Unerwarteter Serverfehler.' });
});

async function startServer() {
  try {
    if (await initializeDatabase()) {
      console.log('Kontoverwaltung und Klassendatenbank bereit.');
    } else {
      console.log('Kontoverwaltung deaktiviert (DATABASE_URL fehlt).');
    }
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      if (isDatabaseConfigured()) rehearsalBots.recover().catch(error => console.error('Could not resume rehearsal bots:', error));
    });
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

startServer();
