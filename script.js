const previewArea = document.getElementById('previewArea');
const imageUpload = document.getElementById('imageUpload');
const opacitySlider = document.getElementById('opacitySlider');
const transparentToggle = document.getElementById('transparentToggle');
const canvasSizeSelect = document.getElementById('canvasSize');
const fileFormatSelect = document.getElementById('fileFormat');
const clearBtn = document.getElementById('clearBtn');
const downloadBtn = document.getElementById('downloadBtn');
const toggleCenterBtn = document.getElementById('toggleCenterBtn');
const centerLines = document.getElementById('centerLines');
const exportCanvas = document.getElementById('exportCanvas');

let images = [];
let draggingImage = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let dragHoldTimeout = null;
let canDrag = false;
let showCenterLines = false;

let reflectionOn = true;

function createImageWrapper(img) {
  const wrapper = document.createElement('div');
  wrapper.classList.add('image-wrapper');
  wrapper.style.left = '10px';
  wrapper.style.top = '10px';
  wrapper.style.width = img.naturalWidth + 'px';
  wrapper.style.height = img.naturalHeight + 'px';

  img.style.width = '100%';
  img.style.height = 'auto';
  img.style.display = 'block';
  img.style.userSelect = 'none';
  wrapper.appendChild(img);

  // Reflection
  const reflection = img.cloneNode();
  reflection.style.position = 'absolute';
  reflection.style.top = '100%';
  reflection.style.left = '0';
  reflection.style.width = '100%';
  reflection.style.height = 'auto';
  reflection.style.transform = 'scaleY(-1)';
  reflection.style.opacity = opacitySlider.value;
  reflection.style.filter = 'brightness(0.6)';
  reflection.style.pointerEvents = 'none';
  reflection.style.userSelect = 'none';

  wrapper.appendChild(reflection);
  wrapper.reflection = reflection;

  // Scale
  wrapper.scale = 1;

  // Resize with mouse wheel + shift
  wrapper.addEventListener('wheel', e => {
    if (!e.shiftKey) return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.05 : -0.05;
    let newScale = wrapper.scale + delta;
    newScale = Math.min(Math.max(newScale, 0.1), 5);
    wrapper.scale = newScale;
    img.style.transform = `scale(${newScale})`;
    reflection.style.transform = `scale(${newScale}, -1)`;
    wrapper.style.width = img.naturalWidth * newScale + 'px';
    wrapper.style.height = img.naturalHeight * newScale + 'px';
  });

  return wrapper;
}

function updateReflectionOpacity() {
  images.forEach(wrapper => {
    if (wrapper.reflection) {
      wrapper.reflection.style.opacity = reflectionOn ? opacitySlider.value : '0';
    }
  });
}

function updateBackground() {
  if (transparentToggle.checked) {
    previewArea.style.backgroundColor = 'transparent';
  } else {
    previewArea.style.backgroundColor = '#ffffff';
  }
}

function clearAll() {
  images.forEach(img => previewArea.removeChild(img));
  images = [];
}

function drawGuideLines(x, y, targetWrapper) {
  const oldLines = previewArea.querySelectorAll('.guide-line');
  oldLines.forEach(line => previewArea.removeChild(line));

  if (!targetWrapper) return;

  const tolerance = 7;
  const targetRect = targetWrapper.getBoundingClientRect();
  const previewRect = previewArea.getBoundingClientRect();

  images.forEach(wrapper => {
    if (wrapper === targetWrapper) return;
    const rect = wrapper.getBoundingClientRect();

    const relX = x;
    const relY = y;
    const wrapperX = rect.left - previewRect.left;
    const wrapperY = rect.top - previewRect.top;

    const targetWidth = targetWrapper.offsetWidth;
    const targetHeight = targetWrapper.offsetHeight;
    const wrapperWidth = wrapper.offsetWidth;
    const wrapperHeight = wrapper.offsetHeight;

    // Left edges snap
    if (Math.abs(relX - wrapperX) <= tolerance) {
      const line = document.createElement('div');
      line.classList.add('guide-line', 'vertical');
      line.style.left = `${wrapperX}px`;
      line.style.top = '0';
      line.style.height = '100%';
      previewArea.appendChild(line);
      targetWrapper.style.left = `${wrapperX}px`;
    }
    // Right edges snap
    if (Math.abs((relX + targetWidth) - (wrapperX + wrapperWidth)) <= tolerance) {
      const line = document.createElement('div');
      line.classList.add('guide-line', 'vertical');
      line.style.left = `${wrapperX + wrapperWidth}px`;
      line.style.top = '0';
      line.style.height = '100%';
      previewArea.appendChild(line);
      targetWrapper.style.left = `${wrapperX + wrapperWidth - targetWidth}px`;
    }
    // Top edges snap
    if (Math.abs(relY - wrapperY) <= tolerance) {
      const line = document.createElement('div');
      line.classList.add('guide-line', 'horizontal');
      line.style.top = `${wrapperY}px`;
      line.style.left = '0';
      line.style.width = '100%';
      previewArea.appendChild(line);
      targetWrapper.style.top = `${wrapperY}px`;
    }
    // Bottom edges snap
    if (Math.abs((relY + targetHeight) - (wrapperY + wrapperHeight)) <= tolerance) {
      const line = document.createElement('div');
      line.classList.add('guide-line', 'horizontal');
      line.style.top = `${wrapperY + wrapperHeight}px`;
      line.style.left = '0';
      line.style.width = '100%';
      previewArea.appendChild(line);
      targetWrapper.style.top = `${wrapperY + wrapperHeight - targetHeight}px`;
    }
    // Center vertical snap
    const targetCenterX = relX + targetWidth / 2;
    const wrapperCenterX = wrapperX + wrapperWidth / 2;
    if (Math.abs(targetCenterX - wrapperCenterX) <= tolerance) {
      const line = document.createElement('div');
      line.classList.add('guide-line', 'vertical');
      line.style.left = `${wrapperCenterX}px`;
      line.style.top = '0';
      line.style.height = '100%';
      previewArea.appendChild(line);
      targetWrapper.style.left = `${wrapperCenterX - targetWidth / 2}px`;
    }
    // Center horizontal snap
    const targetCenterY = relY + targetHeight / 2;
    const wrapperCenterY = wrapperY + wrapperHeight / 2;
    if (Math.abs(targetCenterY - wrapperCenterY) <= tolerance) {
      const line = document.createElement('div');
      line.classList.add('guide-line', 'horizontal');
      line.style.top = `${wrapperCenterY}px`;
      line.style.left = '0';
      line.style.width = '100%';
      previewArea.appendChild(line);
      targetWrapper.style.top = `${wrapperCenterY - targetHeight / 2}px`;
    }
  });
}

function toggleCenterLinesFunc() {
  showCenterLines = !showCenterLines;
  centerLines.style.display = showCenterLines ? 'block' : 'none';
}

imageUpload.addEventListener('change', e => {
  const files = Array.from(e.target.files);
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = function(ev) {
      const img = new Image();
      img.onload = function() {
        const wrapper = createImageWrapper(img);
        previewArea.appendChild(wrapper);
        // Center newly added image
        wrapper.style.left = (previewArea.clientWidth / 2 - img.naturalWidth / 2) + 'px';
        wrapper.style.top = (previewArea.clientHeight / 2 - img.naturalHeight / 2) + 'px';
        images.push(wrapper);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
  e.target.value = '';
});

previewArea.addEventListener('mousedown', e => {
  if (e.target.tagName !== 'IMG') return;
  const wrapper = e.target.parentElement;
  dragHoldTimeout = setTimeout(() => {
    draggingImage = wrapper;
    dragOffsetX = e.clientX - wrapper.offsetLeft;
    dragOffsetY = e.clientY - wrapper.offsetTop;
    canDrag = true;
    wrapper.classList.add('dragging');
  }, 300);
});

previewArea.addEventListener('mouseup', e => {
  clearTimeout(dragHoldTimeout);
  if (draggingImage) draggingImage.classList.remove('dragging');
  draggingImage = null;
  canDrag = false;
  // Remove guide lines
  const oldLines = previewArea.querySelectorAll('.guide-line');
  oldLines.forEach(line => previewArea.removeChild(line));
});

previewArea.addEventListener('mousemove', e => {
  if (!canDrag || !draggingImage) return;
  e.preventDefault();
  let x = e.clientX - dragOffsetX;
  let y = e.clientY - dragOffsetY;

  // Clamp inside previewArea
  x = Math.max(0, Math.min(x, previewArea.clientWidth - draggingImage.offsetWidth));
  y = Math.max(0, Math.min(y, previewArea.clientHeight - draggingImage.offsetHeight));

  draggingImage.style.left = x + 'px';
  draggingImage.style.top = y + 'px';

  drawGuideLines(x, y, draggingImage);
});

opacitySlider.addEventListener('input', () => {
  updateReflectionOpacity();
});

transparentToggle.addEventListener('change', () => {
  updateBackground();
});

clearBtn.addEventListener('click', () => {
  clearAll();
});

toggleCenterBtn.addEventListener('click', () => {
  toggleCenterLinesFunc();
});

downloadBtn.addEventListener('click', () => {
  if (images.length === 0) {
    alert('Ingen billeder til eksport!');
    return;
  }

  const [w, h] = (() => {
    const val = canvasSizeSelect.value;
    if (val === 'auto') {
      let maxRight = 0;
      let maxBottom = 0;
      images.forEach(wrapper => {
        const left = parseFloat(wrapper.style.left);
        const top = parseFloat(wrapper.style.top);
        const width = wrapper.offsetWidth;
        const height = wrapper.offsetHeight;
        if (left + width > maxRight) maxRight = left + width;
        if (top + height > maxBottom) maxBottom = top + height;
      });
      return [Math.ceil(maxRight), Math.ceil(maxBottom)];
    } else {
      const parts = val.split('x');
      return [parseInt(parts[0]), parseInt(parts[1])];
    }
  })();

  exportCanvas.width = w;
  exportCanvas.height = h;
  const ctx = exportCanvas.getContext('2d');

  if (transparentToggle.checked) {
    ctx.clearRect(0, 0, w, h);
  } else {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
  }

  images.forEach(wrapper => {
    const img = wrapper.querySelector('img');
    const scale = wrapper.scale || 1;
    const left = parseFloat(wrapper.style.left);
    const top = parseFloat(wrapper.style.top);
    const imgWidth = img.naturalWidth * scale;
    const imgHeight = img.naturalHeight * scale;

    // Draw main image
    ctx.drawImage(img, left, top, imgWidth, imgHeight);

    // Draw reflection
    if (reflectionOn) {
      ctx.save();
      ctx.globalAlpha = parseFloat(opacitySlider.value);
      ctx.translate(left, top + imgHeight * 2);
      ctx.scale(1, -1);
      ctx.filter = 'brightness(0.6)';
      ctx.drawImage(img, 0, 0, imgWidth, imgHeight);
      ctx.restore();
    }
  });

  const format = fileFormatSelect.value;
  exportCanvas.toBlob(blob => {
    if (!blob) {
      alert('Fejl ved eksport');
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `studio_preview.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }, `image/${format}`);
});

// Init
updateReflectionOpacity();
updateBackground();
