import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { PinoLoggerService } from "./logging/pino-logger.service";
import { correlationMiddleware } from "./logging/correlation.middleware";
import { AllExceptionsFilter } from "./common/all-exceptions.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Logger JSON estructurado compartido (Pino + redactor PII de @todo-list-poc-infra/observability).
  app.useLogger(new PinoLoggerService());

  // Errores estandarizados (ZodError→400, unique→409, resto→500 sin leak).
  app.useGlobalFilters(new AllExceptionsFilter());

  // Correlación: ancla cada request en el AsyncLocalStorage antes del router, para que
  // guards/services/logs/llamadas salientes compartan el mismo correlationId.
  app.use(correlationMiddleware);

  // Todas las rutas bajo /api → alinea con `routePrivate("ANY /api/{proxy+}")`
  // del API Gateway (ver infra/src/apis/main-api.ts).
  app.setGlobalPrefix("api");

  // Documentación OpenAPI / Swagger. UI en /api/docs, JSON en /api/docs-json.
  // NO se expone en prod (el API Gateway es público): solo dev/staging/personales/local.
  if (process.env.APP_STAGE !== "prod") {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("Todo List POC — API")
      .setDescription(
        [
          "API síncrona (NestJS 11 en ECS Fargate) del proyecto Todo List POC.",
          "",
          "Arquitectura: API Gateway → VPC Link + Cloud Map → este servicio (sin ALB).",
          "Los CRUDs síncronos viven aquí; el trabajo async vive en Lambdas.",
          "",
          "Auth: las rutas protegidas requieren un Bearer JWT de Auth0 (verificado vía JWKS",
          "público del tenant). El guard hace lazy-upsert del usuario en Postgres en la",
          "primera request autenticada.",
        ].join("\n"),
      )
      .setVersion("2.0")
      .addBearerAuth()
      .addTag("health", "Health check del servicio")
      .addTag("users", "Lectura de usuarios (requiere JWT)")
      .addTag("me", "Usuario autenticado (requiere JWT)")
      .addTag("workspaces", "Workspaces y miembros (multi-tenancy, RBAC por workspace)")
      .addTag("projects", "Proyectos dentro de un workspace (RBAC reusa rol de workspace)")
      .addTag("invitations", "Invitaciones por email y aceptación (RBAC en BD)")
      .addTag("board", "Tablero Kanban: columnas, tarjetas, movimientos e insights")
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup("docs", app, document, {
      useGlobalPrefix: true,
      jsonDocumentUrl: "docs-json",
      customSiteTitle: "Todo List POC — API Docs",
    });
  }

  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  // URLs legibles (texto plano, NO JSON) para que VSCode auto-forwardee el puerto
  // —igual que hace con `next dev`— y para abrir el servicio rápido en local.
  // Solo fuera de prod: en ECS los logs deben quedar como JSON estructurado limpio.
  if (process.env.APP_STAGE !== "prod") {
    const url = `http://localhost:${port}`;
    // eslint-disable-next-line no-console
    console.log(
      [
        "",
        "🚀 todo-service listo:",
        `   API:     ${url}/api`,
        `   Health:  ${url}/api/health`,
        `   Swagger: ${url}/api/docs`,
        "",
      ].join("\n"),
    );
  }
}

void bootstrap();
