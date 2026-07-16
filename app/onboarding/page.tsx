import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function OnboardingPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>No company assigned yet</CardTitle>
          <CardDescription>
            Your account isn&apos;t linked to any company yet. Ask your platform administrator to
            add you to a company, or ask your company owner to invite you.
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </main>
  );
}
