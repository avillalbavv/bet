const STORAGE_KEY = "noir-casino-platform-v2";
const VERSION = 4;

const DEFAULT_SETTINGS = Object.freeze({
  music: true,
  sfx: true,
  ambience: true,
  muted: false,
  masterVolume: 0.55,
  musicVolume: 0.48,
  sfxVolume: 0.72,
  ambienceVolume: 0.28,
  motion: "full",
  quality: "auto",
  introSeen: false,
});

export const DEFAULT_GAME_CONFIG = Object.freeze({
  slot: { enabled: true, minBet: 1000, maxBet: 250000, name: "NOIR 777" },
  roulette: { enabled: true, minBet: 1000, maxBet: 500000, name: "Ruleta Imperial", variant: "european" },
  blackjack: { enabled: true, minBet: 1000, maxBet: 500000, name: "Blackjack Elite" },
  dice: { enabled: true, minBet: 1000, maxBet: 250000, name: "Dados Eléctricos" },
  baccarat: { enabled: true, minBet: 1000, maxBet: 500000, name: "Baccarat Privé" },
  mines: { enabled: true, minBet: 1000, maxBet: 250000, name: "Minas NOIR" },
  crash: { enabled: true, minBet: 1000, maxBet: 250000, name: "Crash Volt" },
});

export function createDatabase() {
  return {
    version: VERSION,
    sessionUserId: null,
    adminSession: false,
    users: [],
    games: structuredClone(DEFAULT_GAME_CONFIG),
    audit: [],
    jackpot: { mini: 5_000_000, major: 50_000_000, mega: 500_000_000 },
    settings: structuredClone(DEFAULT_SETTINGS),
  };
}

export function createUser({ username, email, passwordHash, avatar = "N" }) {
  return {
    id: globalThis.crypto.randomUUID(),
    username,
    email: email.toLowerCase(),
    passwordHash,
    avatar: avatar.slice(0, 2).toUpperCase() || "N",
    balance: 500_000,
    bonusBalance: 500_000,
    freeSpins: 20,
    xp: 0,
    level: 1,
    rank: "GUEST",
    favorites: ["slot"],
    recent: [],
    createdAt: new Date().toISOString(),
    lastTestCreditAt: null,
    dailyReward: { lastClaimAt: null, streak: 0 },
    stats: { totalWagered: 0, totalWon: 0, biggestWin: 0, gamesPlayed: 0, jackpotsWon: 0, byGame: {} },
    history: [],
    notifications: [{ id: "welcome", title: "BIENVENIDO A NOIR", body: "₲ 500.000 virtuales y 20 giros gratis acreditados.", read: false }],
  };
}

export class LocalDatabase {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    this.data = this.load();
  }

  load() {
    try {
      const parsed = JSON.parse(this.storage.getItem(STORAGE_KEY));
      if (!parsed) return createDatabase();
      const fresh = createDatabase();
      const games = Object.fromEntries(Object.entries(fresh.games).map(([id, config]) => [id, { ...config, ...(parsed.games?.[id] || {}) }]));
      const notificationTranslations = {
        "WELCOME TO NOIR": "BIENVENIDO A NOIR",
        "FREE SPINS UNLOCKED": "GIROS GRATIS DESBLOQUEADOS",
        "DAILY VAULT OPENED": "BÓVEDA DIARIA ABIERTA",
        "TEST CREDITS": "CRÉDITOS DE PRUEBA",
      };
      return {
        ...fresh,
        ...parsed,
        version: VERSION,
        jackpot: { ...fresh.jackpot, ...(parsed.jackpot || {}) },
        settings: { ...fresh.settings, ...(parsed.settings || {}) },
        games,
        users: (parsed.users || []).map((user) => ({
          ...user,
          dailyReward: user.dailyReward || { lastClaimAt: null, streak: 0 },
          notifications: (user.notifications || []).map((notification) => ({
            ...notification,
            title: notificationTranslations[notification.title] || notification.title,
          })),
        })),
      };
    } catch {
      return createDatabase();
    }
  }

  save() {
    this.storage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    return this.data;
  }

  currentUser() {
    return this.data.users.find((user) => user.id === this.data.sessionUserId) || null;
  }

  addAudit(action, previousValue = null, newValue = null, target = "system") {
    this.data.audit.unshift({ id: globalThis.crypto.randomUUID(), date: new Date().toISOString(), admin: "LOCAL_ADMIN", action, target, previousValue, newValue });
    this.data.audit = this.data.audit.slice(0, 250);
  }
}

export async function hashPassword(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
