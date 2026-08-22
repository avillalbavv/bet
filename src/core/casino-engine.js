import { randomId } from "./rng.js";

const RANKS = [[1, "GUEST"], [5, "PLAYER"], [10, "SILVER"], [20, "GOLD"], [35, "PLATINUM"], [50, "BLACK"], [70, "OBSIDIAN"], [90, "CROWN"]];

export class CasinoEngine {
  constructor(database) {
    this.database = database;
  }

  getBalance(user) {
    return Math.max(0, Math.floor(Number(user?.balance) || 0));
  }

  placeBet(user, game, amount, metadata = {}) {
    return this.beginRound(user, game, amount, metadata);
  }

  debitBet(user, amount) {
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("La apuesta debe ser positiva.");
    if (this.getBalance(user) < amount) throw new Error("Saldo virtual insuficiente.");
    user.balance -= amount;
    return user.balance;
  }

  creditWin(user, amount) {
    const safeAmount = Math.max(0, Math.round(Number(amount) || 0));
    user.balance = this.getBalance(user) + safeAmount;
    return user.balance;
  }

  recordTransaction(round, type, amount, balanceAfter) {
    round.transactions ||= [];
    round.transactions.push({ id:randomId("tx"), type, amount, balanceAfter, createdAt:new Date().toISOString() });
  }

  beginRound(user, game, amount, metadata = {}) {
    const config = this.database.data.games[game];
    if (!config?.enabled) throw new Error("Este juego está temporalmente desactivado.");
    if (!Number.isFinite(amount) || amount < config.minBet || amount > config.maxBet) throw new Error("Apuesta fuera de los límites configurados.");
    if (amount > user.balance) throw new Error("Saldo virtual insuficiente.");
    this.debitBet(user, amount);
    const round = { id: randomId(game), game, bet: amount, payout: 0, createdAt: new Date().toISOString(), metadata };
    this.recordTransaction(round, "BET", -amount, user.balance);
    return round;
  }

  addStake(user, round, amount) {
    if (amount <= 0 || user.balance < amount) throw new Error("Saldo virtual insuficiente.");
    this.debitBet(user, amount);
    round.bet += amount;
    this.recordTransaction(round, "BET", -amount, user.balance);
  }

  settleRound(user, round, payout, metadata = {}) {
    const safePayout = Math.max(0, Math.round(payout));
    round.payout = safePayout;
    round.multiplier = round.bet ? safePayout / round.bet : 0;
    round.net = safePayout - round.bet;
    round.metadata = { ...round.metadata, ...metadata };
    this.creditWin(user, safePayout);
    this.recordTransaction(round, "PAYOUT", safePayout, user.balance);
    user.stats.totalWagered += round.bet;
    user.stats.totalWon += safePayout;
    user.stats.biggestWin = Math.max(user.stats.biggestWin, safePayout);
    user.stats.gamesPlayed += 1;
    const gameStats = user.stats.byGame[round.game] ||= { rounds: 0, wagered: 0, paid: 0 };
    gameStats.rounds += 1;
    gameStats.wagered += round.bet;
    gameStats.paid += safePayout;
    user.history.unshift(round);
    user.history = user.history.slice(0, 200);
    user.recent = [round.game, ...user.recent.filter((game) => game !== round.game)].slice(0, 5);
    this.addXp(user, Math.min(500, Math.floor(round.bet / 1_000)));
    this.database.save();
    return round;
  }

  recordGame(user, round, payout, metadata = {}) {
    return this.settleRound(user, round, payout, metadata);
  }

  addXp(user, amount) {
    user.xp += Math.max(0, amount);
    user.level = Math.min(100, Math.floor(Math.sqrt(user.xp / 25)) + 1);
    user.rank = RANKS.reduce((rank, [level, name]) => user.level >= level ? name : rank, "GUEST");
  }

  observedRtp(user, game) {
    const stats = user.stats.byGame[game];
    return stats?.wagered ? stats.paid / stats.wagered : 0;
  }
}
