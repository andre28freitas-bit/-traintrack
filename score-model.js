(() => {
'use strict';
const X = window.TTEX;
if (!X) return;

const numeric = v => {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function equalWeightOverall(assessment) {
  const scores = assessment?.scores || {};
  const factorSource = scores.factors && typeof scores.factors === 'object'
    ? scores.factors
    : scores.categories && typeof scores.categories === 'object'
      ? scores.categories
      : null;

  if (!factorSource) return null;
  const values = Object.values(factorSource).map(numeric).filter(v => v != null);
  if (values.length !== 3) return null;
  return values.reduce((sum, value) => sum + value, 0) / 3;
}

const previousScore = X.score;
X.score = (assessment, key = 'overall') => {
  if (key === 'overall') {
    const calculated = equalWeightOverall(assessment);
    if (calculated != null) return calculated;
  }
  return previousScore ? previousScore(assessment, key) : null;
};

X.equalWeightOverall = equalWeightOverall;
X.scoreMethod = {
  factors: 3,
  weightEach: 1 / 3,
  label: '3 fatores · 33,33% cada'
};
})();
