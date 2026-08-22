/**
 * @typedef {"INTERNAL"|"IFRAME"|"EXTERNAL"|"OPEN_SOURCE"} IntegrationType
 *
 * @typedef {Object} Game
 * @property {string} id
 * @property {string} name
 * @property {string} slug
 * @property {string} provider
 * @property {string} category
 * @property {string} thumbnail
 * @property {string} gameUrl
 * @property {IntegrationType} integrationType
 * @property {boolean} isDemo
 * @property {boolean} isActive
 * @property {boolean} featured
 */

/**
 * Contrato común de proveedores. Las implementaciones nunca deben introducir
 * claves reales en el bundle ni inventar URLs de lanzamiento.
 *
 * @interface
 */
export class GameProvider {
  async getGames() { throw new Error("getGames() no implementado"); }
  async launchGame() { throw new Error("launchGame() no implementado"); }
}

export const INTEGRATION_TYPES = Object.freeze({
  INTERNAL: "INTERNAL",
  IFRAME: "IFRAME",
  EXTERNAL: "EXTERNAL",
  OPEN_SOURCE: "OPEN_SOURCE",
});

export function normalizeGame(game) {
  if (!game?.id || !game?.name || !game?.slug || !game?.provider) {
    throw new TypeError("El proveedor devolvió un juego incompleto.");
  }
  return Object.freeze({
    category: "casino",
    thumbnail: "",
    gameUrl: "",
    integrationType: INTEGRATION_TYPES.EXTERNAL,
    isDemo: true,
    isActive: true,
    featured: false,
    badge: "DEMO",
    tag: "JUEGO VIRTUAL",
    art: "N",
    color: "gold",
    description: "Experiencia social con saldo ficticio.",
    ...game,
  });
}

