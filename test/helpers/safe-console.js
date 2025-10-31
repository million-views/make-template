// Wrap console methods to serialize arguments immediately so node:test doesn't need to structured-clone complex objects later
const orig = global.console;
function serializeArg(a) {
  if (a === null || a === undefined) return a;
  const t = typeof a;
  if (t === 'string' || t === 'number' || t === 'boolean') return a;
  if (a instanceof Error) return `${a.name}: ${a.message}\n${a.stack}`;
  try {
    return JSON.parse(JSON.stringify(a));
  } catch (e) {
    try { return String(a); } catch (e2) { return '[unserializable]'; }
  }
}
function wrap(fn) {
  return (...args) => fn(...args.map(serializeArg));
}
global.console = {
  log: wrap(orig.log.bind(orig)),
  error: wrap(orig.error.bind(orig)),
  warn: wrap(orig.warn.bind(orig)),
  info: wrap(orig.info ? orig.info.bind(orig) : orig.log.bind(orig)),
  debug: wrap(orig.debug ? orig.debug.bind(orig) : orig.log.bind(orig)),
};

export default true;
