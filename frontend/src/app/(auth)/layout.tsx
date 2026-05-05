import { Store } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-4 py-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
            <Store className="h-7 w-7 text-primary" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">
            Restaurant Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            WhatsApp AI Agent powered ordering
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-0.5 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <div className="rounded-xl bg-card p-6 shadow-inner ring-1 ring-white/5">
            {children}
          </div>
        </div>

        <p className="text-center text-xs text-slate-500">
          &copy; {new Date().getFullYear()} Restaurant Dashboard. All rights reserved.
        </p>
      </div>
    </div>
  );
}
