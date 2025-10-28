export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    
    if (pathname === '/users') {
      const result = await env.DB.prepare('SELECT * FROM users').all();
      return Response.json(result);
    }
    
    return new Response('Hello from my-d1-worker!');
  },
};