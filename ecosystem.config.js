module.exports = {
  apps: [
    {
      name: 'pdc-menu-check-new-menu',
      script: 'dest/checkNewMenu.js',
      autorestart: false,
      cron_restart: '30 12 * * 1-5'
    },
    {
      name: 'pdc-menu-check-next-events',
      script: 'dest/checkNextEvents.js',
      autorestart: true,
      restart_delay: 10000,
      cron_restart: '0 9 * * 1'
    }
  ]
};
