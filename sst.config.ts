/// <reference path="./.sst/platform/config.d.ts" />

const APP_NAME = "todo-list-poc-infra";

export default $config({
  async app(input) {
    // SST prohíbe imports top-level en sst.config.ts → import dinámico aquí.
    // Solo módulos PUROS de infra (sin globales $app en scope de módulo).
    const { getAllTags } = await import("./infra/src/shared/tags");
    const { getRemovalPolicy } = await import("./infra/src/helpers/stage");

    return {
      name: APP_NAME,
      removal: getRemovalPolicy(input.stage),
      // Impide `sst remove --stage prod` accidental (retain evita perder datos,
      // pero no impide destruir). Solo prod queda protegido.
      protect: input.stage === "prod",
      home: "aws",
      providers: {
        aws: {
          region: "us-east-1",
          // Tags globales: Pulumi los hereda a CADA recurso AWS (no se etiqueta
          // recurso por recurso). Fuente única: infra/src/shared/tags.ts.
          defaultTags: {
            tags: getAllTags(APP_NAME, input.stage),
          },
        },
        neon: "0.13.0",
        // Pulumi `command` provider → habilita el global `command.local.Command`,
        // usado en infra/src/databases/migrate.ts para correr drizzle-kit migrate
        // en cada deploy (DDL automático, ver docs/SETUP-NEON.md §8).
        command: "1.2.1",
      },
    };
  },
  async run() {
    // Delega toda la definición de infraestructura al orquestador y expone
    // sus outputs (vpcId, neonProjectId, apiUrl, webUrl) — `sst deploy` los imprime.
    const { outputs } = await import("./infra/src/app");
    return outputs;
  },
});
