"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@auth0/nextjs-auth0";
import type { WorkspaceWithRole } from "@todo-list-poc-infra/types";

/**
 * Shell de las vistas de un workspace — réplica del export de Stitch
 * (docs/design-reference): sidebar fijo izquierdo (logo + nav con item activo en
 * pill, botón AI Sidekick gradiente, Help) + topbar sticky con título + iconos +
 * avatar. El contenido de cada vista se renderiza como `children` en el área main.
 */
const NAV = [
  { seg: "board", label: "Kanban", icon: "view_kanban" },
  { seg: "metrics", label: "Métricas", icon: "analytics" },
  { seg: "sprints", label: "Sprints", icon: "bolt" },
  { seg: "members", label: "Equipo", icon: "group" },
  { seg: "settings", label: "Configuración", icon: "settings" },
] as const;

export function WorkspaceShell({
  workspace,
  title,
  children,
}: {
  workspace: WorkspaceWithRole;
  title?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useUser();
  const base = `/w/${workspace.id}`;

  const isActive = (seg: string) => pathname === `${base}/${seg}` || pathname.startsWith(`${base}/${seg}/`);

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar fijo */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col rounded-r-card border-r border-outline-variant bg-surface p-4 shadow-[4px_0_16px_rgba(124,82,170,0.1)] md:flex">
        <Link href={base} className="mb-8 flex items-center gap-3 px-2">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card text-xl"
            style={{ backgroundColor: `${workspace.color}22` }}
          >
            {workspace.icon}
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-black leading-none text-primary">{workspace.name}</p>
            <p className="text-xs font-medium text-on-surface-variant">Joyful Productivity</p>
          </div>
        </Link>

        <nav className="flex flex-grow flex-col gap-2">
          {NAV.map((item) => {
            const active = isActive(item.seg);
            return (
              <Link
                key={item.seg}
                href={`${base}/${item.seg}`}
                className={`bouncy flex items-center gap-3 rounded-pill px-4 py-3 transition-colors ${
                  active
                    ? "bg-secondary-container font-bold text-on-secondary-container"
                    : "text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <span className={`material-symbols-outlined ${active ? "fill" : ""}`}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          className="bouncy mb-4 mt-auto flex items-center justify-center gap-2 rounded-pill bg-gradient-to-r from-primary to-secondary py-4 font-bold text-on-primary card-shadow"
        >
          <span className="material-symbols-outlined">auto_awesome</span>
          AI Sidekick
        </button>

        <div className="border-t border-outline-variant pt-3">
          <Link
            href="/workspaces"
            className="flex items-center gap-3 rounded-pill px-4 py-3 text-on-surface-variant transition-colors hover:bg-surface-container-high"
          >
            <span className="material-symbols-outlined">grid_view</span>
            <span>Mis workspaces</span>
          </Link>
        </div>
      </aside>

      {/* Área principal */}
      <div className="md:pl-64">
        {/* Topbar sticky */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-outline-variant bg-background/90 px-6 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="text-lg font-black tracking-tight text-on-surface md:hidden">{workspace.icon}</span>
            <h1 className="text-lg font-black tracking-tight text-on-surface">{title ?? workspace.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="bouncy flex h-9 w-9 items-center justify-center rounded-pill text-primary hover:bg-surface-container-high">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button type="button" className="bouncy flex h-9 w-9 items-center justify-center rounded-pill text-primary hover:bg-surface-container-high">
              <span className="material-symbols-outlined">help</span>
            </button>
            <button type="button" className="bouncy flex h-9 w-9 items-center justify-center rounded-pill text-primary hover:bg-surface-container-high">
              <span className="material-symbols-outlined">smart_toy</span>
            </button>
            {user?.picture ? (
              <div
                className="h-9 w-9 rounded-full border-2 border-primary-fixed bg-cover bg-center"
                style={{ backgroundImage: `url(${user.picture})` }}
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-primary-fixed bg-primary text-sm font-black text-on-primary">
                {(user?.name ?? user?.email ?? "?").charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </header>

        {/* Mobile nav (horizontal) */}
        <nav className="flex gap-2 overflow-x-auto border-b border-outline-variant bg-surface px-4 py-2 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.seg}
              href={`${base}/${item.seg}`}
              className={`whitespace-nowrap rounded-pill px-3 py-1.5 text-sm font-bold ${
                isActive(item.seg)
                  ? "bg-secondary-container text-on-secondary-container"
                  : "text-on-surface-variant"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
