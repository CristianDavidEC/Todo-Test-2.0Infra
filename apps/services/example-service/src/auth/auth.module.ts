import { Module } from "@nestjs/common";
import { DbModule } from "../db/db.module";
import { Auth0Guard } from "./auth0.guard";
import { RolesGuard } from "./roles.guard";

/**
 * Provee el `Auth0Guard` (depende de `UsersRepository` de DbModule) y el
 * `RolesGuard` (RBAC claim-based, solo depende de `Reflector`).
 * Config Auth0 (AUTH0_DOMAIN, AUTH0_AUDIENCE, AUTH0_NAMESPACE) se resuelve
 * desde env vars dentro de `@app/auth` (resolveAuth0Config).
 */
@Module({
  imports: [DbModule],
  providers: [Auth0Guard, RolesGuard],
  exports: [Auth0Guard, RolesGuard],
})
export class AuthModule {}
