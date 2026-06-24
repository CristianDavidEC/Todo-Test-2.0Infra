import { redirect } from "next/navigation";

/**
 * Ruta `/w/[id]` — entrada al workspace. No hay vista "resumen" propia (sería
 * redundante con el sidebar): redirige directo al tablero Kanban, el home del
 * producto. El gate de acceso (404 si no eres miembro) lo aplica `/board`.
 */
export default async function WorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/w/${id}/board`);
}
