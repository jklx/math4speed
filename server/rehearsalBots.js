const categories = require('../shared/categories.json');

const PROFILES = {
  fast: { name: 'Mia · automatisch', pace: 0.7, errorEvery: 7 },
  steady: { name: 'Noah · automatisch', pace: 1.2, errorEvery: 4 }
};

function answerFor(problem, position, profile) {
  const isCorrect = (position + 1) % PROFILES[profile].errorEvery !== 0;
  const correct = problem.correct;
  // Change the first number in formatted answers, preserving fraction/polynomial notation.
  const wrong = typeof correct === 'number' ? correct + 1
    : String(correct).replace(/-?\d+/, number => String(Number(number) + 1));
  return { ...problem, user: isCorrect ? correct : wrong, isCorrect, assisted: false };
}

function createRehearsalBots({ getPool, createStudentSession, origin, intervalMs = 1000 }) {
  const runs = new Map();
  const preparing = new Map();
  const snapshot = roomId => {
    const run = runs.get(roomId);
    return { active: Boolean(run?.active), error: run?.error || null };
  };

  async function stopRun(roomId) {
    const run = runs.get(roomId);
    if (!run) return;
    run.controller.abort();
    await run.done;
    runs.delete(roomId);
  }

  async function stop(roomId) {
    await preparing.get(roomId);
    await stopRun(roomId);
  }

  function prepare(roomId) {
    if (preparing.has(roomId)) return preparing.get(roomId);
    const pending = start(roomId).finally(() => preparing.delete(roomId));
    preparing.set(roomId, pending);
    return pending;
  }

  async function start(roomId) {
    if (runs.get(roomId)?.active) return snapshot(roomId);
    await stopRun(roomId);
    const result = await getPool().query(`SELECT r.status, r.access_token AS token, e.category, e.settings,
      e.duration_seconds AS duration, c.is_rehearsal, e.seb_required
      FROM exam_rooms r JOIN exams e ON e.id=r.exam_id JOIN classes c ON c.id=e.class_id WHERE r.id=$1`, [roomId]);
    const room = result.rows[0];
    if (!room?.is_rehearsal || room.seb_required || room.status === 'finished') return snapshot(roomId);
    const pupils = await getPool().query(`SELECT s.id, s.rehearsal_bot_profile AS profile FROM students s
      JOIN exam_room_students ers ON ers.student_id=s.id WHERE ers.room_id=$1 AND s.rehearsal_bot_profile IS NOT NULL`, [roomId]);
    if (!pupils.rowCount) return snapshot(roomId);
    const controller = new AbortController();
    const run = { active: true, error: null, controller, code: null };
    runs.set(roomId, run);
    const sleep = ms => new Promise(resolve => {
      if (controller.signal.aborted) return resolve();
      const finish = () => { clearTimeout(timer); controller.signal.removeEventListener('abort', finish); resolve(); };
      const timer = setTimeout(finish, ms);
      controller.signal.addEventListener('abort', finish, { once: true });
    });
    run.done = (async () => {
      try {
        const { generateProblems } = await import('../src/problems/generators.js');
        const bots = [];
        for (const pupil of pupils.rows) {
          if (controller.signal.aborted) return;
          bots.push({ ...pupil, cookie: `math4speed_student=${await createStudentSession(pupil.id)}` });
        }
        async function request(bot, suffix, body) {
          const response = await fetch(`${origin()}/api/exam-rooms/${roomId}/${suffix}${body === undefined ? `?token=${encodeURIComponent(room.token)}` : ''}`, {
            method: body === undefined ? 'GET' : 'POST',
            headers: { 'Content-Type': 'application/json', Cookie: bot.cookie },
            body: body === undefined ? undefined : JSON.stringify({ token: room.token, ...body }),
            signal: AbortSignal.timeout(5000)
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw Error(data.error || 'Die Automatik konnte den Test nicht fortsetzen.');
          return data;
        }
        while (!controller.signal.aborted) {
          const state = await getPool().query(`SELECT ers.student_id, ers.status, r.status AS room_status
            FROM exam_room_students ers JOIN exam_rooms r ON r.id=ers.room_id WHERE ers.room_id=$1`, [roomId]);
          if (!state.rowCount || state.rows[0].room_status === 'finished') break;
          let allDone = true;
          run.error = null;
          for (const bot of bots) {
            if (controller.signal.aborted) return;
            const status = state.rows.find(row => row.student_id === bot.id)?.status;
            if (!status || ['finished', 'absent'].includes(status)) continue;
            allDone = false;
            try {
              if (status === 'pending') { await request(bot, 'ready', {}); continue; }
              if (status === 'ready') {
                if (run.code) { await request(bot, 'start', { code: run.code }); }
                else if (state.rows[0].room_status !== 'waiting') run.error = 'Die Startfreigabe fehlt nach einem Serverneustart. Bitte den Probedurchlauf zurücksetzen.';
                continue;
              }
              if (!bot.plan) {
                const { exam } = await request(bot, 'current');
                bot.plan = exam.taskPlan?.length ? exam.taskPlan : generateProblems(100, room.category, room.settings);
                if (!bot.plan.length) throw Error('Für diese Kategorie konnten keine Probe-Aufgaben erzeugt werden.');
                bot.position = exam.currentPosition || 0;
                bot.deadline = Date.now() + exam.remainingSeconds * 1000;
                const range = categories[room.category]?.performance?.default || [5, 10];
                bot.delay = Math.max(2000, (range[0] + range[1]) / 2 * 1000 * PROFILES[bot.profile].pace);
                bot.nextAnswer = Date.now() + bot.delay;
                await request(bot, 'progress', { taskPlan: bot.plan, currentPosition: bot.position, remainingSeconds: exam.remainingSeconds });
              }
              if (Date.now() >= bot.deadline) { await request(bot, 'finish', {}); continue; }
              if (Date.now() < bot.nextAnswer) continue;
              const entry = answerFor(bot.plan[bot.position % bot.plan.length], bot.position, bot.profile);
              await request(bot, 'answers', { position: bot.position, entry });
              bot.position += 1;
              bot.nextAnswer = Date.now() + bot.delay;
              await request(bot, 'progress', { currentPosition: bot.position, remainingSeconds: Math.max(0, Math.floor((bot.deadline - Date.now()) / 1000)) });
            } catch (error) {
              if (controller.signal.aborted) return;
              run.error = `${PROFILES[bot.profile].name}: ${error.message}`;
            }
          }
          if (allDone) break;
          await sleep(intervalMs);
        }
      } catch (error) {
        if (!controller.signal.aborted) run.error = error.message;
      } finally { run.active = false; }
    })();
    return snapshot(roomId);
  }

  function release(roomId, code) {
    const run = runs.get(roomId);
    if (run) run.code = code;
  }

  async function recover() {
    const result = await getPool().query(`SELECT DISTINCT r.id FROM exam_rooms r JOIN exams e ON e.id=r.exam_id
      JOIN classes c ON c.id=e.class_id JOIN students s ON s.class_id=c.id
      WHERE c.is_rehearsal AND NOT e.seb_required AND r.status <> 'finished' AND s.rehearsal_bot_profile IS NOT NULL`);
    for (const room of result.rows) await prepare(room.id);
  }

  return { prepare, stop, snapshot, release, recover };
}

module.exports = { PROFILES, answerFor, createRehearsalBots };
