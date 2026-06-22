/**
 * API envelope contracts shared by every fetch site and every server action.
 *
 *   BaseResponse<T>     — wire shape the api returns. Mirror of
 *                         services/api/src/api/v1/response/base.response.ts.
 *   ActionResponse<T>   — discriminated union returned by server actions.
 *                         Use { success: true, data } or
 *                         { success: false, message }. Call sites narrow
 *                         on `success` instead of try/catch.
 *
 *   unwrapBaseResponse  — convert an api BaseResponse into a thrown error
 *                         on failure, or the unwrapped result on success.
 *                         Used inside server actions / api fetch helpers.
 */

export interface BaseResponse<T> {
  result: T | null;
  statusCode: number;
  message: string;
  success: boolean;
  errorCode?: string;
  extra?: Record<string, unknown>;
}

export type ActionResponse<T> =
  | { success: true; data: T }
  | { success: false; message: string; errorCode?: string };

export function actionSuccess<T>(data: T): ActionResponse<T> {
  return { success: true, data };
}

export function actionFailure(message: string, errorCode?: string): ActionResponse<never> {
  return { success: false, message, ...(errorCode ? { errorCode } : {}) };
}

export function isBaseResponse(value: unknown): value is BaseResponse<unknown> {
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
    // Legacy / unwrapped response (e.g. streamed binary or a route that
    // hasn't been upgraded yet). Pass through.
    return body as T;
  }
  if (!body.success) {
    const code = body.errorCode ? ` [${body.errorCode}]` : "";
    throw new Error(`OctoFocusAI API ${path} ${body.statusCode}${code}: ${body.message}`);
  }
  return body.result as T;
}
