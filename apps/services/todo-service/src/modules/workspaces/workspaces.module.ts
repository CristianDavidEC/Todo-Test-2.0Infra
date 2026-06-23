import { Module } from "@nestjs/common";
import { DbModule } from "../../db/db.module";
import { AuthModule } from "../../auth/auth.module";
import { WorkspacesController } from "./workspaces.controller";
import { WorkspacesService } from "./workspaces.service";
import { WorkspaceMemberGuard } from "./workspace-member.guard";

@Module({
  imports: [DbModule, AuthModule],
  controllers: [WorkspacesController],
  providers: [WorkspacesService, WorkspaceMemberGuard],
})
export class WorkspacesModule {}
