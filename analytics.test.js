import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getHeatmapIntensity,
  resolvePhysicalKey,
  resolveExpectedKey,
  recordSubstitution,
  getTopSubstitution,
  recordMistake,
  calculateRealWpm,
  createSession,
  applyKeystroke,
  applyBackspace,
  applyPaste
} from './analytics.js';

test('Heatmap intensity matches UI design thresholds', () => {
  assert.equal(getHeatmapIntensity(0), 'intensity-0');
  assert.equal(getHeatmapIntensity(1), 'intensity-1');
  assert.equal(getHeatmapIntensity(2), 'intensity-1');
  assert.equal(getHeatmapIntensity(3), 'intensity-2');
  assert.equal(getHeatmapIntensity(5), 'intensity-2');
  assert.equal(getHeatmapIntensity(6), 'intensity-3');
  assert.equal(getHeatmapIntensity(9), 'intensity-3');
  assert.equal(getHeatmapIntensity(10), 'intensity-4');
  assert.equal(getHeatmapIntensity(25), 'intensity-4');
});

test('Physical key resolution covers full standard layout including brackets, quotes, and backslash', () => {
  // Letters and numbers
  assert.equal(resolvePhysicalKey('KeyA', 'a'), 'A');
  assert.equal(resolvePhysicalKey('KeyZ', 'w'), 'Z');
  assert.equal(resolvePhysicalKey('Digit5', '5'), '5');
  assert.equal(resolvePhysicalKey('Space', ' '), 'SPACE');

  // Extended keyboard keys: brackets, quotes, backslash, symbols
  assert.equal(resolvePhysicalKey('BracketLeft', '['), '[');
  assert.equal(resolvePhysicalKey('BracketRight', ']'), ']');
  assert.equal(resolvePhysicalKey('Quote', "'"), "'");
  assert.equal(resolvePhysicalKey('Backquote', '`'), '`');
  assert.equal(resolvePhysicalKey('Backslash', '\\'), '\\');
  assert.equal(resolvePhysicalKey('Slash', '/'), '/');
  assert.equal(resolvePhysicalKey('Semicolon', ';'), ';');
  assert.equal(resolvePhysicalKey('Minus', '-'), '-');
  assert.equal(resolvePhysicalKey('Equal', '='), '=');
  assert.equal(resolvePhysicalKey('Enter', '\n'), 'ENTER');

  // Mobile / virtual keyboard fallback (no code)
  assert.equal(resolvePhysicalKey('', 'e'), 'E');
  assert.equal(resolvePhysicalKey(null, ' '), 'SPACE');

  // Non-printable modifier keys ignored
  assert.equal(resolvePhysicalKey('ShiftLeft', 'Shift'), null);
});

test('Expected-to-pressed key substitution matrix tracks confusions accurately', () => {
  const substitutions = {};

  // User expected 'E', pressed physical 'R' twice and 'W' once
  recordSubstitution(substitutions, 'E', 'R');
  recordSubstitution(substitutions, 'E', 'R');
  recordSubstitution(substitutions, 'E', 'W');

  assert.equal(substitutions['E']['R'], 2);
  assert.equal(substitutions['E']['W'], 1);

  const top = getTopSubstitution(substitutions, 'E');
  assert.deepEqual(top, { pressedKey: 'R', count: 2 });

  // Correct key matches should not record a substitution error
  recordSubstitution(substitutions, 'E', 'E');
  assert.equal(substitutions['E']['E'], undefined);
});

test('Real WPM calculation is accurate and handles edge cases', () => {
  // 250 characters typed in 60 seconds = 50 words / 1 min = 50 WPM
  assert.equal(calculateRealWpm(250, 60), 50);

  // 125 characters in 30 seconds = 25 words / 0.5 min = 50 WPM
  assert.equal(calculateRealWpm(125, 30), 50);

  // Edge cases
  assert.equal(calculateRealWpm(0, 30), 0);
  assert.equal(calculateRealWpm(100, 0), 0);
});

test('Integration: Backspace compatibility retains cumulative error counts while allowing corrections', () => {
  const session = createSession('The quick brown fox');

  // 1. Type 'T' correctly
  applyKeystroke(session, 'KeyT', 'T');
  assert.equal(session.charStates[0], 'correct');
  assert.equal(session.correctTyped, 1);
  assert.equal(session.mistakes, 0);

  // 2. Type 'x' instead of 'h' (Mistake)
  applyKeystroke(session, 'KeyX', 'x');
  assert.equal(session.charStates[1], 'wrong');
  assert.equal(session.mistakes, 1);
  assert.equal(session.keyMistakes['H'], 1);
  assert.equal(session.keySubstitutions['H']['X'], 1);

  // 3. Press Backspace to correct 'x'
  applyBackspace(session);
  assert.equal(session.buffer, 'T');
  assert.equal(session.charIndex, 1);
  assert.equal(session.charStates[1], '');
  assert.equal(session.mistakes, 0); // Active buffer mistakes cleared

  // CUMULATIVE keyMistakes must remain 1!
  assert.equal(session.keyMistakes['H'], 1, 'Cumulative error count must be retained across Backspace');
  assert.equal(session.keySubstitutions['H']['X'], 1, 'Substitution count must be retained across Backspace');

  // 4. Retype correctly as 'h'
  applyKeystroke(session, 'KeyH', 'h');
  assert.equal(session.buffer, 'Th');
  assert.equal(session.charStates[1], 'correct');
  assert.equal(session.correctTyped, 2);
  assert.equal(session.mistakes, 0);

  // Still retains cumulative error on 'H'
  assert.equal(session.keyMistakes['H'], 1);
});

test('Integration: Repeated corrections accumulate friction without resetting previous mistakes', () => {
  const session = createSession('apple');

  // Attempt 1: 'a' correct
  applyKeystroke(session, 'KeyA', 'a');

  // Attempt 2: Target 'p'. Types 'o' (error 1)
  applyKeystroke(session, 'KeyO', 'o');
  assert.equal(session.keyMistakes['P'], 1);

  // Backspace
  applyBackspace(session);

  // Attempt 3: Target 'p'. Types 'l' (error 2 on same key)
  applyKeystroke(session, 'KeyL', 'l');
  assert.equal(session.keyMistakes['P'], 2);

  // Backspace
  applyBackspace(session);

  // Attempt 4: Types 'p' correctly
  applyKeystroke(session, 'KeyP', 'p');

  // Cumulative mistake on 'P' must be 2
  assert.equal(session.keyMistakes['P'], 2);
  assert.equal(session.keySubstitutions['P']['O'], 1);
  assert.equal(session.keySubstitutions['P']['L'], 1);
});

test('Integration: Paste handling validates text but does NOT record physical keystrokes or substitutions', () => {
  const session = createSession('Hello world');

  // Pasting text with a typo: 'Helxo' into 'Hello'
  applyPaste(session, 'Helxo');

  assert.equal(session.buffer, 'Helxo');
  assert.equal(session.charStates[3], 'wrong'); // 'x' vs 'l'
  assert.equal(session.mistakes, 1); // Checked against passage

  // Crucial: Must NOT record as physical keystrokes or substitutions
  assert.equal(session.keyMistakes['L'], undefined, 'Pasted text must not increment physical keyMistakes');
  assert.equal(session.keySubstitutions['L'], undefined, 'Pasted text must not record physical substitutions');
});
