// Skeleton for the Albums grid page - shown instantly on navigation
export default function Loading() {
  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="h-8 w-24 bg-muted rounded animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2 animate-pulse">
            <div className="aspect-square w-full rounded-lg bg-muted" />
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
