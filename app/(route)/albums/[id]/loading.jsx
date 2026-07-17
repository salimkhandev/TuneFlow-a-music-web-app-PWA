// Skeleton for the Album detail page - shown instantly on navigation
export default function Loading() {
  return (
    <div className="p-6 flex flex-col gap-4 animate-pulse">
      {/* Album header */}
      <div className="h-8 w-56 bg-muted rounded" />
      <div className="h-4 w-80 bg-muted rounded" />
      {/* Song list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
            <div className="h-14 w-14 rounded-md bg-muted shrink-0" />
            <div className="flex flex-col gap-2 flex-1">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
            <div className="h-4 w-8 bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
