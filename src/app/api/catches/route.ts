import { sql } from "@vercel/postgres";
import { NextRequest, NextResponse } from "next/server";

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS catches (
      id SERIAL PRIMARY KEY,
      caught_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      cleared_at TIMESTAMPTZ
    )
  `;
}

export async function GET() {
  try {
    await ensureTable();
    const { rows } = await sql`
      SELECT id, caught_at, cleared_at
      FROM catches
      ORDER BY caught_at DESC
      LIMIT 100
    `;
    return NextResponse.json({ catches: rows });
  } catch (err) {
    return NextResponse.json(
      { error: "database not configured", detail: String(err) },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    await ensureTable();
    const { rows } = await sql`
      INSERT INTO catches (caught_at) VALUES (NOW())
      RETURNING id, caught_at
    `;
    return NextResponse.json({ catch: rows[0] });
  } catch (err) {
    return NextResponse.json(
      { error: "database not configured", detail: String(err) },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "missing id" }, { status: 400 });
    }
    await ensureTable();
    await sql`
      UPDATE catches SET cleared_at = NOW() WHERE id = ${id}
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: "database not configured", detail: String(err) },
      { status: 500 }
    );
  }
}
