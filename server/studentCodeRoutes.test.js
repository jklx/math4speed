const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { validateStudentCodeStyle } = require('./studentCodes');

// Run the actual route handlers with a database double, without starting the server.
const source = fs.readFileSync(require.resolve('./server'), 'utf8');
function routes(query, generatedStyles = []) {
  const handlers = new Map();
  const app = Object.fromEntries(['get', 'post', 'patch', 'delete'].map(method => [method,
    (path, ...callbacks) => handlers.set(`${method} ${path}`, callbacks.at(-1))]));
  const context = {
    app, requireUser: () => {}, requireRole: () => () => {},
    getPool: () => ({ query }), newId: () => 'new-id', validateStudentCodeStyle,
    uniqueStudentCode: async style => { generatedStyles.push(style); return { code: 'MarieCurie0042', normalized: 'mariecurie0042' }; }
  };
  for (const [start, end] of [
    ["app.post('/api/classes',", "app.get('/api/classes/:classId/progress',"],
    ["app.post('/api/classes/:classId/students',", 'const VALID_CATEGORIES']
  ]) vm.runInNewContext(source.slice(source.indexOf(start), source.indexOf(end)), context);
  return handlers;
}
async function invoke(handler, body = {}) {
  const response = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
  await handler({ body, params: { classId: 'class-id', studentId: 'student-id' }, user: { id: 'teacher-id' } }, response, error => { throw error; });
  return response;
}

test('class creation defaults to animals and persists an explicit personality choice', async () => {
  for (const studentCodeStyle of [undefined, 'personalities']) {
    let values;
    const handlers = routes(async (_sql, params) => { values = params; return { rows: [{ id: 'new-id', studentCodeStyle: params[3] }] }; });
    const result = await invoke(handlers.get('post /api/classes'), { name: '7a', studentCodeStyle });
    assert.equal(result.statusCode, 201);
    assert.deepEqual(Array.from(values), ['new-id', 'teacher-id', '7a', studentCodeStyle || 'animals']);
  }
});

test('style updates reject invalid input before querying and restrict changes to the owning active class', async () => {
  const calls = [];
  const handlers = routes(async (sql, params) => { calls.push({ sql, params }); return { rowCount: 0, rows: [] }; });
  const handler = handlers.get('patch /api/classes/:classId');
  for (const body of [{}, { studentCodeStyle: null }, { studentCodeStyle: 'invalid' }]) {
    assert.equal((await invoke(handler, body)).statusCode, 400);
  }
  assert.equal(calls.length, 0);
  assert.equal((await invoke(handler, { studentCodeStyle: 'personalities' })).statusCode, 404);
  assert.match(calls[0].sql, /teacher_id = \$2 AND archived_at IS NULL AND is_rehearsal = FALSE/);
  assert.deepEqual(Array.from(calls[0].params), ['class-id', 'teacher-id', 'personalities']);
  assert.doesNotMatch(calls[0].sql, /UPDATE students/);
  const success = routes(async () => ({ rowCount: 1, rows: [{ id: 'class-id', studentCodeStyle: 'personalities' }] }));
  assert.equal((await invoke(success.get('patch /api/classes/:classId'), { studentCodeStyle: 'personalities' })).body.class.studentCodeStyle, 'personalities');
});

test('single creation, import and regeneration all use the class style and reject missing ownership', async () => {
  for (const path of ['/api/classes/:classId/students', '/api/classes/:classId/students/import', '/api/classes/:classId/students/:studentId/regenerate-code']) {
    for (const owned of [true, false]) {
      const generatedStyles = [];
      const queries = [];
      const handlers = routes(async (sql, params) => {
        queries.push({ sql, params });
        if (sql.startsWith('SELECT')) return { rowCount: owned ? 1 : 0, rows: owned ? [{ studentCodeStyle: 'personalities' }] : [] };
        return { rowCount: 1, rows: [{ id: 'student-id', accessCode: params.includes('MarieCurie0042') ? 'MarieCurie0042' : null }] };
      }, generatedStyles);
      const result = await invoke(handlers.get(`post ${path}`), { displayName: 'Mia', names: ['Mia', 'Noah'] });
      assert.equal(result.statusCode, owned ? (path.endsWith('regenerate-code') ? 200 : 201) : 404);
      assert.equal(generatedStyles.length, owned ? (path.endsWith('import') ? 2 : 1) : 0);
      assert.ok(generatedStyles.every(style => style === 'personalities'));
      assert.match(queries[0].sql, /teacher_id/);
      if (!owned) assert.equal(queries.length, 1);
      else assert.ok(queries.slice(1).every(({ params }) => params.includes('MarieCurie0042')));
    }
  }
});
