const { getDefaultConfig } = require('expo/metro-config');
const http = require('http');

const config = getDefaultConfig(__dirname);

config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      if (req.url && (req.url.startsWith('/__api/') || req.url === '/__api' || req.url.startsWith('/__api?'))) {
        const targetPath = req.url.slice('/__api'.length) || '/';
        const apiPort = Number(process.env.EXPO_PUBLIC_API_PORT || 3000);
        const headers = { ...req.headers, host: `127.0.0.1:${apiPort}` };

        const proxyReq = http.request(
          {
            hostname: '127.0.0.1',
            port: apiPort,
            path: targetPath,
            method: req.method,
            headers,
          },
          (proxyRes) => {
            res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
            proxyRes.pipe(res, { end: true });
          }
        );

        proxyReq.on('error', (err) => {
          if (!res.headersSent) {
            res.writeHead(502, { 'Content-Type': 'application/json' });
          }
          res.end(JSON.stringify({ message: 'Backend API unavailable', error: err.message }));
        });

        req.pipe(proxyReq, { end: true });
        return;
      }
      return middleware(req, res, next);
    };
  },
};

module.exports = config;
