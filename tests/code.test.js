// code.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRandomCode, normalizeCode, parseCode } from '../public/js/core/code.js';
import { CODE_REGEX } from '../public/js/core/constants.js';

test('createRandomCode 결과가 CODE_REGEX 1000회 연속 통과', () => {
  for (let i = 0; i < 500; i++) {
    const codeFN = createRandomCode('FN', 'E');
    assert.ok(CODE_REGEX.test(codeFN), `Invalid code: ${codeFN}`);
    const codeMS = createRandomCode('MS', 'H');
    assert.ok(CODE_REGEX.test(codeMS), `Invalid code: ${codeMS}`);
  }
});

test('parseCode: 앞뒤 공백 및 소문자 정규화 후 성공', () => {
  const res = parseCode(' fn-e-7k3qx9 ');
  assert.equal(res.ok, true);
  assert.equal(res.code, 'FN-E-7K3QX9');
  assert.equal(res.game, 'FN');
  assert.equal(res.difficulty, 'E');
  assert.equal(res.seed, '7K3QX9');
});

test('parseCode: 유효하지 않은 코드 실패 처리', () => {
  assert.equal(parseCode('FN-X-123456').ok, false); // 잘못된 난이도 X
  assert.equal(parseCode('FN-E-12345').ok, false);  // 시드 5글자
  assert.equal(parseCode('FN-E-1234IO').ok, false); // 제외된 문자 I, O
  assert.equal(parseCode('').ok, false);           // 빈 문자열
  assert.equal(parseCode(null).ok, false);         // null
});
