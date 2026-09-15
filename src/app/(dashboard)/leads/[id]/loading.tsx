export default function LeadDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="h-56 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-72 animate-pulse rounded-lg bg-slate-100" />
        </div>
        <div className="space-y-6">
          <div className="h-44 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-72 animate-pulse rounded-lg bg-slate-100" />
        </div>
      </div>
    </div>
  );
}