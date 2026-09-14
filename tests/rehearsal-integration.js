// Creates and removes its own temporary PostgreSQL database; never uses existing tables.
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { Pool } = require('pg');
const { io } = require('socket.io-client');
const { randomUUID } = require('node:crypto');

async function main() {
  if (!process.env.DATABASE_URL) throw Error('DATABASE_URL is required (permission to create a temporary database).');
  const admin = new Pool({ connectionString: process.env.DATABASE_URL });
  const name = 'm4s_rehearsal_test_' + randomUUID().replaceAll('-', '');
  let child, db, created = false;
  const sockets = [];
  try {
    await admin.query(`CREATE DATABASE "${name}"`); created = true;
    const url = new URL(process.env.DATABASE_URL); url.pathname = '/' + name;
    process.env.DATABASE_URL = url.toString();
    const database = require('../server/database');
    await database.initializeDatabase(); db = database.getPool();
    const teacher = await database.createUser({ username: 'probe_teacher', displayName: 'Probe', password: 'local-test-password', role: 'teacher' });
    await database.createUser({ username: 'other_teacher', displayName: 'Other', password: 'local-test-password', role: 'teacher' });
    const classId = randomUUID(), examId = randomUUID(), studentId = randomUUID();
    await db.query('INSERT INTO classes (id, teacher_id, name) VALUES ($1,$2,$3)', [classId, teacher.id, 'Real class']);
    await db.query("INSERT INTO students (id,class_id,display_name,access_code,access_code_normalized) VALUES ($1,$2,'Real student','realcode','realcode')", [studentId, classId]);
    await db.query("INSERT INTO exams (id,class_id,title,category,settings,duration_seconds,seb_required) VALUES ($1,$2,'Original','einmaleins',$3,60,TRUE)", [examId,classId,{ maxFactor: 12 }]);
    const port = 33179;
    child = spawn(process.execPath, ['server/server.js'], { env: { ...process.env, PORT: String(port) }, stdio: ['ignore','pipe','pipe'], windowsHide: true });
    let logs = ''; child.stdout.on('data', x => logs += x); child.stderr.on('data', x => logs += x);
    const base = `http://127.0.0.1:${port}`;
    let ready = false;
    for (let i=0;i<80;i++) { if (logs.includes('Server running')) {ready=true;break;} if(child.exitCode!==null)throw Error(logs); await new Promise(r=>setTimeout(r,100)); }
    assert.ok(ready, logs);
    async function call(path, cookie='', body, expected=200, method=body===undefined?'GET':'POST') {
      const response = await fetch(base+path,{ method, headers:{'Content-Type':'application/json',Cookie:cookie},body:body===undefined?undefined:JSON.stringify(body) });
      const text = await response.text(); assert.equal(response.status,expected,path+' '+text);
      return {data:text?JSON.parse(text):null,cookie:response.headers.get('set-cookie')?.split(';')[0]};
    }
    function event(socket, name, predicate = () => true) {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { socket.off(name, handler); reject(Error('Timed out: ' + name)); }, 5000);
        function handler(value) { if (!predicate(value)) return; clearTimeout(timer); socket.off(name, handler); resolve(value); }
        socket.on(name, handler);
      });
    }
    const observer=io(base,{autoConnect:false,transports:['websocket']}); sockets.push(observer);
    let connected=event(observer,'connect'); observer.connect(); await connected;
    const login = username=>call('/api/auth/login','',{username,password:'local-test-password'});
    const owner = (await login('probe_teacher')).cookie, other=(await login('other_teacher')).cookie;
    await call(`/api/exams/${examId}/rehearsal`,'',{},401);
    await call(`/api/exams/${examId}/rehearsal`,other,{},404);
    const room=(await call(`/api/exams/${examId}/rehearsal`,owner,{},201)).data.room;
    assert.equal((await call(`/api/exams/${examId}/rehearsal`,owner,{})).data.room.id,room.id);
    const detail=(await call(`/api/exam-rooms/${room.id}`,owner)).data;
    assert.equal(detail.room.isRehearsal,true); assert.equal(detail.room.sebRequired,false); assert.equal(detail.students.length,1);
    assert.notEqual(detail.students[0].id,studentId);
    const classes=(await call('/api/classes',owner)).data.classes; assert.deepEqual(classes.map(c=>c.id),[classId]); assert.equal(classes[0].studentCount,1);
    assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM exam_rooms WHERE exam_id=$1',[examId])).rows[0].n,0);
    const student=(await call('/api/student/login','',{accessCode:detail.students[0].accessCode})).cookie;
    const root=`/api/exam-rooms/${room.id}`, token=room.accessToken;
    // A connection made before login cannot observe; reconnecting sends the new cookie.
    const denied=event(observer,'error'); observer.emit('openPersistentRoom',{roomId:room.id});
    assert.match(await denied,/Berechtigung/);
    observer.io.opts.extraHeaders={Cookie:owner};
    connected=event(observer,'connect'); observer.disconnect().connect(); await connected;
    let observed=event(observer,'roomState'); observer.emit('openPersistentRoom',{roomId:room.id});
    assert.equal((await observed).players.length,1);
    await call(root+'/release-code',owner,{},409);
    await call(root+'/ready',student,{token},204);
    const code=(await call(root+'/release-code',owner,{})).data.code;
    await call(root+'/start',student,{token,code:'invalid'},409);
    await call(root+'/start',student,{token,code});
    const participant=io(base,{autoConnect:false,transports:['websocket'],extraHeaders:{Cookie:student}}); sockets.push(participant);
    connected=event(participant,'connect'); participant.connect(); await connected;
    const joined=event(participant,'roomJoined'); participant.emit('joinPersistentRoom',{roomId:room.id,token}); await joined;
    observed=event(observer,'roomState',state=>state.players.some(p=>p.solved?.length===1));
    participant.emit('updateProgress',{roomId:room.id,progress:2,solved:[{a:2,b:3,user:6,isCorrect:true}]});
    assert.equal((await observed).players[0].solved[0].user,6);
    await call(root+'/progress',student,{token,taskPlan:[{a:2,b:3}],currentPosition:0,remainingSeconds:59},204);
    await call(root+'/answers',student,{token,position:0,entry:{a:2,b:3,user:6,isCorrect:true}},204);
    const resume=(await call(root+'/current?token='+token,student)).data.exam;
    assert.equal(resume.isRehearsal,true); assert.equal(resume.answers.length,1); assert.deepEqual(resume.settings,{maxFactor:12});
    await call(root+'/finish',student,{token,correctCount:1,wrongCount:0},204);
    assert.equal((await call(root,owner)).data.room.status,'finished');
    await call(root+'/reset-rehearsal',other,{},404);
    await call(root+'/reset-rehearsal',owner,{},204);
    assert.equal((await call(root,owner)).data.students[0].status,'pending');
    await call(root+'/wait?token='+token,student,undefined,401);
    assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM exam_answers')).rows[0].n,0);
    const seb=(await call(`/api/exams/${examId}/rehearsal`,owner,{mode:'seb'},201)).data.room;
    const sebDetail=(await call(`/api/exam-rooms/${seb.id}`,owner)).data;
    assert.equal(sebDetail.room.sebRequired,true);
    const sebStudent=(await call('/api/student/login','',{accessCode:sebDetail.students[0].accessCode})).cookie;
    await call(`/api/exam-rooms/${seb.id}/ready`,sebStudent,{token:seb.accessToken},403);
    const secondStudent=(await call('/api/student/login','',{accessCode:detail.students[0].accessCode})).cookie;
    await call(root+'/ready',secondStudent,{token},204);
    const secondCode=(await call(root+'/release-code',owner,{})).data.code;
    await call(root+'/start',secondStudent,{token,code:secondCode});
    assert.equal((await call(root+'/current?token='+token,secondStudent)).data.exam.answers.length,0);
    await call(root+'/answers',secondStudent,{token,position:0,entry:{a:4,b:5,user:20,isCorrect:true}},204);
    observed=event(observer,'roomState',state=>state.players.some(p=>p.solved?.[0]?.user===20));
    observer.emit('openPersistentRoom',{roomId:room.id});
    assert.equal((await observed).players[0].solved[0].user,20);
    const real=(await call(`/api/exams/${examId}/rooms`,owner,{},201)).data.room;
    await call(`/api/exam-rooms/${real.id}/reset-rehearsal`,owner,{},404);
    assert.equal((await call(`/api/exam-rooms/${real.id}`,owner)).data.students[0].id,studentId);
    // Several real pupils: ready pupils must still participate; absentees do not block completion.
    const groupClass=randomUUID(), groupExam=randomUUID();
    await db.query('INSERT INTO classes (id,teacher_id,name) VALUES ($1,$2,$3)',[groupClass,teacher.id,'Status test']);
    await db.query("INSERT INTO exams (id,class_id,title,category,duration_seconds) VALUES ($1,$2,'Status test','einmaleins',60)",[groupExam,groupClass]);
    const group=[];
    for(let i=0;i<4;i++) {
      const id=randomUUID(),accessCode='status'+i;
      await db.query('INSERT INTO students (id,class_id,display_name,access_code,access_code_normalized) VALUES ($1,$2,$3,$4,$4)',[id,groupClass,accessCode,accessCode]);
      group.push({id,cookie:(await call('/api/student/login','',{accessCode})).cookie});
    }
    const groupRoom=(await call(`/api/exams/${groupExam}/rooms`,owner,{},201)).data.room;
    const groupRoot=`/api/exam-rooms/${groupRoom.id}`,groupToken=groupRoom.accessToken;
    await call(groupRoot+'/finish',group[0].cookie,{token:groupToken},409);
    await call(groupRoot+`/students/${group[3].id}/attendance`,owner,{absent:true},200,'PATCH');
    for(const pupil of group.slice(0,3)) await call(groupRoot+'/ready',pupil.cookie,{token:groupToken},204);
    const groupCode=(await call(groupRoot+'/release-code',owner,{})).data.code;
    for(const pupil of group.slice(0,2)) await call(groupRoot+'/start',pupil.cookie,{token:groupToken,code:groupCode});
    await Promise.all(group.slice(0,2).map(pupil=>call(groupRoot+'/finish',pupil.cookie,{token:groupToken,correctCount:999,wrongCount:999},204)));
    let groupState=(await call(groupRoot,owner)).data;
    assert.equal(groupState.room.status,'running'); assert.equal(groupState.students.find(p=>p.id===group[2].id).status,'ready');
    await call(groupRoot+'/start',group[2].cookie,{token:groupToken,code:groupCode});
    // A late delivery must finalize the saved work instead of leaving the room running forever.
    await db.query("UPDATE exam_room_students SET started_at=NOW()-INTERVAL '5 minutes' WHERE room_id=$1 AND student_id=$2",[groupRoom.id,group[2].id]);
    await call(groupRoot+'/finish',group[2].cookie,{token:groupToken},204);
    await call(groupRoot+'/finish',group[2].cookie,{token:groupToken},204);
    assert.equal((await call(groupRoot,owner)).data.room.status,'finished');
    assert.equal((await call(`/api/classes/${groupClass}/exams`,owner)).data.exams[0].roomStatus,'finished');
    const counts=await db.query('SELECT correct_count,wrong_count FROM exam_room_students WHERE room_id=$1',[groupRoom.id]);
    assert.ok(counts.rows.every(row=>row.correct_count===0 && row.wrong_count===0));
    // Reproduce concurrent last submissions repeatedly using independent database connections.
    for(let round=0;round<4;round++) {
      await db.query("UPDATE exam_rooms SET status='running',finished_at=NULL WHERE id=$1",[groupRoom.id]);
      await db.query("UPDATE exam_room_students SET status='started',finished_at=NULL WHERE room_id=$1 AND student_id=ANY($2::uuid[])",[groupRoom.id,group.slice(0,2).map(p=>p.id)]);
      await Promise.all(group.slice(0,2).map(pupil=>call(groupRoot+'/finish',pupil.cookie,{token:groupToken},204)));
      assert.equal((await call(groupRoot,owner)).data.room.status,'finished');
    }
    await db.query("UPDATE exam_rooms SET status='running',finished_at=NULL WHERE id=$1",[groupRoom.id]);
    await database.initializeDatabase();
    assert.equal((await call(groupRoot,owner)).data.room.status,'finished');
    if (process.argv.includes('--bots')) {
      await call(`/api/exam-rooms/${real.id}/bots`,owner,{},409);
      await call(`/api/exam-rooms/${seb.id}/bots`,owner,{},409);
      await call(root+'/bots',other,{},409);
      await call(root+'/reset-rehearsal',owner,{},204);
      await Promise.all([call(root+'/bots',owner,{},204),call(root+'/bots',owner,{},204)]);
      async function waitUntil(predicate, timeout=10000) {
        const deadline=Date.now()+timeout;
        while(Date.now()<deadline) { const state=(await call(root,owner)).data; if(predicate(state)) return state; if(state.automation.error)throw Error(state.automation.error); await new Promise(r=>setTimeout(r,300)); }
        throw Error('Timed out waiting for automatic pupils');
      }
      let botsState=await waitUntil(state=>state.students.filter(p=>p.botProfile && p.status==='ready').length===2);
      assert.equal(botsState.students.length,3);
      assert.equal(botsState.students.filter(p=>!p.botProfile).length,1);
      await call(root+`/students/${detail.students[0].id}/attendance`,owner,{absent:true},200,'PATCH');
      await call(root+'/release-code',owner,{});
      await waitUntil(state=>state.students.filter(p=>p.botProfile && p.status==='started').length===2);
      let liveState=event(observer,'roomState',state=>state.players.some(p=>p.solved?.length>0));
      observer.emit('openPersistentRoom',{roomId:room.id});
      assert.ok((await liveState).players.some(p=>p.solved?.length>0));
      // Restart the process while pupils are working; stored plans and remaining time must resume.
      const oldExited=once(child,'exit'); child.kill(); await oldExited;
      logs='';
      child=spawn(process.execPath,['server/server.js'],{env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe'],windowsHide:true});
      child.stdout.on('data',x=>logs+=x); child.stderr.on('data',x=>logs+=x);
      for(let i=0;i<80 && !logs.includes('Server running');i++) await new Promise(r=>setTimeout(r,100));
      assert.ok(logs.includes('Server running'),logs);
      console.log('Bots resumed after server restart; observing the full 60-second rehearsal.');
      await waitUntil(state=>state.room.status==='finished',75000);
      const botCounts=await db.query(`SELECT s.rehearsal_bot_profile AS profile,ers.correct_count,ers.wrong_count FROM exam_room_students ers
        JOIN students s ON s.id=ers.student_id WHERE ers.room_id=$1 AND s.rehearsal_bot_profile IS NOT NULL`,[room.id]);
      assert.equal(botCounts.rows.length,2);
      assert.ok(botCounts.rows.every(p=>p.correct_count>0 && p.wrong_count>0));
      const fast=botCounts.rows.find(p=>p.profile==='fast'),steady=botCounts.rows.find(p=>p.profile==='steady');
      assert.ok(fast.correct_count+fast.wrong_count>steady.correct_count+steady.wrong_count);
      const botObserved=event(observer,'roomState'); observer.emit('openPersistentRoom',{roomId:room.id});
      assert.equal((await botObserved).status,'finished');
      await call(root+'/reset-rehearsal',owner,{},204);
      await waitUntil(state=>state.students.filter(p=>p.botProfile && p.status==='ready').length===2);
      assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM exam_answers WHERE room_id=$1',[room.id])).rows[0].n,0);
      assert.equal((await call(root,owner)).data.students.find(p=>!p.botProfile).status,'pending');
      await call(root+`/students/${detail.students[0].id}/attendance`,owner,{absent:true},200,'PATCH');
      await call(root+'/release-code',owner,{});
      await waitUntil(state=>state.students.filter(p=>p.botProfile && p.status==='started').length===2);
      await call(root+'/reset-rehearsal',owner,{},204);
      await waitUntil(state=>state.students.filter(p=>p.botProfile && p.status==='ready').length===2);
      await new Promise(r=>setTimeout(r,2500));
      assert.equal((await call(root,owner)).data.room.status,'waiting');
      assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM exam_answers WHERE room_id=$1',[room.id])).rows[0].n,0);
      console.log('PASS: live answers, server restart recovery, reset during an active run.');
      console.log('PASS: two automatic pupils, duplicate protection, start, different speeds, mistakes, timed finish, results and reset.');
    }
    console.log('PASS: startup repair of completed rooms.');
    console.log('PASS: concurrent and late final submissions, idempotent completion, ready and absent pupils, persisted counts and class status.');
    console.log('PASS: live authentication refresh and answer broadcast, isolated rehearsal, ownership, reuse, login, start code, answers, resume, finish, reset, session revocation, SEB mode, real-room protection.');
  } finally {
    for (const socket of sockets) socket.disconnect();
    if(child && child.exitCode===null) { const exited=once(child,'exit'); child.kill(); await exited; }
    if(db) await db.end();
    if(created) await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
    await admin.end();
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});



