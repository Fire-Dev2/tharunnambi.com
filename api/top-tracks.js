// Returns Tharun's current top Spotify tracks. Needs three Vercel env vars:
// SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN
module.exports = async (req, res) => {
  const id = (process.env.SPOTIFY_CLIENT_ID || '').trim();
  const secret = (process.env.SPOTIFY_CLIENT_SECRET || '').trim();
  const refresh = (process.env.SPOTIFY_REFRESH_TOKEN || '').trim();
  if (!id || !secret || !refresh) {
    return res.status(500).json({ error: 'Spotify is not configured' });
  }
  try {
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(id + ':' + secret).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refresh }),
    });
    if (!tokenRes.ok) { const e = new Error('token'); e.status = tokenRes.status; e.detail = await tokenRes.text(); throw e; }
    const { access_token } = await tokenRes.json();

    const topRes = await fetch('https://api.spotify.com/v1/me/top/tracks?time_range=short_term&limit=6', {
      headers: { Authorization: 'Bearer ' + access_token },
    });
    if (!topRes.ok) { const e = new Error('top-tracks'); e.status = topRes.status; e.detail = await topRes.text(); throw e; }
    const data = await topRes.json();

    const tracks = (data.items || []).map((t) => ({
      name: t.name,
      artists: t.artists.map((a) => a.name).join(', '),
      image: ((t.album && (t.album.images[1] || t.album.images[0])) || {}).url || null,
      url: t.external_urls && t.external_urls.spotify,
    }));

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({ updated: new Date().toISOString(), tracks });
  } catch (err) {
    console.error(err);
    return res.status(502).json({ error: 'Spotify request failed', step: err.message, status: err.status || null, spotify: (err.detail || '').slice(0, 300) });
  }
};
