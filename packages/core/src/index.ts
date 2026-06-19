/**
 * @app/core
 *
 * Lógica de negocio pura. Sin dependencias de AWS / SST / Auth0 SDK.
 * Usable en frontend (Next.js), Lambdas y servicios ECS (NestJS).
 *
 * IMPORTANTE: NO importar desde:
 * - aws-sdk / @aws-sdk/*
 * - aws-lambda
 * - sst
 * - @auth0/*
 *
 * Las implementaciones concretas (EventBridge publisher, Auth0 verifier,
 * Postgres client) viven en sus packages respectivos o en las apps.
 * Core sólo conoce interfaces.
 */

export * from "./events/buildEvent";
export * from "./events/publisher.interface";
export * from "./users/user.validator";
