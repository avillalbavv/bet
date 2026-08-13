import { LocalDatabase, createUser, hashPassword } from "./src/core/storage.js";
import { CasinoEngine } from "./src/core/casino-engine.js";
import { createSlotGrid, evaluateSlot, theoreticalSlotRtp, SLOT_SYMBOLS } from "./src/games/noir777.js";
import { spinRoulette, rouletteColor, resolveRouletteBet, validateRouletteBet, ROULETTE_TYPES, EUROPEAN_ROULETTE_RTP } from "./src/games/roulette.js";
import { BlackjackTable, scoreHand } from "./src/games/blackjack.js";

const db = new LocalDatabase();
const engine = new CasinoEngine(db);
const app = document.querySelector("#app");
const modalRoot = document.querySelector("#modalRoot");
const debug = new URLSearchParams(location.search).get("debug") === "true";
let authMode = "login", lobbyCategory = "popular", currentGame = null, blackjack = null, blackjackRound = null;
let heroIndex = 0;

const GAMES = [
  { id:"slot", name:"NOIR 777", category:"slots", tag:"HIGH VOLATILITY", art:"7", color:"red", description:"20 paylines · Wild · Scatter" },
  { id:"roulette", name:"Roulette Royale", category:"table", tag:"RTP 97.30%", art:"0", color:"green", description:"European single-zero" },
  { id:"blackjack", name:"Blackjack Elite", category:"table", tag:"6 DECKS · S17", art:"A♠", color:"blue", description:"Blackjack pays 3:2" },
];

const money = (value) => "₲ " + Math.round(value).toLocaleString("es-PY");
const user = () => db.currentUser();
const escapeHtml = (value) => String(value).replace(/[&<>"]/g, (character) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[character]);

function route() {
  const path = location.hash.slice(1) || (user() ? "/lobby" : "/");
  if (path === "/admin") return renderAdmin();
  if (path.startsWith("/game/")) return user() ? renderGame(path.split("/").at(-1)) : go("/auth");
  if (path === "/profile") return user() ? renderProfile() : go("/auth");
  if (path === "/auth") return renderAuth();
  if (path === "/lobby") return user() ? renderLobby() : go("/auth");
  renderLanding();
}

function go(path) { if (location.hash === "#" + path) route(); else location.hash = path; }

function renderLanding() {
  app.innerHTML = `<main class="landing">
    <nav class="public-nav"><a class="wordmark" href="#/">NOIR<span>CASINO</span></a><div class="public-links"><a href="#games">Casino</a><a href="#promos">Promociones</a><a href="#vip">VIP</a><a href="#ranking">Ranking</a></div><div class="nav-actions"><button data-go="/auth" class="text-button">LOGIN</button><button data-auth="register" class="gold-button small">CREAR CUENTA</button></div></nav>
    <section class="hero"><div class="hero-copy"><p class="overline">PRIVATE DIGITAL CLUB</p><h1>EL JUEGO<br><i>EMPIEZA ACÁ</i></h1><p class="hero-lead">Una colección de juegos clásicos reinventados con precisión, atmósfera y guaraníes exclusivamente virtuales.</p><div class="hero-bonus"><strong>${money(500000)}</strong><span>VIRTUALES DE BIENVENIDA</span></div><button data-auth="register" class="play-cta">JUGAR AHORA <b>→</b></button><small>SALDO VIRTUAL — SIN VALOR MONETARIO REAL</small></div>
    <div class="hero-visual" aria-hidden="true"><div class="roulette-orbit"><span>0</span></div><div class="hero-seven">7</div><div class="floating-chip chip-one">N</div><div class="floating-chip chip-two">₲</div></div></section>
    <section class="featured" id="games"><header><div><p class="overline">THE NOIR COLLECTION</p><h2>JUEGOS DESTACADOS</h2></div><button data-go="/auth" class="text-button">VER CASINO →</button></header><div class="public-game-grid">${GAMES.map(gameCard).join("")}<article class="game-card locked"><div class="game-art magenta">♦</div><div class="game-info"><b>Baccarat Privé</b><span>PRÓXIMAMENTE</span></div></article></div></section>
    <footer class="public-footer"><span>NOIR CASINO</span><p>Experiencia ficticia. No acepta depósitos, retiros ni dinero real.</p></footer>
  </main>`;
  bindCommon();
  document.querySelectorAll("[data-game]").forEach((button) => button.onclick = () => { authMode = "register"; go("/auth"); });
}

function renderAuth() {
  app.innerHTML = `<main class="auth-page"><section class="auth-brand"><a class="wordmark" href="#/">NOIR<span>CASINO</span></a><div><p class="overline">MEMBERS ONLY</p><h1>ENTRÁ AL<br>CÍRCULO <i>NOIR</i></h1><p>Guaraníes virtuales, reglas transparentes y resultados generados de forma segura.</p></div><div class="auth-symbols"><i>♠</i><i>7</i><i>◆</i></div><small>SALDO VIRTUAL — SIN VALOR MONETARIO REAL</small></section><section class="auth-panel"><button class="auth-close" data-go="/">×</button><div class="auth-tabs"><button data-mode="login" class="${authMode==="login"?"active":""}">LOGIN</button><button data-mode="register" class="${authMode==="register"?"active":""}">REGISTRO</button></div>${authMode === "register" ? registerForm() : authMode === "reset" ? resetForm() : loginForm()}</section></main>`;
  bindCommon();
  document.querySelectorAll("[data-mode]").forEach((button) => button.onclick = () => { authMode = button.dataset.mode; renderAuth(); });
  document.querySelector("#authForm")?.addEventListener("submit", handleAuth);
}

const loginForm = () => `<form id="authForm" class="auth-form"><p class="overline">WELCOME BACK</p><h2>Volvé a la mesa.</h2><label>Email o usuario<input name="identity" autocomplete="username" required></label><label>Contraseña<input type="password" name="password" autocomplete="current-password" minlength="6" required></label><button class="gold-button" type="submit">ENTRAR A NOIR</button><button class="link-button" type="button" data-mode="reset">¿Olvidaste tu contraseña?</button><p class="form-note">Esta cuenta se guarda únicamente en este dispositivo.</p></form>`;
const registerForm = () => `<form id="authForm" class="auth-form"><p class="overline">CREATE MEMBERSHIP</p><h2>Tu lugar en NOIR.</h2><div class="form-row"><label>Usuario<input name="username" minlength="3" maxlength="18" required></label><label>Avatar<input name="avatar" maxlength="2" placeholder="NV"></label></div><label>Email<input type="email" name="email" autocomplete="email" required></label><label>Contraseña<input type="password" name="password" minlength="6" autocomplete="new-password" required></label><label>Confirmar contraseña<input type="password" name="confirm" minlength="6" required></label><button class="gold-button" type="submit">CREAR CUENTA · ${money(500000)}</button><p class="form-note">Incluye 20 free spins. Todo el saldo es ficticio.</p></form>`;
const resetForm = () => `<form id="authForm" class="auth-form"><p class="overline">LOCAL RECOVERY</p><h2>Recuperación simulada.</h2><label>Email<input type="email" name="email" required></label><button class="gold-button" type="submit">GENERAR AVISO LOCAL</button><button class="link-button" type="button" data-mode="login">VOLVER</button><p class="form-note">Sin backend no se envía ningún correo real.</p></form>`;

async function handleAuth(event) {
  event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget));
  if (authMode === "reset") { toast("RECUPERACIÓN SIMULADA", "En una versión con backend recibirías un correo seguro."); authMode = "login"; return renderAuth(); }
  const passwordHash = await hashPassword(data.password);
  if (authMode === "register") {
    if (data.password !== data.confirm) return toast("CONTRASEÑAS DIFERENTES", "Revisá la confirmación.", true);
    if (db.data.users.some((item) => item.email === data.email.toLowerCase() || item.username.toLowerCase() === data.username.toLowerCase())) return toast("CUENTA EXISTENTE", "Usá otro email o usuario.", true);
    const created = createUser({ username:data.username, email:data.email, passwordHash, avatar:data.avatar || data.username[0] }); db.data.users.push(created); db.data.sessionUserId = created.id; db.save(); toast("WELCOME TO NOIR", `${money(500000)} y 20 free spins acreditados.`); go("/lobby");
  } else {
    const found = db.data.users.find((item) => (item.email === data.identity.toLowerCase() || item.username.toLowerCase() === data.identity.toLowerCase()) && item.passwordHash === passwordHash);
    if (!found) return toast("ACCESO DENEGADO", "Usuario o contraseña incorrectos.", true);
    db.data.sessionUserId = found.id; db.save(); go("/lobby");
  }
}

function shell(content, active = "home") {
  const current = user();
  return `<div class="casino-shell"><header class="casino-header"><a class="wordmark" href="#/lobby">NOIR<span>CASINO</span></a><label class="search-box"><span>⌕</span><input id="gameSearch" placeholder="Buscar juegos"></label><button class="wallet-pill" id="walletButton"><span>${money(current.balance)}</span><small>VIRTUAL</small></button><button class="notice-button" id="noticeButton">●<b>${current.notifications.filter(n=>!n.read).length}</b></button><button class="profile-chip" data-go="/profile"><i>${escapeHtml(current.avatar)}</i><span>${escapeHtml(current.username)}<small>LVL ${current.level} · ${current.rank}</small></span></button></header><aside class="side-nav">${navItem("home","⌂","CASINO","/lobby",active)}${navItem("slots","7","SLOTS","/lobby?cat=slots",active)}${navItem("table","♠","TABLE GAMES","/lobby?cat=table",active)}${navItem("favorite","☆","FAVORITOS","/lobby?cat=favorites",active)}${navItem("profile","◉","MI PERFIL","/profile",active)}<div class="side-spacer"></div><button id="adminLink"><span>⚙</span> ADMIN</button><button id="logoutButton"><span>↗</span> SALIR</button></aside><main class="casino-main">${content}</main><nav class="mobile-nav">${navItem("home","⌂","HOME","/lobby",active)}${navItem("slots","⌕","SEARCH","/lobby",active)}${navItem("table","7","GAMES","/lobby",active)}${navItem("favorite","☆","REWARDS","/lobby",active)}${navItem("profile","◉","PROFILE","/profile",active)}</nav></div>`;
}

const navItem = (id, icon, label, path, active) => `<button data-go="${path}" class="${active===id?"active":""}"><span>${icon}</span>${label}</button>`;

function renderLobby() {
  const current = user();
  const hero = [{eyebrow:"MEGA JACKPOT",title:money(db.data.jackpot.mega),copy:"La bóveda principal continúa creciendo.",tone:"mega"},{eyebrow:"BIENVENIDO A NOIR",title:"20 FREE SPINS",copy:"Tu membresía incluye créditos de juego virtuales.",tone:"welcome"},{eyebrow:"ROULETTE NIGHT",title:"2X XP",copy:"Disponible en Roulette Royale esta noche.",tone:"roulette"}][heroIndex%3];
  const filtered = GAMES.filter((game) => lobbyCategory === "popular" || game.category === lobbyCategory || (lobbyCategory === "favorites" && current.favorites.includes(game.id)) || (lobbyCategory === "recent" && current.recent.includes(game.id)));
  app.innerHTML = shell(`<section class="lobby-page"><div class="casino-hero ${hero.tone}"><div><p class="overline">${hero.eyebrow}</p><h1>${hero.title}</h1><p>${hero.copy}</p><button class="light-button" data-game="${hero.tone==="roulette"?"roulette":"slot"}">JUGAR AHORA →</button></div><div class="hero-emblem">${hero.tone==="roulette"?"0":"N"}</div><div class="hero-dots">${[0,1,2].map(i=>`<button data-hero="${i}" class="${heroIndex===i?"active":""}"></button>`).join("")}</div></div>
    <section class="balance-strip"><div><span>SALDO DISPONIBLE</span><strong>${money(current.balance)}</strong></div><div><span>NIVEL</span><strong>${current.level} · ${current.rank}</strong></div><div><span>XP</span><strong>${current.xp.toLocaleString("es-PY")}</strong></div><div><span>FREE SPINS</span><strong>${current.freeSpins}</strong></div><button id="claimCredits">OBTENER CRÉDITOS DE PRUEBA</button></section>
    <div class="section-heading"><div><p class="overline">LIVE COLLECTION</p><h2>CASINO</h2></div><div class="category-tabs">${[["popular","POPULARES"],["favorites","FAVORITOS"],["recent","RECIENTES"],["slots","SLOTS"],["table","TABLE GAMES"]].map(([id,label])=>`<button data-category="${id}" class="${lobbyCategory===id?"active":""}">${label}</button>`).join("")}</div></div>
    <div class="game-grid" id="gameGrid">${filtered.length?filtered.map(gameCard).join(""):`<div class="empty-state"><b>NADA TODAVÍA</b><span>Jugá o marcá favoritos para llenar esta colección.</span></div>`}</div>
    <section class="lobby-lower"><article><p class="overline">YOUR PROGRESS</p><h3>CAMINO A ${current.rank==="GUEST"?"PLAYER":"SILVER"}</h3><div class="progress"><i style="width:${Math.min(100,current.xp%250/2.5)}%"></i></div><span>${current.xp%250} / 250 XP</span></article><article><p class="overline">RECENT ACTIVITY</p><h3>${current.history[0]?`${current.history[0].game.toUpperCase()} · ${money(current.history[0].net)}`:"TU HISTORIAL EMPIEZA ACÁ"}</h3><button data-go="/profile" class="text-button">VER ACTIVIDAD →</button></article></section></section>`, "home");
  bindShell(); bindGameCards();
  document.querySelectorAll("[data-category]").forEach(button=>button.onclick=()=>{lobbyCategory=button.dataset.category;renderLobby();});
  document.querySelectorAll("[data-hero]").forEach(button=>button.onclick=()=>{heroIndex=Number(button.dataset.hero);renderLobby();});
  document.querySelector("#claimCredits").onclick = claimCredits;
}

function gameCard(game) {
  const current = user(); const favorite = current?.favorites.includes(game.id);
  return `<article class="game-card" data-card="${game.id}" data-name="${game.name.toLowerCase()}"><div class="game-art ${game.color}"><span>${game.art}</span><i></i>${current?`<button class="favorite ${favorite?"active":""}" data-favorite="${game.id}" aria-label="Favorito">${favorite?"★":"☆"}</button>`:""}<button class="card-play" data-game="${game.id}">PLAY →</button></div><div class="game-info"><div><b>${game.name}</b><span>${game.description}</span></div><small>${game.tag}</small></div></article>`;
}

function bindGameCards() {
  document.querySelectorAll("[data-game]").forEach(button=>button.onclick=(event)=>{event.stopPropagation();go("/game/"+button.dataset.game);});
  document.querySelectorAll("[data-favorite]").forEach(button=>button.onclick=(event)=>{event.stopPropagation();const current=user(),id=button.dataset.favorite;current.favorites=current.favorites.includes(id)?current.favorites.filter(item=>item!==id):[...current.favorites,id];db.save();renderLobby();});
  document.querySelector("#gameSearch")?.addEventListener("input",event=>document.querySelectorAll("[data-card]").forEach(card=>card.hidden=!card.dataset.name.includes(event.target.value.toLowerCase())));
}

function renderGame(id) {
  if (!GAMES.some(game=>game.id===id)) return go("/lobby"); currentGame=id;
  const body = id === "slot" ? slotView() : id === "roulette" ? rouletteView() : blackjackView();
  app.innerHTML = shell(`<section class="game-page"><header class="game-page-head"><button class="back-casino" data-go="/lobby">← LOBBY</button><div><p class="overline">${GAMES.find(game=>game.id===id).tag}</p><h1>${GAMES.find(game=>game.id===id).name}</h1></div><span>SALDO VIRTUAL</span></header>${body}${debug?debugPanel():""}</section>`, id==="slot"?"slots":"table"); bindShell(); bindGame(id);
}

function betOptions(max = 250000) { return [1000,5000,10000,25000,50000,100000,250000].filter(v=>v<=max).map(v=>`<option value="${v}">${money(v)}</option>`).join(""); }

function slotView() {
  return `<div class="slot-stage"><div class="slot-marquee"><span>20 PAYLINES</span><strong>NOIR <i>777</i></strong><span>RTP ${Math.min(999,theoreticalSlotRtp()*100).toFixed(2)}%</span></div><div class="slot-window" id="slotGrid">${Array.from({length:15},(_,i)=>`<i class="slot-symbol ghost" style="--delay:${i*35}ms">N</i>`).join("")}</div><div class="game-message" id="gameMessage">ELEGÍ TU APUESTA</div><div class="game-controls"><label>APUESTA<select id="gameBet">${betOptions()}</select></label><div class="spin-housing"><button id="slotSpin" class="physical-spin">SPIN</button></div><div><span>FREE SPINS</span><strong id="freeSpinCount">${user().freeSpins}</strong></div></div><button class="paytable-link" id="paytableButton">VER TABLA DE PAGOS</button></div>`;
}

function rouletteView() {
  return `<div class="roulette-layout"><div class="roulette-wheel-wrap"><div class="roulette-wheel" id="rouletteWheel"><div class="roulette-ball"></div><b id="rouletteResult">?</b></div><div class="roulette-history" id="rouletteHistory">SIN GIROS TODAVÍA</div></div><div class="roulette-table"><p class="overline">EUROPEAN SINGLE ZERO</p><h2>COLOCÁ TU APUESTA</h2><label>TIPO<select id="rouletteType">${Object.entries(ROULETTE_TYPES).map(([id,c])=>`<option value="${id}">${c.label} · ${c.payout-1}:1</option>`).join("")}</select></label><label id="rouletteTargetLabel">NÚMERO<input id="rouletteTarget" value="7" placeholder="Ej: 7 o 7,8"></label><label>APUESTA<select id="gameBet">${betOptions(500000)}</select></label><div class="potential"><span>GANANCIA POTENCIAL</span><strong id="roulettePotential">${money(36000)}</strong></div><button class="gold-button" id="rouletteSpin">GIRAR RULETA</button><div class="quick-bets">${["red","black","even","odd","low","high"].map(type=>`<button data-quick="${type}">${ROULETTE_TYPES[type].label}</button>`).join("")}</div></div></div>`;
}

function blackjackView() {
  return `<div class="blackjack-table"><div class="dealer-zone"><p>DEALER <span id="dealerScore"></span></p><div class="cards" id="dealerCards"><i class="card back-card">N</i><i class="card back-card">N</i></div></div><div class="table-mark">NOIR<br><small>BLACKJACK PAYS 3 TO 2 · DEALER STANDS ON SOFT 17</small></div><div class="player-zone"><div class="cards" id="playerCards"><i class="card empty-card">A♠</i><i class="card empty-card">K♦</i></div><p>PLAYER <span id="playerScore"></span></p></div><div class="blackjack-controls"><label>APUESTA<select id="gameBet">${betOptions(500000)}</select></label><button class="gold-button" id="blackjackDeal">DEAL</button><button id="blackjackHit" disabled>HIT</button><button id="blackjackStand" disabled>STAND</button><button id="blackjackDouble" disabled>DOUBLE</button><button id="blackjackSplit" disabled>SPLIT</button><button id="blackjackInsurance" disabled>INSURANCE</button></div><div class="game-message" id="gameMessage">LA MESA ESTÁ ABIERTA</div></div>`;
}

function bindGame(id) {
  if (id === "slot") { document.querySelector("#slotSpin").onclick=playSlot; document.querySelector("#paytableButton").onclick=showPaytable; }
  if (id === "roulette") bindRoulette();
  if (id === "blackjack") bindBlackjack();
}

async function playSlot() {
  const button=document.querySelector("#slotSpin"), amount=Number(document.querySelector("#gameBet").value), current=user();
  const free=current.freeSpins>0; let round;
  try { round=engine.beginRound(current,"slot",free?db.data.games.slot.minBet:amount,{freeSpin:free}); if(free){current.balance+=db.data.games.slot.minBet;round.bet=amount;current.freeSpins-=1;} }
  catch(error){return toast("NO SE PUDO GIRAR",error.message,true);}
  button.disabled=true;document.querySelector("#gameMessage").textContent=free?`FREE SPIN · ${current.freeSpins} RESTANTES`:"REELS IN MOTION";
  const grid=createSlotGrid(); const nodes=[...document.querySelectorAll(".slot-symbol")]; nodes.forEach((node,i)=>{node.className="slot-symbol spinning";node.textContent=SLOT_SYMBOLS[i%SLOT_SYMBOLS.length].label;});
  await wait(900); Array.from({length:3},(_,row)=>grid.map(column=>column[row])).flat().forEach((symbol,i)=>{nodes[i].className="slot-symbol "+symbol.id.toLowerCase();nodes[i].textContent=symbol.label;});
  const outcome=evaluateSlot(grid,amount); if(outcome.freeSpins){current.freeSpins+=outcome.freeSpins;current.notifications.unshift({id:crypto.randomUUID(),title:"FREE SPINS UNLOCKED",body:`${outcome.freeSpins} giros acreditados.`,read:false});}
  if(free) round.bet=0; engine.settleRound(current,round,outcome.payout,{scatters:outcome.scatters,freeSpinsAwarded:outcome.freeSpins});
  document.querySelector("#gameMessage").textContent=outcome.payout?`${winTitle(outcome.payout/Math.max(1,amount))} · ${money(outcome.payout)}`:"SIN PREMIO — SIGUIENTE RONDA";document.querySelector("#freeSpinCount").textContent=current.freeSpins;button.disabled=false;refreshHeader();
  if(outcome.wins.length) outcome.wins[0].line.forEach((row,column)=>nodes[row*5+column]?.classList.add("winner"));
}

function bindRoulette() {
  const type=document.querySelector("#rouletteType"), target=document.querySelector("#rouletteTarget"), bet=document.querySelector("#gameBet");
  const update=()=>{const config=ROULETTE_TYPES[type.value];document.querySelector("#rouletteTargetLabel").hidden=!config.count;document.querySelector("#roulettePotential").textContent=money(Number(bet.value)*config.payout);};
  type.onchange=update;bet.onchange=update;document.querySelectorAll("[data-quick]").forEach(button=>button.onclick=()=>{type.value=button.dataset.quick;update();});document.querySelector("#rouletteSpin").onclick=playRoulette;update();
}

async function playRoulette() {
  const type=document.querySelector("#rouletteType").value,target=document.querySelector("#rouletteTarget").value,amount=Number(document.querySelector("#gameBet").value),button=document.querySelector("#rouletteSpin");
  try { validateRouletteBet(type,target); var round=engine.beginRound(user(),"roulette",amount,{type,target}); } catch(error){return toast("APUESTA INVÁLIDA",error.message,true);}
  const number=spinRoulette(),wheel=document.querySelector("#rouletteWheel");button.disabled=true;wheel.classList.add("spinning");document.querySelector("#rouletteResult").textContent="";await wait(1900);wheel.classList.remove("spinning");document.querySelector("#rouletteResult").textContent=number;document.querySelector("#rouletteResult").className=rouletteColor(number);const payout=resolveRouletteBet(type,target,amount,number);engine.settleRound(user(),round,payout,{number,color:rouletteColor(number)});document.querySelector("#rouletteHistory").textContent=`ÚLTIMO · ${number} ${rouletteColor(number).toUpperCase()} · ${payout?"WIN "+money(payout):"NO WIN"}`;button.disabled=false;refreshHeader();
}

function bindBlackjack() {
  document.querySelector("#blackjackDeal").onclick=dealBlackjack;document.querySelector("#blackjackHit").onclick=()=>{blackjack.hit();updateBlackjack();};document.querySelector("#blackjackStand").onclick=()=>{blackjack.stand();updateBlackjack();};document.querySelector("#blackjackDouble").onclick=()=>{try{engine.addStake(user(),blackjackRound,blackjack.hand().bet);blackjack.double();updateBlackjack();}catch(e){toast("DOUBLE RECHAZADO",e.message,true);}};document.querySelector("#blackjackSplit").onclick=()=>{try{engine.addStake(user(),blackjackRound,blackjack.hand().bet);blackjackRound.metadata.split=true;blackjack.split();updateBlackjack();}catch(e){toast("SPLIT RECHAZADO",e.message,true);}};document.querySelector("#blackjackInsurance").onclick=()=>{const stake=blackjack.hand().bet/2;try{engine.addStake(user(),blackjackRound,stake);blackjack.insurance=stake;updateBlackjack();}catch(e){toast("INSURANCE RECHAZADO",e.message,true);}};
}

function dealBlackjack() {
  const amount=Number(document.querySelector("#gameBet").value);try{blackjackRound=engine.beginRound(user(),"blackjack",amount);blackjack=new BlackjackTable(amount);}catch(e){return toast("NO SE PUDO REPARTIR",e.message,true);}document.querySelector("#blackjackDeal").disabled=true;updateBlackjack();const player=scoreHand(blackjack.hand().cards),dealer=scoreHand(blackjack.dealer);if(player.blackjack||dealer.blackjack){blackjack.playDealer();updateBlackjack();}
}

function updateBlackjack() {
  const hand=blackjack?.hand(); if(!hand)return; const playerScore=scoreHand(hand.cards);
  document.querySelector("#playerCards").innerHTML=blackjack.hands.map((item,index)=>`<div class="hand ${index===blackjack.active?"active":""}">${item.cards.map(cardHtml).join("")}<small>HAND ${index+1} · ${scoreHand(item.cards).total}</small></div>`).join("");
  document.querySelector("#dealerCards").innerHTML=blackjack.dealer.map((card,index)=>!blackjack.complete&&index===1?`<i class="card back-card">N</i>`:cardHtml(card)).join("");document.querySelector("#playerScore").textContent=playerScore.total;document.querySelector("#dealerScore").textContent=blackjack.complete?scoreHand(blackjack.dealer).total:"";
  ["Hit","Stand"].forEach(id=>document.querySelector("#blackjack"+id).disabled=blackjack.complete);document.querySelector("#blackjackDouble").disabled=blackjack.complete||!blackjack.canDouble()||user().balance<hand.bet;document.querySelector("#blackjackSplit").disabled=blackjack.complete||!blackjack.canSplit()||user().balance<hand.bet;document.querySelector("#blackjackInsurance").disabled=blackjack.complete||!blackjack.canInsure()||user().balance<hand.bet/2;
  if(blackjack.complete){const settlement=blackjack.settle();engine.settleRound(user(),blackjackRound,settlement.payout,{results:settlement.results,dealerScore:settlement.dealerScore});document.querySelector("#gameMessage").textContent=settlement.results.map((r,i)=>`HAND ${i+1}: ${r.outcome}`).join(" · ");document.querySelector("#blackjackDeal").disabled=false;["Hit","Stand","Double","Split","Insurance"].forEach(id=>document.querySelector("#blackjack"+id).disabled=true);refreshHeader();}
}

const cardHtml=card=>`<i class="card ${["♥","♦"].includes(card.suit)?"red-card":""}"><b>${card.rank}</b><span>${card.suit}</span></i>`;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const winTitle=m=>m>=500?"LEGENDARY WIN":m>=100?"EPIC WIN":m>=50?"MEGA WIN":m>=20?"BIG WIN":"WIN";

function renderProfile() {
  const current=user(),favorite=GAMES.find(game=>game.id===current.favorites[0]);
  app.innerHTML=shell(`<section class="profile-page"><header class="profile-hero"><div class="avatar-large">${escapeHtml(current.avatar)}</div><div><p class="overline">NOIR MEMBER SINCE ${new Date(current.createdAt).getFullYear()}</p><h1>${escapeHtml(current.username)}</h1><span>${current.rank} · LEVEL ${current.level}</span></div><button id="editAvatar" class="light-button">CAMBIAR AVATAR</button></header><div class="profile-stats">${[["BALANCE",money(current.balance)],["TOTAL WAGERED",money(current.stats.totalWagered)],["TOTAL WON",money(current.stats.totalWon)],["BIGGEST WIN",money(current.stats.biggestWin)],["GAMES PLAYED",current.stats.gamesPlayed],["FAVORITE",favorite?.name||"—"]].map(([label,value])=>`<article><span>${label}</span><strong>${value}</strong></article>`).join("")}</div><section class="activity"><header><div><p class="overline">ROUND LEDGER</p><h2>MY ACTIVITY</h2></div></header><div class="activity-table"><div class="activity-row heading"><span>FECHA</span><span>JUEGO</span><span>APUESTA</span><span>MULT.</span><span>RESULTADO</span></div>${current.history.length?current.history.map(round=>`<div class="activity-row"><span>${new Date(round.createdAt).toLocaleString("es-PY",{dateStyle:"short",timeStyle:"short"})}</span><span>${round.game.toUpperCase()}<small>${round.id}</small></span><span>${money(round.bet)}</span><span>${round.multiplier.toFixed(2)}x</span><strong class="${round.net>=0?"positive":"negative"}">${round.net>=0?"+":""}${money(round.net)}</strong></div>`).join(""):`<div class="empty-state">TODAVÍA NO HAY RONDAS REGISTRADAS</div>`}</div></section></section>`,"profile");bindShell();document.querySelector("#editAvatar").onclick=()=>{const value=prompt("Iniciales del avatar (máximo 2)",current.avatar);if(value){current.avatar=value.slice(0,2).toUpperCase();db.save();renderProfile();}};
}

function renderAdmin() {
  if(!db.data.adminSession){app.innerHTML=`<main class="admin-login"><a class="wordmark" href="#/">NOIR<span>ADMIN</span></a><form id="adminForm"><p class="overline">LOCAL CONTROL ROOM</p><h1>ADMIN ACCESS</h1><label>Código local<input type="password" name="code" required></label><button class="gold-button">ENTRAR</button><small>Demo local: NOIR-LOCAL-ADMIN</small></form></main>`;document.querySelector("#adminForm").onsubmit=e=>{e.preventDefault();if(new FormData(e.currentTarget).get("code")!=="NOIR-LOCAL-ADMIN")return toast("ACCESO DENEGADO","Código administrativo inválido.",true);db.data.adminSession=true;db.addAudit("ADMIN_LOGIN");db.save();renderAdmin();};return;}
  const aggregate=db.data.users.reduce((a,u)=>({balance:a.balance+u.balance,wagered:a.wagered+u.stats.totalWagered,paid:a.paid+u.stats.totalWon,rounds:a.rounds+u.stats.gamesPlayed}),{balance:0,wagered:0,paid:0,rounds:0});
  app.innerHTML=`<div class="admin-shell"><aside><a class="wordmark" href="#/admin">NOIR<span>CONTROL</span></a><button class="active" data-admin-tab="top">OVERVIEW</button><button data-admin-tab="adminUsers">USERS</button><button data-admin-tab="adminGames">GAMES</button><button data-admin-tab="adminAudit">AUDIT LOG</button><div></div><button data-go="/lobby">← CASINO</button><button id="adminLogout">LOG OUT</button></aside><main id="top"><header><div><p class="overline">SIMULATION CONTROL</p><h1>OPERATIONS OVERVIEW</h1></div><span>${new Date().toLocaleString("es-PY")}</span></header><div class="admin-metrics">${[["LOCAL USERS",db.data.users.length],["TOTAL VIRTUAL BALANCE",money(aggregate.balance)],["TOTAL BETS",money(aggregate.wagered)],["TOTAL PAYOUT",money(aggregate.paid)],["OBSERVED RTP",aggregate.wagered?(aggregate.paid/aggregate.wagered*100).toFixed(2)+"%":"—"],["GAMES PLAYED",aggregate.rounds]].map(([l,v])=>`<article><span>${l}</span><strong>${v}</strong></article>`).join("")}</div><section class="admin-section" id="adminGames"><header><h2>GAME CONFIGURATION</h2><span>All values use virtual guaraníes</span></header><div class="admin-games">${Object.entries(db.data.games).map(([id,c])=>`<article><div><b>${c.name}</b><span>${id==="slot"?`Theoretical RTP ${Math.min(999,theoreticalSlotRtp()*100).toFixed(2)}%`:id==="roulette"?`Theoretical RTP ${(EUROPEAN_ROULETTE_RTP*100).toFixed(2)}%`:"HOUSE RULES · 6 DECKS"}</span></div><label>MIN BET<input data-config="${id}:minBet" type="number" value="${c.minBet}"></label><label>MAX BET<input data-config="${id}:maxBet" type="number" value="${c.maxBet}"></label><label class="switch"><input data-config="${id}:enabled" type="checkbox" ${c.enabled?"checked":""}><i></i>ENABLED</label></article>`).join("")}</div><button id="saveConfig" class="gold-button">SAVE CONFIGURATION</button></section><section class="admin-section" id="adminUsers"><header><h2>LOCAL USERS</h2><span>Changes are written to the audit log</span></header>${db.data.users.map(u=>`<div class="admin-user"><i>${escapeHtml(u.avatar)}</i><span><b>${escapeHtml(u.username)}</b><small>${escapeHtml(u.email)}</small></span><strong>${money(u.balance)}</strong><button data-credit="${u.id}">+ ₲100K</button></div>`).join("")||"No users yet."}</section><section class="admin-section" id="adminAudit"><header><h2>AUDIT LOG</h2></header>${db.data.audit.slice(0,10).map(log=>`<div class="audit-row"><span>${new Date(log.date).toLocaleString("es-PY")}</span><b>${log.action}</b><span>${log.target}</span></div>`).join("")||"No actions yet."}</section></main></div>`;
  bindCommon();document.querySelector("#adminLogout").onclick=()=>{db.data.adminSession=false;db.save();renderAdmin();};document.querySelector("#saveConfig").onclick=saveAdminConfig;document.querySelectorAll("[data-credit]").forEach(button=>button.onclick=()=>adminCredit(button.dataset.credit));document.querySelectorAll("[data-admin-tab]").forEach(button=>button.onclick=()=>document.querySelector("#"+button.dataset.adminTab)?.scrollIntoView({behavior:"smooth"}));
}

function saveAdminConfig(){document.querySelectorAll("[data-config]").forEach(input=>{const[id,key]=input.dataset.config.split(":"),old=db.data.games[id][key],value=input.type==="checkbox"?input.checked:Number(input.value);db.data.games[id][key]=value;if(old!==value)db.addAudit("GAME_CONFIG_CHANGED",old,value,id+":"+key);});db.save();toast("CONFIGURACIÓN GUARDADA","Los límites se aplican a la próxima ronda.");}
function adminCredit(id){const target=db.data.users.find(u=>u.id===id),old=target.balance;target.balance+=100000;db.addAudit("VIRTUAL_BALANCE_ADDED",old,target.balance,target.username);db.save();renderAdmin();}

function showWallet(){const current=user();modalRoot.innerHTML=`<div class="modal-backdrop"><section class="wallet-modal"><button class="modal-close">×</button><p class="overline">VIRTUAL WALLET</p><h2>${money(current.balance)}</h2><span class="virtual-stamp">SALDO VIRTUAL — SIN VALOR MONETARIO REAL</span><div>${[["GANANCIAS TOTALES",money(current.stats.totalWon)],["APUESTAS TOTALES",money(current.stats.totalWagered)],["BONUS BALANCE",money(current.bonusBalance)],["JACKPOTS GANADOS",current.stats.jackpotsWon]].map(([l,v])=>`<article><span>${l}</span><strong>${v}</strong></article>`).join("")}</div><button class="gold-button" id="modalClaim">OBTENER CRÉDITOS DE PRUEBA</button></section></div>`;modalRoot.querySelector(".modal-close").onclick=closeModal;modalRoot.querySelector(".modal-backdrop").onclick=e=>{if(e.target===e.currentTarget)closeModal();};modalRoot.querySelector("#modalClaim").onclick=claimCredits;}
function showNotifications(){const current=user();current.notifications.forEach(n=>n.read=true);db.save();modalRoot.innerHTML=`<div class="modal-backdrop"><section class="notice-modal"><button class="modal-close">×</button><p class="overline">NOIR NOTIFICATIONS</p><h2>YOUR EVENTS</h2>${current.notifications.slice(0,10).map(n=>`<article><b>${escapeHtml(n.title)}</b><p>${escapeHtml(n.body)}</p></article>`).join("")||"<p>No notifications.</p>"}</section></div>`;modalRoot.querySelector(".modal-close").onclick=closeModal;}
function showPaytable(){modalRoot.innerHTML=`<div class="modal-backdrop"><section class="paytable-modal"><button class="modal-close">×</button><p class="overline">NOIR 777</p><h2>PAYTABLE</h2><div>${SLOT_SYMBOLS.map(s=>`<article><b>${s.label}</b><span>3 · ${s.pay[2]}x</span><span>4 · ${s.pay[3]}x</span><span>5 · ${s.pay[4]}x</span></article>`).join("")}</div><small>Premios de línea aplicados proporcionalmente sobre 20 paylines. Scatter paga sobre apuesta total.</small></section></div>`;modalRoot.querySelector(".modal-close").onclick=closeModal;}
function closeModal(){modalRoot.innerHTML="";}

function claimCredits(){const current=user(),now=Date.now(),cooldown=12*60*60*1000,last=current.lastTestCreditAt?Date.parse(current.lastTestCreditAt):0;if(now-last<cooldown)return toast("CRÉDITOS NO DISPONIBLES",`Volvé en ${Math.ceil((cooldown-(now-last))/3600000)} hora(s).`,true);current.balance+=250000;current.lastTestCreditAt=new Date().toISOString();current.notifications.unshift({id:crypto.randomUUID(),title:"TEST CREDITS",body:`${money(250000)} acreditados.`,read:false});db.save();closeModal();refreshHeader();toast("CRÉDITOS ACREDITADOS",money(250000)+" virtuales.");}

function bindCommon(){document.querySelectorAll("[data-go]").forEach(button=>button.onclick=()=>go(button.dataset.go.split("?")[0]));document.querySelectorAll("[data-auth]").forEach(button=>button.onclick=()=>{authMode=button.dataset.auth;go("/auth");});}
function bindShell(){bindCommon();document.querySelector("#walletButton").onclick=showWallet;document.querySelector("#noticeButton").onclick=showNotifications;document.querySelector("#logoutButton").onclick=()=>{db.data.sessionUserId=null;db.save();go("/");};document.querySelector("#adminLink").onclick=()=>go("/admin");}
function refreshHeader(){const pill=document.querySelector("#walletButton span");if(pill)pill.textContent=money(user().balance);}
function toast(title,body,error=false){const node=document.createElement("article");node.className="toast "+(error?"error":"");node.innerHTML=`<b>${escapeHtml(title)}</b><span>${escapeHtml(body)}</span>`;document.querySelector("#toastRoot").appendChild(node);setTimeout(()=>node.remove(),4200);}
function debugPanel(){return `<details class="debug-panel"><summary>DEBUG MODE</summary><pre>secure RNG: crypto.getRandomValues\nslot theoretical RTP: ${(theoreticalSlotRtp()*100).toFixed(4)}%\nroulette probability: 1 / 37\nroulette theoretical RTP: ${(EUROPEAN_ROULETTE_RTP*100).toFixed(4)}%\ncurrent game: ${currentGame}\nuser id: ${user().id}</pre></details>`;}

window.addEventListener("hashchange",route);route();
