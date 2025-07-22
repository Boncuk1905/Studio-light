// --- Globale variabler ---

const previewArea = document.getElementById('previewArea');
const imageUpload = document.getElementById('imageUpload');
const opacitySlider = document.getElementById('opacitySlider');
const bgColorPicker = document.getElementById('bgColorPicker');
const canvasSizeSelect = document.getElementById('canvasSize');
const fileFormatSelect = document.getElementById('fileFormat');
const clearBtn = document.querySelector('button[onclick="clearImages()"]');
const downloadBtn = document.querySelector('button[onclick="exportLayout()"]');
const toggleGrid = document.getElementById('toggleGrid');
let toggleMidLine = document.getElementById('toggleMidLine');
let toggleReflection = document.getElementById('toggleReflection');
let zoomLevel = 1;

if (!toggleMidLine) {
  const cb = document.createElement('input'); cb.type='checkbox'; cb.id='toggleMidLine';
  const lbl = document.createElement('label'); lbl.append(cb, ' Vis midterlinje');
  document.querySelector('.controls').appendChild(lbl);
  toggleMidLine = cb;
}

if (!toggleReflection) {
  const cb = document.createElement('input'); cb.type='checkbox'; cb.id='toggleReflection'; cb.checked=true;
  const lbl = document.createElement('label'); lbl.append(cb, ' Reflektion');
  document.querySelector('.controls').appendChild(lbl);
  toggleReflection = cb;
}

const zoomInBtn = document.createElement('button'); zoomInBtn.textContent = '+';
const zoomOutBtn = document.createElement('button'); zoomOutBtn.textContent = '−';
document.querySelector('.controls').append(zoomInBtn, zoomOutBtn);

let images = [];
let activeImage = null, dragMode = null, dragOffset = {x:0,y:0};
const snapDistance = 10;

// --- Init previewArea & default canvas size ---
previewArea.style.width = '1280px';
previewArea.style.height = '1280px';
previewArea.style.margin = '0 auto';
canvasSizeSelect.value = '1280x1280';

// --- Render funktion & hjælpefunktioner ---
function getEdges(o) {
  return {
    left: o.x, right: o.x + o.width,
    top: o.y, bottom: o.y + o.height,
    centerX: o.x + o.width/2, centerY: o.y + o.height/2
  };
}

function createImageObject(imgElem) {
  return {
    imageElement: imgElem,
    x: 50, y: 50,
    width: imgElem.naturalWidth,
    height: imgElem.naturalHeight,
    rotation: 0
  };
}

function render() {
  previewArea.innerHTML = '';
  previewArea.style.background = bgColorPicker.value;

  images.forEach(obj => {
    const w = obj.width * zoomLevel, h = obj.height * zoomLevel;
    const div = document.createElement('div');
    div.className = 'image-wrapper';
    div.style.left = obj.x * zoomLevel + 'px';
    div.style.top = obj.y * zoomLevel + 'px';
    div.style.width = w + 'px';
    div.style.height = h + 'px';
    div.style.transform = `rotate(${obj.rotation}deg)`;
    div.style.position = 'absolute';

    // Billede
    const img = document.createElement('img');
    img.src = obj.imageElement.src;
    img.style.width = '100%';
    img.style.height = '100%';
    img.draggable = false;
    div.appendChild(img);

    // Reflektion
    if (toggleReflection.checked) {
      const refl = document.createElement('img');
      refl.src = obj.imageElement.src;
      refl.style.width = '100%';
      refl.style.height = '100%';
      refl.style.transform = 'scaleY(-1)';
      refl.style.opacity = opacitySlider.value;
      refl.style.filter = 'blur(2px)';
      refl.style.position = 'absolute';
      refl.style.top = h + 'px';
      refl.draggable = false;
      div.appendChild(refl);
    }

    // Resize håndtag
    const res = document.createElement('div');
    res.className = 'resize-handle';
    res.style.position = 'absolute';
    res.style.width = '12px';
    res.style.height = '12px';
    res.style.right = '0';
    res.style.bottom = '0';
    res.style.background = '#fff';
    res.style.border = '1px solid #000';
    res.style.cursor = 'nwse-resize';
    div.appendChild(res);

    // Rotate håndtag
    const rot = document.createElement('div');
    rot.className = 'rotate-handle';
    rot.style.position = 'absolute';
    rot.style.width = '12px';
    rot.style.height = '12px';
    rot.style.left = '50%';
    rot.style.top = '-16px';
    rot.style.background = '#fff';
    rot.style.border = '1px solid #000';
    rot.style.cursor = 'grab';
    div.appendChild(rot);

    previewArea.appendChild(div);
    obj.wrapper = div;
    obj.resizeHandle = res;
    obj.rotateHandle = rot;
  });

  drawGuides();
  if (toggleMidLine.checked) drawMidLines();
}

function drawGuides() {
  previewArea.querySelectorAll('.guide-line').forEach(el => el.remove());
  if (!toggleGrid.checked) return;

  images.forEach(a => {
    const ea = getEdges(a);
    images.forEach(b => {
      if (a === b) return;
      const eb = getEdges(b);

      ['left','right','centerX'].forEach(k => {
        if (Math.abs(ea.left - eb[k]) < snapDistance ||
            Math.abs(ea.right - eb[k]) < snapDistance ||
            Math.abs(ea.centerX - eb[k]) < snapDistance) {
          const x = eb[k] * zoomLevel;
          const line = document.createElement('div');
          line.className = 'guide-line vertical';
          line.style.left = x + 'px';
          line.style.top = '0';
          line.style.width = '1px';
          line.style.height = previewArea.clientHeight + 'px';
          previewArea.appendChild(line);
        }
      });
      ['top','bottom','centerY'].forEach(k => {
        if (Math.abs(ea.top - eb[k]) < snapDistance ||
            Math.abs(ea.bottom - eb[k]) < snapDistance ||
            Math.abs(ea.centerY - eb[k]) < snapDistance) {
          const y = eb[k] * zoomLevel;
          const line = document.createElement('div');
          line.className = 'guide-line horizontal';
          line.style.top = y + 'px';
          line.style.left = '0';
          line.style.height = '1px';
          line.style.width = previewArea.clientWidth + 'px';
          previewArea.appendChild(line);
        }
      });
    });
  });
}

function drawMidLines() {
  previewArea.querySelectorAll('.mid-line').forEach(el => el.remove());
  const rect = previewArea.getBoundingClientRect();
  ['vertical','horizontal'].forEach(dir => {
    const line = document.createElement('div');
    line.className = 'mid-line ' + dir;
    line.style.position = 'absolute';
    line.style.background = 'blue';
    line.style.opacity = '0.6';
    if (dir === 'vertical') {
      line.style.left = (previewArea.clientWidth/2)+'px';
      line.style.width = '2px'; line.style.height = previewArea.clientHeight+'px';
    } else {
      line.style.top = (previewArea.clientHeight/2)+'px';
      line.style.height = '2px'; line.style.width = previewArea.clientWidth+'px';
    }
    previewArea.appendChild(line);
  });
}

// Resize & rotate + drag handlers (kombineret)

previewArea.addEventListener('mousedown', e => {
  if (e.button !== 0) return;
  const rect = previewArea.getBoundingClientRect();
  const mx = (e.clientX - rect.left) / zoomLevel;
  const my = (e.clientY - rect.top) / zoomLevel;

  for (let i = images.length - 1; i >= 0; i--){
    const obj = images[i];
    const edges = getEdges(obj);
    if (mx >= edges.left && mx <= edges.right && my >= edges.top && my <= edges.bottom) {
      activeImage = obj;
      dragOffset = {x: mx - obj.x, y: my - obj.y};
      dragMode = 'move';

      images.push(...images.splice(i,1)); // bring to front
      render();
      return;
    }
  }
});

// Document-wide handlers for drag: move/resize/rotate
document.addEventListener('mousemove', e => {
  if (!activeImage || e.buttons !== 1) return;
  const rect = previewArea.getBoundingClientRect();
  const mx = (e.clientX - rect.left) / zoomLevel;
  const my = (e.clientY - rect.top) / zoomLevel;
  const obj = activeImage;

  // Determine if resizing or rotating
  if (!dragMode) {
    // Check proximity to resize handle
    const dx = mx - (obj.x + obj.width);
    const dy = my - (obj.y + obj.height);
    if (Math.hypot(dx, dy) < 10) {
      dragMode = 'resize';
    }

    // Check rotate handle
    const rx = mx - (obj.x + obj.width/2);
    const ry = my - obj.y;
    if (Math.hypot(rx, ry + 30) < 10) {
      dragMode = 'rotate';
    }
  }

  if (dragMode === 'move') {
    let nx = mx - dragOffset.x;
    let ny = my - dragOffset.y;
    // Snap logic similar
    const edges = getEdges(obj);
    images.forEach(o => {
      if (o === obj) return;
      const eb = getEdges(o);
      ['left','right','centerX'].forEach(k => {
        if (Math.abs(edges.left - eb[k]) < snapDistance) nx = eb[k];
        if (Math.abs(edges.right - eb[k]) < snapDistance) nx = eb[k] - obj.width;
      });
      ['top','bottom','centerY'].forEach(k => {
        if (Math.abs(edges.top - eb[k]) < snapDistance) ny = eb[k];
        if (Math.abs(edges.bottom - eb[k]) < snapDistance) ny = eb[k] - obj.height;
      });
    });
    if (toggleMidLine.checked) {
      const midx = previewArea.clientWidth / (2*zoomLevel);
      const midy = previewArea.clientHeight / (2*zoomLevel);
      const centerX = obj.x + obj.width/2, centerY = obj.y + obj.height/2;
      if (Math.abs(centerX-midx)<snapDistance) nx = midx - obj.width/2;
      if (Math.abs(centerY-midy)<snapDistance) ny = midy - obj.height/2;
    }
    obj.x = nx; obj.y = ny;
  }
  else if (dragMode === 'resize') {
    obj.width = Math.max(20, mx - obj.x);
    obj.height = Math.max(20, my - obj.y);
  }
  else if (dragMode === 'rotate') {
    const cx = obj.x + obj.width/2, cy = obj.y + obj.height/2;
    const angle = Math.atan2(my - cy, mx - cx) * 180/Math.PI;
    obj.rotation = angle;
  }

  render();
});

document.addEventListener('mouseup', () => {
  activeImage = null; dragMode = null;
});

// Upload
imageUpload.addEventListener('change', e => {
  Array.from(e.target.files).filter(f => f.type.startsWith('image/')).forEach(f => {
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        images.push(createImageObject(img));
        render();
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(f);
  });
  e.target.value = '';
});

// Zoom controls
zoomInBtn.onclick = () => { zoomLevel = Math.min(3, zoomLevel+0.2); render(); };
zoomOutBtn.onclick = () => { zoomLevel = Math.max(0.5, zoomLevel-0.2); render(); };

// Clear & export
clearBtn.onclick = () => { images=[]; render(); };
downloadBtn.onclick = exportLayout;
