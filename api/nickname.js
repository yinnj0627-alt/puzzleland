// POST /api/nickname
import { allowMethods, readJson, sendOk, withErrors } from '../lib/http.js';
import { checkNickname } from '../lib/nickname.js';

export default withErrors(async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return;
  const body = readJson(req);
  const result = await checkNickname(body.nickname);
  sendOk(res, result);
});
