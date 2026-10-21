import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";

export default async function HomePage() {
  const session = await getAuthSession();

  if (!session) redirect("/login");
  if (session.user.platformRole === "SUPER_ADMIN") redirect("/admin");
  if (session.user.platformRole === "REMITTANCE_OFFICER" || (session.user.isRemittanceOfficer && !session.user.companyId)) redirect("/remittances");
  if (session.user.companyId) redirect("/dashboard");
  if (session.user.isRemittanceOfficer) redirect("/remittances");
  redirect("/onboarding");
}
