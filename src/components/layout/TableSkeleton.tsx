interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 3 }: TableSkeletonProps) {
  return (
    <div className="space-y-3 p-2">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4">
          {Array.from({ length: columns }).map((_, c) => (
            <div
              key={c}
              className="skeleton h-10 flex-1"
              style={{ animationDelay: `${(r * columns + c) * 60}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
