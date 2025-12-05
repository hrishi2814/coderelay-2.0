import { NextResponse } from 'next/server';
import db from '@/app/lib/db'; // Your SQLite helper

export async function GET() {
  try {
    // We only need the ID and Title for the menu
    const problems = db.prepare('SELECT id, title, difficulty FROM problems').all();
    return NextResponse.json({ data: problems });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch problems" }, { status: 500 });
  }
}