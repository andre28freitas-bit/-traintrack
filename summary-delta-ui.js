(() => {
'use strict';

const style = document.createElement('style');
style.textContent = `
.tt-highlight small.tt-delta-up{color:#15803d;font-weight:800}
.tt-highlight small.tt-delta-down{color:#b91c1c;font-weight:800}
.tt-highlight small.tt-delta-flat{color:#64748b;font-weight:750}
.tt-highlight small .tt-delta-percent{display:block;margin-top:2px;font-size:9px;font-weight:700;opacity:.82;color:inherit}
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

const safe = value => String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

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

    const dataCurrent = small.dataset.current === '' ? null : Number(small.dataset.current);
    const dataBaseline = small.dataset.baseline === '' ? null : Number(small.dataset.baseline);
    const current = Number.isFinite(dataCurrent) ? dataCurrent : parseNumber(strong.textContent);
    let previous = Number.isFinite(dataBaseline) ? dataBaseline : null;
    let delta = current != null && previous != null ? current - previous : parseNumber(original);
    if (current == null || delta == null) return;
    if (previous == null) previous = current - delta;

    const pct = Math.abs(previous) > 1e-9 ? (delta / Math.abs(previous)) * 100 : null;
    const isFlat = Math.abs(delta) < 1e-9;
    const match = original.match(/\s+vs\s+(.+)$/i);
    const reference = small.dataset.reference || match?.[1] || 'anterior';
    const absolute = original.replace(/\s+vs\s+.+$/i,'').trim();

    small.classList.remove('tt-delta-up','tt-delta-down','tt-delta-flat');
    if (isFlat) {
      small.classList.add('tt-delta-flat');
      small.innerHTML = `→ Sem alteração${pct == null ? '' : `<span class="tt-delta-percent">${percentText(0)} vs ${safe(reference)}</span>`}`;
    } else if (delta > 0) {
      small.classList.add('tt-delta-up');
      small.innerHTML = `↑ ${safe(absolute)}${pct == null ? '' : `<span class="tt-delta-percent">${percentText(pct)} vs ${safe(reference)}</span>`}`;
    } else {
      small.classList.add('tt-delta-down');
      small.innerHTML = `↓ ${safe(absolute)}${pct == null ? '' : `<span class="tt-delta-percent">${percentText(pct)} vs ${safe(reference)}</span>`}`;
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
