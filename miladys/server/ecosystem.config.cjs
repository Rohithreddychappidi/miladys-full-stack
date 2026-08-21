// PM2 process file. From /server, run:  pm2 start ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'miladys-api',
      script: 'src/index.js',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
      },
      // Restart on crash, but don't restart-loop forever if it's broken
      // (e.g. bad DATABASE_URL) — cap it and let `pm2 logs` show why.
      max_restarts: 10,
      min_uptime: '10s',
      // Node's built-in file watcher (used for `npm run dev`) stays off in
      // production — PM2 restarts are triggered by `pm2 restart`, not by
      // file changes, so a stray edit or log write can't bounce the API.
      watch: false,
    },
  ],
};
