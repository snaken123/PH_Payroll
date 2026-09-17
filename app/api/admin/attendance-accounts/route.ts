import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ accounts: [] });
}

export async function POST() {
  return NextResponse.json({ error: "Attendance accounts module has been removed." }, { status: 410 });
}
