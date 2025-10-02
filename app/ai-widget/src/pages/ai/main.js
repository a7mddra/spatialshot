export function createPage() {
  const wrap = document.createElement('div');
  wrap.className = 'page-center';
  const h = document.createElement('div');
  h.className = 'page-text';
  h.textContent = 'This is AI Overview';
  wrap.appendChild(h);
  return wrap;
}