import { Module } from "@nestjs/common";
import { HealthModule } from "./modules/health/health.module";
import { UsersModule } from "./modules/users/users.module";
import { WorkspacesModule } from "./modules/workspaces/workspaces.module";

@Module({
  imports: [HealthModule, UsersModule, WorkspacesModule],
})
export class AppModule {}
