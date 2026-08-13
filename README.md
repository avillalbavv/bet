# NOIR Private Casino

An atmospheric fictional casino experience built with plain HTML, CSS and JavaScript.

## Current experience

- Cinematic entrance with animated doors
- 2.5D lobby with parallax, ambient lighting and particles
- Camera transition into the NOIR 777 cabinet
- Five reels and three rows
- Bets of 10, 25, 50, 100 and 250 fictional credits
- Win detection, symbol animation and Web Audio feedback
- Balance and preferences persisted with `localStorage`
- Responsive desktop-first layout

## Run locally

Open `index.html` in a modern browser. No dependency installation or build step is required.

## Cloudflare Pages

The project remains fully static and dependency-free. The included build command only copies the three production files into `dist/` so it works with Cloudflare's standard Git deployment settings:

- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: repository root

This prototype uses fictional credits only. It does not include payments, cryptocurrency, real-money wagering, accounts or a backend.
