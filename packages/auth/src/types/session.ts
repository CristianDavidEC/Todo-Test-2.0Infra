import type { Auth0Claims, Auth0CustomClaims } from "./claims";

export interface AuthSession {
  auth0UserId: string;
  email: string;
  emailVerified: boolean;
  roles: string[];
  permissions: string[];
  raw: Auth0Claims;
  custom: Auth0CustomClaims;
}
