const { io } = require('socket.io-client');
const { performance } = require('perf_hooks');

// Performance profiles for different types of students
const STUDENT_PROFILES = {
  fast: {
    name: 'FastSolver',
    thinkTimeRange: [500, 1200],    // ms per problem
    accuracyRange: [0.95, 1.0],     // 95-100% correct
  },
  average: {
    name: 'AverageSolver',
    thinkTimeRange: [1500, 3000],   // ms per problem
    accuracyRange: [0.8, 0.9],      // 80-90% correct
  },
  struggling: {
    name: 'StrugglingLearner',
    thinkTimeRange: [2500, 5000],   // ms per problem
    accuracyRange: [0.6, 0.75],     // 60-75% correct
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
  constructor(profile, roomId) {
    this.profile = profile;
    this.roomId = roomId;
    this.socket = io('http://localhost:3001');
    this.problems = generateProblems(50);
    this.answers = [];
    this.current = 0;
    this.startTime = null;
  }

  async connect() {
    return new Promise((resolve) => {
      this.socket.on('connect', () => {
        console.log(`${this.profile.name} connected`);
        resolve();
      });

      // Handle room events
      this.socket.on('gameStarted', () => {
        console.log(`${this.profile.name} starting game`);
        this.startTime = performance.now();
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
      if (this.current >= this.problems.length) {
        this.finish();
        return;
      }

      const problem = this.problems[this.current];
      const answer = simulateAnswer(problem, this.profile);
      
      // Wait for random think time
      const thinkTime = random(this.profile.thinkTimeRange[0], this.profile.thinkTimeRange[1]);
      await new Promise(resolve => setTimeout(resolve, thinkTime));

      // Record answer
      const isCorrect = answer === problem.correct;
      this.answers.push({ ...problem, user: answer, isCorrect });

      // Send progress update
      const progress = ((this.current + 1) / this.problems.length) * 100;
      this.socket.emit('updateProgress', { 
        roomId: this.roomId, 
        progress,
        solved: this.answers
      });

      this.current++;
      solveProblem(); // solve next problem
    };

    solveProblem();
  }

  finish() {
    const endTime = performance.now();
    const elapsed = Math.floor((endTime - this.startTime) / 1000);
    const wrongCount = this.answers.filter(a => !a.isCorrect).length;
    const penalty = wrongCount * 10;
    const finalTime = elapsed + penalty;

    console.log(`${this.profile.name} finished in ${elapsed}s with ${wrongCount} wrong answers (final time: ${finalTime}s)`);
    
    this.socket.emit('finishGame', {
      roomId: this.roomId,
      score: finalTime,
      wrongCount
    });
  }
}

// Main test function
async function runTest(roomId) {
  if (!roomId) {
    console.error('Please provide a room code as parameter. Example: node tests/multiplayer-simulation.js abc123');
    process.exit(1);
  }

  // Verify room exists first
  const checkSocket = io('http://localhost:3001');
  
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

  checkSocket.disconnect();

  // Create students with different profiles
  const students = [
    new SimulatedStudent(STUDENT_PROFILES.fast, roomId),
    new SimulatedStudent(STUDENT_PROFILES.fast, roomId),
    new SimulatedStudent(STUDENT_PROFILES.average, roomId),
    new SimulatedStudent(STUDENT_PROFILES.average, roomId),
    new SimulatedStudent(STUDENT_PROFILES.average, roomId),
    new SimulatedStudent(STUDENT_PROFILES.struggling, roomId),
    new SimulatedStudent(STUDENT_PROFILES.struggling, roomId),
  ];

  // Connect all students
  await Promise.all(students.map(student => student.connect()));
  
  // Join room
  await Promise.all(students.map(student => student.join()));
  
  console.log('All students joined, starting game in 2 seconds...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Wait for game to start (admin will start it from the UI)
  await new Promise(resolve => {
    const waitSocket = io('http://localhost:3001');
    waitSocket.emit('joinRoom', { roomId, username: 'SimulationWatcher' });
    
    waitSocket.on('gameStarted', () => {
      console.log('Game started by admin!');
      waitSocket.disconnect();
      resolve();
    });
  });

  // Wait for completion
  await new Promise(resolve => {
    const resultSocket = io('http://localhost:3001');
    resultSocket.emit('joinRoom', { roomId, username: 'SimulationWatcher' });
    
    let finishedCount = 0;
    resultSocket.on('roomState', (state) => {
      // Show progress updates
      const inProgress = state.players.filter(p => !p.score);
      if (inProgress.length > 0) {
        process.stdout.write('\r' + inProgress.map(p => 
          `${p.username}: ${p.progress.toFixed(0)}%`
        ).join(' | '));
      }

      const allFinished = state.players.every(p => p.score !== null);
      if (allFinished && finishedCount === 0) {
        finishedCount++;
        console.log('\n\nFinal Results:');
        state.players
          .sort((a, b) => a.score.time - b.score.time)
          .forEach((p, i) => {
            console.log(`${i + 1}. ${p.username}: ${p.score.time}s (${p.score.wrongCount} wrong)`);
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
runTest(roomId).catch(console.error);