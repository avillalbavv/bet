const env = globalThis.__NOIR_ENV__ || {};

const clean = (value) => typeof value === "string" ? value.trim() : "";

export const runtimeConfig = Object.freeze({
  supabaseUrl: clean(env.VITE_SUPABASE_URL),
  supabaseAnonKey: clean(env.VITE_SUPABASE_ANON_KEY),
  zeroXPlaySlotsProxyUrl: clean(env.VITE_0XPLAYSLOTS_PROXY_URL),
  zeroXPlaySlotsApiUrl: clean(env.VITE_0XPLAYSLOTS_API_URL) || "https://api.0xplayslots.com/v1",
  zeroXPlaySlotsApiKey: clean(env.VITE_0XPLAYSLOTS_API_KEY),
});

export const hasSupabase = () => Boolean(runtimeConfig.supabaseUrl && runtimeConfig.supabaseAnonKey);

