// Returns Tharun's hand-picked songs with real Spotify covers and links.
// Each pick is looked up with Spotify search; `must` keeps the right recording.
const PICKS = [
  { name: 'Why This Kolaveri Di', artists: 'Anirudh Ravichander, Dhanush', q: 'track:"Why This Kolaveri Di" artist:Anirudh', must: 'anirudh' },
  { name: "Devil's Trill Sonata", artists: 'Tartini · David Oistrakh, Lev Oborin', q: "Tartini Devil's Trill Oistrakh Oborin", must: 'oistrakh' },
  { name: 'Daydreaming', artists: 'Radiohead', q: 'track:Daydreaming artist:Radiohead', must: 'radiohead' },
  { name: 'New Person, Same Old Mistakes', artists: 'Tame Impala', q: 'track:"New Person, Same Old Mistakes" artist:"Tame Impala"', must: 'tame impala' },
  { name: "we can't be friends", artists: 'Ariana Grande', q: 'track:"we can\'t be friends" artist:"Ariana Grande"', must: 'ariana grande' },
  { name: 'Candy Paint', artists: 'Post Malone', q: 'track:"Candy Paint" artist:"Post Malone"', must: 'post malone' },
];

async function token() {
  const id = (process.env.SPOTIFY_CLIENT_ID || '').trim();
  const secret = (process.env.SPOTIFY_CLIENT_SECRET || '').trim();
  const refresh = (process.env.SPOTIFY_REFRESH_TOKEN || '').trim();
  if (!id || !secret || !refresh) throw new Error('Spotify is not configured');
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(id + ':' + secret).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refresh }),
  });
  if (!r.ok) throw new Error('token ' + r.status);
  return (await r.json()).access_token;
}

async function lookup(pick, access) {
  const url = 'https://api.spotify.com/v1/search?type=track&limit=10&market=US&q=' + encodeURIComponent(pick.q);
  const r = await fetch(url, { headers: { Authorization: 'Bearer ' + access } });
  if (!r.ok) return null;
  const items = ((await r.json()).tracks || {}).items || [];
  const hit = items.find(t => (t.artists.map(a => a.name).join(' ') + ' ' + t.album.name).toLowerCase().includes(pick.must)) || items[0];
  if (!hit) return null;
  const img = hit.album && (hit.album.images[1] || hit.album.images[0]);
  return { image: img ? img.url : null, url: hit.external_urls && hit.external_urls.spotify };
}

module.exports = async (req, res) => {
  try {
    const access = await token();
    const found = await Promise.all(PICKS.map(p => lookup(p, access).catch(() => null)));
    const tracks = PICKS.map((p, i) => ({ name: p.name, artists: p.artists, image: found[i] && found[i].image, url: found[i] && found[i].url }));
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).json({ tracks });
  } catch (err) {
    console.error(err);
    return res.status(502).json({ error: 'Spotify request failed' });
  }
};
