export function createPage() {
  const wrap = document.createElement('div');
  wrap.className = 'page-center';
  const h = document.createElement('div');
  h.className = 'page-text';
  h.textContent = 'This is Google Lens';
  wrap.appendChild(h);
  return wrap;
}