module.exports = async function handler(req) {
  const url = new URL(req.url);
  return new Response(JSON.stringify({ ok: true, path: url.pathname }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
};
