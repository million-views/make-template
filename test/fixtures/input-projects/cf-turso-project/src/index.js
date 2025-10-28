import { createClient } from '@libsql/client';

export default {
  async fetch(request, env, ctx) {
    const client = createClient({
      url: env.TURSO_DB_URL,
      authToken: env.TURSO_DB_AUTH_TOKEN,
    });
    
    const { pathname } = new URL(request.url);
    
    if (pathname === '/users') {
      const result = await client.execute('SELECT * FROM users');
      return Response.json(result.rows);
    }
    
    return new Response('Hello from my-turso-worker!');
  },
};