import { requireRemittanceAccess } from "@/lib/auth";
import { getConsolidatedPayables } from "@/lib/services/remittanceConsolidationService";
import { RemittancePortalClient } from "@/components/remittances/remittance-portal-client";

export const metadata = {
  title: "Statutory Contributions & Remittance Portal | PH Payroll",
  description:
    "Consolidated Philippine statutory remittance module for SSS, PhilHealth, Pag-IBIG, and BIR contributions and member loans across all companies.",
};

export default async function RemittancesPage() {
  await requireRemittanceAccess();

  // Load initial payables (default status UNPAID)
  const initialData = await getConsolidatedPayables({
    status: "UNPAID",
  });

  return <RemittancePortalClient initialData={initialData} />;
}
