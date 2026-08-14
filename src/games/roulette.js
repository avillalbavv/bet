import { secureInt } from "../core/rng.js";

export const RED_NUMBERS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
export const EUROPEAN_WHEEL = Object.freeze([0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26]);
export const AMERICAN_WHEEL = Object.freeze([0,28,9,26,30,11,7,20,32,17,5,22,34,15,3,24,36,13,1,"00",27,10,25,29,12,8,19,31,18,6,21,33,16,4,23,35,14,2]);

export const ROULETTE_VARIANTS = Object.freeze({
  european: { id:"european", label:"Europea", pockets:EUROPEAN_WHEEL, houseEdge:1/37, rtp:36/37 },
  american: { id:"american", label:"Americana", pockets:AMERICAN_WHEEL, houseEdge:2/38, rtp:36/38 },
});

// profitOdds es el pago anunciado. returnMultiplier incluye la apuesta devuelta.
export const ROULETTE_TYPES = Object.freeze({
  straight: { label:"Número pleno", profitOdds:35, returnMultiplier:36, count:1 },
  split: { label:"Caballo", profitOdds:17, returnMultiplier:18, count:2 },
  street: { label:"Calle", profitOdds:11, returnMultiplier:12, count:3 },
  corner: { label:"Cuadro", profitOdds:8, returnMultiplier:9, count:4 },
  sixline: { label:"Seisena", profitOdds:5, returnMultiplier:6, count:6 },
  red: { label:"Rojo", profitOdds:1, returnMultiplier:2 },
  black: { label:"Negro", profitOdds:1, returnMultiplier:2 },
  even: { label:"Par", profitOdds:1, returnMultiplier:2 },
  odd: { label:"Impar", profitOdds:1, returnMultiplier:2 },
  low: { label:"1–18", profitOdds:1, returnMultiplier:2 },
  high: { label:"19–36", profitOdds:1, returnMultiplier:2 },
  dozen1: { label:"1.ª docena", profitOdds:2, returnMultiplier:3 },
  dozen2: { label:"2.ª docena", profitOdds:2, returnMultiplier:3 },
  dozen3: { label:"3.ª docena", profitOdds:2, returnMultiplier:3 },
  column1: { label:"1.ª columna", profitOdds:2, returnMultiplier:3 },
  column2: { label:"2.ª columna", profitOdds:2, returnMultiplier:3 },
  column3: { label:"3.ª columna", profitOdds:2, returnMultiplier:3 },
});

export const EUROPEAN_ROULETTE_RTP = ROULETTE_VARIANTS.european.rtp;
export const AMERICAN_ROULETTE_RTP = ROULETTE_VARIANTS.american.rtp;

export function roulettePockets(variant = "european") {
  return ROULETTE_VARIANTS[variant]?.pockets || EUROPEAN_WHEEL;
}

export function spinRoulette(variant = "european") {
  const pockets = roulettePockets(variant);
  return pockets[secureInt(pockets.length)];
}

export function rouletteColor(value) {
  if (value === 0 || value === "00") return "green";
  return RED_NUMBERS.has(Number(value)) ? "red" : "black";
}

export function parseNumbers(value) {
  const matches = String(value).trim().match(/00|\d+/g) || [];
  return [...new Set(matches.map((item) => item === "00" ? "00" : Number(item)))];
}

function numericTargets(value) {
  return parseNumbers(value).filter((item) => item !== "00").map(Number).sort((a,b)=>a-b);
}

export function rouletteBetWins(type, target, result) {
  if ((result === 0 || result === "00") && type !== "straight") return false;
  if (["straight","split","street","corner","sixline"].includes(type)) return parseNumbers(target).includes(result) || parseNumbers(target).includes(Number(result));
  const number = Number(result);
  if (type === "red") return RED_NUMBERS.has(number);
  if (type === "black") return number > 0 && !RED_NUMBERS.has(number);
  if (type === "even") return number > 0 && number % 2 === 0;
  if (type === "odd") return number > 0 && number % 2 === 1;
  if (type === "low") return number >= 1 && number <= 18;
  if (type === "high") return number >= 19 && number <= 36;
  if (type.startsWith("dozen")) return Math.ceil(number / 12) === Number(type.at(-1));
  if (type.startsWith("column")) return ((number - 1) % 3) + 1 === Number(type.at(-1));
  return false;
}

export function validateRouletteBet(type, target, variant = "european") {
  const config = ROULETTE_TYPES[type];
  if (!config) throw new Error("Tipo de apuesta inválido.");
  if (!ROULETTE_VARIANTS[variant]) throw new Error("Variante de ruleta inválida.");
  if (!config.count) return true;
  const values = parseNumbers(target);
  const upper = variant === "american" ? 37 : 36;
  const normalized = values.map((value) => value === "00" ? 37 : value);
  if (values.length !== config.count || normalized.some((number) => number < 0 || number > upper)) throw new Error(`Esta apuesta requiere ${config.count} número(s) válidos.`);
  if (type === "straight") return true;
  if (values.includes("00")) throw new Error("El 00 sólo admite apuesta a número pleno.");
  const numbers = numericTargets(target);
  if (type === "split") {
    const [a,b] = numbers;
    const zeroSplit = a === 0 && [1,2,3].includes(b);
    const horizontal = b-a === 3;
    const vertical = b-a === 1 && a > 0 && Math.ceil(a/3) === Math.ceil(b/3);
    if (!zeroSplit && !horizontal && !vertical) throw new Error("Los números del caballo deben ser adyacentes.");
  }
  if (type === "street" && !(numbers[0] > 0 && numbers[0]%3 === 1 && numbers[1] === numbers[0]+1 && numbers[2] === numbers[0]+2)) throw new Error("La calle debe contener una fila horizontal de tres números.");
  if (type === "corner" && !(numbers[0] > 0 && numbers[0]%3 !== 0 && numbers[1] === numbers[0]+1 && numbers[2] === numbers[0]+3 && numbers[3] === numbers[0]+4)) throw new Error("El cuadro debe contener cuatro números contiguos.");
  if (type === "sixline" && !(numbers[0] > 0 && numbers[0]%3 === 1 && numbers.every((number,index)=>number === numbers[0]+index))) throw new Error("La seisena debe contener dos filas consecutivas.");
  return true;
}

export function resolveRouletteBet(type, target, amount, result, variant = "european") {
  validateRouletteBet(type,target,variant);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("El importe de la apuesta debe ser positivo.");
  return rouletteBetWins(type,target,result) ? amount*ROULETTE_TYPES[type].returnMultiplier : 0;
}

export function settleRouletteBets(bets, result, variant = "european") {
  return bets.reduce((summary,bet) => {
    const payout = resolveRouletteBet(bet.type,bet.target,bet.amount,result,variant);
    summary.stake += bet.amount;
    summary.payout += payout;
    if (payout) summary.winners.push({...bet,payout});
    return summary;
  },{stake:0,payout:0,winners:[]});
}

export function theoreticalRouletteMetrics(variant = "european") {
  const config = ROULETTE_VARIANTS[variant] || ROULETTE_VARIANTS.european;
  return { rtp:config.rtp, houseEdge:config.houseEdge, pockets:config.pockets.length };
}

export function simulateRoulette(rounds, variant = "european", randomInt = (max)=>secureInt(max)) {
  const pockets = roulettePockets(variant);
  const frequency = Object.fromEntries(pockets.map((pocket)=>[String(pocket),0]));
  const colors = { red:0, black:0, green:0 };
  const parity = { even:0, odd:0, zero:0 };
  let paid = 0;
  for (let index=0;index<rounds;index+=1) {
    const result = pockets[randomInt(pockets.length)];
    frequency[String(result)] += 1;
    colors[rouletteColor(result)] += 1;
    if (result === 0 || result === "00") parity.zero += 1;
    else parity[Number(result)%2 ? "odd" : "even"] += 1;
    paid += rouletteBetWins("red","",result) ? 2 : 0;
  }
  const rtp = paid/rounds;
  return { rounds,variant,wagered:rounds,paid,profit:rounds-paid,rtp,houseEdge:1-rtp,frequency,colors,parity };
}

export async function simulateRouletteAsync(rounds, variant = "european", onProgress = ()=>{}) {
  const pockets = roulettePockets(variant);
  const frequency = Object.fromEntries(pockets.map((pocket)=>[String(pocket),0]));
  const colors = { red:0, black:0, green:0 };
  const parity = { even:0, odd:0, zero:0 };
  let paid = 0;
  const chunk = 20_000;
  for (let start=0;start<rounds;start+=chunk) {
    const end = Math.min(rounds,start+chunk);
    for (let index=start;index<end;index+=1) {
      const result = pockets[secureInt(pockets.length)];
      frequency[String(result)] += 1;
      colors[rouletteColor(result)] += 1;
      if (result === 0 || result === "00") parity.zero += 1;
      else parity[Number(result)%2 ? "odd" : "even"] += 1;
      paid += rouletteBetWins("red","",result) ? 2 : 0;
    }
    onProgress(end/rounds);
    await new Promise((resolve)=>setTimeout(resolve,0));
  }
  const rtp = paid/rounds;
  return { rounds,variant,wagered:rounds,paid,profit:rounds-paid,rtp,houseEdge:1-rtp,frequency,colors,parity };
}
