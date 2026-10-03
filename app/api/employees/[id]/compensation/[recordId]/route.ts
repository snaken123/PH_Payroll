import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; recordId: string }> }
) {
  const session = await getAuthSession();
  if (!session || session.user.platformRole !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: Only superadmins can delete compensation rates" },
      { status: 403 }
    );
  }

  const { id: employeeId, recordId } = await context.params;

  const targetRecord = await prisma.compensationRecord.findFirst({
    where: { id: recordId, employeeId },
  });

  if (!targetRecord) {
    return NextResponse.json({ error: "Compensation record not found" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    const allRecords = await tx.compensationRecord.findMany({
      where: { employeeId },
      orderBy: { effectiveFrom: "asc" },
    });

    const index = allRecords.findIndex((r) => r.id === recordId);

    // If target was active (effectiveTo === null) and there is a preceding record
    if (targetRecord.effectiveTo === null && index > 0) {
      const prevRecord = allRecords[index - 1];
      await tx.compensationRecord.update({
        where: { id: prevRecord.id },
        data: { effectiveTo: null },
      });
    } else if (targetRecord.effectiveTo !== null && index > 0) {
      // If target was a middle historical record, extend the preceding record's effectiveTo
      const prevRecord = allRecords[index - 1];
      await tx.compensationRecord.update({
        where: { id: prevRecord.id },
        data: { effectiveTo: targetRecord.effectiveTo },
      });
    }

    await tx.compensationRecord.delete({
      where: { id: recordId },
    });
  });

  return NextResponse.json({ success: true, message: "Compensation rate record deleted" });
}
