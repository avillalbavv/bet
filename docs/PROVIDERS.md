# Proveedores evaluados

## 0xPlaySlots

Estado: `credentials_required`.

La web oficial anuncia catálogo REST, SDK, iframe y una URL de embed unificada para demos. La prueba gratuita dura 7 días; el plan publicado comienza en USD 200/mes. Los términos exigen cuenta y API key, y restringen el uso a demos, sin dinero real.

NOIR incluye:

- adaptador de catálogo en `src/games/providers/external-demo/zero-x-play-slots.js`;
- iframe aislado y responsive;
- caché del catálogo por 15 minutos;
- Edge Function proxy en `supabase/functions/catalog-0xplayslots`;
- integración desactivada mientras no exista acceso autorizado.

Variables backend requeridas para el proxy:

```env
ZERO_XPLAYSLOTS_GAMES_URL=
ZERO_XPLAYSLOTS_API_KEY=
ZERO_XPLAYSLOTS_AUTH_HEADER=
NOIR_ALLOWED_ORIGIN=https://bet-aop.pages.dev
```

El nombre/formato de autenticación debe copiarse de la documentación entregada por 0xPlaySlots; el proyecto no lo adivina.

Fuentes: https://0xplayslots.com/ · https://0xplayslots.com/pricing · https://0xplayslots.com/terms

## Casino-by-AI

Estado: evaluado, licencia MIT verificada. Incluye Slots, Blackjack, Ruleta Europea y Plinko. NOIR conserva sus propios motores y dirección visual; no copia el diseño retro. Plinko Prisma es una implementación propia. La licencia permanece documentada para una adaptación futura legalmente atribuida.

Fuente y licencia: https://github.com/Lemelson/casino-by-ai

## BunnyBet

Estado: bloqueado para reutilización.

El repositorio público contiene Baccarat, Craps, Keno, Poker y otros juegos, pero no publica un archivo de licencia. Sin una licencia expresa, NOIR no copia, adapta ni redistribuye ese código.

Fuente evaluada: https://github.com/oanapopescu93/casino

## Proveedores comerciales

Pragmatic Play, Evolution, NetEnt, Play'n GO, PG Soft, Nolimit City y Red Tiger no están integrados ni imitados. Una integración futura debe realizarse mediante contrato oficial, agregador autorizado y backend seguro; nunca mediante clones, scraping, assets copiados o endpoints no oficiales.

