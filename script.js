// --- Init og variabler ---
let images = [], currentDrag = null, offsetX = 0, offsetY = 0;
const canvas = document.getElementById('exportCanvas');
const ctx = canvas.getContext('2d');
const previewArea = document.getElementById('previewArea');
let transparentBackground = true, backgroundColor = '#ffffff', reflectionOpacity = 0.25;

// --- Upload billeder ---
document.getElementById("imageUpload").addEventListener("change", handleImageUpload);

function handleImageUpload(e) {
  Array.from(e.target.files).forEach(file => {
    const img = new Image();
    img.onload = () => addImage(img);
    img.src = URL.createObjectURL(file);
  });
}


// --- Tilføj billede ---
function addImage(img) {
  const previewArea = document.getElementById("previewArea");

  const wrapper = document.createElement("div");
  wrapper.className = "image-wrapper";
  wrapper.style.left = "100px";
  wrapper.style.top = "100px";
  wrapper.style.width = img.width + "px";
  wrapper.style.height = img.height + "px";
  wrapper.style.position = "absolute";
  wrapper.dataset.rotation = "0";

  // Hovedbillede
  const mainImg = img.cloneNode();
  mainImg.className = 'main-image';
  wrapper.appendChild(mainImg);

  // Refleksion
  const reflection = img.cloneNode();
  reflection.className = 'reflection';
  wrapper.appendChild(reflection);

  previewArea.appendChild(wrapper);

  // Gem i images-array
  images.push({
    img: mainImg,
    wrapper,
    x: 100,
    y: 100,
    width: img.width,
    height: img.height,
    rotation: 0,
    showReflection: true
  });

  render();
}


// --- Drag & snap ---
previewArea.addEventListener('mousedown', e => {
  if (e.target.tagName === 'IMG') {
    const wrapper = e.target.parentElement;
    const index = images.findIndex(obj => obj.wrapper === wrapper);
    currentDrag = images[index];
    const rect = previewArea.getBoundingClientRect();
    offsetX = e.clientX - rect.left - currentDrag.x;
    offsetY = e.clientY - rect.top - currentDrag.y;
    previewArea.addEventListener('mousemove', onMouseMove);
    previewArea.addEventListener('mouseup', onMouseUp);
  }
});
function onMouseMove(e) {
  const rect = previewArea.getBoundingClientRect();
  let x = e.clientX - rect.left - offsetX;
  let y = e.clientY - rect.top - offsetY;
  if (document.getElementById('toggleGrid').checked) {
    const snap = snapToGuides(x, y, currentDrag.width, currentDrag.height);
    x = snap.x; y = snap.y;
  }
  currentDrag.x = x;
  currentDrag.y = y;
  render();
}
function onMouseUp() {
  previewArea.removeEventListener('mousemove', onMouseMove);
  previewArea.removeEventListener('mouseup', onMouseUp);
  currentDrag = null;
  updateGuides(false);
}

// --- Snap-linjer ---
function snapToGuides(x, y, w, h) {
  const cx = canvas.width/2, cy = canvas.height/2;
  let nx = x, ny = y;
  const threshold = 10;
  if (Math.abs(x + w/2 - cx) < threshold) nx = cx - w/2;
  if (Math.abs(y + h/2 - cy) < threshold) ny = cy - h/2;
  document.querySelector('.guide-x').style.left = Math.abs(nx + w/2 - cx) < threshold ? cx+'px' : '-9999px';
  document.querySelector('.guide-y').style.top = Math.abs(ny + h/2 - cy) < threshold ? cy+'px' : '-9999px';
  return {x: nx, y: ny};
}
function updateGuides(show) {
  document.querySelectorAll('.guide').forEach(g => g.style.display = show ? 'block' : 'none');
}

// --- UI controls ---
document.getElementById('opacitySlider').addEventListener('input', e => {
  reflectionOpacity = parseFloat(e.target.value); render();
});
document.getElementById('bgColorPicker').addEventListener('input', e => {
  backgroundColor = e.target.value; render();
});
document.getElementById('transparentToggle').addEventListener('change', e => {
  transparentBackground = e.target.checked; render();
});
document.getElementById('canvasSize').addEventListener('change', e => {
  const v = e.target.value;
  if (v === 'auto') {
    let maxW = 0, maxH=0;
    images.forEach(o => {
      maxW = Math.max(maxW, o.x + o.width);
      maxH = Math.max(maxH, o.y + o.height);
    });
    canvas.width = maxW + 50; canvas.height = maxH + 50;
  } else {
    const [w,h] = v.split('x').map(n=>+n);
    canvas.width=w; canvas.height =h;
  }
  render();
});
document.getElementById('toggleGrid').addEventListener('change', () => {
  updateGuides(document.getElementById('toggleGrid').checked);
  render();
});

// --- Rotate og resize ---
previewArea.addEventListener('wheel', e => {
  if (!currentDrag) return;
  e.preventDefault();
  currentDrag.rotation += e.deltaY > 0 ? 5 : -5;
  render();
});
previewArea.addEventListener('mousemove', e => {
  if (!currentDrag || !e.shiftKey) return;
  const rect = previewArea.getBoundingClientRect();
  let w = e.clientX - rect.left - currentDrag.x;
  let h = e.clientY - rect.top - currentDrag.y;
  if (w>20 && h>20) {
    currentDrag.width=w; currentDrag.height=h; render();
  }
});

// --- Render funktion ---
function render() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if (!transparentBackground) {
    ctx.fillStyle=backgroundColor;
    ctx.fillRect(0,0,canvas.width,canvas.height);
  }
  images.forEach(o => {
    ctx.save();
    ctx.translate(o.x + o.width/2, o.y + o.height/2);
    ctx.rotate(o.rotation * Math.PI/180);
    ctx.drawImage(o.img, -o.width/2, -o.height/2, o.width, o.height);
    ctx.restore();
    if (o.showReflection) {
      ctx.save();
      ctx.translate(o.x + o.width/2, o.y + o.height * 1.5);
      ctx.scale(1, -1);
      ctx.globalAlpha = reflectionOpacity;
      ctx.drawImage(o.img, -o.width/2, -o.height/2, o.width, o.height);
      ctx.restore();
      const grad = ctx.createLinearGradient(0, o.y + o.height, 0, o.y + o.height*1.5);
      grad.addColorStop(0, `rgba(255,255,255,${reflectionOpacity})`);
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(o.x, o.y + o.height, o.width, o.height/2);
    }
  });
}

// --- Export/clear ---
function exportLayout() {
  render();
  const fmt = document.getElementById('fileFormat').value;
  const type = fmt === 'webp' ? 'image/webp' : 'image/png';
  const link = document.createElement('a');
  link.download = 'layout.' + fmt;
  link.href = canvas.toDataURL(type);
  link.click();
}
function clearImages() {
  images = [];
  previewArea.innerHTML = '';
  render();
}
