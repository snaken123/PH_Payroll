export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="h-7 w-48 animate-pulse rounded-md bg-muted" />
      <div className="space-y-2">
        <div className="h-24 w-full animate-pulse rounded-lg bg-muted" />
        <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
        <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
        <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
      </div>
    </div>
  );
}
