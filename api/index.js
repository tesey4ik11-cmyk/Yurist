module.exports = async function handler(req) {
  return new Response(JSON.stringify({ ok: true, env: Object.keys(process.env).filter(k => k.includes('POSTGRES') || k.includes('SUPABASE') || k.includes('DATABASE')).join(',') }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
};
