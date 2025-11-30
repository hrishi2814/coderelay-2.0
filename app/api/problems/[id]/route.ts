import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import db from '@/app/lib/db';
// 1. Define the Type for the params
// In Next.js 15+, params is a Promise, not a plain object
interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  // 2. You MUST await params before accessing 'id'
  const { id } = await params;

  // 3. Open Database Connection
  // verbose: console.log prints every query (great for debugging)
//   const db = new Database('main.db', { verbose: console.log });

  try {
    // 4. Raw SQL Query
    // We use .get() because we expect only 1 result
    const problem = db.prepare('SELECT * FROM problems WHERE id = ?').get(id);

    if (!problem) {
      return NextResponse.json({ error: "Problem not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: problem });

  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  } finally {
    // 5. Always close the connection
  }
}