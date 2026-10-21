import { NextResponse } from "next/server";
import { requireRemittanceAccess } from "@/lib/auth";
import {
  disburseRemittanceCheck,
  type DisburseRemittanceCheckParams,
} from "@/lib/services/remittanceConsolidationService";
import { StatutoryAgency } from "@/lib/generated/prisma/enums";

export async function POST(request: Request) {
  try {
    const session = await requireRemittanceAccess();

    const body = await request.json();
    const {
      companyId,
      agency,
      checkNumber,
      checkDate,
      bankAccountId,
      bankName,
      payee,
      referenceNumber,
      notes,
      items,
    } = body;

    if (!companyId) {
      return NextResponse.json({ error: "Company ID is required" }, { status: 400 });
    }

    if (!agency || !Object.values(StatutoryAgency).includes(agency)) {
      return NextResponse.json({ error: "Valid statutory agency is required (SSS, PHILHEALTH, PAGIBIG, BIR)" }, { status: 400 });
    }

    if (!checkNumber || !checkNumber.trim()) {
      return NextResponse.json({ error: "Check number is required" }, { status: 400 });
    }

    if (!referenceNumber || !referenceNumber.trim()) {
      return NextResponse.json({ error: "Agency payment reference / PRN / SPA / PIS is required" }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "At least one item must be selected for disbursement" }, { status: 400 });
    }

    const params: DisburseRemittanceCheckParams = {
      companyId,
      agency,
      checkNumber: checkNumber.trim(),
      checkDate: checkDate || new Date(),
      bankAccountId: bankAccountId || null,
      bankName: bankName || null,
      payee: payee ? payee.trim() : null,
      referenceNumber: referenceNumber.trim(),
      notes: notes ? notes.trim() : null,
      issuedByUserId: session.user.id,
      items,
    };

    const check = await disburseRemittanceCheck(params);

    return NextResponse.json({ success: true, check }, { status: 201 });
  } catch (err: any) {
    if (err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden: Remittance Access required" }, { status: 403 });
    }
    console.error("Error creating remittance check disbursement:", err);
    return NextResponse.json(
      { error: err.message || "Failed to disburse remittance check" },
      { status: 400 }
    );
  }
}
