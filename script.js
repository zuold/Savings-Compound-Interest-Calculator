const ids = ['principal', 'monthly', 'rate', 'years'];
const els = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));

function money(value) { return '￥' + value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function compactMoney(value) { return value >= 10000 ? (value / 10000).toFixed(2) + ' 万' : money(value); }

function calc() {
  const principal = Math.min(2000000, Math.max(0, +els.principal.value || 0));
  const monthly = Math.min(100000, Math.max(0, +els.monthly.value || 0));
  const annual = Math.min(15, Math.max(0, +els.rate.value || 0));
  const years = Math.min(30, Math.max(1, Math.round(+els.years.value || 1)));
  Object.assign(els.principal, { value: principal }); Object.assign(els.monthly, { value: monthly }); els.years.value = years;
  const monthlyRate = annual / 100 / 12, months = years * 12, rows = [];
  for (let month = 0; month <= months; month++) {
    const total = monthlyRate === 0 ? principal + monthly * month : principal * (1 + monthlyRate) ** month + monthly * (((1 + monthlyRate) ** month - 1) / monthlyRate);
    const contributed = principal + monthly * month;
    rows.push({ total, contributed });
  }
  const end = rows[months], interest = end.total - end.contributed, percent = end.contributed ? interest / end.contributed * 100 : 0;
  document.getElementById('total').textContent = money(end.total); document.getElementById('contributed').textContent = money(end.contributed); document.getElementById('interest').textContent = money(interest); document.getElementById('returnRate').textContent = percent.toFixed(2) + '%'; document.getElementById('growthBadge').textContent = '+' + percent.toFixed(2) + '%'; document.getElementById('yearLabel').textContent = years + ' 年'; document.getElementById('periods').textContent = months + ' 个月';
  draw(rows);
}

function draw(rows) {
  const svg = document.getElementById('chart'), mobile = window.innerWidth <= 800, W = mobile ? 400 : 760, H = 300, pad = { l: mobile ? 72 : 66, r: 14, t: 16, b: 46 }, width = W - pad.l - pad.r, height = H - pad.t - pad.b, rawMax = Math.max(...rows.map(row => row.total), 1), tickStep = Math.max(10000, Math.ceil(rawMax / 4 / 50000) * 50000), max = tickStep * 4;
  const x = index => pad.l + index / (rows.length - 1) * width, y = value => pad.t + height - value / max * height;
  const start = new Date(); start.setDate(1);
  const dateAt = index => { const date = new Date(start); date.setMonth(date.getMonth() + index); return `${date.getFullYear()}年`; };
  let grid = '';
  for (let index = 0; index < 5; index++) { const value = tickStep * index, position = y(value); grid += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${position}" y2="${position}" stroke="#e8eeea"/><text x="${pad.l - 10}" y="${position + 6}" text-anchor="end" fill="#718078" font-size="${mobile ? 14 : 12}">${index === 0 ? '0' : (value / 10000) + '万'}</text>`; }
  const base = rows.map((row, index) => `${x(index)},${y(row.contributed)}`).join(' '), top = rows.map((row, index) => `${x(index)},${y(row.total)}`).join(' '), area = `${base} ${x(rows.length - 1)},${y(0)} ${x(0)},${y(0)}`, every = 12;
  const labels = rows.map((row, index) => index % every === 0 || index === rows.length - 1 ? `<text x="${x(index)}" y="${H - 12}" text-anchor="middle" fill="#718078" font-size="${mobile ? 14 : 12}">${dateAt(index)}</text>` : '').join('');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = `${grid}<polygon points="${area}" fill="#e1f7ed"/><polygon points="${top} ${base.split(' ').reverse().join(' ')}" fill="#b9efdc"/><polyline points="${base}" fill="none" stroke="#3cbd91" stroke-width="2.5"/><polyline points="${top}" fill="none" stroke="#8bdabe" stroke-width="2.5"/>${labels}<g id="hover" opacity="0"><line id="hoverLine" y1="${pad.t}" y2="${pad.t + height}" stroke="#54b996" stroke-dasharray="3 3"/><circle id="hoverDot" r="5" fill="#fff" stroke="#2ca87d" stroke-width="2.5"/><rect id="tipBg" width="206" height="92" rx="8" fill="#173229"/><text id="tipText" fill="#fff" font-size="${mobile ? 17 : 15}" font-weight="600"></text></g><rect id="hit" x="${pad.l}" y="${pad.t}" width="${width}" height="${height}" fill="transparent"/>`;
  const hit = svg.querySelector('#hit'), hover = svg.querySelector('#hover'), line = svg.querySelector('#hoverLine'), dot = svg.querySelector('#hoverDot'), bg = svg.querySelector('#tipBg'), text = svg.querySelector('#tipText');
  const show = event => { const box = svg.getBoundingClientRect(), pointerX = (event.clientX - box.left) / box.width * W, index = Math.max(0, Math.min(rows.length - 1, Math.round((pointerX - pad.l) / width * (rows.length - 1)))), row = rows[index], pointX = x(index), pointY = y(row.total), tipX = pointX > W - 225 ? pointX - 216 : pointX + 10, tipY = Math.max(8, Math.min(H - 102, pointY - 100)); hover.setAttribute('opacity', '1'); line.setAttribute('x1', pointX); line.setAttribute('x2', pointX); dot.setAttribute('cx', pointX); dot.setAttribute('cy', pointY); bg.setAttribute('x', tipX); bg.setAttribute('y', tipY); text.setAttribute('x', tipX + 12); text.setAttribute('y', tipY + 22); text.innerHTML = `<tspan x="${tipX + 12}" dy="0">${dateAt(index)}</tspan><tspan x="${tipX + 12}" dy="24">总资产  ${compactMoney(row.total)}</tspan><tspan x="${tipX + 12}" dy="24">本金  ${compactMoney(row.contributed)}</tspan>`; };
  hit.addEventListener('mousemove', show); hit.addEventListener('touchstart', event => show(event.touches[0]), { passive: true }); hit.addEventListener('touchmove', event => show(event.touches[0]), { passive: true }); hit.addEventListener('mouseleave', () => hover.setAttribute('opacity', '0'));
}

ids.filter(id => id !== 'rate').forEach(id => els[id].addEventListener('input', () => { const range = document.getElementById(id + 'Range'); if (range) range.value = els[id].value; calc(); }));
function sanitizeRate(value) {
  const [integer = '', ...decimalParts] = value.replace(/[^\d.]/g, '').split('.');
  return decimalParts.length ? `${integer}.${decimalParts.join('').slice(0, 2)}` : integer;
}

els.rate.addEventListener('input', () => { els.rate.value = sanitizeRate(els.rate.value); calc(); });
els.rate.addEventListener('blur', () => { const rate = Math.min(15, Math.max(0, parseFloat(els.rate.value) || 0)); els.rate.value = rate.toFixed(2); calc(); });
function stepRate(amount) { const current = parseFloat(els.rate.value) || 0; els.rate.value = Math.min(15, Math.max(0, current + amount)).toFixed(2); calc(); }
document.getElementById('rateDown').addEventListener('click', () => stepRate(-0.05));
document.getElementById('rateUp').addEventListener('click', () => stepRate(0.05));
function stepField(id, amount, min, max) { const value = Math.min(max, Math.max(min, (+els[id].value || 0) + amount)); els[id].value = value; const range = document.getElementById(id + 'Range'); if (range) range.value = value; calc(); }
document.getElementById('principalDown').addEventListener('click', () => stepField('principal', -5000, 0, 2000000));
document.getElementById('principalUp').addEventListener('click', () => stepField('principal', 5000, 0, 2000000));
document.getElementById('monthlyDown').addEventListener('click', () => stepField('monthly', -1000, 0, 100000));
document.getElementById('monthlyUp').addEventListener('click', () => stepField('monthly', 1000, 0, 100000));
document.getElementById('yearsDown').addEventListener('click', () => stepField('years', -1, 1, 30));
document.getElementById('yearsUp').addEventListener('click', () => stepField('years', 1, 1, 30));
['principal', 'monthly'].forEach(id => { const range = document.getElementById(id + 'Range'); range.addEventListener('input', () => { els[id].value = range.value; calc(); }); });
window.addEventListener('resize', calc); calc();
