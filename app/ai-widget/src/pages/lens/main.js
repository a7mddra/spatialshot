export function createPage(imagePath) {
  const wrap = document.createElement('div');
  wrap.className = 'page-center';
  const h = document.createElement('div');
  h.className = 'page-text';
  h.textContent = imagePath 
    ? `Google Lens for: ${imagePath}` 
    : 'No image provided';
  wrap.appendChild(h);
  return wrap;
}