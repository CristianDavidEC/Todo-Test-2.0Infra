import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth0, isAuth0Configured } from "./lib/auth0";

/**
 * Auth0 v4 + Next.js 16: la autenticación se intercepta en el network boundary.
 * En Next.js 16 el archivo es `proxy.ts` (en Next.js 15 sería `middleware.ts`).
 *
 * `auth0.middleware()` monta automáticamente las rutas:
 *   /auth/login, /auth/logout, /auth/callback, /auth/profile, /auth/access-token, ...
 *
 * GUARD: sin credenciales Auth0 (la base no las trae por defecto),
 * `auth0.middleware()` lanza y devuelve 500 en TODA request (el matcher cubre
 * `/`). Mientras no esté configurado, hacemos no-op para que el sitio público
 * funcione. Al existir los secrets, `isAuth0Configured` pasa a true y el
 * middleware se activa sin cambiar código.
 */
export async function proxy(request: NextRequest) {
  if (!isAuth0Configured) {
    return NextResponse.next();
  }
  return await auth0.middleware(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
