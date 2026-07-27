const { io } = require('socket.io-client');
const { performance } = require('perf_hooks');
const CATEGORIES = require('../shared/categories.json');

const DEFAULT_CATEGORY = 'einmaleins';
const DEFAULT_DURATION_SECONDS = CATEGORIES[DEFAULT_CATEGORY].durationMinutes * 60;
const SIM_DURATION_SECONDS = Number(process.env.SIM_DURATION_SECONDS || 0) || null;
const PROGRESS_UPDATE_INTERVAL_MS = 1000;

// Performance profiles for different types of students
const STUDENT_PROFILES = {
  fast: {
    name: 'FastSolver',
    thinkTimeRange: [800, 1200],    // ms per problem
    accuracyRange: [0.95, 1.0],     // 95-100% correct
  },
  average: {
    name: 'AverageSolver',
    thinkTimeRange: [1500, 3000],   // ms per problem
    accuracyRange: [0.85, 0.95],      // 80-90% correct
  },
  struggling: {
    name: 'StrugglingLearner',
    thinkTimeRange: [2500, 5000],   // ms per problem
    accuracyRange: [0.7, 0.8],     // 60-75% correct
  }
};

// Utility to generate random number between min and max
const random = (min, max) => Math.random() * (max - min) + min;

// Simulates a student solving a problem
function simulateAnswer(problem, profile) {
  const accuracy = random(profile.accuracyRange[0], profile.accuracyRange[1]);
  const correct = problem.a * problem.b;
  const willBeCorrect = Math.random() < accuracy;
  
  if (willBeCorrect) {
    return correct;
  } else {
    // Generate wrong answer close to correct one
    const offset = Math.floor(random(-2, 3));
    return correct + offset;
  }
}

// Generate multiplication problems (same as in Game.jsx)
function generateProblems(count = 50) {
  const problems = [];
  function pick() {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    return { a, b };
  }

  while (problems.length < count) {
    const { a, b } = pick();
    if (a === 1 || b === 1 || a === 10 || b === 10) {
      if (Math.random() > 0.18) continue;
    }
    problems.push({ id: problems.length + 1, a, b, correct: a * b });
  }
  return problems;
}

class SimulatedStudent {
  constructor(profile, roomId, durationSeconds = DEFAULT_DURATION_SECONDS) {
    this.profile = profile;
    this.roomId = roomId;
    this.socket = io('http://localhost:3000');
    this.durationSeconds = durationSeconds;
    this.problems = generateProblems(80);
    this.answers = [];
    this.current = 0;
    this.startTime = null;
    this.finished = false;
    this.progressTimer = null;
  }

  async connect() {
    return new Promise((resolve) => {
      this.socket.on('connect', () => {
        console.log(`${this.profile.name} connected`);
        resolve();
      });

      // Handle room events
      this.socket.on('gameStarted', () => {
        console.log(`${this.profile.name} starting timed game (${this.durationSeconds}s)`);
        this.startTime = performance.now();
        this.progressTimer = setInterval(() => {
          this.sendProgress();
        }, PROGRESS_UPDATE_INTERVAL_MS);
        this.solveProblems();
      });
    });
  }

  async join() {
    return new Promise((resolve) => {
      this.socket.emit('joinRoom', { roomId: this.roomId, username: this.profile.name });
      this.socket.on('roomJoined', () => {
        console.log(`${this.profile.name} joined room ${this.roomId}`);
        resolve();
      });
    });
  }

  async solveProblems() {
    const solveProblem = async () => {
      if (this.finished) {
        return;
      }

      const elapsedSeconds = (performance.now() - this.startTime) / 1000;
      if (elapsedSeconds >= this.durationSeconds) {
        this.finish();
        return;
      }

      if (this.current + 20 >= this.problems.length) {
        const offset = this.problems.length;
        const moreProblems = generateProblems(50).map(problem => ({ ...problem, id: problem.id + offset }));
        this.problems.push(...moreProblems);
      }

      const problem = this.problems[this.current];
      const answer = simulateAnswer(problem, this.profile);
      
      // Wait for random think time
      const thinkTime = random(this.profile.thinkTimeRange[0], this.profile.thinkTimeRange[1]);
      await new Promise(resolve => setTimeout(resolve, thinkTime));

      if ((performance.now() - this.startTime) / 1000 >= this.durationSeconds) {
        this.finish();
        return;
      }

      // Record answer
      const isCorrect = answer === problem.correct;
      this.answers.push({ ...problem, user: answer, isCorrect });

      this.sendProgress();

      this.current++;
      solveProblem(); // solve next problem
    };

    solveProblem();
  }

  sendProgress(finalProgress = null) {
    if (!this.startTime) return;

    const elapsedSeconds = (performance.now() - this.startTime) / 1000;
    const progress = finalProgress ?? Math.min(99, (elapsedSeconds / this.durationSeconds) * 100);
    this.socket.emit('updateProgress', {
      roomId: this.roomId,
      progress,
      solved: this.answers
    });
  }

  finish() {
    if (this.finished) return;
    this.finished = true;
    if (this.progressTimer) clearInterval(this.progressTimer);

    const endTime = performance.now();
    const elapsed = Math.floor((endTime - this.startTime) / 1000);
    const wrongCount = this.answers.filter(a => !a.isCorrect).length;
    const correctCount = this.answers.filter(a => a.isCorrect).length;

    console.log(`${this.profile.name} finished after ${elapsed}s with ${correctCount} correct and ${wrongCount} wrong answers`);
    
    this.socket.emit('finishGame', {
      roomId: this.roomId,
      score: correctCount,
      wrongCount
    });
    this.sendProgress(100);
  }
}

// Main test function
async function runTest(roomId) {
  if (!roomId) {
    console.error('Please provide a room code as parameter. Example: node tests/multiplayer-simulation.js abc123');
    process.exit(1);
  }

  // Verify room exists first
  const checkSocket = io('http://localhost:3000');
  
  await new Promise((resolve) => {
    checkSocket.on('connect', resolve);
  });

  // Check if room exists and is waiting
  const roomStatus = await new Promise((resolve) => {
    checkSocket.emit('checkRoom', roomId);
    checkSocket.on('roomCheckResult', (result) => resolve(result));
  });

  if (!roomStatus.exists) {
    console.error(`Room ${roomId} not found. Create a room first and copy its code.`);
    process.exit(1);
  }

  if (roomStatus.status !== 'waiting') {
    console.error(`Room ${roomId} is not waiting (status: ${roomStatus.status}). Create a new room.`);
    process.exit(1);
  }

  const category = roomStatus.settings?.category || DEFAULT_CATEGORY;
  const configuredDurationSeconds = (CATEGORIES[category]?.durationMinutes || CATEGORIES[DEFAULT_CATEGORY].durationMinutes) * 60;
  const durationSeconds = SIM_DURATION_SECONDS || configuredDurationSeconds;
  console.log(`Simulation mode: fixed time (${durationSeconds}s), category: ${category}`);

  checkSocket.disconnect();

  // Create students with different profiles
  const students = [
    new SimulatedStudent(STUDENT_PROFILES.fast, roomId, durationSeconds),
    new SimulatedStudent(STUDENT_PROFILES.fast, roomId, durationSeconds),
    new SimulatedStudent(STUDENT_PROFILES.average, roomId, durationSeconds),
    new SimulatedStudent(STUDENT_PROFILES.average, roomId, durationSeconds),
    new SimulatedStudent(STUDENT_PROFILES.average, roomId, durationSeconds),
    new SimulatedStudent(STUDENT_PROFILES.struggling, roomId, durationSeconds),
    new SimulatedStudent(STUDENT_PROFILES.struggling, roomId, durationSeconds),
  ];

  // Connect all students
  await Promise.all(students.map(student => student.connect()));
  
  // Join room
  await Promise.all(students.map(student => student.join()));
  
  console.log('All students joined, starting game in 2 seconds...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Wait for game to start (admin will start it from the UI)
  await new Promise(resolve => {
    const waitSocket = io('http://localhost:3000');
    let pollTimer = null;

    waitSocket.on('connect', () => {
      pollTimer = setInterval(() => {
        waitSocket.emit('getRoomState', roomId);
      }, 1000);
    });

    waitSocket.on('roomState', (state) => {
      if (state.status !== 'playing') return;

      if (pollTimer) clearInterval(pollTimer);
      console.log('Game started by admin!');
      waitSocket.disconnect();
      resolve();
    });
  });

  // Wait for completion
  await new Promise(resolve => {
    const resultSocket = io('http://localhost:3000');
    let finishedCount = 0;
    let pollTimer = null;
    
    resultSocket.on('connect', () => {
      pollTimer = setInterval(() => {
        resultSocket.emit('getRoomState', roomId);
      }, 1000);
    });

    resultSocket.on('roomState', (state) => {
      // Show live solved/correct/wrong counts during the timed round
      const inProgress = state.players.filter(p => !p.score);
      if (inProgress.length > 0) {
        process.stdout.write('\r' + inProgress.map(p => {
          const solved = p.solved || [];
          const correct = solved.filter(answer => answer.isCorrect).length;
          const wrong = solved.filter(answer => answer.isCorrect === false).length;
          return `${p.username}: ${solved.length} solved (${correct} correct, ${wrong} wrong)`;
        }).join(' | '));
      }

      const allFinished = state.players.every(p => p.score !== null);
      if (allFinished && finishedCount === 0) {
        finishedCount++;
        if (pollTimer) clearInterval(pollTimer);
        console.log('\n\nFinal Results:');
        state.players
          .sort((a, b) => b.score.time - a.score.time || a.score.wrongCount - b.score.wrongCount)
          .forEach((p, i) => {
            console.log(`${i + 1}. ${p.username}: ${p.score.time} correct (${p.score.wrongCount} wrong)`);
          });
        resultSocket.disconnect();
        resolve();
      }
    });
  });
  students.forEach(s => s.socket.disconnect());
  console.log('\nTest completed!');
}

// Get room code from command line argument
const roomId = process.argv[2]?.toLowerCase();

// Run the test
console.log('Starting multiplayer simulation test...');
runTest(roomId)
  .then(() => {
    console.log('All done — exiting.');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
