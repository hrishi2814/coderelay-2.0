import Database from 'better-sqlite3';
// init-db.js
const db = new Database('main.db'); // Creates a file named main.db

// Create the tables manually using SQL
const createProblemsTable = `
  CREATE TABLE IF NOT EXISTS problems (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    difficulty TEXT,
    starter_code TEXT
  );
`;

const createTestCasesTable = `
  CREATE TABLE IF NOT EXISTS test_cases (
    id TEXT PRIMARY KEY,
    problem_id TEXT,
    input TEXT,
    expected TEXT,
    is_hidden INTEGER, -- SQLite doesn't have Boolean, use 0 or 1
    FOREIGN KEY(problem_id) REFERENCES problems(id)
  );
`;

db.exec(createProblemsTable);
db.exec(createTestCasesTable);
console.log("Database initialized!");