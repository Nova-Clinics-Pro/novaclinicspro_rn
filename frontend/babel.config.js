module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    env: {
      // Production builds drop console.log/info/debug so appointment and patient details never reach a device's or browser's log.
      // console.error and console.warn stay, for real faults.
      production: {
        plugins: [['transform-remove-console', { exclude: ['error', 'warn'] }]],
      },
    },
  };
};
