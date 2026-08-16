import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function OnboardingPage() {
  const session = await getAuthSession();
  if (session?.user.platformRole === "SUPER_ADMIN") {
    redirect("/admin");
  }

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-md border-slate-200/80 shadow-xs dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg font-bold">No company assigned yet</CardTitle>
          <CardDescription className="text-xs">
            Your account isn&apos;t linked to an active company tenant yet. Ask your company owner or HR administrator to assign your account to an organization.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button nativeButton={false} variant="outline" className="w-full text-xs font-semibold" render={<Link href="/login" />}>
            Back to Sign In
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
