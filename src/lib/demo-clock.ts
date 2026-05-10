export const DEMO_NOW = Date.now();

export const DEMO_TODAY_START = (() => {
  const d = new Date(DEMO_NOW);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
})();
