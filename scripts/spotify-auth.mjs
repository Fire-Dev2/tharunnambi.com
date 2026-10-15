// One-time helper: logs you into Spotify and prints your refresh token.
// Run from the site folder:  node scripts/spotify-auth.mjs
import http from 'node:http';
import { exec } from 'node:child_process';
import readline from 'node:readline/promises';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const id = (await rl.question('Spotify Client ID: ')).trim();
const secret = (await rl.question('Spotify Client Secret: ')).trim();
rl.close();

const redirect = 'http://127.0.0.1:8888/callback';
const authUrl = 'https://accounts.spotify.com/authorize?' + new URLSearchParams({
  client_id: id, response_type: 'code', redirect_uri: redirect, scope: 'user-top-read',
});

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, redirect);
  if (u.pathname !== '/callback') { res.end(); return; }
  const code = u.searchParams.get('code');
  if (!code) { res.end('Spotify said: ' + (u.searchParams.get('error') || 'no code')); return; }
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(id + ':' + secret).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirect }),
  });
  const j = await r.json();
  if (!j.refresh_token) {
    res.end('Something went wrong. Check Terminal.');
    console.log('\nError from Spotify:', j);
  } else {
    res.end('Done! You can close this tab and go back to Terminal.');
    console.log('\nYour refresh token (copy this whole line):\n\n' + j.refresh_token + '\n');
  }
  setTimeout(() => { server.close(); process.exit(0); }, 300);
});

server.listen(8888, '127.0.0.1', () => {
  console.log('\nOpening Spotify login in your browser...');
  exec(`open "${authUrl}"`);
});
