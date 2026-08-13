import test from "node:test";
import assert from "node:assert/strict";
import { secureRandom, secureInt, shuffle } from "../src/core/rng.js";
import { CasinoEngine } from "../src/core/casino-engine.js";
import { createDatabase } from "../src/core/storage.js";
import { evaluateSlot, theoreticalSlotRtp, SLOT_SYMBOLS } from "../src/games/noir777.js";
import { resolveRouletteBet, rouletteBetWins, validateRouletteBet, EUROPEAN_ROULETTE_RTP } from "../src/games/roulette.js";
import { scoreHand, createShoe } from "../src/games/blackjack.js";

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
  assert.ok(rtp > 0 && rtp < 10);
});

test("European roulette payouts and house edge are traditional", () => {
  assert.equal(resolveRouletteBet("straight","17",1_000,17),36_000);
  assert.equal(resolveRouletteBet("red","",1_000,3),2_000);
  assert.equal(resolveRouletteBet("red","",1_000,2),0);
  assert.equal(rouletteBetWins("column1","",1),true);
  assert.equal(EUROPEAN_ROULETTE_RTP,36/37);
  assert.throws(() => validateRouletteBet("split","1,5"),/adyacentes/);
});

test("blackjack scoring handles soft aces, blackjack and bust", () => {
  assert.deepEqual(scoreHand([{rank:"A"},{rank:"6"}]),{total:17,soft:true,blackjack:false,bust:false});
  assert.equal(scoreHand([{rank:"A"},{rank:"K"}]).blackjack,true);
  assert.equal(scoreHand([{rank:"K"},{rank:"Q"},{rank:"2"}]).bust,true);
  assert.equal(createShoe(6).length,312);
});
