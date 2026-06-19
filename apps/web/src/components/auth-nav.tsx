"use client";

import { useUser } from "@auth0/nextjs-auth0";

/**
 * Barra de auth (client component). Usa el hook `useUser()` del SDK v4, que
 * lee la sesión desde el endpoint `/auth/profile` montado por el proxy.
 */
export function AuthNav() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return <span className="text-sm text-gray-500">…</span>;
  }

  if (!user) {
    return (
      <a
        href="/auth/login"
        className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-sm text-emerald-400 hover:bg-emerald-500/20"
      >
        Iniciar sesión
      </a>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-gray-400">{user.name ?? user.email}</span>
      <a
        href="/auth/logout"
        className="rounded-md border border-gray-700 px-3 py-1.5 text-gray-300 hover:bg-gray-800"
      >
        Cerrar sesión
      </a>
    </div>
  );
}
