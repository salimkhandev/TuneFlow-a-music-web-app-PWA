// Skeleton for the Artist detail page - shown instantly on navigation
export default function Loading() {
  return (
    <div className="flex flex-col gap-4 p-6 animate-pulse">
      {/* Artist header card */}
      <div className="flex items-center gap-4 p-4 border rounded-xl">
        <div className="h-20 w-20 sm:h-32 sm:w-32 rounded-full bg-muted shrink-0" />
        <div className="flex flex-col gap-2 flex-1">
          <div className="h-5 w-40 bg-muted rounded" />
          <div className="h-4 w-24 bg-muted rounded" />
          <div className="h-6 w-20 bg-muted rounded-full" />
        </div>
      </div>
      {/* Bio section */}
      <div className="h-6 w-16 bg-muted rounded" />
      <div className="h-32 bg-muted rounded-xl" />
      {/* Top Songs */}
      <div className="h-6 w-24 bg-muted rounded" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 bg-muted rounded-lg" />
        ))}
      </div>
      {/* Top Albums */}
      <div className="h-6 w-24 bg-muted rounded" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="aspect-square w-full bg-muted rounded-lg" />
            <div className="h-4 bg-muted rounded w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}
