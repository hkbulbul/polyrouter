import { Skeleton } from "@/shared/components/Loading";

function SkeletonRow() {
  return (
    <div className="flex flex-col gap-3 border-b border-border-subtle px-4 py-4 last:border-b-0 sm:grid sm:grid-cols-[minmax(12rem,1.1fr)_6rem_minmax(12rem,1fr)_6rem_8rem] sm:items-center">
      <div className="flex items-center gap-3">
        <Skeleton className="size-8 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3.5 w-32 max-w-full" />
          <Skeleton className="h-2.5 w-20 max-w-full" />
        </div>
      </div>
      <Skeleton className="h-5 w-14" />
      <div className="space-y-2">
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-2 w-3/4" />
      </div>
      <Skeleton className="h-3 w-12" />
      <div className="flex gap-2 sm:justify-end">
        <Skeleton className="size-8" />
        <Skeleton className="size-8" />
        <Skeleton className="size-8" />
      </div>
    </div>
  );
}

export default function QuotaPageSkeleton() {
  return (
    <div className="space-y-5" aria-label="Loading quota tracker" aria-busy="true">
      <div className="flex flex-col gap-4 border-b border-border pb-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-72 max-w-full" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-9" />
        </div>
      </div>

      <div className="grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-2 xl:grid-cols-4">
        {["Accounts", "Ready capacity", "Needs attention", "Next reset"].map((label) => (
          <div key={label} className="space-y-2 bg-surface px-4 py-4">
            <span className="text-[10px] font-semibold uppercase tracking-[0.11em] text-text-muted">{label}</span>
            <Skeleton className="h-7 w-24" />
          </div>
        ))}
      </div>

      <div className="overflow-hidden border border-border bg-surface shadow-[var(--shadow-soft)]">
        <div className="hidden items-center gap-4 border-b border-border bg-bg-alt px-4 py-3 lg:grid lg:grid-cols-[25%_12%_31%_15%_17%]">
          {["Account", "State", "Quota remaining", "Next reset", "Actions"].map((label) => (
            <span key={label} className="text-[10px] font-semibold uppercase tracking-[0.11em] text-text-muted">{label}</span>
          ))}
        </div>
        {[1, 2, 3, 4].map((row) => <SkeletonRow key={row} />)}
      </div>
    </div>
  );
}
