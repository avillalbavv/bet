# NOIR Casino

Casino virtual ficticio construido con HTML, CSS, Canvas y módulos JavaScript nativos. No usa frameworks ni dependencias en producción.

## Experiencia actual

- Interfaz íntegramente en español con atmósferas cromáticas propias por juego.
- Lobby cinematográfico, partículas adaptativas, parallax y transiciones de cámara.
- Ruleta europea o americana con rueda y bola independientes en Canvas, resultado fijado antes de animar y pagos estándar.
- NOIR 777 de cinco rodillos, veinte líneas, movimiento por columnas, anticipación, comodín y dispersión.
- Blackjack de seis mazos con cartas y fichas animadas.
- Dados, baccarat, minas y crash con mecánicas y presentación propias.
- Audio procedural con canales general, música, efectos y ambiente; se activa después de la primera interacción.
- Persistencia local de saldo virtual, historial, preferencias y estadísticas.
- Calidad visual automática o manual: baja, media, alta y ultra.

## Matemática de la ruleta

- Europea: 37 resultados uniformes (`0–36`), RTP teórico `36/37 = 97,2973 %` y ventaja `2,7027 %`.
- Americana: 38 resultados uniformes (`0`, `00`, `1–36`), RTP teórico `36/38 = 94,7368 %` y ventaja `5,2632 %`.
- Pagos anunciados: pleno 35:1, caballo 17:1, calle 11:1, cuadro 8:1, seisena 5:1, docena/columna 2:1 y apuestas simples 1:1.
- El retorno interno incluye una sola vez la apuesta original cuando hay premio.
- El panel administrativo permite simular 10.000, 100.000 o 1.000.000 de rondas y comparar frecuencias, RTP y ventaja.

## Desarrollo

```bash
npm test
npm run build
```

La compilación copia la aplicación estática a `dist/`.

## Cloudflare Pages

- Comando de compilación: `npm run build`
- Directorio de salida: `dist`
- Directorio raíz: raíz del repositorio

El proyecto utiliza únicamente créditos ficticios. No acepta pagos, depósitos, retiros, criptomonedas ni apuestas con dinero real.
