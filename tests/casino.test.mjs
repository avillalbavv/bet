import test from "node:test";
import assert from "node:assert/strict";
import { secureRandom, secureInt, shuffle } from "../src/core/rng.js";
import { CasinoEngine } from "../src/core/casino-engine.js";
import { createDatabase } from "../src/core/storage.js";
import { evaluateSlot, theoreticalSlotRtp, SLOT_SYMBOLS } from "../src/games/noir777.js";
import { resolveRouletteBet, rouletteBetWins, validateRouletteBet, settleRouletteBets, theoreticalRouletteMetrics, simulateRoulette, EUROPEAN_ROULETTE_RTP, AMERICAN_ROULETTE_RTP } from "../src/games/roulette.js";
import { scoreHand, createShoe } from "../src/games/blackjack.js";
import { resolveDiceBet, baccaratScore, minesMultiplier, generateCrashPoint } from "../src/games/instant-games.js";

test("secure RNG stays within the requested ranges", () => {
  for (let index = 0; index < 1_000; index += 1) {
    assert.ok(secureRandom() >= 0 && secureRandom() < 1);
    assert.ok(secureInt(37) >= 0 && secureInt(37) < 37);
  }
});

test("Fisher-Yates keeps every card", () => {
  const source = Array.from({ length: 52 }, (_, index) => index);
  const result = shuffle(source);
  assert.deepEqual([...result].sort((a, b) => a - b), source);
});

test("wallet never becomes negative and round accounting is consistent", () => {
  const memory = { value: null, getItem(){return this.value;}, setItem(_key,value){this.value=value;} };
  const database = { data:createDatabase(), save(){ memory.setItem("state",JSON.stringify(this.data)); } };
  const engine = new CasinoEngine(database);
  const user = { balance:5_000, xp:0, level:1, rank:"GUEST", history:[], recent:[], stats:{ totalWagered:0,totalWon:0,biggestWin:0,gamesPlayed:0,jackpotsWon:0,byGame:{} } };
  assert.throws(() => engine.beginRound(user,"slot",10_000), /insuficiente/);
  const round = engine.beginRound(user,"slot",1_000);
  assert.equal(user.balance,4_000);
  engine.settleRound(user,round,2_000);
  assert.equal(user.balance,6_000);
  assert.equal(user.stats.totalWagered,1_000);
});

test("slot paytable evaluates three matching premium symbols", () => {
  const seven = SLOT_SYMBOLS.find((symbol) => symbol.id === "SEVEN");
  const ten = SLOT_SYMBOLS.find((symbol) => symbol.id === "TEN");
  const grid = Array.from({ length:5 }, (_, column) => [ten, column < 3 ? seven : ten, ten]);
  const result = evaluateSlot(grid,20_000);
  assert.ok(result.payout > 0);
  assert.ok(result.wins.some((win) => win.symbol === "SEVEN" && win.count >= 3));
});

test("slot theoretical RTP is derived and finite", () => {
  const rtp = theoreticalSlotRtp();
  assert.ok(Number.isFinite(rtp));
  assert.ok(rtp > .93 && rtp < .98);
});

test("los pagos de ruleta incluyen correctamente apuesta y ganancia", () => {
  assert.equal(resolveRouletteBet("straight","17",1_000,17),36_000);
  assert.equal(resolveRouletteBet("split","17,20",1_000,17),18_000);
  assert.equal(resolveRouletteBet("street","1,2,3",1_000,2),12_000);
  assert.equal(resolveRouletteBet("corner","1,2,4,5",1_000,4),9_000);
  assert.equal(resolveRouletteBet("sixline","1,2,3,4,5,6",1_000,6),6_000);
  assert.equal(resolveRouletteBet("dozen1","",1_000,12),3_000);
  assert.equal(resolveRouletteBet("column1","",1_000,1),3_000);
  assert.equal(resolveRouletteBet("red","",1_000,3),2_000);
  assert.equal(resolveRouletteBet("black","",1_000,2),2_000);
  assert.equal(resolveRouletteBet("even","",1_000,2),2_000);
  assert.equal(resolveRouletteBet("odd","",1_000,3),2_000);
  assert.equal(resolveRouletteBet("low","",1_000,18),2_000);
  assert.equal(resolveRouletteBet("high","",1_000,19),2_000);
  assert.equal(resolveRouletteBet("red","",1_000,2),0);
  assert.equal(rouletteBetWins("column1","",1),true);
  assert.equal(EUROPEAN_ROULETTE_RTP,36/37);
  assert.equal(AMERICAN_ROULETTE_RTP,36/38);
  assert.throws(() => validateRouletteBet("split","1,5"),/adyacentes/);
});

test("la liquidación de múltiples fichas no devuelve dos veces la apuesta",()=>{
  const result=settleRouletteBets([{type:"straight",target:"19",amount:1_000},{type:"red",target:"",amount:1_000}],19,"european");
  assert.equal(result.stake,2_000);
  assert.equal(result.payout,38_000);
  assert.equal(result.winners.length,2);
});

test("1.000.000 de giros europeos mantienen uniformidad, RTP y ventaja",()=>{
  let state=0x9e3779b9;
  const deterministic=(max)=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)%max;};
  const simulation=simulateRoulette(1_000_000,"european",deterministic),theory=theoreticalRouletteMetrics("european"),expected=simulation.rounds/37;
  for(const count of Object.values(simulation.frequency))assert.ok(Math.abs(count-expected)/expected<.025);
  assert.ok(Math.abs(simulation.rtp-theory.rtp)<.004);
  assert.ok(Math.abs(simulation.houseEdge-theory.houseEdge)<.004);
});

test("1.000.000 de giros americanos mantienen 38 resultados y ventaja estándar",()=>{
  let state=0x243f6a88;
  const deterministic=(max)=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)%max;};
  const simulation=simulateRoulette(1_000_000,"american",deterministic),theory=theoreticalRouletteMetrics("american"),expected=simulation.rounds/38;
  assert.equal(Object.keys(simulation.frequency).length,38);
  assert.ok(simulation.frequency["00"]>0);
  for(const count of Object.values(simulation.frequency))assert.ok(Math.abs(count-expected)/expected<.025);
  assert.ok(Math.abs(simulation.rtp-theory.rtp)<.004);
  assert.ok(Math.abs(simulation.houseEdge-theory.houseEdge)<.004);
});

test("blackjack scoring handles soft aces, blackjack and bust", () => {
  assert.deepEqual(scoreHand([{rank:"A"},{rank:"6"}]),{total:17,soft:true,blackjack:false,bust:false});
  assert.equal(scoreHand([{rank:"A"},{rank:"K"}]).blackjack,true);
  assert.equal(scoreHand([{rank:"K"},{rank:"Q"},{rank:"2"}]).bust,true);
  assert.equal(createShoe(6).length,312);
});

test("los juegos instantáneos mantienen pagos y factores explícitos",()=>{
  assert.equal(resolveDiceBet("under7",1_000,[2,3]),2_300);
  assert.equal(resolveDiceBet("over7",1_000,[2,3]),0);
  assert.equal(baccaratScore([{rank:"K"},{rank:"9"}]),9);
  assert.ok(minesMultiplier(3)>minesMultiplier(2));
  assert.equal(generateCrashPoint(0),1);
  assert.ok(generateCrashPoint(.9)>=9.69);
});
