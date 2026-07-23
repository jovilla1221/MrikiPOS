export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-br from-emerald-50 via-slate-50 to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-2 mb-2">
            <span className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
              Mriki<span className="text-blue-600">POS</span>
            </span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
            Solusi POS Cerdas UMKM Kota Blitar
          </p>
        </div>
        {children}
      </div>
    </main>
  );
}
