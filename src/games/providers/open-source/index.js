import { GameProvider, INTEGRATION_TYPES } from "../game-provider.js";

/**
 * Registro legal de fuentes evaluadas. NOIR no descarga ni copia sus interfaces.
 * Casino-by-AI (MIT) se conserva como referencia verificable para futuras
 * adaptaciones; BunnyBet queda bloqueado por no publicar licencia.
 */
export class OpenSourceProvider extends GameProvider {
  id = "open-source";
  name = "Código abierto verificado";
  integrationType = INTEGRATION_TYPES.OPEN_SOURCE;
  sources = Object.freeze([
    { name:"Casino-by-AI", url:"https://github.com/Lemelson/casino-by-ai", license:"MIT", usable:true },
    { name:"BunnyBet", url:"https://github.com/oanapopescu93/casino", license:"SIN LICENCIA PUBLICADA", usable:false },
  ]);

  async getGames() { return []; }
  async launchGame() { throw new Error("No hay juegos open source externos activos."); }
}

