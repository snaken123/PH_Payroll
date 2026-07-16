import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";

export default async function HomePage() {
  const session = await getAuthSession();

  if (!session) redirect("/login");
  if (session.user.platformRole === "SUPER_ADMIN") redirect("/admin");
  if (session.user.companyId) redirect("/dashboard");
  redirect("/onboarding");
}
