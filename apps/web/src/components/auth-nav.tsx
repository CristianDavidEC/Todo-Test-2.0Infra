"use client";

import Link from "next/link";
import { useUser } from "@auth0/nextjs-auth0";

export function AuthNav() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return <span className="text-sm text-ink-muted">…</span>;
  }

  if (!user) {
    return (
      <a
        href="/auth/login"
        className="rounded-pill bg-gradient-to-r from-primary to-secondary px-5 py-2 text-sm font-bold text-white shadow-candy-primary transition-all hover:scale-[1.05]"
      >
        Iniciar sesión
      </a>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <Link
        href="/workspaces"
        className="rounded-pill bg-secondary-fixed px-4 py-1.5 text-sm font-bold text-secondary transition-all hover:bg-secondary hover:text-white hover:scale-[1.03]"
      >
        Workspaces
      </Link>
      <div className="border-l border-outline-variant pl-4 flex items-center gap-3">
        <span className="text-sm text-ink-muted">{user.name ?? user.email}</span>
        <a
          href="/auth/logout"
          className="rounded-pill border border-primary/30 px-3 py-1 text-xs font-medium text-primary transition-all hover:bg-primary/5 hover:scale-[1.03]"
        >
          Salir
        </a>
      </div>
    </div>
  );
}
