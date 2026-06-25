import { Module } from "@nestjs/common";
import { HealthModule } from "./modules/health/health.module";
import { UsersModule } from "./modules/users/users.module";
import { WorkspacesModule } from "./modules/workspaces/workspaces.module";
import { ProjectsModule } from "./modules/projects/projects.module";
import { InvitationsModule } from "./modules/invitations/invitations.module";
import { BoardModule } from "./modules/board/board.module";

@Module({
  imports: [
    HealthModule,
    UsersModule,
    WorkspacesModule,
    ProjectsModule,
    InvitationsModule,
    BoardModule,
  ],
})
export class AppModule {}
