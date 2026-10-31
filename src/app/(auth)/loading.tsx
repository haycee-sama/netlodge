export default function AuthLoading() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col">
        <div className="flex h-16 items-center px-4 sm:px-6">
          <div className="h-6 w-32 animate-pulse rounded bg-muted/40" />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6">
          <div className="w-full max-w-md space-y-4">
            <div className="h-8 w-48 animate-pulse rounded bg-muted/40" />
            <div className="h-4 w-64 animate-pulse rounded bg-muted/40" />
            <div className="h-11 w-full animate-pulse rounded bg-muted/40" />
            <div className="h-11 w-full animate-pulse rounded bg-muted/40" />
            <div className="h-11 w-full animate-pulse rounded bg-muted/40" />
          </div>
        </div>
      </div>
      <aside className="relative hidden overflow-hidden bg-primary lg:block">
        <div className="absolute inset-0 bg-grid-pattern opacity-20" aria-hidden />
      </aside>
    </div>
  );
}
