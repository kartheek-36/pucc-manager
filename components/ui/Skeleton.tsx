import React from 'react';

export function Skeleton({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-md bg-[#F3F4F6] ${className}`}
      {...props}
    />
  );
}

export function MetricCardSkeleton() {
  return (
    <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E7E9ED] flex flex-col gap-2">
      <Skeleton className="h-3.5 w-20" />
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

export function VanCardSkeleton() {
  return (
    <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E7E9ED] flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-5 w-20 rounded-md" />
      </div>
      <Skeleton className="h-6 w-28" />
      <div className="flex justify-between pt-2 border-t border-[#E7E9ED]">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="bg-[#FFFFFF] p-5 rounded-xl border border-[#E7E9ED] flex flex-col gap-3">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-44 w-full rounded-lg" />
    </div>
  );
}
