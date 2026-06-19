/**
 * VPC para la plantilla base — sharing entre dev y personal stages.
 *
 * Decisión NAT (importante): se EVITA el NAT *Gateway*
 * gestionado de AWS (~$33-100/mes, caro para esta escala), y en su lugar se usa un NAT
 * *instance* EC2 `t4g.nano` (~$3/mes) — egress idéntico a una fracción del costo. Es una
 * decisión deliberada de costo, no un descuido: "sin NAT" en el diseño significaba "sin
 * NAT Gateway", no "sin salida a internet".
 *
 * Estrategia por stage:
 *
 *   prod      → VPC propia (aislamiento total, 2 AZs) + NAT instance
 *   staging   → VPC propia (aislamiento, 2 AZs) + NAT instance
 *   dev       → VPC propia (1 AZ) + NAT instance t4g.nano (~$3/mes)
 *   personal  → REFERENCIA la VPC + NAT de `dev` vía SHARED_DEV_VPC_ID (NAT compartido)
 *
 * Bootstrap order:
 *   1. `pnpm sst deploy --stage dev` → crea VPC compartida + NAT
 *   2. Captura el VPC ID del output de SST (o del AWS console)
 *   3. Agregar a .env.example committed:  SHARED_DEV_VPC_ID=vpc-xxxxxxx
 *   4. `pnpm sst dev --stage <usuario>` → referencia la VPC de dev
 *
 * Ahorro vs VPC-por-stage (con ECS en la VPC):
 *   - Sin sharing: 5 devs × $5/mes NAT = $25/mes
 *   - Con sharing: $0 extra (usan NAT de dev) → ahorro real cuando crezca el equipo
 *
 * Lambdas SIEMPRE fuera de VPC (no se les pasa `vpc` field).
 */

import { isProduction, isStaging, isSharedStage } from "../helpers/stage";

const stage = $app.stage;

export const vpc = isSharedStage(stage) ? createOwnedVpc() : referenceDevVpc();

function createOwnedVpc(): sst.aws.Vpc {
  const needsHA = isProduction(stage) || isStaging(stage);
  const baseName = `${$app.name}-${stage}`;

  return new sst.aws.Vpc("MainVpc", {
    az: needsHA ? 2 : 1,
    nat: {
      ec2: {
        instance: "t4g.nano" as const,
      },
    },
    // Tags Name explícitos para identificar el recurso en AWS console
    // (sin esto, salen como "MainVpc" genérico y se confunden entre stages).
    transform: {
      vpc: (args) => {
        args.tags = { ...args.tags, Name: `${baseName}-vpc` };
      },
      internetGateway: (args) => {
        args.tags = { ...args.tags, Name: `${baseName}-igw` };
      },
      natInstance: (args) => {
        args.tags = { ...args.tags, Name: `${baseName}-nat` };
      },
      elasticIp: (args) => {
        args.tags = { ...args.tags, Name: `${baseName}-nat-eip` };
      },
      securityGroup: (args) => {
        args.tags = { ...args.tags, Name: `${baseName}-sg-default` };
      },
    },
  });
}

function referenceDevVpc(): sst.aws.Vpc {
  const sharedVpcId = process.env.SHARED_DEV_VPC_ID;
  if (!sharedVpcId) {
    throw new Error(
      `SHARED_DEV_VPC_ID env var requerido para stages personales.\n` +
        `1. Asegúrate que el stage 'dev' fue deployado:\n` +
        `     pnpm sst deploy --stage dev\n` +
        `2. Captura el VPC ID del output (o de AWS console → VPC dashboard)\n` +
        `3. Agrégalo a .env.example y .env:\n` +
        `     SHARED_DEV_VPC_ID=vpc-xxxxxxxxxxxxxxxx\n` +
        `4. Re-corre 'sst dev --stage ${stage}'.`,
    );
  }
  return sst.aws.Vpc.get("MainVpc", sharedVpcId);
}
