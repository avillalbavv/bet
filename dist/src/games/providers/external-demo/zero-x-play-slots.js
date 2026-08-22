import { GameProvider, INTEGRATION_TYPES, normalizeGame } from "../game-provider.js";

const CACHE_KEY = "noir-0xplayslots-catalog-v1";
const CACHE_TTL = 15 * 60 * 1000;

export class ZeroXPlaySlotsProvider extends GameProvider {
  id = "0xplayslots";
  name = "0xPlaySlots";
  integrationType = INTEGRATION_TYPES.IFRAME;

  constructor(config, storage = globalThis.localStorage) {
    super();
    this.config = config;
    this.storage = storage;
  }

  get configured() {
    return Boolean(this.config.zeroXPlaySlotsProxyUrl || (this.config.zeroXPlaySlotsApiUrl && this.config.zeroXPlaySlotsApiKey));
  }

  endpoint(path = "games") {
    if (this.config.zeroXPlaySlotsProxyUrl) return `${this.config.zeroXPlaySlotsProxyUrl.replace(/\/$/, "")}/${path}`;
    return `${this.config.zeroXPlaySlotsApiUrl.replace(/\/$/, "")}/${path}`;
  }

  headers() {
    return this.config.zeroXPlaySlotsProxyUrl || !this.config.zeroXPlaySlotsApiKey
      ? { Accept:"application/json" }
      : { Accept:"application/json", Authorization:`Bearer ${this.config.zeroXPlaySlotsApiKey}` };
  }

  readCache() {
    try {
      const cached = JSON.parse(this.storage?.getItem(CACHE_KEY));
      return cached && Date.now() - cached.savedAt < CACHE_TTL ? cached.games : null;
    } catch { return null; }
  }

  async getGames({ force = false } = {}) {
    if (!this.configured) return [];
    if (!force) {
      const cached = this.readCache();
      if (cached) return cached;
    }
    const response = await fetch(this.endpoint("games"), { headers:this.headers(), signal:AbortSignal.timeout(3500) });
    if (!response.ok) throw new Error(`0xPlaySlots respondió ${response.status}.`);
    const payload = await response.json();
    const entries = Array.isArray(payload) ? payload : payload.games;
    if (!Array.isArray(entries)) throw new Error("Formato de catálogo 0xPlaySlots no reconocido.");
    const games = entries.slice(0, 120).map((entry) => normalizeGame({
      id:`0x-${entry.id}`,
      slug:`0x-${entry.id}`,
      name:entry.name,
      provider:this.id,
      category:"slots",
      thumbnail:entry.thumbnails?.webp || entry.thumbnails?.small || entry.thumbnail || "",
      gameUrl:entry.embed_url || "",
      integrationType:this.integrationType,
      isDemo:true,
      isActive:Boolean(entry.embed_url),
      featured:false,
      badge:"DEMO EXTERNA",
      tag:entry.volatility ? `VOLATILIDAD ${String(entry.volatility).toUpperCase()}` : "DEMO AUTORIZADA",
      art:"0X",
      color:"magenta",
      description:`${entry.provider || "0xPlaySlots"}${entry.rtp ? ` · RTP ${entry.rtp}%` : ""}`,
    }));
    this.storage?.setItem(CACHE_KEY, JSON.stringify({ savedAt:Date.now(), games }));
    return games;
  }

  async launchGame(gameId, userId) {
    const games = await this.getGames();
    const game = games.find((item) => item.id === gameId);
    if (!game?.gameUrl) throw new Error("0xPlaySlots no devolvió una URL de lanzamiento válida.");
    return { id:crypto.randomUUID(), gameId, userId, launchUrl:game.gameUrl, createdAt:new Date().toISOString() };
  }
}
