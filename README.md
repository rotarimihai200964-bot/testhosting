# ogcraft host

Hosting de boți Discord pe web: Create bot → token → cont → Start / Stop / Restart.

**Local:** instalează Node.js 18+ (nodejs.org), apoi în acest folder rulează `npm install` și `npm start`; deschide http://localhost:3000. Pe Linux/Mac merge și `./start.sh`.
**Server/VPS:** `docker build -t ogcraft-host . && docker run -d -p 3000:3000 -v $PWD/data:/app/data ogcraft-host`.
Pune-l în spatele unui proxy HTTPS (Caddy/nginx) și setează `PROXY=1`.

Opțional (variabile de mediu): `PORT`, `MC_IP` (implicit ogcraft.mc-gravel.com), `ANTHROPIC_API_KEY` pentru /ai, `AI_MODEL`.
Fundalul: pune `BackGround.png` în `public/`. Datele și tokenurile criptate stau în `data/` (nu le urca în git).

Botul are: /ip, /ai și anti-spam (5 mesaje în 6 secunde sau 5+ mențiuni → mesaje șterse și timeout 60s).
