import type { Context } from "aws-lambda";
import type { Logger } from "@aws-lambda-powertools/logger";
import { runWithCorrelation } from "../correlation/context";
import { extractCorrelationId } from "../correlation/headers";

export interface InstrumentOptions {
  logger: Logger;
}

type AnyHandler<TEvent, TResult> = (event: TEvent, context: Context) => Promise<TResult>;

export function instrumentHandler<TEvent, TResult>(
  handler: AnyHandler<TEvent, TResult>,
  opts: InstrumentOptions,
): AnyHandler<TEvent, TResult> {
  return async (event, context) => {
    const headers = (event as { headers?: Record<string, string | undefined> }).headers;
    const correlationId = extractCorrelationId(headers);
    const requestId = context.awsRequestId;

    opts.logger.appendKeys({ correlationId, requestId });

    return runWithCorrelation({ correlationId, requestId }, async () => {
      const start = Date.now();
      try {
        opts.logger.info("handler.start", { functionName: context.functionName });
        const result = await handler(event, context);
        opts.logger.info("handler.end", { durationMs: Date.now() - start });
        return result;
      } catch (err) {
        opts.logger.error("handler.error", {
          durationMs: Date.now() - start,
          error: err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : err,
        });
        throw err;
      } finally {
        opts.logger.removeKeys(["correlationId", "requestId"]);
      }
    });
  };
}
