import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export interface AttendanceSessionData {
  accountId: string;
  username: string;
  name: string;
  companyId: string;
}

const COOKIE_NAME = "attendance_portal_session";

export async function getAttendanceSession(): Promise<AttendanceSessionData | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const jsonStr = Buffer.from(token, "base64").toString("utf-8");
    const data = JSON.parse(jsonStr) as AttendanceSessionData;

    if (!data.accountId || !data.companyId) return null;

    // Verify account is still active in DB
    const account = await prisma.attendanceAccount.findUnique({
      where: { id: data.accountId },
      select: { id: true, isActive: true, companyId: true },
    });

    if (!account || !account.isActive) return null;

    return {
      accountId: account.id,
      username: data.username,
      name: data.name,
      companyId: account.companyId,
    };
  } catch {
    return null;
  }
}

export function encodeAttendanceSession(data: AttendanceSessionData): string {
  return Buffer.from(JSON.stringify(data), "utf-8").toString("base64");
}

export { COOKIE_NAME as ATTENDANCE_COOKIE_NAME };
