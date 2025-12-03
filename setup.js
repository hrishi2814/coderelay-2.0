import Database from 'better-sqlite3'; 
const db = new Database('main.db');

console.log("Resetting db");

db.exec(`DROP TABLE IF EXISTS test_cases`);
db.exec(`DROP TABLE IF EXISTS problems`);

console.log("Creating Tables");

db.exec(`
  CREATE TABLE problems (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT UNIQUE,
    difficulty TEXT,
    description TEXT,
    starter_code TEXT
  )
`);

db.exec(`
  CREATE TABLE test_cases (
    id TEXT PRIMARY KEY,
    problem_id TEXT,
    input TEXT,
    expected TEXT,
    is_hidden INTEGER,
    FOREIGN KEY(problem_id) REFERENCES problems(id)
  )
`);

db.exec(`
  CREATE TABLE teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    current_turn_member_id TEXT,  -- Who is allowed to type?
    turn_expires_at INTEGER,      -- Timestamp (ms) when turn ends
    code_state TEXT,              -- The latest code (for syncing)
    last_updated INTEGER          -- Timestamp (ms) of last edit
  )
`);

db.exec(`
  CREATE TABLE members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    team_id TEXT,
    FOREIGN KEY(team_id) REFERENCES teams(id)
  )
`);

console.log("Seeding");
console.log("Seeding Team Data...");
const TEAM_ID = 'team-alpha';
const USER_1 = 'user-alice';
const USER_2 = 'user-bob';

// 1. Create a Team
const insertTeam = db.prepare(`
  INSERT INTO teams (id, name, current_turn_member_id, turn_expires_at, code_state, last_updated)
  VALUES (?, ?, ?, ?, ?, ?)
`);

// Initialize: Alice starts first, turn ends in 5 minutes
const now = Date.now();
insertTeam.run(TEAM_ID, 'Team Alpha', USER_1, now + (5 * 60 * 1000), '', now);

// 2. Add Members
const insertMember = db.prepare(`INSERT INTO members (id, name, team_id) VALUES (?, ?, ?)`);
insertMember.run(USER_1, 'Alice', TEAM_ID);
insertMember.run(USER_2, 'Bob', TEAM_ID);

console.log("Now seeding problems....")
const insertProblem = db.prepare(`
  INSERT INTO problems (id, title, slug, difficulty, description, starter_code)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const insertTestCase = db.prepare(`
  INSERT INTO test_cases (id, problem_id, input, expected, is_hidden)
  VALUES (?, ?, ?, ?, ?)
`);

const PROBLEM_ID = 'sum-2-nums';

insertProblem.run(
  PROBLEM_ID,
  'Sum of Two Numbers',
  'sum-two-numbers',
  'Easy',
  'Write a program that reads two integers (separated by a newline) from input and prints their sum.',
  '# Read input from standard input\n# Print result to standard output\n'
);

insertTestCase.run('tc_1', PROBLEM_ID, '5\n10', '15', 0);   // Public
insertTestCase.run('tc_2', PROBLEM_ID, '100\n200', '300', 1); // Hidden
insertTestCase.run('tc_3', PROBLEM_ID, '-5\n-5', '-10', 1);   // Hidden

console.log("seeded!");