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
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Scaffold activo
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {example.name}
          </h1>
          <p className="text-lg text-gray-400">
            {example.description}
          </p>
        </div>

        {/* Type-safety check */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Tipado end-to-end</p>
              <p className="text-xs text-gray-500 mt-1">
                Validando con <code className="text-gray-300">@todo-list-poc-infra/core</code>
              </p>
            </div>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
              isValid
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                : "bg-red-500/10 text-red-400 border border-red-500/30"
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${isValid ? "bg-emerald-400" : "bg-red-400"}`} />
              {isValid ? "Validación OK" : errors.join(", ")}
            </span>
          </div>
        </div>

        {/* Stack */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {stack.map((item) => (
            <div
              key={item.name}
              className="rounded-lg border border-gray-800 bg-gray-900/50 p-4 transition-colors hover:border-gray-700 hover:bg-gray-900"
            >
              <p className="text-sm font-medium">{item.name}</p>
              <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link
            href="/dashboard"
            className="inline-flex rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400 hover:bg-emerald-500/20"
          >
            Ir al dashboard (protegido) →
          </Link>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-600">
          Monorepo cloud scaffold — listo para construir
        </p>
      </div>
    </main>
  );
}
