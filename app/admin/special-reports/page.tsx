import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { SpecialReportsContainer } from "@/components/admin/special-reports-container";

export default async function AdminSpecialReportsPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login");
  if (session.user.platformRole !== "SUPER_ADMIN") redirect("/dashboard");

  return (
    <div className="space-y-6">
      <SpecialReportsContainer />
    </div>
  );
}
