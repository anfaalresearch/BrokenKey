import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getHeatmapIntensity,
  computeFingerWeakness,
  calculateRealWpm,
  generateAdaptiveDrill
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

test('Finger weakness aggregation accurately maps mistake keys to hand anatomy', () => {
  const mistakes = {
    P: 4, // Right Pinky
    Q: 2, // Left Pinky
    A: 3, // Left Pinky (Total Left Pinky = 5)
    T: 1  // Left Index
  };

  const ranking = computeFingerWeakness(mistakes);
  assert.equal(ranking[0].finger, 'Left Pinky');
  assert.equal(ranking[0].errors, 5);
  assert.equal(ranking[1].finger, 'Right Pinky');
  assert.equal(ranking[1].errors, 4);
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

test('Adaptive drill generator creates exercises focused on worst keys', () => {
  const mistakes = {
    R: 5,
    P: 3,
    Z: 1
  };

  const drill = generateAdaptiveDrill(mistakes);
  assert.ok(drill.includes('[R, P, Z]'));
  assert.ok(drill.includes('report') || drill.includes('packet') || drill.includes('hazard'));

  // Fallback when no mistakes
  const fallback = generateAdaptiveDrill({}, 'Default text');
  assert.equal(fallback, 'Default text');
});
