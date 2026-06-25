import { Module } from "@nestjs/common";
import { DbModule } from "../../db/db.module";
import { AuthModule } from "../../auth/auth.module";
import { WorkspaceMemberGuard } from "../workspaces/workspace-member.guard";
import { ProjectsController } from "./projects.controller";
import { ProjectsService } from "./projects.service";

/**
 * Módulo M2 (Proyectos). Reusa `WorkspaceMemberGuard` de M1 — que NO se exporta desde
 * `WorkspacesModule`, así que se re-registra aquí (resuelve `WorkspacesRepository` de DbModule).
 */
@Module({
  imports: [DbModule, AuthModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, WorkspaceMemberGuard],
})
export class ProjectsModule {}
