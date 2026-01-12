// src/util/scoreClass.js
export function getClassByRatio(ratio) {
  if (ratio >= 1.0) return 'S';
  if (ratio >= 0.90) return 'A';
  if (ratio >= 0.70) return 'B';
  if (ratio >= 0.55) return 'C';
  if (ratio >= 0.40) return 'D';
  return 'F';
}
