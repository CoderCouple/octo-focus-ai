/**
 * Shape of every response from the OctoFocusAI api. Mirrors
 * services/api/src/api/v1/response/base.response.ts.
 *
 * Use `unwrapBaseResponse(body, path)` to extract `.result` and convert
 * unexpected shapes into a clear error rather than silently returning
 * undefined fields downstream.
 */
export interface BaseResponse<T> {
  result: T | null;
  statusCode: number;
  message: string;
  success: boolean;
  errorCode?: string;
  extra?: Record<string, unknown>;
}

function isBaseResponse(value: unknown): value is BaseResponse<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    "statusCode" in value &&
    "message" in value &&
    "result" in value
  );
}

export function unwrapBaseResponse<T>(body: unknown, path: string): T {
  if (!isBaseResponse(body)) {
    // Legacy / unwrapped response (e.g. a streamed binary or a raw payload
    // from a route that hasn't been upgraded yet). Return as-is.
    return body as T;
  }
  if (!body.success) {
    throw new Error(`OctoFocusAI API ${path} ${body.statusCode}: ${body.message}`);
  }
  return body.result as T;
}
