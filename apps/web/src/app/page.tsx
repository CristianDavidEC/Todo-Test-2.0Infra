import Link from "next/link";
import { auth0 } from "@/lib/auth0";

/* Iconos inline (sin dependencia de Material Symbols font). */
function Sparkle({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2l1.9 5.6L19.5 9 14 11 12 16.5 10 11 4.5 9l5.6-1.4L12 2z" />
    </svg>
  );
}
function Play({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M8 5v14l11-7L8 5z" />
    </svg>
  );
}
function Check({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={className} aria-hidden>
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Homepage — landing de marketing "Candy" recreada del proyecto Stitch
 * "Nexus Intelligent Kanban" (pantalla "Bienvenido a CandyProject").
 * Logged-out: hero + features + bento + CTA. Logged-in: bienvenida con accesos.
 */
export default async function Home() {
  const session = await auth0.getSession();

  if (session) {
    return (
      <main className="flex min-h-[80vh] flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-2xl space-y-8 text-center">
          <h1 className="bg-gradient-to-r from-primary via-secondary to-tertiary bg-clip-text text-5xl font-black tracking-tight text-transparent sm:text-6xl">
            ¡Hola, {session.user.name}!
          </h1>
          <p className="text-xl text-ink-muted">
            Bienvenido a <span className="font-bold text-primary">CandyProject</span> — gestión de proyectos inteligente
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/workspaces"
              className="bouncy-hover inline-flex items-center justify-center rounded-pill bg-primary px-8 py-3 text-base font-bold text-on-primary shadow-candy-primary"
            >
              🚀 Ir a mis workspaces
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-32">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <span className="mb-8 inline-flex animate-bounce items-center gap-2 rounded-pill bg-primary-container px-4 py-1.5 text-sm font-bold text-on-primary-container">
            <Sparkle className="h-4 w-4" />
            Delicia con IA, ya disponible
          </span>
          <h1 className="mb-6 text-5xl font-black leading-[1.1] tracking-tight text-on-surface md:text-7xl">
            Gestión de proyectos,
            <br />
            <span className="italic text-primary">pero hecha dulce.</span>
          </h1>
          <p className="mx-auto mb-12 max-w-2xl text-xl font-medium text-on-surface-variant md:text-2xl">
            La plataforma AI-native que convierte el seguimiento de tareas en una experiencia deliciosa. Adiós a los deadlines amargos.
          </p>
          <div className="mb-16 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/auth/login"
              className="bouncy-hover w-full rounded-pill bg-primary px-10 py-4 text-lg font-bold text-on-primary shadow-candy-primary sm:w-auto"
            >
              Comienza gratis
            </Link>
            <a
              href="#features"
              className="bouncy-hover glass flex w-full items-center justify-center gap-2 rounded-pill px-10 py-4 text-lg font-bold text-on-surface sm:w-auto"
            >
              <Play className="h-5 w-5" />
              Ver demo
            </a>
          </div>

          {/* Mockup hero (glass + placeholder gradiente) */}
          <div className="relative mx-auto mt-20 max-w-5xl">
            <div className="glass relative z-10 rounded-card p-4 shadow-2xl">
              <div className="aspect-[16/9] w-full rounded-card border border-outline-variant bg-gradient-to-br from-primary-fixed via-surface to-secondary-container" />
            </div>
            <div className="absolute -top-12 -right-12 -z-10 h-48 w-48 rounded-full bg-secondary-container opacity-50 blur-3xl" />
            <div className="absolute -bottom-12 -left-12 -z-10 h-64 w-64 rounded-full bg-primary-container opacity-50 blur-3xl" />
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="bg-surface-container-low/50 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <p className="mb-12 text-center text-sm font-bold uppercase tracking-widest text-on-surface-variant">
            Equipos dulces de todo el mundo confían en nosotros
          </p>
          <div className="flex flex-wrap items-center justify-center gap-12 opacity-60 md:gap-20">
            {[32, 40, 28, 36, 32].map((w, i) => (
              <div key={i} className="h-10 rounded-pill bg-on-surface-variant/20" style={{ width: `${w * 4}px` }} />
            ))}
          </div>
        </div>
      </section>

      {/* Feature 1: Kanban Inteligente */}
      <section id="features" className="bg-surface py-32">
        <div className="mx-auto grid max-w-7xl items-center gap-20 px-6 md:grid-cols-2">
          <div className="order-2 md:order-1">
            <div className="glass rounded-card p-4 shadow-xl">
              <div className="aspect-[4/3] w-full rounded-card bg-gradient-to-br from-primary-fixed via-surface to-tertiary-container" />
            </div>
          </div>
          <div className="order-1 md:order-2">
            <span className="text-sm font-black uppercase tracking-widest text-secondary">Feature uno</span>
            <h2 className="mt-4 mb-6 text-4xl font-black text-on-surface md:text-5xl">Kanban Inteligente</h2>
            <p className="mb-8 text-lg font-medium leading-relaxed text-on-surface-variant">
              Nuestro AI Sidekick no solo observa: trabaja. Identifica bloqueos antes de que se vuelvan dolores de cabeza y re-asigna tareas según la experiencia del equipo.
            </p>
            <ul className="space-y-4">
              {[
                "Sugerencias de auto-desbloqueo",
                "Priorización según el contexto",
                "Predicción de cuellos de botella en tiempo real",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 font-bold text-on-surface">
                  <Check className="h-5 w-5 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Feature 2: Analítica Predictiva (bento) */}
      <section className="bg-surface-container-low py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-20 text-center">
            <span className="text-sm font-black uppercase tracking-widest text-tertiary">Feature dos</span>
            <h2 className="mt-4 mb-6 text-4xl font-black text-on-surface md:text-5xl">Analítica Predictiva</h2>
            <p className="mx-auto max-w-2xl text-lg font-medium text-on-surface-variant">
              Ve el futuro de tu proyecto con insights impulsados por IA que de verdad tienen sentido.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="relative overflow-hidden rounded-card bg-surface p-8 shadow-candy-primary md:col-span-2">
              <h3 className="mb-4 text-2xl font-bold text-on-surface">Burndown sin estrés</h3>
              <p className="mb-8 font-medium text-on-surface-variant">
                Gráficos burndown dinámicos que se ajustan a la velocidad del equipo y a las vacaciones.
              </p>
              <div className="aspect-[16/7] w-full rounded-card border border-outline-variant bg-gradient-to-br from-primary-fixed via-surface to-secondary-container" />
            </div>
            <div className="flex flex-col gap-8">
              <div className="flex h-full flex-col justify-between rounded-card bg-tertiary-container p-8 shadow-candy-tertiary">
                <span className="text-4xl">⏱️</span>
                <div>
                  <h3 className="mb-2 text-xl font-bold text-on-tertiary-container">Fechas de finalización</h3>
                  <p className="text-sm font-medium text-on-tertiary-container/80">
                    Fechas estimadas por IA con 94% de precisión según datos históricos.
                  </p>
                </div>
              </div>
              <div className="flex h-full flex-col justify-between rounded-card bg-secondary-container p-8 shadow-candy-secondary">
                <span className="text-4xl">📈</span>
                <div>
                  <h3 className="mb-2 text-xl font-bold text-on-secondary-container">Insights de velocidad</h3>
                  <p className="text-sm font-medium text-on-secondary-container/80">
                    Detecta cuándo tu equipo está en &quot;flow&quot; y optimiza tus ciclos de sprint.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 3: Salud del Equipo */}
      <section className="bg-surface py-32">
        <div className="mx-auto grid max-w-7xl items-center gap-20 px-6 md:grid-cols-2">
          <div>
            <span className="text-sm font-black uppercase tracking-widest text-primary">Feature tres</span>
            <h2 className="mt-4 mb-6 text-4xl font-black text-on-surface md:text-5xl">Salud del Equipo</h2>
            <p className="mb-8 text-lg font-medium leading-relaxed text-on-surface-variant">
              Los equipos felices construyen mejores productos. Nuestro indicador &quot;Radiant&quot; monitorea la distribución de carga y ayuda a prevenir el burnout antes de que ocurra.
            </p>
            <div className="rounded-card border-l-8 border-primary bg-surface-container-low p-6">
              <div className="mb-4 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-2xl text-on-primary">
                  💖
                </div>
                <div>
                  <p className="text-lg font-bold text-on-surface">Indicador Radiant</p>
                  <p className="text-sm font-medium text-on-surface-variant">Capacidad: 82% (Óptima)</p>
                </div>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-pill bg-surface-variant">
                <div className="h-full w-[82%] rounded-pill bg-primary transition-all duration-1000" />
              </div>
            </div>
          </div>
          <div className="aspect-square w-full rounded-card bg-gradient-to-br from-primary-container via-surface to-tertiary-container shadow-candy-primary" />
        </div>
      </section>

      {/* CTA invertido */}
      <section className="py-32">
        <div className="mx-auto max-w-5xl px-6">
          <div className="relative overflow-hidden rounded-card bg-inverse-surface p-12 text-center md:p-20">
            <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary opacity-30 blur-[100px]" />
            <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-tertiary opacity-30 blur-[100px]" />
            <h2 className="relative z-10 mb-8 text-4xl font-black text-white md:text-5xl">
              ¿List@ para deleitar a tu equipo?
              <br />
              Únete a CandyProject hoy.
            </h2>
            <div className="relative z-10 flex flex-col items-center justify-center gap-6 sm:flex-row">
              <Link
                href="/auth/login"
                className="bouncy-hover w-full rounded-pill bg-primary px-12 py-4 text-lg font-bold text-on-primary shadow-candy-primary sm:w-auto"
              >
                Comienza gratis
              </Link>
              <a
                href="#features"
                className="bouncy-hover w-full rounded-pill border-2 border-primary-fixed px-12 py-4 text-lg font-bold text-primary-fixed sm:w-auto"
              >
                Habla con ventas
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-20 rounded-t-card bg-surface-container">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between px-8 py-12 md:flex-row">
          <div className="mb-8 md:mb-0">
            <span className="text-xl font-black text-primary">CandyProject AI</span>
            <p className="mt-2 text-sm font-medium text-on-surface-variant">© 2026 CandyProject AI. Stay Sweet.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-8 text-sm text-on-surface-variant">
            {["Privacidad", "Términos", "Contacto", "Twitter", "LinkedIn"].map((link) => (
              <a
                key={link}
                href="#"
                className="underline-offset-4 transition-colors duration-200 hover:text-primary hover:underline"
              >
                {link}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}
