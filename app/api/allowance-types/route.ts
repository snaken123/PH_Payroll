import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";

const INITIAL_ALLOWANCE_TYPES = ["Communication", "Inter-Company", "Transportation"];

export async function GET() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const customTypes = await prisma.allowanceType.findMany({
    orderBy: { name: "asc" },
  });

  const namesSet = new Set<string>(INITIAL_ALLOWANCE_TYPES);
  for (const t of customTypes) {
    namesSet.add(t.name);
  }

  return NextResponse.json({ allowanceTypes: Array.from(namesSet) });
}

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Allowance name is required" }, { status: 400 });
  }

  const existing = await prisma.allowanceType.findUnique({ where: { name } });
  if (existing) {
    return NextResponse.json({ allowanceType: existing });
  }

  const created = await prisma.allowanceType.create({
    data: { name },
  });

  return NextResponse.json({ allowanceType: created }, { status: 201 });
}
