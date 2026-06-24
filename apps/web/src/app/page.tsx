import Link from "next/link";
import { auth0 } from "@/lib/auth0";

export default async function Home() {
  const session = await auth0.getSession();
  const isLoggedIn = !!session;

  if (isLoggedIn) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="w-full max-w-2xl space-y-8 text-center">
          <div className="space-y-3">
            <h1 className="text-5xl font-black tracking-tight sm:text-6xl bg-gradient-to-r from-primary via-secondary to-tertiary bg-clip-text text-transparent">
              ¡Hola, {session.user.name}!
            </h1>
            <p className="text-xl text-ink-muted">
              Bienvenido a <span className="font-bold text-primary">CandyProject</span> — gestión de proyectos inteligente
            </p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/workspaces"
              className="inline-flex items-center justify-center rounded-pill bg-gradient-to-r from-primary to-secondary px-8 py-3 text-base font-bold text-white shadow-candy-primary transition-all hover:scale-[1.05] hover:shadow-lg"
            >
              🚀 Ir a mis workspaces
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-pill border-2 border-secondary px-8 py-3 text-base font-bold text-secondary transition-all hover:bg-secondary hover:text-white hover:scale-[1.05]"
            >
              📊 Dashboard
            </Link>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-card bg-surface p-6 shadow-candy-primary transition-transform hover:scale-[1.03]">
              <span className="text-4xl">🎨</span>
              <h3 className="mt-3 font-bold text-ink">Diseño Candy</h3>
              <p className="mt-1 text-sm text-ink-muted">Interfaz vibrante y playful</p>
            </div>
            <div className="rounded-card bg-surface p-6 shadow-candy-secondary transition-transform hover:scale-[1.03]">
              <span className="text-4xl">🤖</span>
              <h3 className="mt-3 font-bold text-ink">IA Integrada</h3>
              <p className="mt-1 text-sm text-ink-muted">Asistente inteligente en cada paso</p>
            </div>
            <div className="rounded-card bg-surface p-6 shadow-candy-tertiary transition-transform hover:scale-[1.03]">
              <span className="text-4xl">👥</span>
              <h3 className="mt-3 font-bold text-ink">Colaboración</h3>
              <p className="mt-1 text-sm text-ink-muted">Trabaja con tu equipo en tiempo real</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-3xl space-y-12">
        {/* Hero */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-pill bg-secondary-fixed px-4 py-1.5 text-sm font-bold text-secondary">
            <span className="h-2 w-2 rounded-full bg-secondary animate-pulse" />
            Nuevo — Workspaces & RBAC
          </div>
          <h1 className="text-5xl font-black tracking-tight sm:text-6xl bg-gradient-to-r from-primary via-secondary to-tertiary bg-clip-text text-transparent">
            CandyProject
          </h1>
          <p className="text-xl text-ink-muted">
            La plataforma de gestión de proyectos diseñada para<br />
            <span className="font-bold text-primary">equipos que construyen cosas increíbles</span>
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { icon: "✨", title: "Tablero Kanban", desc: "Visual, intuitivo y en tiempo real" },
            { icon: "📈", title: "Métricas IA", desc: "Pronósticos y análisis automáticos" },
            { icon: "👥", title: "Colaboración", desc: "Equipo organizado con RBAC" },
            { icon: "🎯", title: "Sprints", desc: "Planificación ágil y dashboards" },
            { icon: "💬", title: "Sidekick IA", desc: "Asistente que entiende tu contexto" },
            { icon: "🔐", title: "Multi-Tenant", desc: "Workspaces independientes seguros" },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-card bg-surface p-6 shadow-candy-secondary transition-transform hover:scale-[1.03]"
            >
              <span className="text-3xl">{feature.icon}</span>
              <h3 className="mt-3 font-bold text-ink">{feature.title}</h3>
              <p className="mt-1 text-sm text-ink-muted">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-4 text-center sm:flex-row sm:justify-center">
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center rounded-pill bg-gradient-to-r from-primary to-secondary px-8 py-4 text-lg font-bold text-white shadow-candy-primary transition-all hover:scale-[1.05] hover:shadow-lg"
          >
            🚀 Comienza ahora
          </Link>
          <a
            href="#features"
            className="inline-flex items-center justify-center rounded-pill border-2 border-primary px-8 py-4 text-lg font-bold text-primary transition-all hover:bg-primary hover:text-white hover:scale-[1.05]"
          >
            Saber más
          </a>
        </div>

        {/* Stack Info */}
        <div className="rounded-card bg-surface p-8 shadow-candy-primary border border-primary/10">
          <h2 className="font-bold text-ink mb-4">Construido con tecnología moderna</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 text-sm text-ink-muted">
            {[
              "Next.js 16 + React 19",
              "NestJS 11 + Fargate",
              "Drizzle ORM + Postgres",
              "Auth0 + JWT",
              "SST v4 + AWS",
              "Tailwind v4 + DM Sans",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <span className="text-primary font-bold">→</span> {item}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-ink-muted">
          CandyProject v1.0 — Sistema de diseño Candy activo
        </p>
      </div>
    </main>
  );
}
