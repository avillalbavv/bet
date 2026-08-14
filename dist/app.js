import { LocalDatabase, createUser, hashPassword } from "./src/core/storage.js";
import { CasinoEngine } from "./src/core/casino-engine.js";
import { createSlotGrid, evaluateSlot, theoreticalSlotRtp, SLOT_SYMBOLS } from "./src/games/noir777.js";
import { spinRoulette, rouletteColor, resolveRouletteBet, validateRouletteBet, ROULETTE_TYPES, EUROPEAN_ROULETTE_RTP } from "./src/games/roulette.js";
import { BlackjackTable, scoreHand } from "./src/games/blackjack.js";
import { NoirExperience } from "./src/presentation/experience.js";

const db = new LocalDatabase();
const engine = new CasinoEngine(db);
const app = document.querySelector("#app");
const modalRoot = document.querySelector("#modalRoot");
const experience = new NoirExperience(db.data.settings, () => db.save());
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
const icon = (name) => {
  const paths = {
    home:'<path d="M3 11 12 3l9 8v10h-6v-6H9v6H3Z"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>',
    cards:'<rect x="4" y="3" width="13" height="17" rx="1"/><path d="m9 8 2-2 2 2-2 2Z"/><path d="m15 5 5 3v13H9"/>',
    star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/>',
    profile:'<circle cx="12" cy="8" r="4"/><path d="M4 21c.8-5 3.5-7 8-7s7.2 2 8 7"/>',
    sound:'<path d="M4 10v4h4l5 4V6L8 10Z"/><path d="M17 9c1.8 1.7 1.8 4.3 0 6M20 6c3.5 3.3 3.5 8.7 0 12"/>',
    exit:'<path d="M14 8V4H4v16h10v-4M10 12h11m-4-4 4 4-4 4"/>',
    grid:'<path d="M4 4h6v6H4Zm10 0h6v6h-6ZM4 14h6v6H4Zm10 0h6v6h-6Z"/>',
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.grid}</svg>`;
};

function route() {
  const path = location.hash.slice(1) || (user() ? "/lobby" : "/");
  experience.setScene(path.startsWith("/game/") ? path.split("/").at(-1) : path === "/lobby" ? "lobby" : "landing");
  if (path === "/admin") return renderAdmin();
  if (path.startsWith("/game/")) return user() ? renderGame(path.split("/").at(-1)) : go("/auth");
  if (path === "/profile") return user() ? renderProfile() : go("/auth");
  if (path === "/auth") return renderAuth();
  if (path === "/lobby") return user() ? renderLobby() : go("/auth");
  renderLanding();
}

function go(path) {
  const destination = path.split("?")[0];
  const accent = destination.includes("slot") ? "magenta" : destination.includes("roulette") ? "green" : destination.includes("blackjack") ? "cream" : "gold";
  experience.transition(() => { if (location.hash === "#" + destination) route(); else location.hash = destination; }, accent);
}

function renderLanding() {
  app.innerHTML = `<main class="landing nocturne">
    <nav class="public-nav"><a class="wordmark" href="#/">NOIR<span>CASINO</span></a><div class="public-links"><a href="#games">THE FLOOR</a><a href="#jackpots">JACKPOTS</a><a href="#vip">PRIVÉ</a></div><div class="nav-actions"><button id="publicSound" class="sound-orb" aria-label="Audio">${icon("sound")}</button><button data-go="/auth" class="text-button">LOGIN</button><button data-auth="register" class="gold-button small">MEMBERSHIP</button></div></nav>
    <section class="hero hero-cinematic">
      <div class="hero-aura" data-parallax="-10"></div><div class="laser laser-one"></div><div class="laser laser-two"></div>
      <div class="hero-copy" data-parallax="6"><p class="overline"><i></i> PRIVATE DIGITAL CLUB · ASUNCIÓN</p><h1><span>NOIR</span><em>CASINO</em></h1><p class="hero-lead">La noche tiene una mesa reservada para vos.</p><div class="hero-bonus"><small>WELCOME FORTUNE</small><strong>${money(500000)}</strong><span>VIRTUALES · 20 FREE SPINS</span></div><button data-auth="register" class="play-cta"><span>ENTRAR AL CASINO</span><b>→</b></button><small class="legal-whisper">ENTRETENIMIENTO VIRTUAL · SIN VALOR MONETARIO REAL</small></div>
      <div class="casino-diorama" aria-hidden="true" data-parallax="18">
        <div class="wheel-shadow"></div><div class="hero-wheel"><div class="wheel-rim"><div class="wheel-numbers">${[0,32,15,19,4,21,2,25,17,34,6,27].map((number,index)=>`<i style="--n:${index}">${number}</i>`).join("")}</div><div class="wheel-bowl"><span></span><b>N</b></div></div><i class="hero-ball"></i></div>
        <div class="hero-slot"><header>NOIR <i>777</i></header><div><b>7</b><b>W</b><b>7</b></div><footer>MEGA</footer></div>
        <div class="floating-card card-ace"><b>A</b><i>♠</i></div><div class="floating-card card-king"><b>K</b><i>♦</i></div>
        <div class="floating-chip chip-one"><span>N</span></div><div class="floating-chip chip-two"><span>500</span></div><div class="floating-chip chip-three"><span>VIP</span></div>
      </div>
      <div class="hero-jackpot" id="jackpots"><span>MEGA JACKPOT</span><strong data-live-jackpot data-value="${experience.currentJackpot}">${money(experience.currentJackpot)}</strong><i>LIVE PROGRESSIVE</i></div>
      <div class="scroll-cue"><i></i><span>DESCEND TO THE FLOOR</span></div>
    </section>
    <section class="jackpot-gallery"><p class="overline">LIVE VAULTS</p><div><article><span>MINI</span><strong>${money(8412900)}</strong><i></i></article><article><span>MAJOR</span><strong>${money(96831200)}</strong><i></i></article><article class="mega"><span>MEGA</span><strong data-live-jackpot data-value="${experience.currentJackpot}">${money(experience.currentJackpot)}</strong><i></i></article></div></section>
    <section class="featured" id="games"><header><div><p class="overline">THE NOIR COLLECTION</p><h2>CHOOSE YOUR NIGHT</h2></div><button data-go="/auth" class="text-button">ENTER THE FLOOR →</button></header><div class="public-game-grid">${GAMES.map(gameCard).join("")}</div></section>
    <section class="vip-gate" id="vip"><div class="vip-doors"><i></i><b>N</b><i></i></div><div><p class="overline">THE OBSIDIAN ROOM</p><h2>PRIVILEGE<br>BEYOND THE FLOOR</h2><p>Un espacio reservado para rangos altos, límites especiales y recompensas ceremoniales.</p><button data-auth="register" class="light-button">REQUEST MEMBERSHIP →</button></div></section>
    <footer class="public-footer"><span>NOIR CASINO · 2026</span><p>Experiencia ficticia. No acepta depósitos, retiros ni dinero real.</p></footer>
  </main>`;
  bindCommon();
  experience.bindParallax(app);
  document.querySelector("#publicSound").onclick = () => experience.openAudioPanel(modalRoot);
  document.querySelectorAll("[data-game]").forEach((button) => button.onclick = () => { authMode = "register"; go("/auth"); });
}

function renderAuth() {
  app.innerHTML = `<main class="auth-page auth-cinematic"><section class="auth-brand"><a class="wordmark" href="#/">NOIR<span>CASINO</span></a><div class="auth-stage" data-parallax="14"><div class="auth-wheel"><i></i><b>N</b></div><div class="auth-chip chip-a">500</div><div class="auth-chip chip-b">VIP</div><div class="auth-card"><b>A</b><span>♠</span></div></div><div class="auth-message"><p class="overline">MEMBERS ONLY</p><h1>YOUR NIGHT<br>STARTS <i>HERE</i></h1><p>Entrá a una sala construida para el juego, la precisión y la atmósfera.</p></div><small>SALDO VIRTUAL — SIN VALOR MONETARIO REAL</small></section><section class="auth-panel"><button class="auth-close" data-go="/">×</button><button id="authSound" class="auth-sound">${icon("sound")}</button><div class="auth-tabs"><button data-mode="login" class="${authMode==="login"?"active":""}">LOGIN</button><button data-mode="register" class="${authMode==="register"?"active":""}">MEMBERSHIP</button></div>${authMode === "register" ? registerForm() : authMode === "reset" ? resetForm() : loginForm()}</section></main>`;
  bindCommon();
  experience.bindParallax(app);
  document.querySelector("#authSound").onclick = () => experience.openAudioPanel(modalRoot);
  document.querySelectorAll("[data-mode]").forEach((button) => button.onclick = () => { authMode = button.dataset.mode; renderAuth(); });
  document.querySelector("#authForm")?.addEventListener("submit", handleAuth);
}

const loginForm = () => `<form id="authForm" class="auth-form"><p class="overline">WELCOME BACK</p><h2>Return to the floor.</h2><label><span>Email o usuario</span><input name="identity" autocomplete="username" required></label><label><span>Contraseña</span><input type="password" name="password" autocomplete="current-password" minlength="6" required></label><button class="gold-button" type="submit">UNLOCK NOIR <b>→</b></button><button class="link-button" type="button" data-mode="reset">RECOVER LOCAL ACCESS</button><p class="form-note">La membresía vive en este dispositivo. Sin dinero real.</p></form>`;
const registerForm = () => `<form id="authForm" class="auth-form"><p class="overline">CREATE MEMBERSHIP</p><h2>Claim your place.</h2><div class="form-row"><label><span>Usuario</span><input name="username" minlength="3" maxlength="18" required></label><label><span>Iniciales</span><input name="avatar" maxlength="2" placeholder="NV"></label></div><label><span>Email</span><input type="email" name="email" autocomplete="email" required></label><label><span>Contraseña</span><input type="password" name="password" minlength="6" autocomplete="new-password" required></label><label><span>Confirmar contraseña</span><input type="password" name="confirm" minlength="6" required></label><div class="membership-ticket"><span>WELCOME FORTUNE</span><strong>${money(500000)}</strong><i>+ 20 FREE SPINS</i></div><button class="gold-button" type="submit">CREATE MEMBERSHIP <b>→</b></button></form>`;
const resetForm = () => `<form id="authForm" class="auth-form"><p class="overline">LOCAL RECOVERY</p><h2>Recuperación simulada.</h2><label>Email<input type="email" name="email" required></label><button class="gold-button" type="submit">GENERAR AVISO LOCAL</button><button class="link-button" type="button" data-mode="login">VOLVER</button><p class="form-note">Sin backend no se envía ningún correo real.</p></form>`;

async function handleAuth(event) {
  event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget));
  if (authMode === "reset") { toast("RECUPERACIÓN SIMULADA", "En una versión con backend recibirías un correo seguro."); authMode = "login"; return renderAuth(); }
  const passwordHash = await hashPassword(data.password);
  if (authMode === "register") {
    if (data.password !== data.confirm) return toast("CONTRASEÑAS DIFERENTES", "Revisá la confirmación.", true);
    if (db.data.users.some((item) => item.email === data.email.toLowerCase() || item.username.toLowerCase() === data.username.toLowerCase())) return toast("CUENTA EXISTENTE", "Usá otro email o usuario.", true);
    const created = createUser({ username:data.username, email:data.email, passwordHash, avatar:data.avatar || data.username[0] }); db.data.users.push(created); db.data.sessionUserId = created.id; db.save(); toast("WELCOME TO NOIR", `${money(500000)} y 20 free spins acreditados.`); go("/lobby"); setTimeout(()=>experience.winCelebration(500000, 20), 900);
  } else {
    const found = db.data.users.find((item) => (item.email === data.identity.toLowerCase() || item.username.toLowerCase() === data.identity.toLowerCase()) && item.passwordHash === passwordHash);
    if (!found) return toast("ACCESO DENEGADO", "Usuario o contraseña incorrectos.", true);
    db.data.sessionUserId = found.id; db.save(); go("/lobby");
  }
}

function shell(content, active = "home") {
  const current = user();
  return `<div class="casino-shell"><header class="casino-header"><a class="wordmark" href="#/lobby">NOIR<span>CASINO</span></a><label class="search-box">${icon("search")}<input id="gameSearch" placeholder="Search the floor"></label><div class="live-status"><i></i> FLOOR LIVE</div><button class="audio-button" id="audioButton" aria-label="Audio controls">${icon("sound")}</button><button class="wallet-pill" id="walletButton"><span data-value="${current.balance}">${money(current.balance)}</span><small>VIRTUAL BALANCE</small></button><button class="notice-button" id="noticeButton"><i></i><b>${current.notifications.filter(n=>!n.read).length}</b></button><button class="profile-chip" data-go="/profile"><i>${escapeHtml(current.avatar)}</i><span>${escapeHtml(current.username)}<small>LVL ${current.level} · ${current.rank}</small></span></button></header><aside class="side-nav">${navItem("home","home","CASINO","/lobby",active)}${navItem("slots","grid","SLOTS","/lobby?cat=slots",active)}${navItem("table","cards","TABLE GAMES","/lobby?cat=table",active)}${navItem("favorite","star","FAVORITES","/lobby?cat=favorites",active)}${navItem("profile","profile","PLAYER CARD","/profile",active)}<div class="side-spacer"></div><button id="rewardsButton">${icon("star")} REWARDS</button><button id="adminLink">${icon("grid")} ADMIN</button><button id="logoutButton">${icon("exit")} EXIT</button></aside><main class="casino-main">${content}</main><nav class="mobile-nav">${navItem("home","home","HOME","/lobby",active)}${navItem("slots","search","SEARCH","/lobby",active)}${navItem("table","grid","GAMES","/lobby",active)}<button id="mobileRewards">${icon("star")}REWARDS</button>${navItem("profile","profile","PROFILE","/profile",active)}</nav></div>`;
}

const navItem = (id, iconName, label, path, active) => `<button data-go="${path}" class="${active===id?"active":""}">${icon(iconName)}${label}</button>`;

function renderLobby() {
  const current = user();
  const hero = [{eyebrow:"THE FLOOR IS OPEN",title:"NOIR 777",copy:"20 paylines. Wild energy. Progressive night.",tone:"mega"},{eyebrow:"MEMBERSHIP FORTUNE",title:"20 FREE SPINS",copy:"Your welcome ritual is waiting inside the machine.",tone:"welcome"},{eyebrow:"ROULETTE NIGHT",title:"2X XP",copy:"European precision under emerald lights.",tone:"roulette"}][heroIndex%3];
  const filtered = GAMES.filter((game) => lobbyCategory === "popular" || game.category === lobbyCategory || (lobbyCategory === "favorites" && current.favorites.includes(game.id)) || (lobbyCategory === "recent" && current.recent.includes(game.id)));
  app.innerHTML = shell(`<section class="lobby-page">
    <div class="casino-hero ${hero.tone}" data-parallax="5"><div class="hero-copy-lobby"><p class="overline">${hero.eyebrow}</p><h1>${hero.title}</h1><p>${hero.copy}</p><button class="light-button" data-game="${hero.tone==="roulette"?"roulette":"slot"}">PLAY THE FEATURE <b>→</b></button></div><div class="lobby-machine" aria-hidden="true"><div class="machine-crown"><i></i><b>777</b><i></i></div><div class="machine-reels"><span>7</span><span>W</span><span>7</span></div><div class="machine-lights"></div></div><div class="hero-dots">${[0,1,2].map(i=>`<button data-hero="${i}" class="${heroIndex===i?"active":""}"></button>`).join("")}</div></div>
    <section class="live-jackpots"><div class="jackpot-title"><i></i><span>LIVE JACKPOTS</span></div><article><span>MINI</span><strong>${money(db.data.jackpot.mini)}</strong></article><article><span>MAJOR</span><strong>${money(db.data.jackpot.major)}</strong></article><article class="mega"><span>MEGA</span><strong data-live-jackpot data-value="${experience.currentJackpot}">${money(experience.currentJackpot)}</strong></article><div class="ticker"><span>RECENT WIN · NIGHTOWL · ${money(1850000)}</span></div></section>
    <section class="featured-floor"><div class="section-heading"><div><p class="overline">FEATURED EXPERIENCE</p><h2>THE HEADLINER</h2></div><span>LIVE · HIGH VOLATILITY</span></div><article class="featured-game"><div class="featured-art"><div class="seven-monolith">7</div><div class="reel-rings"><i></i><i></i><i></i></div><div class="coin-rain">${Array.from({length:12},(_,i)=>`<i style="--i:${i}"></i>`).join("")}</div></div><div class="featured-copy"><span>NOIR ORIGINAL</span><h3>NOIR<br><i>777</i></h3><p>Entrá a una máquina física de cinco reels, símbolos premium y premios de hasta 500×.</p><div><b>RTP ${(theoreticalSlotRtp()*100).toFixed(2)}%</b><b>20 PAYLINES</b><b>FREE SPINS</b></div><button data-game="slot" class="play-cta"><span>ENTER MACHINE</span><b>→</b></button></div></article></section>
    <section class="collection-floor"><div class="section-heading"><div><p class="overline">POPULAR NOW</p><h2>CHOOSE YOUR TABLE</h2></div><div class="category-tabs">${[["popular","ALL"],["favorites","FAVORITES"],["recent","RECENT"],["slots","SLOTS"],["table","TABLES"]].map(([id,label])=>`<button data-category="${id}" class="${lobbyCategory===id?"active":""}">${label}</button>`).join("")}</div></div><div class="game-grid" id="gameGrid">${filtered.length?filtered.map(gameCard).join(""):`<div class="empty-state"><b>THE CABINET IS EMPTY</b><span>Play or mark favorites to build your private collection.</span></div>`}</div></section>
    <section class="balance-strip"><div><span>VIRTUAL BALANCE</span><strong>${money(current.balance)}</strong></div><div><span>MEMBER LEVEL</span><strong>${current.level} · ${current.rank}</strong></div><div><span>EXPERIENCE</span><strong>${current.xp.toLocaleString("es-PY")} XP</strong></div><div><span>FREE SPINS</span><strong>${current.freeSpins}</strong></div><button id="claimCredits">CLAIM TEST CREDITS</button></section>
    <section class="lobby-lower"><article><div class="rank-orbit"><b>${current.level}</b><i></i></div><div><p class="overline">YOUR ASCENT</p><h3>ROAD TO ${current.rank==="GUEST"?"PLAYER":"SILVER"}</h3><div class="progress"><i style="width:${Math.min(100,current.xp%250/2.5)}%"></i></div><span>${current.xp%250} / 250 XP</span></div></article><article><p class="overline">LAST TABLE</p><h3>${current.history[0]?`${current.history[0].game.toUpperCase()} · ${money(current.history[0].net)}`:"YOUR LEDGER BEGINS TONIGHT"}</h3><button data-go="/profile" class="text-button">OPEN PLAYER CARD →</button></article></section></section>`, "home");
  bindShell(); bindGameCards();
  experience.bindParallax(app);
  document.querySelectorAll("[data-category]").forEach(button=>button.onclick=()=>{lobbyCategory=button.dataset.category;renderLobby();});
  document.querySelectorAll("[data-hero]").forEach(button=>button.onclick=()=>{heroIndex=Number(button.dataset.hero);renderLobby();});
  document.querySelector("#claimCredits").onclick = claimCredits;
}

function gameCard(game) {
  const current = user(); const favorite = current?.favorites.includes(game.id);
  const art = game.id === "slot"
    ? `<div class="cover-machine"><i></i><div><b>7</b><b>W</b><b>7</b></div><span>JACKPOT</span></div>`
    : game.id === "roulette"
      ? `<div class="cover-wheel"><i></i><b>0</b><span></span></div>`
      : `<div class="cover-table"><i class="card-a"><b>A</b><span>♠</span></i><i class="card-k"><b>K</b><span>♦</span></i><em></em></div>`;
  return `<article class="game-card game-${game.id}" data-card="${game.id}" data-name="${game.name.toLowerCase()}" data-parallax="3"><div class="game-art ${game.color}"><div class="card-beam"></div>${art}<span class="card-index">${game.art}</span>${current?`<button class="favorite ${favorite?"active":""}" data-favorite="${game.id}" aria-label="Favorito">${favorite?"★":"☆"}</button>`:""}<button class="card-play" data-game="${game.id}"><span>PLAY</span> →</button></div><div class="game-info"><div><b>${game.name}</b><span>${game.description}</span></div><small>${game.tag}</small></div></article>`;
}

function bindGameCards() {
  document.querySelectorAll("[data-game]").forEach(button=>button.onclick=(event)=>{event.stopPropagation();go("/game/"+button.dataset.game);});
  document.querySelectorAll("[data-favorite]").forEach(button=>button.onclick=(event)=>{event.stopPropagation();const current=user(),id=button.dataset.favorite;current.favorites=current.favorites.includes(id)?current.favorites.filter(item=>item!==id):[...current.favorites,id];db.save();renderLobby();});
  document.querySelector("#gameSearch")?.addEventListener("input",event=>document.querySelectorAll("[data-card]").forEach(card=>card.hidden=!card.dataset.name.includes(event.target.value.toLowerCase())));
}

function renderGame(id) {
  if (!GAMES.some(game=>game.id===id)) return go("/lobby"); currentGame=id;
  const body = id === "slot" ? slotView() : id === "roulette" ? rouletteView() : blackjackView();
  app.innerHTML = shell(`<section class="game-page game-scene-${id}"><header class="game-page-head"><button class="back-casino" data-go="/lobby">← THE FLOOR</button><div><p class="overline">${GAMES.find(game=>game.id===id).tag}</p><h1>${GAMES.find(game=>game.id===id).name}</h1></div><span><i></i> VIRTUAL TABLE</span></header>${body}${debug?debugPanel():""}</section>`, id==="slot"?"slots":"table"); bindShell(); bindGame(id);
}

function betOptions(max = 250000) { return [1000,5000,10000,25000,50000,100000,250000].filter(v=>v<=max).map(v=>`<option value="${v}">${money(v)}</option>`).join(""); }

function slotView() {
  return `<div class="slot-chamber"><div class="slot-ambient-lights"><i></i><i></i></div><div class="slot-stage"><div class="slot-topper"><div><span>MINI</span><strong>${money(db.data.jackpot.mini)}</strong></div><div class="slot-marquee"><small>NOIR ORIGINAL</small><strong>NOIR <i>777</i></strong><span>FORTUNE IN THE DARK</span></div><div><span>MEGA</span><strong data-live-jackpot data-value="${experience.currentJackpot}">${money(experience.currentJackpot)}</strong></div></div><div class="slot-cabinet"><div class="cabinet-lights left"></div><div class="slot-glass"><div class="reel-header"><span>20 LINES</span><i>WILD PAYS BOTH WAYS</i><span>RTP ${Math.min(999,theoreticalSlotRtp()*100).toFixed(2)}%</span></div><div class="slot-window" id="slotGrid">${Array.from({length:15},(_,i)=>`<i class="slot-symbol ghost" style="--delay:${i*35}ms"><b>N</b><span>NOIR</span></i>`).join("")}</div><div class="win-line"></div><div class="game-message" id="gameMessage">PLACE YOUR FORTUNE</div></div><div class="cabinet-lights right"></div></div><div class="game-controls"><label><span>BET</span><select id="gameBet">${betOptions()}</select></label><div class="control-meter"><span>WIN</span><strong id="slotWin">${money(0)}</strong></div><div class="spin-housing"><i></i><button id="slotSpin" class="physical-spin"><span>SPIN</span><small>PRESS</small></button></div><div><span>FREE SPINS</span><strong id="freeSpinCount">${user().freeSpins}</strong></div></div><button class="paytable-link" id="paytableButton">OPEN PAYTABLE <b>+</b></button></div></div>`;
}

function rouletteView() {
  return `<div class="roulette-room"><div class="roulette-layout"><div class="roulette-wheel-wrap"><div class="wheel-halo"></div><div class="roulette-wheel" id="rouletteWheel"><div class="roulette-number-ring">${[0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23].map((number,index)=>`<i style="--i:${index}">${number}</i>`).join("")}</div><div class="roulette-ball"></div><div class="roulette-turret"><b id="rouletteResult">?</b></div></div><div class="roulette-history" id="rouletteHistory">THE WHEEL AWAITS</div></div><div class="roulette-table"><div class="table-rail"></div><p class="overline">EUROPEAN SINGLE ZERO</p><h2>PLACE YOUR CHIP</h2><div class="roulette-form"><label><span>BET TYPE</span><select id="rouletteType">${Object.entries(ROULETTE_TYPES).map(([id,c])=>`<option value="${id}">${c.label} · ${c.payout-1}:1</option>`).join("")}</select></label><label id="rouletteTargetLabel"><span>NUMBER</span><input id="rouletteTarget" value="7" placeholder="7 or 7,8"></label><label><span>CHIP VALUE</span><select id="gameBet">${betOptions(500000)}</select></label></div><div class="physical-chips">${[1000,5000,25000,100000].map((value,index)=>`<button data-chip="${value}" style="--chip:${index}"><i>${value/1000}K</i></button>`).join("")}</div><div class="potential"><span>POTENTIAL RETURN</span><strong id="roulettePotential">${money(36000)}</strong></div><button class="roulette-spin-control" id="rouletteSpin"><i></i><span>SPIN THE WHEEL</span></button><div class="quick-bets">${["red","black","even","odd","low","high"].map(type=>`<button data-quick="${type}">${ROULETTE_TYPES[type].label}</button>`).join("")}</div></div></div></div>`;
}

function blackjackView() {
  return `<div class="blackjack-room"><div class="dealer-silhouette"><i></i><span>NOIR DEALER</span></div><div class="deck-stack"><i></i><i></i><i></i></div><div class="blackjack-table"><div class="felt-lines"></div><div class="dealer-zone"><p>DEALER <span id="dealerScore"></span></p><div class="cards" id="dealerCards"><i class="card back-card">N</i><i class="card back-card">N</i></div></div><div class="table-mark"><b>NOIR</b><span>BLACKJACK</span><small>BLACKJACK PAYS 3 TO 2 · DEALER STANDS ON SOFT 17</small></div><div class="player-zone"><div class="cards" id="playerCards"><i class="card empty-card"><b>A</b><span>♠</span></i><i class="card empty-card"><b>K</b><span>♦</span></i></div><p>PLAYER <span id="playerScore"></span></p></div><div class="betting-spot"><i></i><span>PLACE BET</span></div><div class="blackjack-controls"><label><span>CHIP VALUE</span><select id="gameBet">${betOptions(500000)}</select></label><button class="deal-control" id="blackjackDeal">DEAL</button><button id="blackjackHit" disabled>HIT</button><button id="blackjackStand" disabled>STAND</button><button id="blackjackDouble" disabled>DOUBLE</button><button id="blackjackSplit" disabled>SPLIT</button><button id="blackjackInsurance" disabled>INSURANCE</button></div><div class="game-message" id="gameMessage">THE TABLE IS OPEN</div></div></div>`;
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
  experience.audio.play("spin");button.disabled=true;document.querySelector(".slot-stage").classList.add("machine-active");document.querySelector("#gameMessage").textContent=free?`FREE SPIN · ${current.freeSpins} REMAINING`:"REELS AT FULL VELOCITY";
  const grid=createSlotGrid(); const nodes=[...document.querySelectorAll(".slot-symbol")]; nodes.forEach((node,i)=>{node.className="slot-symbol spinning";node.style.setProperty("--delay",`${(i%5)*90}ms`);node.innerHTML=`<b>${SLOT_SYMBOLS[i%SLOT_SYMBOLS.length].label}</b><span>NOIR</span>`;});
  await wait(880); const symbols=Array.from({length:3},(_,row)=>grid.map(column=>column[row])).flat(); for(let column=0;column<5;column++){await wait(135); experience.audio.play("stop"); symbols.forEach((symbol,i)=>{if(i%5!==column)return;nodes[i].className="slot-symbol "+symbol.id.toLowerCase()+" reel-stop";nodes[i].innerHTML=`<b>${symbol.label}</b><span>${symbol.id}</span>`;});}
  const outcome=evaluateSlot(grid,amount); if(outcome.freeSpins){current.freeSpins+=outcome.freeSpins;current.notifications.unshift({id:crypto.randomUUID(),title:"FREE SPINS UNLOCKED",body:`${outcome.freeSpins} giros acreditados.`,read:false});}
  if(free) round.bet=0; engine.settleRound(current,round,outcome.payout,{scatters:outcome.scatters,freeSpinsAwarded:outcome.freeSpins});
  const multiplier=outcome.payout/Math.max(1,amount);document.querySelector("#gameMessage").textContent=outcome.payout?`${winTitle(multiplier)} · ${money(outcome.payout)}`:"NO WIN · THE MACHINE AWAITS";document.querySelector("#slotWin").textContent=money(outcome.payout);document.querySelector("#freeSpinCount").textContent=current.freeSpins;button.disabled=false;document.querySelector(".slot-stage").classList.remove("machine-active");refreshHeader();
  if(outcome.wins.length){outcome.wins[0].line.forEach((row,column)=>nodes[row*5+column]?.classList.add("winner"));experience.winCelebration(outcome.payout,multiplier);}
}

function bindRoulette() {
  const type=document.querySelector("#rouletteType"), target=document.querySelector("#rouletteTarget"), bet=document.querySelector("#gameBet");
  const update=()=>{const config=ROULETTE_TYPES[type.value];document.querySelector("#rouletteTargetLabel").hidden=!config.count;document.querySelector("#roulettePotential").textContent=money(Number(bet.value)*config.payout);};
  type.onchange=update;bet.onchange=update;document.querySelectorAll("[data-quick]").forEach(button=>button.onclick=()=>{type.value=button.dataset.quick;experience.audio.play("chip");update();});document.querySelectorAll("[data-chip]").forEach(button=>button.onclick=()=>{bet.value=button.dataset.chip;experience.audio.play("chip");update();});document.querySelector("#rouletteSpin").onclick=playRoulette;update();
}

async function playRoulette() {
  const type=document.querySelector("#rouletteType").value,target=document.querySelector("#rouletteTarget").value,amount=Number(document.querySelector("#gameBet").value),button=document.querySelector("#rouletteSpin");
  try { validateRouletteBet(type,target); var round=engine.beginRound(user(),"roulette",amount,{type,target}); } catch(error){return toast("APUESTA INVÁLIDA",error.message,true);}
  const number=spinRoulette(),wheel=document.querySelector("#rouletteWheel");experience.audio.play("spin");button.disabled=true;wheel.classList.add("spinning");document.querySelector("#rouletteResult").textContent="";await wait(2450);experience.audio.play("stop");wheel.classList.remove("spinning");document.querySelector("#rouletteResult").textContent=number;document.querySelector("#rouletteResult").className=rouletteColor(number);const payout=resolveRouletteBet(type,target,amount,number);engine.settleRound(user(),round,payout,{number,color:rouletteColor(number)});document.querySelector("#rouletteHistory").textContent=`LAST · ${number} ${rouletteColor(number).toUpperCase()} · ${payout?"WIN "+money(payout):"NO WIN"}`;button.disabled=false;refreshHeader();if(payout)experience.winCelebration(payout,payout/amount);
}

function bindBlackjack() {
  document.querySelector("#blackjackDeal").onclick=dealBlackjack;document.querySelector("#blackjackHit").onclick=()=>{blackjack.hit();updateBlackjack();};document.querySelector("#blackjackStand").onclick=()=>{blackjack.stand();updateBlackjack();};document.querySelector("#blackjackDouble").onclick=()=>{try{engine.addStake(user(),blackjackRound,blackjack.hand().bet);blackjack.double();updateBlackjack();}catch(e){toast("DOUBLE RECHAZADO",e.message,true);}};document.querySelector("#blackjackSplit").onclick=()=>{try{engine.addStake(user(),blackjackRound,blackjack.hand().bet);blackjackRound.metadata.split=true;blackjack.split();updateBlackjack();}catch(e){toast("SPLIT RECHAZADO",e.message,true);}};document.querySelector("#blackjackInsurance").onclick=()=>{const stake=blackjack.hand().bet/2;try{engine.addStake(user(),blackjackRound,stake);blackjack.insurance=stake;updateBlackjack();}catch(e){toast("INSURANCE RECHAZADO",e.message,true);}};
}

function dealBlackjack() {
  const amount=Number(document.querySelector("#gameBet").value);try{blackjackRound=engine.beginRound(user(),"blackjack",amount);blackjack=new BlackjackTable(amount);}catch(e){return toast("NO SE PUDO REPARTIR",e.message,true);}experience.audio.play("chip");document.querySelector("#blackjackDeal").disabled=true;setTimeout(()=>experience.audio.play("card"),80);setTimeout(()=>experience.audio.play("card"),220);setTimeout(()=>experience.audio.play("card"),360);updateBlackjack();const player=scoreHand(blackjack.hand().cards),dealer=scoreHand(blackjack.dealer);if(player.blackjack||dealer.blackjack){blackjack.playDealer();updateBlackjack();}
}

function updateBlackjack() {
  const hand=blackjack?.hand(); if(!hand)return; const playerScore=scoreHand(hand.cards);
  document.querySelector("#playerCards").innerHTML=blackjack.hands.map((item,index)=>`<div class="hand ${index===blackjack.active?"active":""}">${item.cards.map(cardHtml).join("")}<small>HAND ${index+1} · ${scoreHand(item.cards).total}</small></div>`).join("");
  document.querySelector("#dealerCards").innerHTML=blackjack.dealer.map((card,index)=>!blackjack.complete&&index===1?`<i class="card back-card">N</i>`:cardHtml(card)).join("");document.querySelector("#playerScore").textContent=playerScore.total;document.querySelector("#dealerScore").textContent=blackjack.complete?scoreHand(blackjack.dealer).total:"";
  ["Hit","Stand"].forEach(id=>document.querySelector("#blackjack"+id).disabled=blackjack.complete);document.querySelector("#blackjackDouble").disabled=blackjack.complete||!blackjack.canDouble()||user().balance<hand.bet;document.querySelector("#blackjackSplit").disabled=blackjack.complete||!blackjack.canSplit()||user().balance<hand.bet;document.querySelector("#blackjackInsurance").disabled=blackjack.complete||!blackjack.canInsure()||user().balance<hand.bet/2;
  if(blackjack.complete){const settlement=blackjack.settle();engine.settleRound(user(),blackjackRound,settlement.payout,{results:settlement.results,dealerScore:settlement.dealerScore});document.querySelector("#gameMessage").textContent=settlement.results.map((r,i)=>`HAND ${i+1}: ${r.outcome}`).join(" · ");document.querySelector("#blackjackDeal").disabled=false;["Hit","Stand","Double","Split","Insurance"].forEach(id=>document.querySelector("#blackjack"+id).disabled=true);refreshHeader();if(settlement.payout>blackjackRound.bet)experience.winCelebration(settlement.payout,settlement.payout/blackjackRound.bet);}
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
function showRewards(){const current=user(),rewards=[25000,50000,5,100000,10,250000,500000],last=current.dailyReward?.lastClaimAt?Date.parse(current.dailyReward.lastClaimAt):0,available=Date.now()-last>=20*60*60*1000,day=(current.dailyReward?.streak||0)%7;modalRoot.innerHTML=`<div class="modal-backdrop vault-backdrop"><section class="reward-vault"><button class="modal-close">×</button><div class="vault-wheel"><i></i><b>N</b><span></span></div><p class="overline">THE DAILY VAULT</p><h2>SEVEN NIGHTS OF FORTUNE</h2><div class="reward-days">${rewards.map((value,index)=>`<article class="${index<day?"claimed":index===day?"current":""}"><span>NIGHT ${index+1}</span><div class="reward-chest"><i></i><b>${index===2||index===4?value+" FS":money(value)}</b></div></article>`).join("")}</div><button id="claimDaily" class="play-cta" ${available?"":"disabled"}><span>${available?"OPEN TONIGHT'S VAULT":"VAULT RECHARGING"}</span><b>→</b></button><small>${available?"A virtual reward is ready.":"Return after the next casino night."}</small></section></div>`;modalRoot.querySelector(".modal-close").onclick=closeModal;modalRoot.querySelector("#claimDaily").onclick=()=>{if(!available)return;const reward=rewards[day];if(day===2||day===4)current.freeSpins+=reward;else current.balance+=reward;current.dailyReward={lastClaimAt:new Date().toISOString(),streak:day+1};current.notifications.unshift({id:crypto.randomUUID(),title:"DAILY VAULT OPENED",body:day===2||day===4?`${reward} free spins credited.`:`${money(reward)} credited.`,read:false});db.save();experience.audio.play("bigWin");closeModal();refreshHeader();experience.winCelebration(day===2||day===4?reward*10000:reward,25);};}
function closeModal(){modalRoot.innerHTML="";}

function claimCredits(){const current=user(),now=Date.now(),cooldown=12*60*60*1000,last=current.lastTestCreditAt?Date.parse(current.lastTestCreditAt):0;if(now-last<cooldown)return toast("CRÉDITOS NO DISPONIBLES",`Volvé en ${Math.ceil((cooldown-(now-last))/3600000)} hora(s).`,true);current.balance+=250000;current.lastTestCreditAt=new Date().toISOString();current.notifications.unshift({id:crypto.randomUUID(),title:"TEST CREDITS",body:`${money(250000)} acreditados.`,read:false});db.save();closeModal();refreshHeader();toast("CRÉDITOS ACREDITADOS",money(250000)+" virtuales.");}

function bindCommon(){document.querySelectorAll("[data-go]").forEach(button=>button.onclick=()=>go(button.dataset.go.split("?")[0]));document.querySelectorAll("[data-auth]").forEach(button=>button.onclick=()=>{authMode=button.dataset.auth;go("/auth");});}
function bindShell(){bindCommon();document.querySelector("#walletButton").onclick=showWallet;document.querySelector("#noticeButton").onclick=showNotifications;document.querySelector("#audioButton").onclick=()=>experience.openAudioPanel(modalRoot);document.querySelector("#rewardsButton").onclick=showRewards;document.querySelector("#mobileRewards")?.addEventListener("click",showRewards);document.querySelector("#logoutButton").onclick=()=>{db.data.sessionUserId=null;db.save();go("/");};document.querySelector("#adminLink").onclick=()=>go("/admin");}
function refreshHeader(){const pill=document.querySelector("#walletButton span");if(pill)experience.animateNumber(pill,user().balance,"₲ ");}
function toast(title,body,error=false){experience.audio.play(error?"error":"click");const node=document.createElement("article");node.className="toast "+(error?"error":"");node.innerHTML=`<i></i><b>${escapeHtml(title)}</b><span>${escapeHtml(body)}</span>`;document.querySelector("#toastRoot").appendChild(node);setTimeout(()=>node.remove(),4200);}
function debugPanel(){return `<details class="debug-panel"><summary>DEBUG MODE</summary><pre>secure RNG: crypto.getRandomValues\nslot theoretical RTP: ${(theoreticalSlotRtp()*100).toFixed(4)}%\nroulette probability: 1 / 37\nroulette theoretical RTP: ${(EUROPEAN_ROULETTE_RTP*100).toFixed(4)}%\ncurrent game: ${currentGame}\nuser id: ${user().id}</pre></details>`;}

window.addEventListener("hashchange",route);route();
