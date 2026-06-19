import { Module } from "@nestjs/common";
import { DbModule } from "../../db/db.module";
import { AuthModule } from "../../auth/auth.module";
import { UsersController, MeController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
  imports: [DbModule, AuthModule],
  controllers: [UsersController, MeController],
  providers: [UsersService],
})
export class UsersModule {}
