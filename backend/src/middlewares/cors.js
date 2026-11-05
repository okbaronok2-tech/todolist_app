// CORS (NFR-06 (6)). SPA와 API는 다른 origin이다. 허용 origin은 CORS_ORIGIN(쉼표 구분)에서만 읽는다 (PR-08).
// 쿠키 인증이라 Allow-Origin은 '*'가 아닌 요청 Origin을 그대로 돌려주고 Allow-Credentials를 켠다.
// 목록에 없는 Origin은 헤더를 붙이지 않는다 (브라우저가 차단). 의존성 추가 없음 (원칙 3.5).
const allowed = new Set((process.env.CORS_ORIGIN ?? '').split(',').map((s) => s.trim()).filter(Boolean));

export function cors(req, res, next) {
  const origin = req.headers.origin;
  if (origin && allowed.has(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Access-Control-Allow-Credentials', 'true');
    res.set('Vary', 'Origin');
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
      res.set('Access-Control-Max-Age', '600');
      return res.status(204).end();
    }
  }
  next();
}
