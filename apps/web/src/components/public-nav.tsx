import Link from "next/link";
import { AuthNav } from "@/components/auth-nav";

/**
 * Header superior glass (landing + lista de workspaces). Las vistas internas de
 * un workspace usan el sidebar fijo (`WorkspaceShell`), no este header.
 */
export function PublicNav() {
  return (
    <header className="glass sticky top-0 z-50 shadow-[0_4px_16px_rgba(224,64,160,0.1)]">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="text-2xl font-black tracking-tighter text-primary transition-transform duration-300 ease-out hover:scale-105"
        >
          CandyProject
        </Link>
        <AuthNav />
      </div>
    </header>
  );
}
