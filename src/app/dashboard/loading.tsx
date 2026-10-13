export default function DashboardLoading() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-pulse">
      {/* Top Banner Skeleton */}
      <div className="h-32 sm:h-40 rounded-3xl bg-slate-200/80 dark:bg-slate-800/60 border border-slate-200 shadow-sm flex flex-col justify-center px-8 space-y-3">
        <div className="h-5 w-48 bg-slate-300 dark:bg-slate-700 rounded-full" />
        <div className="h-8 w-72 bg-slate-300 dark:bg-slate-700 rounded-lg" />
        <div className="h-4 w-96 max-w-full bg-slate-300/70 dark:bg-slate-700/70 rounded" />
      </div>

      {/* KPI Cards Grid Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-slate-200" />
              <div className="w-12 h-4 rounded bg-slate-100" />
            </div>
            <div className="space-y-1.5 pt-1">
              <div className="h-3 w-20 bg-slate-200 rounded" />
              <div className="h-7 w-28 bg-slate-200 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="h-5 w-40 bg-slate-200 rounded" />
            <div className="h-8 w-24 bg-slate-200 rounded-lg" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-200" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-36 bg-slate-200 rounded" />
                    <div className="h-3 w-24 bg-slate-100 rounded" />
                  </div>
                </div>
                <div className="h-5 w-20 bg-slate-200 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="h-5 w-32 bg-slate-200 rounded pb-3 border-b border-slate-100" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="h-4 w-3/4 bg-slate-200 rounded" />
                <div className="h-3 w-1/2 bg-slate-200/70 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
