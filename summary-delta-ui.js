(() => {
'use strict';

const style = document.createElement('style');
style.textContent = `
.tt-highlight small.tt-delta-up{color:#15803d;font-weight:800}
.tt-highlight small.tt-delta-down{color:#b91c1c;font-weight:800}
.tt-highlight small.tt-delta-flat{color:#64748b;font-weight:750}
.tt-highlight small .tt-delta-percent{display:block;margin-top:2px;font-size:9px;font-weight:700;opacity:.82}
`;
document.head.appendChild(style);

const parseNumber = value => {
  const match = String(value || '').replace(/\s/g,'').match(/[+-]?\d+(?:[.,]\d+)?/);
  if (!match) return null;
  const n = Number(match[0].replace(',','.'));
  return Number.isFinite(n) ? n : null;
};

const percentText = value => new Intl.NumberFormat('pt-PT', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: 'always'
}).format(value) + '%';

function decorateSummaryCards(){
  document.querySelectorAll('.tt-highlights .tt-highlight').forEach(card => {
    const strong = card.querySelector('strong');
    const small = card.querySelector('small');
    if (!strong || !small || small.dataset.deltaEnhanced === '1') return;

    const original = small.textContent.trim();
    if (!original || /Sem comparação/i.test(original)) {
      small.classList.add('tt-delta-flat');
      small.dataset.deltaEnhanced = '1';
      return;
    }

    const current = parseNumber(strong.textContent);
    const delta = parseNumber(original);
    if (current == null || delta == null) return;

    const previous = current - delta;
    const pct = Math.abs(previous) > 1e-9 ? (delta / Math.abs(previous)) * 100 : null;
    const isFlat = Math.abs(delta) < 1e-9;
    const absolute = original.replace(/\s+vs anterior$/i,'');

    small.classList.remove('tt-delta-up','tt-delta-down','tt-delta-flat');
    if (isFlat) {
      small.classList.add('tt-delta-flat');
      small.innerHTML = `→ Sem alteração${pct == null ? '' : `<span class="tt-delta-percent">${percentText(0)} vs anterior</span>`}`;
    } else if (delta > 0) {
      small.classList.add('tt-delta-up');
      small.innerHTML = `↑ ${absolute}${pct == null ? '' : `<span class="tt-delta-percent">${percentText(pct)} vs anterior</span>`}`;
    } else {
      small.classList.add('tt-delta-down');
      small.innerHTML = `↓ ${absolute}${pct == null ? '' : `<span class="tt-delta-percent">${percentText(pct)} vs anterior</span>`}`;
    }
    small.dataset.deltaEnhanced = '1';
  });
}

let scheduled = false;
const schedule = () => {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    decorateSummaryCards();
  });
};

new MutationObserver(schedule).observe(document.body, {childList:true, subtree:true});
schedule();
})();
