// Skeleton for liked-songs page - shown instantly on navigation
export default function Loading() {
  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="h-8 w-32 bg-muted rounded animate-pulse" />
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3 rounded-lg animate-pulse">
          <div className="h-6 w-6 bg-muted rounded shrink-0" />
          <div className="h-14 w-14 rounded-md bg-muted shrink-0" />
          <div className="flex flex-col gap-2 flex-1">
            <div className="h-4 bg-muted rounded w-2/3" />
            <div className="h-3 bg-muted rounded w-1/3" />
          </div>
          <div className="h-4 w-10 bg-muted rounded" />
        </div>
      ))}
    </div>
  );
}
