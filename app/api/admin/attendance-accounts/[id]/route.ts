import { NextResponse } from "next/server";

export async function PATCH() {
  return NextResponse.json({ error: "Attendance accounts module has been removed." }, { status: 410 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Attendance accounts module has been removed." }, { status: 410 });
}
