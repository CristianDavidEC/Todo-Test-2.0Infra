import Link from "next/link";

/**
 * Sub-navegación de un workspace (tabs Candy). Recrea la barra lateral/superior
 * de las pantallas Stitch como pestañas-pill. `active` resalta la sección actual.
 */
const TABS = [
  { key: "board", label: "Kanban", icon: "🗂️", href: (id: string) => `/w/${id}/board` },
  { key: "metrics", label: "Métricas", icon: "📊", href: (id: string) => `/w/${id}/metrics` },
  { key: "sprints", label: "Sprints", icon: "⚡", href: (id: string) => `/w/${id}/sprints` },
  { key: "team", label: "Equipo", icon: "👥", href: (id: string) => `/w/${id}/members` },
  { key: "settings", label: "Configuración", icon: "⚙️", href: (id: string) => `/w/${id}/settings` },
] as const;

export type WorkspaceTab = (typeof TABS)[number]["key"];

export function WorkspaceNav({
  workspaceId,
  active,
}: {
  workspaceId: string;
  active?: WorkspaceTab;
}) {
  return (
    <nav className="mb-8 flex flex-wrap gap-2">
      <Link
        href={`/w/${workspaceId}`}
        className={`bouncy-hover rounded-pill px-4 py-2 text-sm font-bold transition-colors ${
          active === undefined
            ? "bg-primary text-on-primary shadow-candy-primary"
            : "border border-outline-variant bg-surface text-on-surface-variant hover:text-primary"
        }`}
      >
        🏠 Resumen
      </Link>
      {TABS.map((t) => {
        const isActive = t.key === active;
        return (
          <Link
            key={t.key}
            href={t.href(workspaceId)}
            className={`bouncy-hover rounded-pill px-4 py-2 text-sm font-bold transition-colors ${
              isActive
                ? "bg-primary text-on-primary shadow-candy-primary"
                : "border border-outline-variant bg-surface text-on-surface-variant hover:text-primary"
            }`}
          >
            {t.icon} {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
