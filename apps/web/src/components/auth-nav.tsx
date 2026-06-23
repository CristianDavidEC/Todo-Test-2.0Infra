"use client";

import { useUser } from "@auth0/nextjs-auth0";

/**
 * Barra de auth (client component). Usa el hook `useUser()` del SDK v4, que
 * lee la sesión desde el endpoint `/auth/profile` montado por el proxy.
 */
export function AuthNav() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return <span className="text-sm text-ink-muted">…</span>;
  }

  if (!user) {
    return (
      <a
        href="/auth/login"
        className="rounded-pill bg-primary px-4 py-1.5 text-sm font-medium text-white shadow-candy-primary transition-transform hover:scale-[1.03]"
      >
        Iniciar sesión
      </a>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-ink-muted">{user.name ?? user.email}</span>
      <a
        href="/auth/logout"
        className="rounded-pill border border-primary/30 px-4 py-1.5 font-medium text-primary transition-transform hover:scale-[1.03]"
      >
        Cerrar sesión
      </a>
    </div>
  );
}
