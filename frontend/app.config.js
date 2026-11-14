/**
 * Dynamic Expo config layered on top of app.json.
 *
 * Web rendering: app.json sets `web.output: "static"` (pre-rendered pages, used for production web builds). In
 * development that makes Metro server-render every page on each reload, and on a small dev machine that
 * leaks memory until Metro crashes (the app then fails to load until it restarts). Setting
 * EXPO_WEB_OUTPUT=single for the dev server serves a plain single-page app instead. Production builds do not
 * set the variable, so they keep `static`.
 *
 *   EXPO_WEB_OUTPUT=single npx expo start --lan
 */
module.exports = ({ config }) => {
  const output = process.env.EXPO_WEB_OUTPUT;
  if (output !== 'single' && output !== 'static' && output !== 'server') return config;
  return { ...config, web: { ...config.web, output } };
};
