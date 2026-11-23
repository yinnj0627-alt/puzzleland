// 공통 응답 도우미 모듈
export function sendOk(res, data, status = 200) {
  res.status(status).json({ ok: true, data });
}

export function sendError(res, status, code, message) {
  res.status(status).json({ ok: false, error: { code, message } });
}

export function allowMethods(req, res, methods) {
  if (!methods.includes(req.method)) {
    res.setHeader('Allow', methods.join(', '));
    sendError(res, 405, 'METHOD_NOT_ALLOWED', '허용되지 않은 요청 방식이에요.');
    return false;
  }
  return true;
}

export function readJson(req) {
  if (!req.body) return {};
  if (typeof req.body === 'object') return req.body;
  try {
    return JSON.parse(req.body);
  } catch {
    return {};
  }
}

export function withErrors(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      console.error('[API Error]', err?.code || err?.message || err);
      if (!res.headersSent) {
        sendError(res, 500, 'SERVER_ERROR', '잠시 문제가 생겼어요. 다시 시도해 주세요.');
      }
    }
  };
}
