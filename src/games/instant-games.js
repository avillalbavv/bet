import { secureInt, secureRandom, shuffle } from "../core/rng.js";

export const DICE_BETS = Object.freeze({
  under7:{label:"Menos de 7",returnMultiplier:2.3},
  exactly7:{label:"Exactamente 7",returnMultiplier:5.8},
  over7:{label:"Más de 7",returnMultiplier:2.3},
});

export function rollDice() {
  return [secureInt(6)+1,secureInt(6)+1];
}

export function resolveDiceBet(type,amount,dice) {
  const total=dice[0]+dice[1],config=DICE_BETS[type];
  if(!config)throw new Error("Apuesta de dados inválida.");
  const wins=type==="under7"?total<7:type==="over7"?total>7:total===7;
  return wins?Math.round(amount*config.returnMultiplier):0;
}

const BACCARAT_RANKS=["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const BACCARAT_SUITS=["♠","♥","♦","♣"];
const baccaratValue=(card)=>card.rank==="A"?1:["10","J","Q","K"].includes(card.rank)?0:Number(card.rank);
export const baccaratScore=(hand)=>hand.reduce((sum,card)=>sum+baccaratValue(card),0)%10;

export function baccaratRound() {
  const deck=shuffle(Array.from({length:8},()=>BACCARAT_SUITS.flatMap((suit)=>BACCARAT_RANKS.map((rank)=>({rank,suit})))).flat());
  const player=[deck.pop(),deck.pop()],banker=[deck.pop(),deck.pop()];
  let playerScore=baccaratScore(player),bankerScore=baccaratScore(banker),playerThird=null;
  if(playerScore<8&&bankerScore<8){
    if(playerScore<=5){playerThird=deck.pop();player.push(playerThird);playerScore=baccaratScore(player);}
    const thirdValue=playerThird?baccaratValue(playerThird):null;
    const bankerDraw=!playerThird?bankerScore<=5:
      bankerScore<=2||
      (bankerScore===3&&thirdValue!==8)||
      (bankerScore===4&&thirdValue>=2&&thirdValue<=7)||
      (bankerScore===5&&thirdValue>=4&&thirdValue<=7)||
      (bankerScore===6&&thirdValue>=6&&thirdValue<=7);
    if(bankerDraw)banker.push(deck.pop());
    bankerScore=baccaratScore(banker);
  }
  const winner=playerScore===bankerScore?"tie":playerScore>bankerScore?"player":"banker";
  return {player,banker,playerScore,bankerScore,winner};
}

export function resolveBaccaratBet(type,amount,round) {
  if(!["player","banker","tie"].includes(type))throw new Error("Apuesta de baccarat inválida.");
  if(round.winner!==type)return 0;
  return Math.round(amount*(type==="banker"?1.95:type==="tie"?9:2));
}

export function createMinesBoard(cellCount=25,mineCount=3) {
  if(mineCount<1||mineCount>=cellCount)throw new Error("Cantidad de minas inválida.");
  return new Set(shuffle(Array.from({length:cellCount},(_,index)=>index)).slice(0,mineCount));
}

function combination(n,k){if(k<0||k>n)return 0;let value=1;for(let i=1;i<=k;i+=1)value=value*(n-k+i)/i;return value;}
export function minesMultiplier(safeReveals,mineCount=3,cellCount=25,houseFactor=.97) {
  if(safeReveals<=0)return 1;
  const survival=combination(cellCount-mineCount,safeReveals)/combination(cellCount,safeReveals);
  return Math.floor(houseFactor/survival*100)/100;
}

export function generateCrashPoint(random=secureRandom()) {
  const point=Math.floor((.97/(1-random))*100)/100;
  return Math.min(1000,Math.max(1,point));
}
