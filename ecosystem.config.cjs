module.exports = {
  apps: [
    {
      name: 'webapp',
      script: 'server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3003,
        HOSTNAME: '0.0.0.0',
      },
    },
  ],
};
