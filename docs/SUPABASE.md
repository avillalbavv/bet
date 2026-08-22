# Backend social seguro con Supabase

La aplicación sigue funcionando localmente como demo sin dinero real. Para impedir que DevTools altere el saldo compartido entre dispositivos, hay que desplegar la migración y conectar autenticación Supabase.

## Aplicación

1. Crear un proyecto Supabase.
2. Ejecutar `supabase/migrations/202608220001_noir_social_casino.sql`.
3. Configurar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en Cloudflare Pages.
4. Mantener `service_role` exclusivamente en Supabase Edge Functions.
5. Asignar `app_metadata.role = noir_admin` sólo a administradores reales.

## Garantías de la migración

- `balance >= 0` mediante restricción SQL.
- apuestas positivas y dentro de límites.
- bloqueo de fila durante el débito.
- `request_key` único e idempotente.
- RLS por usuario para sesiones, historial, transacciones y favoritos.
- el frontend puede apostar, pero no puede ejecutar `noir_settle_round`.
- la liquidación y el payout quedan reservados a `service_role`.
- todas las tablas y juegos están marcados como demo/social.

## Regla crítica

Un juego sólo debe acreditar premios en producción cuando su resultado se calcule dentro de una Edge Function y esa función invoque `noir_settle_round`. El motor local se conserva para la experiencia demo offline, pero no debe considerarse una autoridad de saldo compartido.

