import { Module } from "@nestjs/common";
import { DbModule } from "../../db/db.module";
import { AuthModule } from "../../auth/auth.module";
import { AiModule } from "../ai/ai.module";
import { WorkspaceMemberGuard } from "../workspaces/workspace-member.guard";
import { BoardController } from "./board.controller";
import { BoardService } from "./board.service";

/**
 * Módulo M4 (Tablero Kanban). Reusa `WorkspaceMemberGuard` (re-registrado). Importa
 * `AiModule` para el Sidekick. Realtime (WebSocket) = runbook (no hay infra WS hoy).
 */
@Module({
  imports: [DbModule, AuthModule, AiModule],
  controllers: [BoardController],
  providers: [BoardService, WorkspaceMemberGuard],
})
export class BoardModule {}
