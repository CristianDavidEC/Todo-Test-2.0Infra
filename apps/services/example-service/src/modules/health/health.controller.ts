import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiOkResponse, ApiTags } from "@nestjs/swagger";

@ApiTags("health")
@Controller("health")
export class HealthController {
  @Get()
  @ApiOperation({
    summary: "Health check",
    description: "Endpoint público para smoke tests y health checks del balanceador/ECS.",
  })
  @ApiOkResponse({
    description: "Servicio operativo",
    schema: {
      example: { status: "ok", service: "example-service" },
    },
  })
  check() {
    return { status: "ok", service: "example-service" };
  }
}
