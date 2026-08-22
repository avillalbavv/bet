/**
 * Acceso opcional a Supabase sin exponer service_role. Las apuestas se debitan
 * mediante RPC autenticada; la liquidación sólo puede realizarla una Edge
 * Function con service_role. En ausencia de configuración NOIR conserva su
 * motor local, explícitamente limitado a demostración social.
 */
export class SupabaseGateway {
  constructor({ url, anonKey, accessToken = () => "" }) {
    this.url = url?.replace(/\/$/, "");
    this.anonKey = anonKey;
    this.accessToken = accessToken;
  }

  get configured() { return Boolean(this.url && this.anonKey); }

  headers(extra = {}) {
    const token = this.accessToken() || this.anonKey;
    return { apikey:this.anonKey, Authorization:`Bearer ${token}`, "Content-Type":"application/json", ...extra };
  }

  async request(path, options = {}) {
    if (!this.configured) throw new Error("Supabase no está configurado.");
    const response = await fetch(`${this.url}${path}`, { ...options, headers:this.headers(options.headers) });
    const payload = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.message || payload?.error_description || `Supabase respondió ${response.status}.`);
    return payload;
  }

  async getBalance() {
    const result = await this.request("/rest/v1/rpc/noir_get_balance", { method:"POST", body:"{}" });
    return Number(result);
  }

  async placeBet(gameId, amount, requestKey = crypto.randomUUID()) {
    return this.request("/rest/v1/rpc/noir_place_bet", { method:"POST", body:JSON.stringify({ p_game_id:gameId, p_amount:amount, p_request_key:requestKey }) });
  }

  async debitBet(gameId, amount, requestKey) { return this.placeBet(gameId, amount, requestKey); }

  async creditWin() {
    throw new Error("Los premios sólo pueden acreditarse desde la Edge Function segura.");
  }

  async recordGame() {
    throw new Error("El historial se crea automáticamente al liquidar la ronda en backend.");
  }

  async recordTransaction() {
    throw new Error("Las transacciones son inmutables y sólo se crean mediante RPC segura.");
  }

  async history(limit = 50) {
    return this.request(`/rest/v1/game_history?select=*&order=created_at.desc&limit=${Math.min(100,Math.max(1,limit))}`);
  }

  async favorites() {
    return this.request("/rest/v1/favorites?select=game_id,created_at&order=created_at.desc");
  }

  async setFavorite(gameId, active) {
    const query = `/rest/v1/favorites?game_id=eq.${encodeURIComponent(gameId)}`;
    if (!active) return this.request(query, { method:"DELETE", headers:{ Prefer:"return=minimal" } });
    return this.request("/rest/v1/favorites", { method:"POST", headers:{ Prefer:"return=minimal" }, body:JSON.stringify({ game_id:gameId }) });
  }
}

