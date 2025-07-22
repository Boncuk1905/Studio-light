const previewArea = document.getElementById('previewArea');
const imageUpload = document.getElementById('imageUpload');
const opacitySlider = document.getElementById('opacitySlider');
const lightAngleSlider = document.getElementById('lightAngleSlider');
const backgroundToggle = document.getElementById('backgroundToggle');
const canvasSizeSelect = document.getElementById('canvasSize');
const fileFormatSelect = document.getElementById('fileFormat');
const clearBtn = document.getElementById('clearBtn');
const downloadBtn = document.getElementById('downloadBtn');
const toggleReflection = document.getElementById('toggleReflection');
const toggleMidline = document.getElementById('toggleMidline');
const toggleGrid = document.getElementById('toggleGrid');

let images = [];
let selectedImage = null;
let isDragging = false;
let dragOffset = {x:0, y:0};
let isResizing = false;
let resizeDir = null;
let isRotating = false;
let rotateStart = 0;
let rotateOrigin = {x: 0, y: 0};
let mouseStart = {x: 0, y: 0};

const SNAP_DISTANCE = 10;

function createImageWrapper(img, originalWidth, originalHeight) {
  const wrapper = document.createElement('div');
  wrapper.classList.add('image-wrapper');
  wrapper.style.left = '50px';
  wrapper.style.top = '50px';
  wrapper.style.width = originalWidth + 'px';
  wrapper.style.height = originalHeight + 'px';
  wrapper.style.transform = 'rotate(0deg)';
  wrapper.style.position = 'absolute';
  wrapper.dataset.rotation = 0;
  wrapper.dataset.originalWidth = originalWidth;
  wrapper.dataset.originalHeight = originalHeight;

  const imageElement = document.createElement('img');
  imageElement.src = img.src;
  imageElement.draggable = false;
  wrapper.appendChild(imageElement);

  // Reflection image under the main image
  const reflection = document.createElement('img');
  reflection.src = img.src;
  reflection.classList.add('reflection');
  reflection.style.opacity = opacitySlider.value;
  wrapper.appendChild(reflection);

  // Resize handle bottom-right
  const resizeHandle = document.createElement('div');
  resizeHandle.classList.add('resize-handle');
  wrapper.appendChild(resizeHandle);

  // Rotation handle top-center
  const rotateHandle = document.createElement('div');
  rotateHandle.classList.add('rotate-handle');
  wrapper.appendChild(rotateHandle);

  previewArea.appendChild(wrapper);

  // Store reference
  return {wrapper, imageElement, reflection, resizeHandle, rotateHandle};
}

function addImageFromFile(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const {wrapper, imageElement, reflection, resizeHandle, rotateHandle} = createImageWrapper(img, img.width, img.height);

      const imageObj = {
        wrapper,
        imageElement,
        reflection,
        resizeHandle,
        rotateHandle,
        x: 50,
        y: 50,
        width: img.width,
        height: img.height,
        rotation: 0,
        originalWidth: img.width,
        originalHeight: img.height,
      };
      images.push(imageObj);
      setupDragResizeRotate(imageObj);
      render();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// Drag, resize, rotate setup
function setupDragResizeRotate(imageObj) {
  const {wrapper, resizeHandle, rotateHandle} = imageObj;

  // Drag
  wrapper.addEventListener('mousedown', e => {
    if(e.target === resizeHandle || e.target === rotateHandle) return;
    e.preventDefault();
    selectedImage = imageObj;
    isDragging = true;
    dragOffset.x = e.clientX - wrapper.offsetLeft;
    dragOffset.y = e.clientY - wrapper.offsetTop;
    wrapper.classList.add('dragging');
  });

  // Resize
  resizeHandle.addEventListener('mousedown', e => {
    e.stopPropagation();
    e.preventDefault();
    selectedImage = imageObj;
    isResizing = true;
    dragOffset.x = e.clientX;
    dragOffset.y = e.clientY;
    wrapper.classList.add('dragging');
  });

  // Rotate
  rotateHandle.addEventListener('mousedown', e => {
    e.stopPropagation();
    e.preventDefault();
    selectedImage = imageObj;
    isRotating = true;
    const rect = wrapper.getBoundingClientRect();
    rotateOrigin = {x: rect.left + rect.width/2, y: rect.top + rect.height/2};
    rotateStart = Math.atan2(e.clientY - rotateOrigin.y, e.clientX - rotateOrigin.x);
    mouseStart = {x: e.clientX, y: e.clientY};
    wrapper.classList.add('dragging');
  });
}

document.addEventListener('mousemove', e => {
  if (!selectedImage) return;
  const wrapper = selectedImage.wrapper;

  if (isDragging) {
    let newX = e.clientX - dragOffset.x;
    let newY = e.clientY - dragOffset.y;
    // Snap logic
    const snap = getSnapPosition(selectedImage, newX, newY);
    newX = snap.x;
    newY = snap.y;
    selectedImage.x = newX;
    selectedImage.y = newY;
    wrapper.style.left = newX + 'px';
    wrapper.style.top = newY + 'px';

    renderSnapLines(snap.lines);
  } else if (isResizing) {
    const dx = e.clientX - dragOffset.x;
    const dy = e.clientY - dragOffset.y;
    dragOffset.x = e.clientX;
    dragOffset.y = e.clientY;

    // Resize proportionally
    const wrapperRect = wrapper.getBoundingClientRect();
    let newWidth = wrapper.offsetWidth + dx;
    let newHeight = wrapper.offsetHeight + dy;

    // Hold aspect ratio from original
    const ratio = selectedImage.originalWidth / selectedImage.originalHeight;
    if (newWidth / newHeight > ratio) {
      newHeight = newWidth / ratio;
    } else {
      newWidth = newHeight * ratio;
    }

    selectedImage.width = newWidth;
    selectedImage.height = newHeight;

    wrapper.style.width = newWidth + 'px';
    wrapper.style.height = newHeight + 'px';

    render();
  } else if (isRotating) {
    const angleNow = Math.atan2(e.clientY - rotateOrigin.y, e.clientX - rotateOrigin.x);
    let deltaAngle = angleNow - rotateStart;
    let deg = selectedImage.rotation + (deltaAngle * 180 / Math.PI);
    // Normalize degree
    deg = ((deg % 360) + 360) % 360;
    selectedImage.rotation = deg;
    wrapper.style.transform = `rotate(${deg}deg)`;
    rotateStart = angleNow;
    render();
  }
});

document.addEventListener('mouseup', e => {
  if(selectedImage) {
    selectedImage.wrapper.classList.remove('dragging');
  }
  isDragging = false;
  isResizing = false;
  isRotating = false;
  clearSnapLines();
  selectedImage = null;
});

// Snap logic: return snapped x,y and lines to draw
function getSnapPosition(currentImage, proposedX, proposedY) {
  const snapLines = [];
  let snapX = proposedX;
  let snapY = proposedY;

  const cRect = currentImage.wrapper.getBoundingClientRect();
  const cCenterX = proposedX + cRect.width/2;
  const cCenterY = proposedY + cRect.height/2;
  const cLeft = proposedX;
  const cRight = proposedX + cRect.width;
  const cTop = proposedY;
  const cBottom = proposedY + cRect.height;

  images.forEach(img => {
    if(img === currentImage) return;
    const r = img.wrapper.getBoundingClientRect();

    // Snap left edge to other left/right/center
    [[r.left, 'left'], [r.right, 'right'], [r.left + r.width/2, 'centerX']].forEach(xEdge => {
      if(Math.abs(cLeft - xEdge[0]) < SNAP_DISTANCE) {
        snapX = xEdge[0];
        snapLines.push({type:'vertical', x: xEdge[0]});
      }
      if(Math.abs(cRight - xEdge[0]) < SNAP_DISTANCE) {
        snapX = xEdge[0] - cRect.width;
        snapLines.push({type:'vertical', x: xEdge[0]});
      }
      if(Math.abs(cCenterX - xEdge[0]) < SNAP_DISTANCE) {
        snapX = xEdge[0] - cRect.width/2;
        snapLines.push({type:'vertical', x: xEdge[0]});
      }
    });

    // Snap top edge to other top/bottom/center
    [[r.top, 'top'], [r.bottom, 'bottom'], [r.top + r.height/2, 'centerY']].forEach(yEdge => {
      if(Math.abs(cTop - yEdge[0]) < SNAP_DISTANCE) {
        snapY = yEdge[0];
        snapLines.push({type:'horizontal', y: yEdge[0]});
      }
      if(Math.abs(cBottom - yEdge[0]) < SNAP_DISTANCE) {
        snapY = yEdge[0] - cRect.height;
        snapLines.push({type:'horizontal', y: yEdge[0]});
      }
      if(Math.abs(cCenterY - yEdge[0]) < SNAP_DISTANCE) {
        snapY = yEdge[0] - cRect.height/2;
        snapLines.push({type:'horizontal', y: yEdge[0]});
      }
    });
  });

  // Snap to preview area center lines
  const previewRect = previewArea.getBoundingClientRect();
  const centerX = previewRect.left + previewRect.width/2;
  const centerY = previewRect.top + previewRect.height/2;

  if(Math.abs(cCenterX - centerX) < SNAP_DISTANCE) {
    snapX = centerX - cRect.width/2;
    snapLines.push({type:'vertical', x: centerX});
  }
  if(Math.abs(cCenterY - centerY) < SNAP_DISTANCE) {
    snapY = centerY - cRect.height/2;
    snapLines.push({type:'horizontal', y: centerY});
  }

  return {x: snapX, y: snapY, lines: snapLines};
}

function renderSnapLines(lines) {
  clearSnapLines();
  if(!toggleGrid.checked) return;
  lines.forEach(line => {
    const el = document.createElement('div');
    el.classList.add('snap-line');
    if(line.type === 'vertical') {
      el.style.left = line.x + 'px';
      el.style.top = '0';
      el.style.width = '1px';
      el.style.height = '100%';
      el.style.position = 'fixed';
      el.style.backgroundColor = 'rgba(52, 152, 219, 0.7)';
      el.style.zIndex = '9999';
      previewArea.appendChild(el);
    } else if(line.type === 'horizontal') {
      el.style.top = line.y + 'px';
      el.style.left = '0';
      el.style.height = '1px';
      el.style.width = '100%';
      el.style.position = 'fixed';
      el.style.backgroundColor = 'rgba(52, 152, 219, 0.7)';
      el.style.zIndex = '9999';
      previewArea.appendChild(el);
    }
  });
}

function clearSnapLines() {
  const lines = previewArea.querySelectorAll('.snap-line');
  lines.forEach(line => line.remove());
}

function render() {
  // Update reflection opacity and visibility
  images.forEach(img => {
    img.reflection.style.opacity = opacitySlider.value;
    img.reflection.style.display = toggleReflection.checked ? 'block' : 'none';

    // Position and size of reflection
    img.reflection.style.width = img.wrapper.style.width;
    img.reflection.style.height = 'auto';
    img.reflection.style.transform = `rotate(${img.rotation}deg) scaleY(-1)`;
  });

  // Background color
  previewArea.style.backgroundColor = backgroundToggle.value === 'white' ? '#fff' : 'transparent';

  // Midline toggles
  drawMidlines();
}

function drawMidlines() {
  const existingV = document.getElementById('midline-vertical');
  const existingH = document.getElementById('midline-horizontal');
  if(existingV) existingV.remove();
  if(existingH) existingH.remove();
  if(!toggleMidline.checked) return;

  const rect = previewArea.getBoundingClientRect();
  const midX = rect.left + rect.width/2;
  const midY = rect.top + rect.height/2;

  const vLine = document.createElement('div');
  vLine.id = 'midline-vertical';
  vLine.style.position = 'fixed';
  vLine.style.left = midX + 'px';
  vLine.style.top = rect.top + 'px';
  vLine.style.height = rect.height + 'px';
  vLine.style.width = '1px';
  vLine.style.backgroundColor = 'rgba(255,0,0,0.6)';
  vLine.style.zIndex = '9998';
  previewArea.appendChild(vLine);

  const hLine = document.createElement('div');
  hLine.id = 'midline-horizontal';
  hLine.style.position = 'fixed';
  hLine.style.top = midY + 'px';
  hLine.style.left = rect.left + 'px';
  hLine.style.width = rect.width + 'px';
  hLine.style.height = '1px';
  hLine.style.backgroundColor = 'rgba(255,0,0,0.6)';
  hLine.style.zIndex = '9998';
  previewArea.appendChild(hLine);
}

imageUpload.addEventListener('change', e => {
  const files = Array.from(e.target.files);
  files.forEach(file => addImageFromFile(file));
  e.target.value = ''; // reset input
});

opacitySlider.addEventListener('input', () => {
  images.forEach(img => img.reflection.style.opacity = opacitySlider.value);
});

backgroundToggle.addEventListener('change', () => {
  render();
});

toggleReflection.addEventListener('change', () => {
  images.forEach(img => {
    img.reflection.style.display = toggleReflection.checked ? 'block' : 'none';
  });
});

toggleMidline.addEventListener('change', () => {
  render();
});

toggleGrid.addEventListener('change', () => {
  if(!toggleGrid.checked) clearSnapLines();
});

// Clear all images
clearBtn.addEventListener('click', () => {
  images.forEach(img => img.wrapper.remove());
  images = [];
  clearSnapLines();
});

// Initial render call
render();

// --- Resize logik i mousemove fortsættelse ---
window.addEventListener('mousemove', (e) => {
  if (!activeImage) return;
  if (e.buttons !== 1) return; // kun hvis venstre knap holdes nede

  const rect = previewArea.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  if (dragMode === 'move') {
    // Flyt billede med snap til kanter / midterlinje
    let newX = mouseX - dragOffset.x;
    let newY = mouseY - dragOffset.y;

    // Snap til andre billeder og midterlinje
    const snapEdges = getSnapEdges(activeImage, newX, newY);

    if (snapEdges.snapX !== null) newX = snapEdges.snapX;
    if (snapEdges.snapY !== null) newY = snapEdges.snapY;

    activeImage.x = newX;
    activeImage.y = newY;
  } else if (dragMode === 'resize') {
    // Resize billede fra nederste højre hjørne
    let newWidth = mouseX - activeImage.x;
    let newHeight = mouseY - activeImage.y;

    // Minimum størrelse
    newWidth = Math.max(50, newWidth);
    newHeight = Math.max(50, newHeight);

    // Oprethold billedets aspect ratio (valgfrit, her true)
    const aspectRatio = activeImage.imageElement.naturalWidth / activeImage.imageElement.naturalHeight;
    if (newWidth / newHeight > aspectRatio) {
      newWidth = newHeight * aspectRatio;
    } else {
      newHeight = newWidth / aspectRatio;
    }

    activeImage.width = newWidth;
    activeImage.height = newHeight;
  }

  render();
});

window.addEventListener('mouseup', (e) => {
  activeImage = null;
  dragMode = null;
});

// Snap funktion: returnerer snapX og snapY hvis indenfor snapDistance, ellers null
function getSnapEdges(activeImg, newX, newY) {
  let snapX = null;
  let snapY = null;

  const activeEdges = {
    left: newX,
    right: newX + activeImg.width,
    centerX: newX + activeImg.width / 2,
    top: newY,
    bottom: newY + activeImg.height,
    centerY: newY + activeImg.height / 2,
  };

  images.forEach(img => {
    if (img === activeImg) return;

    const edges = {
      left: img.x,
      right: img.x + img.width,
      centerX: img.x + img.width / 2,
      top: img.y,
      bottom: img.y + img.height,
      centerY: img.y + img.height / 2,
    };

    // Lodrette snap
    ['left', 'right', 'centerX'].forEach(edge => {
      if (Math.abs(activeEdges.left - edges[edge]) < snapDistance) snapX = edges[edge];
      if (Math.abs(activeEdges.right - edges[edge]) < snapDistance) snapX = edges[edge] - activeImg.width;
      if (Math.abs(activeEdges.centerX - edges[edge]) < snapDistance) snapX = edges[edge] - activeImg.width / 2;
    });

    // Vandrette snap
    ['top', 'bottom', 'centerY'].forEach(edge => {
      if (Math.abs(activeEdges.top - edges[edge]) < snapDistance) snapY = edges[edge];
      if (Math.abs(activeEdges.bottom - edges[edge]) < snapDistance) snapY = edges[edge] - activeImg.height;
      if (Math.abs(activeEdges.centerY - edges[edge]) < snapDistance) snapY = edges[edge] - activeImg.height / 2;
    });
  });

  // Snap til preview midterlinjer
  if (toggleMidLine.checked) {
    const midX = previewArea.clientWidth / 2;
    const midY = previewArea.clientHeight / 2;

    if (Math.abs(activeEdges.left - midX) < snapDistance) snapX = midX;
    if (Math.abs(activeEdges.right - midX) < snapDistance) snapX = midX - activeImg.width;
    if (Math.abs(activeEdges.centerX - midX) < snapDistance) snapX = midX - activeImg.width / 2;

    if (Math.abs(activeEdges.top - midY) < snapDistance) snapY = midY;
    if (Math.abs(activeEdges.bottom - midY) < snapDistance) snapY = midY - activeImg.height;
    if (Math.abs(activeEdges.centerY - midY) < snapDistance) snapY = midY - activeImg.height / 2;
  }

  return { snapX, snapY };
}

// Upload funktion - indsæt billeder i preview og images array
imageUpload.addEventListener('change', (e) => {
  const files = Array.from(e.target.files);
  files.forEach(file => {
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = function(ev) {
      const img = new Image();
      img.onload = function() {
        const imgObj = createImageObject(img);
        images.push(imgObj);
        render();
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
  e.target.value = ''; // reset så samme fil kan uploades igen hvis ønsket
});

// Download / export funktion
async function exportLayout() {
  const exportSize = canvasSizeSelect.value.split('x').map(Number);
  const exportWidth = exportSize[0];
  const exportHeight = exportSize[1];
  const format = fileFormatSelect.value;

  const canvas = document.createElement('canvas');
  canvas.width = exportWidth;
  canvas.height = exportHeight;
  const ctx = canvas.getContext('2d');

  // Baggrund
  if (bgColorPicker.value === 'transparent' || bgColorPicker.value === '') {
    ctx.clearRect(0, 0, exportWidth, exportHeight);
  } else {
    ctx.fillStyle = bgColorPicker.value;
    ctx.fillRect(0, 0, exportWidth, exportHeight);
  }

  // Skaleringsfaktor for at passe preview til eksport
  const scaleX = exportWidth / previewArea.clientWidth;
  const scaleY = exportHeight / previewArea.clientHeight;

  // Tegn billeder med reflektion under
  for (const imgObj of images) {
    // Tegn billede
    ctx.save();
    ctx.translate(imgObj.x * scaleX + (imgObj.width * scaleX) / 2, imgObj.y * scaleY + (imgObj.height * scaleY) / 2);
    ctx.rotate(imgObj.rotation * Math.PI / 180);
    ctx.translate(-(imgObj.width * scaleX) / 2, -(imgObj.height * scaleY) / 2);
    ctx.drawImage(imgObj.imageElement, 0, 0, imgObj.width * scaleX, imgObj.height * scaleY);
    ctx.restore();

    // Tegn reflektion hvis slået til
    if (toggleReflection.checked) {
      ctx.save();
      ctx.globalAlpha = opacitySlider.value;
      ctx.translate(imgObj.x * scaleX + (imgObj.width * scaleX) / 2, (imgObj.y + imgObj.height) * scaleY + (imgObj.height * scaleY) / 2);
      ctx.scale(1, -1);
      ctx.rotate(imgObj.rotation * Math.PI / 180);
      ctx.translate(-(imgObj.width * scaleX) / 2, -(imgObj.height * scaleY) / 2);
      ctx.filter = 'blur(2px)';
      ctx.drawImage(imgObj.imageElement, 0, 0, imgObj.width * scaleX, imgObj.height * scaleY);
      ctx.restore();
      ctx.globalAlpha = 1;
      ctx.filter = 'none';
    }
  }

  // Opret fil til download
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'export.' + format;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/' + format);
}

// Clear funktion
function clearImages() {
  images = [];
  render();
}

// --- Event bindings ---
opacitySlider.addEventListener('input', () => {
  render();
});

bgColorPicker.addEventListener('input', () => {
  render();
});

toggleReflection.addEventListener('change', () => {
  render();
});

toggleGridCheckbox.addEventListener('change', () => {
  render();
});

toggleMidLine.addEventListener('change', () => {
  render();
});

canvasSizeSelect.addEventListener('change', () => {
  // Ingen visuel ændring, men kan evt. opdatere preview størrelse hvis ønsket
});

fileFormatSelect.addEventListener('change', () => {
  // Ingen visuel ændring
});
