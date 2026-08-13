const UINT32_RANGE = 0x100000000;

export function secureRandom() {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error("A cryptographically secure random source is required.");
  }
  const value = new Uint32Array(1);
  globalThis.crypto.getRandomValues(value);
  return value[0] / UINT32_RANGE;
}

export function secureInt(maxExclusive) {
  if (!Number.isSafeInteger(maxExclusive) || maxExclusive <= 0) {
    throw new RangeError("maxExclusive must be a positive safe integer.");
  }
  const limit = Math.floor(UINT32_RANGE / maxExclusive) * maxExclusive;
  const value = new Uint32Array(1);
  do globalThis.crypto.getRandomValues(value); while (value[0] >= limit);
  return value[0] % maxExclusive;
}

export function weightedPick(entries) {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = secureRandom() * total;
  for (const entry of entries) {
    cursor -= entry.weight;
    if (cursor < 0) return entry;
  }
  return entries.at(-1);
}

export function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = secureInt(index + 1);
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

export function randomId(prefix = "round") {
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  return prefix + "_" + [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
