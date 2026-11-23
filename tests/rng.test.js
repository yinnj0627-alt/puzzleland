// rng.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { hashString, mulberry32, createRng, randInt, shuffle } from '../public/js/core/rng.js';

test('같은 문자열 → 같은 난수 100개 생성 확인', () => {
  const rng1 = createRng('FN-E-7K3QX9');
  const rng2 = createRng('FN-E-7K3QX9');
  for (let i = 0; i < 100; i++) {
    assert.equal(rng1(), rng2());
  }
});

test('다른 문자열 → 다른 난수 시퀀스 확인', () => {
  const rng1 = createRng('FN-E-7K3QX9');
  const rng2 = createRng('FN-E-7K3QX8');
  let diff = false;
  for (let i = 0; i < 10; i++) {
    if (rng1() !== rng2()) diff = true;
  }
  assert.ok(diff);
});

test('난수 값 범위 0 이상 1 미만 확인', () => {
  const rng = createRng('SEED-TEST');
  for (let i = 0; i < 1000; i++) {
    const val = rng();
    assert.ok(val >= 0 && val < 1);
  }
});

test('shuffle이 원본 배열을 수정하지 않고 섞음', () => {
  const rng = createRng('SHUFFLE-TEST');
  const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const shuffled = shuffle(rng, original);

  assert.deepEqual(original, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.notDeepEqual(shuffled, original);
  assert.equal(shuffled.length, original.length);
  assert.deepEqual(shuffled.slice().sort((a, b) => a - b), original);
});
