import { Module } from "@nestjs/common";
import { AiInsightsService } from "./ai-insights.service";

/**
 * Módulo de IA (capa transversal §3 del doc). Hoy solo el seam heurístico
 * (`AiInsightsService`). Se aísla aquí para poder añadir el orquestador LLM real
 * (Claude/Anthropic) o extraerlo a un servicio dedicado sin tocar a los consumidores.
 */
@Module({
  providers: [AiInsightsService],
  exports: [AiInsightsService],
})
export class AiModule {}
