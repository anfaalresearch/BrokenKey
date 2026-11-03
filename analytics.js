// Analytics & Heatmap Engine for KeyRush (BrokenKey)

export const FINGER_MAP = {
  'Left Pinky': ['Q', 'A', 'Z', '1'],
  'Left Ring': ['W', 'S', 'X', '2'],
  'Left Middle': ['E', 'D', 'C', '3'],
  'Left Index': ['R', 'T', 'F', 'G', 'V', 'B', '4', '5'],
  'Right Index': ['Y', 'U', 'H', 'J', 'N', 'M', '6', '7'],
  'Right Middle': ['I', 'K', '8', ','],
  'Right Ring': ['O', 'L', '9', '.'],
  'Right Pinky': ['P', '0', ';', '/', '-', '='],
  'Thumbs': ['SPACE']
};

export const DRILL_DICTIONARY = {
  q: ['quick', 'quiet', 'quest', 'query', 'equip'],
  w: ['power', 'water', 'write', 'world', 'network'],
  e: ['enter', 'every', 'event', 'error', 'enable'],
  r: ['error', 'repair', 'repeat', 'record', 'report'],
  t: ['target', 'total', 'threat', 'system', 'status'],
  y: ['bytes', 'crypto', 'dynamic', 'syntax', 'verify'],
  u: ['unique', 'output', 'update', 'queue', 'secure'],
  i: ['input', 'logic', 'script', 'string', 'packet'],
  o: ['protocol', 'remote', 'module', 'robust', 'opcode'],
  p: ['packet', 'prompt', 'process', 'python', 'proper'],
  a: ['array', 'access', 'attack', 'assert', 'packet'],
  s: ['status', 'secure', 'stream', 'syntax', 'socket'],
  d: ['device', 'domain', 'define', 'detect', 'damage'],
  f: ['filter', 'format', 'freeze', 'fluent', 'finish'],
  g: ['engine', 'gather', 'graph', 'global', 'target'],
  h: ['header', 'handle', 'threat', 'method', 'hash'],
  j: ['object', 'project', 'adjust', 'inject', 'reject'],
  k: ['kernel', 'packet', 'socket', 'broken', 'lookup'],
  l: ['lookup', 'layout', 'listen', 'client', 'module'],
  z: ['zero', 'freeze', 'zigzag', 'hazard', 'bizarre'],
  x: ['syntax', 'prefix', 'export', 'expand', 'matrix'],
  c: ['client', 'cipher', 'custom', 'create', 'packet'],
  v: ['verify', 'server', 'driver', 'device', 'vector'],
  b: ['broken', 'buffer', 'binary', 'branch', 'bridge'],
  n: ['network', 'engine', 'online', 'return', 'listen'],
  m: ['module', 'memory', 'modern', 'sample', 'matrix']
};

export function getHeatmapIntensity(errCount) {
  if (!errCount || errCount <= 0) return 'intensity-0';
  if (errCount <= 2) return 'intensity-1';
  if (errCount <= 5) return 'intensity-2';
  if (errCount <= 9) return 'intensity-3';
  return 'intensity-4';
}

export function computeFingerWeakness(mistakesMap = {}) {
  const summary = {};
  for (const [finger, keys] of Object.entries(FINGER_MAP)) {
    summary[finger] = 0;
    for (const key of keys) {
      summary[finger] += mistakesMap[key] || 0;
    }
  }
  return Object.entries(summary)
    .map(([finger, errors]) => ({ finger, errors }))
    .sort((a, b) => b.errors - a.errors);
}

export function calculateRealWpm(correctCharacters, elapsedSeconds) {
  if (!elapsedSeconds || elapsedSeconds <= 0 || !correctCharacters) return 0;
  const elapsedMinutes = elapsedSeconds / 60;
  return Math.round((correctCharacters / 5) / elapsedMinutes);
}

export function generateAdaptiveDrill(mistakesMap = {}, fallback = 'Practice typing accurately.') {
  const sorted = Object.entries(mistakesMap)
    .filter(([k, count]) => count > 0 && k !== 'SPACE')
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k.toLowerCase());

  if (sorted.length === 0) return fallback;

  const topKeys = sorted.slice(0, 3);
  const words = [];
  topKeys.forEach((key) => {
    const list = DRILL_DICTIONARY[key] || [];
    words.push(...list);
  });

  if (words.length === 0) return fallback;
  return `Targeted drill for keys [${topKeys.map((k) => k.toUpperCase()).join(', ')}]: ${words.join(' ')}.`;
}
