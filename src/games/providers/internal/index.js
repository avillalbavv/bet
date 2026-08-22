import { GameProvider, INTEGRATION_TYPES, normalizeGame } from "../game-provider.js";

export const INTERNAL_GAMES = Object.freeze([
  { id:"slot", slug:"slot", name:"NOIR 777", category:"slots", tag:"VOLATILIDAD ALTA", badge:"EXCLUSIVO", art:"7", color:"red", description:"20 líneas · Comodín · Dispersión", featured:true },
  { id:"roulette", slug:"roulette", name:"Ruleta Imperial", category:"roulette", tag:"RTP 97,30 %", badge:"POPULAR", art:"0", color:"green", description:"Europea o americana · Bola real", featured:true },
  { id:"blackjack", slug:"blackjack", name:"Blackjack Élite", category:"blackjack", tag:"6 MAZOS · PLANTA EN 17", badge:"MESA", art:"A♠", color:"blue", description:"Blackjack paga 3:2", featured:true },
  { id:"plinko", slug:"plinko", name:"Plinko Prisma", category:"originals", tag:"RTP OBJETIVO 97 %", badge:"NUEVO", art:"●", color:"violet", description:"8–12 filas · Física · Multiplicadores", featured:true },
  { id:"dice", slug:"dice", name:"Dados Eléctricos", category:"originals", tag:"RTP 95,83 %", badge:"RÁPIDO", art:"••", color:"cyan", description:"Dos dados · Física 3D" },
  { id:"baccarat", slug:"baccarat", name:"Baccarat Privé", category:"table", tag:"REGLAS CLÁSICAS", badge:"PRIVÉ", art:"B", color:"wine", description:"Jugador · Banca · Empate" },
  { id:"mines", slug:"mines", name:"Minas NOIR", category:"originals", tag:"RIESGO CRECIENTE", badge:"NUEVO", art:"◆", color:"violet", description:"25 casillas · Minas configurables" },
  { id:"crash", slug:"crash", name:"Crash Volt", category:"crash", tag:"MULTIPLICADOR EN VIVO", badge:"EN VIVO", art:"×", color:"orange", description:"Retirá antes del impacto", featured:true },
]);

export class InternalProvider extends GameProvider {
  id = "noir-originals";
  name = "NOIR Originals";
  integrationType = INTEGRATION_TYPES.INTERNAL;

  async getGames() {
    return INTERNAL_GAMES.map((game) => normalizeGame({
      provider: this.id,
      thumbnail: "",
      gameUrl: `/game/${game.slug}`,
      integrationType: this.integrationType,
      isDemo: true,
      isActive: true,
      ...game,
    }));
  }

  async launchGame(gameId, userId) {
    const game = INTERNAL_GAMES.find((item) => item.id === gameId);
    if (!game) throw new Error("Juego NOIR no encontrado.");
    return { id: crypto.randomUUID(), gameId, userId, launchUrl: `#/game/${game.slug}`, createdAt: new Date().toISOString() };
  }
}
