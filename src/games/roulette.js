import { secureInt } from "../core/rng.js";

export const RED_NUMBERS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
export const ROULETTE_TYPES = Object.freeze({
  straight: { label: "Straight", payout: 36, count: 1 },
  split: { label: "Split", payout: 18, count: 2 },
  street: { label: "Street", payout: 12, count: 3 },
  corner: { label: "Corner", payout: 9, count: 4 },
  sixline: { label: "Six Line", payout: 6, count: 6 },
  red: { label: "Red", payout: 2 }, black: { label: "Black", payout: 2 },
  even: { label: "Even", payout: 2 }, odd: { label: "Odd", payout: 2 },
  low: { label: "1–18", payout: 2 }, high: { label: "19–36", payout: 2 },
  dozen1: { label: "1st 12", payout: 3 }, dozen2: { label: "2nd 12", payout: 3 }, dozen3: { label: "3rd 12", payout: 3 },
  column1: { label: "Column 1", payout: 3 }, column2: { label: "Column 2", payout: 3 }, column3: { label: "Column 3", payout: 3 },
});

export function spinRoulette() { return secureInt(37); }

export function rouletteColor(number) { return number === 0 ? "green" : RED_NUMBERS.has(number) ? "red" : "black"; }

export function parseNumbers(value) {
  return [...new Set(String(value).split(/[^0-9]+/).filter(Boolean).map(Number))];
}

export function rouletteBetWins(type, target, result) {
  if (result === 0 && type !== "straight") return false;
  if (["straight","split","street","corner","sixline"].includes(type)) return parseNumbers(target).includes(result);
  if (type === "red") return RED_NUMBERS.has(result);
  if (type === "black") return result > 0 && !RED_NUMBERS.has(result);
  if (type === "even") return result > 0 && result % 2 === 0;
  if (type === "odd") return result % 2 === 1;
  if (type === "low") return result >= 1 && result <= 18;
  if (type === "high") return result >= 19 && result <= 36;
  if (type.startsWith("dozen")) return Math.ceil(result / 12) === Number(type.at(-1));
  if (type.startsWith("column")) return ((result - 1) % 3) + 1 === Number(type.at(-1));
  return false;
}

export function validateRouletteBet(type, target) {
  const config = ROULETTE_TYPES[type];
  if (!config) throw new Error("Tipo de apuesta inválido.");
  if (config.count) {
    const numbers = parseNumbers(target).sort((a, b) => a - b);
    if (numbers.length !== config.count || numbers.some((number) => number < 0 || number > 36)) throw new Error(`Esta apuesta requiere ${config.count} número(s) entre 0 y 36.`);
    if (type === "split") {
      const [a, b] = numbers;
      const zeroSplit = a === 0 && [1, 2, 3].includes(b);
      const horizontal = b - a === 3;
      const vertical = b - a === 1 && a > 0 && Math.ceil(a / 3) === Math.ceil(b / 3);
      if (!zeroSplit && !horizontal && !vertical) throw new Error("Los números del split deben ser adyacentes en el tablero.");
    }
    if (type === "street" && !(numbers[0] > 0 && numbers[0] % 3 === 1 && numbers[1] === numbers[0] + 1 && numbers[2] === numbers[0] + 2)) throw new Error("Una street debe contener una fila horizontal de tres números.");
    if (type === "corner" && !(numbers[0] > 0 && numbers[0] % 3 !== 0 && numbers[1] === numbers[0] + 1 && numbers[2] === numbers[0] + 3 && numbers[3] === numbers[0] + 4)) throw new Error("Un corner debe formar cuatro números contiguos.");
    if (type === "sixline" && !(numbers[0] > 0 && numbers[0] % 3 === 1 && numbers.every((number, index) => number === numbers[0] + index))) throw new Error("Una six line debe contener dos filas consecutivas.");
  }
  return true;
}

export function resolveRouletteBet(type, target, amount, result) {
  validateRouletteBet(type, target);
  return rouletteBetWins(type, target, result) ? amount * ROULETTE_TYPES[type].payout : 0;
}

export const EUROPEAN_ROULETTE_RTP = 36 / 37;
