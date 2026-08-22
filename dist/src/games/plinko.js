import { secureInt } from "../core/rng.js";

export const PLINKO_ROWS = Object.freeze([8, 10, 12]);
export const PLINKO_TARGET_RTP = 0.97;

const combinations = (n, k) => {
  let value = 1;
  for (let index = 1; index <= Math.min(k, n - k); index += 1) value = value * (n - index + 1) / index;
  return value;
};

export function plinkoMultipliers(rows = 8) {
  if (!PLINKO_ROWS.includes(rows)) throw new RangeError("Filas de Plinko no válidas.");
  const raw = Array.from({ length:rows + 1 }, (_, bucket) => {
    const distance = Math.abs(bucket - rows / 2) / (rows / 2);
    return 0.18 + 11.82 * Math.pow(distance, 4.2);
  });
  const expectedRaw = raw.reduce((sum, value, bucket) => sum + value * combinations(rows, bucket) / 2 ** rows, 0);
  const scale = PLINKO_TARGET_RTP / expectedRaw;
  return raw.map((value) => Number((value * scale).toFixed(2)));
}

export function createPlinkoDrop(rows = 8, randomInt = secureInt) {
  if (!PLINKO_ROWS.includes(rows)) throw new RangeError("Filas de Plinko no válidas.");
  const path = Array.from({ length:rows }, () => randomInt(2));
  const bucket = path.reduce((sum, direction) => sum + direction, 0);
  const multipliers = plinkoMultipliers(rows);
  return { rows, path, bucket, multiplier:multipliers[bucket], multipliers };
}

export function theoreticalPlinkoRtp(rows = 8) {
  return plinkoMultipliers(rows).reduce((sum, multiplier, bucket) => sum + multiplier * combinations(rows, bucket) / 2 ** rows, 0);
}

