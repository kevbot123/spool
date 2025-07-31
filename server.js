const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize WebSocket server
  if (dev) {
    // Only initialize WebSocket in development for now
    // In production, this would be handled by a separate WebSocket service
    try {
      const { initializeWebSocketServer } = require('./src/lib/websocket-server.ts');
      initializeWebSocketServer(server);
      console.log('✅ WebSocket server initialized for live updates');
    } catch (error) {
      console.warn('⚠️  WebSocket server failed to initialize:', error.message);
      console.log('📝 Live updates will fall back to webhook-only mode');
    }
  }

  server
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});