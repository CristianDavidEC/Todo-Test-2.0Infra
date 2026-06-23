import Link from "next/link";
import { validateEmail } from "@todo-list-poc-infra/core";

const stack = [
  { name: "Turborepo + pnpm", desc: "Monorepo build system" },
  { name: "SST v4 (Ion)", desc: "Infraestructura como código" },
  { name: "Next.js 16", desc: "Frontend (App Router)" },
  { name: "Lambda (TS nativo)", desc: "Serverless handlers" },
  { name: "NestJS + Fargate", desc: "Servicios de larga duración" },
  { name: "Tailwind CSS v4", desc: "Estilos utilitarios" },
];

export default function Home() {
  const example = {
    id: "1",
    name: "Todo List POC",
    description: "Todo List POC",
    createdAt: new Date().toISOString(),
  };

  const isValid = validateEmail("hello@example.com");
  const errors = isValid ? [] : ["email inválido"];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-2xl space-y-10">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-pill bg-primary-fixed px-4 py-1.5 text-sm font-bold text-primary">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            Scaffold activo
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {example.name}
          </h1>
          <p className="text-lg text-ink-muted">
            {example.description}
          </p>
        </div>

        {/* Type-safety check */}
        <div className="rounded-card bg-surface p-5 shadow-candy-primary">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-ink">Tipado end-to-end</p>
              <p className="text-xs text-ink-muted mt-1">
                Validando con <code className="text-primary">@todo-list-poc-infra/core</code>
              </p>
            </div>
            <span className={`inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-sm font-bold ${
              isValid
                ? "bg-primary-fixed text-primary"
                : "bg-red-100 text-red-600"
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${isValid ? "bg-primary" : "bg-red-500"}`} />
              {isValid ? "Validación OK" : errors.join(", ")}
            </span>
          </div>
        </div>

        {/* Stack */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {stack.map((item) => (
            <div
              key={item.name}
              className="rounded-card bg-surface p-4 shadow-candy-secondary transition-transform hover:scale-[1.03]"
            >
              <p className="text-sm font-medium">{item.name}</p>
              <p className="text-xs text-ink-muted mt-1">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link
            href="/dashboard"
            className="inline-flex rounded-pill bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-candy-primary transition-transform hover:scale-[1.03]"
          >
            Ir al dashboard (protegido) →
          </Link>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-ink-muted">
          CandyProject — sistema de diseño Candy activo
        </p>
      </div>
    </main>
  );
}
