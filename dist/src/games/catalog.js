import { InternalProvider } from "./providers/internal/index.js";
import { OpenSourceProvider } from "./providers/open-source/index.js";
import { ZeroXPlaySlotsProvider } from "./providers/external-demo/zero-x-play-slots.js";

export class ProviderRegistry {
  constructor(providers) { this.providers = new Map(providers.map((provider) => [provider.id, provider])); }
  list() { return [...this.providers.values()]; }
  get(id) { return this.providers.get(id); }

  async getGames() {
    const results = await Promise.allSettled(this.list().map((provider) => provider.getGames()));
    return results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  }

  async launchGame(game, userId) {
    const provider = this.get(game.provider);
    if (!provider) throw new Error("Proveedor no registrado.");
    return provider.launchGame(game.id, userId);
  }
}

export function createProviderRegistry(config) {
  return new ProviderRegistry([
    new InternalProvider(),
    new OpenSourceProvider(),
    new ZeroXPlaySlotsProvider(config),
  ]);
}

