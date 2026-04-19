// -----------------------------------------------
// Response helpers
// -----------------------------------------------

export function ok<T>(data: T, status = 200): Response {
    return Response.json({ ok: true, data }, { status })
}

export function err(code: string, message: string, status: number): Response {
    return Response.json({ ok: false, error: { code, message } }, { status })
}

export const NOT_FOUND      = err('not_found',      'Resource not found',        404)
export const UNAUTHORIZED   = err('unauthorized',    'Invalid or missing API key', 401)
export const METHOD_NOT_ALLOWED = err('method_not_allowed', 'Method not allowed', 405)
export const BAD_REQUEST    = (msg: string) => err('bad_request', msg,            400)
export const INTERNAL_ERROR = err('internal_error', 'Internal server error',      500)
