import { weightedPick } from "../core/rng.js";

export const SLOT_SYMBOLS = Object.freeze([
  { id: "TEN", label: "10", weight: 18, pay: [0, 0, 8, 24, 80] },
  { id: "J", label: "J", weight: 16, pay: [0, 0, 10, 30, 100] },
  { id: "Q", label: "Q", weight: 14, pay: [0, 0, 12, 40, 130] },
  { id: "K", label: "K", weight: 12, pay: [0, 0, 15, 50, 160] },
  { id: "A", label: "A", weight: 10, pay: [0, 0, 20, 70, 220] },
  { id: "BAR", label: "BAR", weight: 8, pay: [0, 0, 25, 90, 300] },
  { id: "BELL", label: "♟", weight: 6, pay: [0, 0, 35, 120, 400] },
  { id: "DIAMOND", label: "◆", weight: 4, pay: [0, 0, 50, 180, 600] },
  { id: "SEVEN", label: "7", weight: 2, pay: [0, 0, 80, 300, 1_000] },
  { id: "WILD", label: "W", weight: 2, pay: [0, 0, 100, 400, 1_500] },
  { id: "SCATTER", label: "✦", weight: 2, pay: [0, 0, 2, 10, 50] },
]);

export const PAYLINES = Object.freeze([
  [1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],
  [0,0,1,2,2],[2,2,1,0,0],[1,0,0,0,1],[1,2,2,2,1],[0,1,1,1,0],
  [2,1,1,1,2],[0,1,0,1,0],[2,1,2,1,2],[1,0,1,2,1],[1,2,1,0,1],
  [0,1,2,2,2],[2,1,0,0,0],[0,0,0,1,2],[2,2,2,1,0],[1,1,0,1,1],
]);

const FREE_SPINS = { 3: 8, 4: 12, 5: 20 };
export const SLOT_PAYOUT_SCALE = 1.65;

export function createSlotGrid() {
  return Array.from({ length: 5 }, () => Array.from({ length: 3 }, () => weightedPick(SLOT_SYMBOLS)));
}

function bestLineWin(sequence) {
  let best = { multiplier: 0, count: 0, symbol: null };
  for (const target of SLOT_SYMBOLS.filter((symbol) => symbol.id !== "SCATTER")) {
    let count = 0;
    for (const symbol of sequence) {
      if (symbol.id === target.id || symbol.id === "WILD") count += 1;
      else break;
    }
    const multiplier = target.pay[count - 1] || 0;
    if (multiplier > best.multiplier) best = { multiplier, count, symbol: target.id };
  }
  return best;
}

export function evaluateSlot(grid, totalBet) {
  const lineBet = totalBet / PAYLINES.length;
  let payout = 0;
  const wins = [];
  PAYLINES.forEach((line, lineIndex) => {
    const result = bestLineWin(line.map((row, column) => grid[column][row]));
    if (result.multiplier) {
      const amount = result.multiplier * SLOT_PAYOUT_SCALE * lineBet;
      payout += amount;
      wins.push({ lineIndex, line, ...result, amount });
    }
  });
  const scatters = grid.flat().filter((symbol) => symbol.id === "SCATTER").length;
  const scatterSymbol = SLOT_SYMBOLS.find((symbol) => symbol.id === "SCATTER");
  const scatterMultiplier = scatterSymbol.pay[Math.min(5, scatters) - 1] || 0;
  payout += scatterMultiplier * SLOT_PAYOUT_SCALE * totalBet;
  return { payout: Math.round(payout), wins, scatters, freeSpins: FREE_SPINS[Math.min(5, scatters)] || 0 };
}

export function theoreticalSlotRtp() {
  const totalWeight = SLOT_SYMBOLS.reduce((sum, symbol) => sum + symbol.weight, 0);
  let lineExpectation = 0;
  const walk = (sequence, probability) => {
    if (sequence.length === 5) {
      lineExpectation += probability * bestLineWin(sequence).multiplier;
      return;
    }
    for (const symbol of SLOT_SYMBOLS) walk([...sequence, symbol], probability * symbol.weight / totalWeight);
  };
  walk([], 1);
  const scatter = SLOT_SYMBOLS.find((symbol) => symbol.id === "SCATTER");
  const p = scatter.weight / totalWeight;
  let scatterExpectation = 0;
  for (let count = 3; count <= 15; count += 1) {
    const combinations = binomial(15, count);
    const multiplier = scatter.pay[Math.min(5, count) - 1] || 0;
    scatterExpectation += combinations * p ** count * (1 - p) ** (15 - count) * multiplier;
  }
  return (lineExpectation + scatterExpectation) * SLOT_PAYOUT_SCALE;
}

function binomial(n, k) {
  let result = 1;
  for (let index = 1; index <= k; index += 1) result = result * (n - index + 1) / index;
  return result;
}
