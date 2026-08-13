import { shuffle } from "../core/rng.js";

const RANKS = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const SUITS = ["♠","♥","♦","♣"];

export function createShoe(decks = 6) {
  const cards = [];
  for (let deck = 0; deck < decks; deck += 1) for (const suit of SUITS) for (const rank of RANKS) cards.push({ rank, suit });
  return shuffle(cards);
}

export function scoreHand(cards) {
  let total = 0, aces = 0;
  for (const card of cards) {
    if (card.rank === "A") { total += 11; aces += 1; }
    else total += ["J","Q","K"].includes(card.rank) ? 10 : Number(card.rank);
  }
  while (total > 21 && aces) { total -= 10; aces -= 1; }
  return { total, soft: aces > 0, blackjack: cards.length === 2 && total === 21, bust: total > 21 };
}

export class BlackjackTable {
  constructor(bet) {
    this.shoe = createShoe(6);
    this.dealer = [this.draw(), this.draw()];
    this.hands = [{ cards: [this.draw(), this.draw()], bet, split: false, doubled: false, done: false }];
    this.active = 0;
    this.insurance = 0;
    this.complete = false;
  }

  draw() { return this.shoe.pop(); }
  hand() { return this.hands[this.active]; }
  canSplit() { const hand = this.hand(); return hand.cards.length === 2 && cardValue(hand.cards[0]) === cardValue(hand.cards[1]) && this.hands.length < 4; }
  canDouble() { return this.hand().cards.length === 2 && !this.hand().done; }
  canInsure() { return this.dealer[0].rank === "A" && this.insurance === 0; }

  hit() {
    const hand = this.hand(); hand.cards.push(this.draw());
    if (scoreHand(hand.cards).total >= 21) this.finishHand();
  }

  stand() { this.hand().done = true; this.advance(); }

  double() {
    const hand = this.hand(); hand.bet *= 2; hand.doubled = true; hand.cards.push(this.draw()); hand.done = true; this.advance();
  }

  split() {
    const hand = this.hand(), moved = hand.cards.pop();
    hand.split = true; hand.cards.push(this.draw());
    const second = { cards: [moved, this.draw()], bet: hand.bet, split: true, doubled: false, done: false };
    this.hands.splice(this.active + 1, 0, second);
  }

  finishHand() { this.hand().done = true; this.advance(); }

  advance() {
    const next = this.hands.findIndex((hand, index) => index > this.active && !hand.done);
    if (next >= 0) this.active = next; else this.playDealer();
  }

  playDealer() {
    while (true) {
      const score = scoreHand(this.dealer);
      if (score.total >= 17 || score.bust) break;
      this.dealer.push(this.draw());
    }
    this.complete = true;
  }

  settle() {
    const dealerScore = scoreHand(this.dealer);
    let payout = 0;
    const results = this.hands.map((hand) => {
      const player = scoreHand(hand.cards); let outcome = "LOSE", handPayout = 0;
      if (player.bust) outcome = "BUST";
      else if (player.blackjack && !hand.split && !dealerScore.blackjack) { outcome = "BLACKJACK"; handPayout = hand.bet * 2.5; }
      else if (dealerScore.blackjack && !player.blackjack) outcome = "DEALER BLACKJACK";
      else if (dealerScore.bust || player.total > dealerScore.total) { outcome = "WIN"; handPayout = hand.bet * 2; }
      else if (player.total === dealerScore.total) { outcome = "PUSH"; handPayout = hand.bet; }
      payout += handPayout;
      return { outcome, payout: handPayout, score: player.total };
    });
    if (this.insurance) payout += dealerScore.blackjack ? this.insurance * 3 : 0;
    return { payout, results, dealerScore: dealerScore.total };
  }
}

function cardValue(card) { return ["J","Q","K"].includes(card.rank) ? 10 : card.rank === "A" ? 11 : Number(card.rank); }
