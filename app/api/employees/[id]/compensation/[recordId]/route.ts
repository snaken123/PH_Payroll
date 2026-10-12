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
      orderBy: [{ effectiveFrom: "asc" }, { createdAt: "asc" }],
    });

    const remainingRecords = allRecords.filter((r) => r.id !== recordId);

    // Rechain remaining records: the latest record must have effectiveTo = null,
    // and each prior record must have effectiveTo = next record's effectiveFrom.
    if (remainingRecords.length > 0) {
      for (let i = 0; i < remainingRecords.length; i++) {
        const rec = remainingRecords[i];
        const isLatest = i === remainingRecords.length - 1;
        const nextRec = isLatest ? null : remainingRecords[i + 1];
        const targetEffectiveTo = nextRec ? nextRec.effectiveFrom : null;

        const currentEffectiveToTime = rec.effectiveTo?.getTime() ?? null;
        const targetEffectiveToTime = targetEffectiveTo?.getTime() ?? null;

        if (currentEffectiveToTime !== targetEffectiveToTime) {
          await tx.compensationRecord.update({
            where: { id: rec.id },
            data: { effectiveTo: targetEffectiveTo },
          });
        }
      }
    }

    await tx.compensationRecord.delete({
      where: { id: recordId },
    });
  });

  return NextResponse.json({ success: true, message: "Compensation rate record deleted" });
}
