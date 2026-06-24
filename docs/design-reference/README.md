# Design reference — Stitch export (CandyProject "Nexus Intelligent Kanban")

Exportado vía HTTP del MCP de Stitch (proyecto `13445169559965589127`) el 2026-06-23.
Capturado aquí porque el MCP nativo está roto (bug de schema de Google) y el acceso
HTTP es frágil. **Estos archivos son la referencia visual autoritativa** mientras no
se regenere desde Stitch.

| Archivo | Pantalla |
|---|---|
| `team-management.{html,png}` | Gestión de Equipo y Capacidad |
| `kanban-board.{html,png}` | Tablero Kanban Inteligente |
| `project-settings.{html,png}` | Configuración del Proyecto y Automatizaciones |

## Cómo usarla (en Fase 4 / web)

- **Shell reutilizable** (idéntico en las 3 pantallas): sidebar fijo izquierdo
  (logo CandyProject + nav con item activo en pill `bg-secondary-container`, botón
  "AI Sidekick" pill gradiente al fondo, Help Center) · topbar sticky con tabs +
  iconos + avatar · contenido en cards `rounded-xl` con sombras **tintadas al color**
  (`card-shadow`/`purple-shadow`/`blue-shadow`) · botones pill · DM Sans · microinteracción
  `bouncy` (hover scale + tilt).
- **Paleta completa Material-3 "Candy"**: está verbatim en el bloque
  `<script id="tailwind-config">` de cualquiera de los HTML (no la dupliques aquí).
  La adopción de esos tokens a `globals.css` se decide en **Fase 4**, al construir los
  componentes reales y saber qué tokens se consumen — no antes.
- **⚠️ Solo lenguaje visual, NO spec funcional.** `team-management.html` muestra barras
  de capacidad, tarea activa, "team health" de IA y "recent wins" — **nada de eso está
  en el alcance de M1**. La vista de miembros de M1 es solo: listar miembros, agregar
  por email, cambiar rol, remover, salir. Replicar el *estilo*, no esos widgets.
