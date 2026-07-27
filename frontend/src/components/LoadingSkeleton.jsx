function LoadingSkeleton({ count = 3 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-lg border border-gray-200 bg-white p-5"
        >
          {/* Title skeleton */}
          <div className="mb-2 h-5 w-3/4 rounded bg-gray-200" />

          {/* Meta skeleton */}
          <div className="mb-3 h-4 w-1/2 rounded bg-gray-100" />

          {/* Abstract skeleton lines */}
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-gray-100" />
            <div className="h-3 w-full rounded bg-gray-100" />
            <div className="h-3 w-2/3 rounded bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default LoadingSkeleton;
