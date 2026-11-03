// Analytics & Heatmap Engine for KeyRush (BrokenKey) — Phase 1

export function getHeatmapIntensity(errCount) {
  if (!errCount || errCount <= 0) return 'intensity-0';
  if (errCount <= 2) return 'intensity-1';
  if (errCount <= 5) return 'intensity-2';
  if (errCount <= 9) return 'intensity-3';
  return 'intensity-4';
}

export function resolvePhysicalKey(code, key = '') {
  if (code) {
    if (code === 'Space') return 'SPACE';
    if (code.startsWith('Key') && code.length === 4) return code.slice(3).toUpperCase();
    if (code.startsWith('Digit') && code.length === 6) return code.slice(5);
    if (code === 'BracketLeft') return '[';
    if (code === 'BracketRight') return ']';
    if (code === 'Quote') return "'";
    if (code === 'Backquote') return '`';
    if (code === 'Backslash') return '\\';
    if (code === 'Slash') return '/';
    if (code === 'Semicolon') return ';';
    if (code === 'Comma') return ',';
    if (code === 'Period') return '.';
    if (code === 'Minus') return '-';
    if (code === 'Equal') return '=';
    if (code === 'Enter') return 'ENTER';
  }
  // Fallback for virtual / mobile keyboards without physical code
  if (key === ' ' || key === '\n') return 'SPACE';
  if (typeof key === 'string' && key.length === 1) return key.toUpperCase();
  return null;
}

export function resolveExpectedKey(char) {
  if (!char) return null;
  if (char === ' ' || char === '\n') return 'SPACE';
  return char.toUpperCase();
}

export function recordSubstitution(substitutions, expectedKey, pressedKey) {
  if (!expectedKey || !pressedKey || expectedKey === pressedKey) return substitutions;
  if (!substitutions[expectedKey]) {
    substitutions[expectedKey] = {};
  }
  substitutions[expectedKey][pressedKey] = (substitutions[expectedKey][pressedKey] || 0) + 1;
  return substitutions;
}

export function getTopSubstitution(substitutions, expectedKey) {
  const map = substitutions && substitutions[expectedKey];
  if (!map) return null;
  const entries = Object.entries(map);
  if (entries.length === 0) return null;
  entries.sort((a, b) => b[1] - a[1]);
  return { pressedKey: entries[0][0], count: entries[0][1] };
}

export function recordMistake(tracker, expectedChar, code, key, isPasted = false) {
  // Pasted characters must not be recorded as physical keystrokes or substitutions
  if (isPasted) return tracker;

  const expectedKey = resolveExpectedKey(expectedChar);
  if (!expectedKey) return tracker;
  const pressedKey = resolvePhysicalKey(code, key);

  tracker.keyMistakes = tracker.keyMistakes || {};
  tracker.keyMistakes[expectedKey] = (tracker.keyMistakes[expectedKey] || 0) + 1;

  if (pressedKey && pressedKey !== expectedKey) {
    tracker.keySubstitutions = tracker.keySubstitutions || {};
    recordSubstitution(tracker.keySubstitutions, expectedKey, pressedKey);
  }
  return tracker;
}

export function calculateRealWpm(correctCharacters, elapsedSeconds) {
  if (!elapsedSeconds || elapsedSeconds <= 0 || !correctCharacters) return 0;
  const elapsedMinutes = elapsedSeconds / 60;
  return Math.round((correctCharacters / 5) / elapsedMinutes);
}

// Session engine for stateful simulation and integration tests
export function createSession(passage) {
  return {
    passage,
    buffer: '',
    charIndex: 0,
    charStates: new Array(passage.length).fill(''),
    keyMistakes: {},
    keySubstitutions: {},
    mistakes: 0,
    correctTyped: 0,
    totalTyped: 0
  };
}

export function applyKeystroke(session, code, key) {
  if (session.charIndex >= session.passage.length) return session;

  const expectedChar = session.passage[session.charIndex];
  const typedChar = key === 'Enter' ? '\n' : key;

  session.buffer += typedChar;
  session.totalTyped++;

  if (typedChar === expectedChar) {
    session.charStates[session.charIndex] = 'correct';
    session.correctTyped++;
  } else {
    session.charStates[session.charIndex] = 'wrong';
    session.mistakes++;
    recordMistake(session, expectedChar, code, key, false);
  }

  session.charIndex++;
  return session;
}

export function applyBackspace(session) {
  if (session.buffer.length === 0) return session;

  const lastIndex = session.buffer.length - 1;
  const wasState = session.charStates[lastIndex];

  if (wasState === 'correct') {
    session.correctTyped--;
  } else if (wasState === 'wrong') {
    session.mistakes--;
  }

  session.charStates[lastIndex] = '';
  session.buffer = session.buffer.slice(0, -1);
  session.charIndex = session.buffer.length;
  // NOTE: session.keyMistakes and keySubstitutions are CUMULATIVE and never decremented!
  return session;
}

export function applyPaste(session, text) {
  // Pasted input is validated against the passage, but MUST NOT record physical keystrokes or substitutions
  for (let i = 0; i < text.length; i++) {
    if (session.charIndex >= session.passage.length) break;
    const char = text[i];
    const expected = session.passage[session.charIndex];
    session.buffer += char;
    session.totalTyped++;

    if (char === expected) {
      session.charStates[session.charIndex] = 'correct';
      session.correctTyped++;
    } else {
      session.charStates[session.charIndex] = 'wrong';
      session.mistakes++;
      // Notice: recordMistake with isPasted = true (does NOT increment keyMistakes or keySubstitutions)
      recordMistake(session, expected, null, char, true);
    }
    session.charIndex++;
  }
  return session;
}
