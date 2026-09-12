export function PageSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <main className="dashboard-shell app-page" aria-busy="true" aria-label="Loading page">
      <div className="skeleton-heading">
        <Skeleton className="skeleton-kicker" />
        <Skeleton className="skeleton-title" />
        <Skeleton className="skeleton-copy" />
      </div>
      <div className="skeleton-grid">
        {Array.from({ length: cards }, (_, index) => (
          <div className="panel skeleton-card" key={index}>
            <Skeleton className="skeleton-line skeleton-line-short" />
            <Skeleton className="skeleton-line" />
            <Skeleton className="skeleton-line" />
            <Skeleton className="skeleton-line skeleton-line-medium" />
          </div>
        ))}
      </div>
    </main>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <span className={`skeleton ${className}`} aria-hidden="true" />;
}
