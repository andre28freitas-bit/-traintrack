(() => {
'use strict';
const X = window.TTEX;
if (!X) return;

const numeric = v => {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

X.score = (assessment, key = 'overall') => {
  if (!assessment) return null;
  if (key === 'overall') return numeric(assessment?.scores?.overall);
  return numeric(assessment?.scores?.categories?.[key]);
};

X.scoreMethod = {
  configurable: true,
  label: 'Ponderação definida no Back Office'
};
})();