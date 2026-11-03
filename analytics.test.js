import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getHeatmapIntensity,
  resolvePhysicalKey,
  resolveExpectedKey,
  recordSubstitution,
  getTopSubstitution,
  recordMistake,
  calculateRealWpm
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

test('Physical key resolution uses KeyboardEvent.code with mobile/virtual fallback', () => {
  // Physical key codes
  assert.equal(resolvePhysicalKey('KeyA', 'a'), 'A');
  assert.equal(resolvePhysicalKey('KeyZ', 'w'), 'Z');
  assert.equal(resolvePhysicalKey('Space', ' '), 'SPACE');
  assert.equal(resolvePhysicalKey('Digit5', '5'), '5');
  assert.equal(resolvePhysicalKey('Comma', ','), ',');

  // Mobile / virtual keyboard fallback
  assert.equal(resolvePhysicalKey('', 'e'), 'E');
  assert.equal(resolvePhysicalKey(null, ' '), 'SPACE');

  // Non-printable modifier keys ignored
  assert.equal(resolvePhysicalKey('ShiftLeft', 'Shift'), null);
});

test('Expected-to-pressed key substitution matrix tracks confusions accurately', () => {
  const substitutions = {};

  // Expected 'E', user pressed physical 'R' twice and 'W' once
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

test('keyMistakes retains cumulative error counts across inputs', () => {
  const session = { keyMistakes: {}, keySubstitutions: {} };

  // Mistake 1 on 'E'
  recordMistake(session, 'e', 'KeyR', 'r');
  assert.equal(session.keyMistakes['E'], 1);

  // Subsequent typing must NOT reset keyMistakes
  assert.equal(session.keyMistakes['E'], 1);

  // Mistake 2 on 'E'
  recordMistake(session, 'e', 'KeyD', 'd');
  assert.equal(session.keyMistakes['E'], 2);

  // Mistake on 'SPACE'
  recordMistake(session, ' ', 'KeyB', 'b');
  assert.equal(session.keyMistakes['SPACE'], 1);

  // Verify cumulative retention and substitutions
  assert.equal(session.keyMistakes['E'], 2);
  assert.equal(session.keyMistakes['SPACE'], 1);
  assert.equal(session.keySubstitutions['E']['R'], 1);
  assert.equal(session.keySubstitutions['E']['D'], 1);
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
