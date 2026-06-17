// Vercel Edge Middleware for HTTP Basic Authentication
export default function middleware(request) {
  const authorization = request.headers.get('authorization');

  if (authorization) {
    try {
      const base64 = authorization.split(' ')[1];
      const credentials = atob(base64);
      const [username, password] = credentials.split(':');

      const expectedUser = process.env.BASIC_AUTH_USER || 'brc_audit';
      const expectedPassword = process.env.BASIC_AUTH_PASSWORD;

      // Only authorize if the password environment variable is set and matches
      if (expectedPassword && username === expectedUser && password === expectedPassword) {
        return; // Proceed to static files
      }
    } catch (e) {
      console.error('Basic Auth decoding failed:', e);
    }
  }

  // Return 401 Unauthorized to trigger standard browser password prompt
  return new Response('Authentication Required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="BRC Revenue Assurance Portal"',
    },
  });
}
