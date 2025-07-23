// ==== Globale DOM-elementer ====
const previewArea = document.getElementById('previewArea');  // Div hvor billeder placeres og manipuleres
const exportCanvas = document.getElementById('exportCanvas'); // Canvas til eksport
const ctx = exportCanvas.getContext('2d');                    // Canvas 2D kontekst til tegning
const imageUpload = document.getElementById('imageUpload');   // Fil-upload input
const opacitySlider = document.getElementById('opacitySlider'); // Slider til reflektions-intensitet
const bgColorPicker = document.getElementById('bgColorPicker'); // Baggrundsfarve picker
const transparentToggle = document.getElementById('transparentToggle'); // Checkbox til transparent bg
const canvasSizeSelect = document.getElementById('canvasSize'); // Vælg canvas størrelse
const fileFormatSelect = document.getElementById('fileFormat'); // Vælg eksport filformat
const toggleGridCheckbox = document.getElementById('toggleGrid'); // Checkbox for grid snapping
const canvasSizeValue = document.getElementById('canvasSize').value; // fx "1280x1280" eller "1024x1024" eller "auto"


// ==== Globale tilstandsvariabler ====
const images = [];  // Array til at gemme alle billede-objekter, som indeholder data og elementer

let currentDrag = null;  // Hvilket billede der er ved at blive dragget/resized
let offsetX = 0;         // Offset til drag-bevægelse X
let offsetY = 0;         // Offset til drag-bevægelse Y
let zoomLevel = 1;       // Zoom niveau på canvas (hvis implementeret)
// ==== Event listeners ====
document.getElementById('imageUpload').addEventListener('change', handleImageUpload);
document.getElementById('opacitySlider').addEventListener('input', () => {
  if (currentDrag) {
    currentDrag.intensity = parseFloat(event.target.value);
    render();
  }
});
document.getElementById('bgColorPicker').addEventListener('input', (e) => {
  previewArea.style.backgroundColor = e.target.value;
});
document.getElementById('transparentToggle').addEventListener('change', (e) => {
  previewArea.style.backgroundColor = e.target.checked ? 'transparent' : document.getElementById('bgColorPicker').value;
});
document.getElementById('canvasSize').addEventListener('change', (e) => {
  const val = e.target.value;
  if(val === 'auto'){
    // Auto kan sættes til previewAreas egen størrelse fx
    exportCanvas.width = previewArea.clientWidth;
    exportCanvas.height = previewArea.clientHeight;
  } else {
    const [w,h] = val.split('x').map(Number);
    exportCanvas.width = w;
    exportCanvas.height = h;
  }
});
document.getElementById('toggleGrid').addEventListener('change', render);

document.addEventListener('DOMContentLoaded', () => {
  // Tilføj til DOM
  previewArea.appendChild(wrapper);
});


// ==== Upload billeder og tilføj ====
function handleImageUpload(e) {
  Array.from(e.target.files).forEach(file => {
    const src = URL.createObjectURL(file);
    addImage(src);
  });
}

// ==== Tilføj billede med wrapper, resize-handle, spejling og drag ====
function addImage(src) {
  // Opret wrapper div som indeholder billedet + resize håndtag
  const wrapper = document.createElement('div');
  wrapper.classList.add('image-wrapper'); // Matcher CSS
  wrapper.style.position = 'absolute';    // For at kunne placere frit
  wrapper.style.cursor = 'move';          // Mouse cursor ved hover

  // Sæt startdimensioner
  const startWidth = 150;
  const startHeight = 150;

  // Placér billedet i midten af previewArea
  const previewRect = previewArea.getBoundingClientRect();
const startX = previewArea.offsetWidth / 2 - startWidth / 2;
const startY = previewArea.offsetHeight / 2 - startHeight / 2;


  // Sæt position og størrelse på wrapper
 wrapper.style.left = startX + 'px';
wrapper.style.top = startY + 'px';
wrapper.style.width = startWidth + 'px';
wrapper.style.height = startHeight + 'px';

  // Opret billed-elementet
  const img = document.createElement('img');
  img.src = src;
  img.classList.add('main-image');  // VIGTIG! For CSS target
  img.style.userSelect = 'none';
  img.style.display = 'block';       // Fjerner whitespace under billedet
  img.style.pointerEvents = 'none';  // Mus events går til wrapper
  wrapper.appendChild(img);

  // Tilføj resize-håndtag (lille firkant nederst til højre)
  const resizeHandle = document.createElement('div');
  resizeHandle.classList.add('resize-handle');
  wrapper.appendChild(resizeHandle);

  // Opret et billede-objekt til at holde data
  const imgObj = {
    wrapper,
    img,
    x: startX,
    y: startY,
    width: startWidth,
    height: startHeight,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    mirror: false,
    intensity: 1
  };

  // Gem i global images array
  images.push(imgObj);

  // Tilføj wrapper til previewArea i DOM
  previewArea.appendChild(wrapper);

  // Gør billedet dragbart og resizable
  makeDraggable(wrapper, imgObj);

  // Render billedet med startparametre
  render();

  return imgObj;
}

// ==== Drag og resize med håndtag ====
function makeDraggable(wrapper, imgObj) {
  // Opret resize-håndtag (lille firkant nederst til højre)
  const resizeHandle = document.createElement('div');
  resizeHandle.classList.add('resize-handle');
  wrapper.appendChild(resizeHandle);

  let dragging = false;
  let resizing = false;

  let offsetX, offsetY;
  let startWidth, startHeight;
  let startX, startY;

  // Drag start
  wrapper.addEventListener('mousedown', e => {
    if (e.target === resizeHandle) return; // Hvis resize håndtag, ignorer drag start
    dragging = true;
    currentDrag = imgObj;

    const previewRect = previewArea.getBoundingClientRect();
    offsetX = e.clientX - previewRect.left - imgObj.x;
    offsetY = e.clientY - previewRect.top - imgObj.y;

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });

  // Resize start
  resizeHandle.addEventListener('mousedown', e => {
    e.stopPropagation(); // Forhindrer drag ved resize
    resizing = true;
    currentDrag = imgObj;

    startWidth = imgObj.width;
    startHeight = imgObj.height;
    startX = e.clientX;
    startY = e.clientY;

    document.addEventListener('mousemove', onMouseResizeMove);
    document.addEventListener('mouseup', onMouseResizeUp);
  });

  // Zoom med scroll
  wrapper.addEventListener('wheel', e => {
    e.preventDefault();
    currentDrag = imgObj;

    const scaleAmount = 0.1;
    if (e.deltaY < 0) {
      imgObj.scaleX += scaleAmount;
      imgObj.scaleY += scaleAmount;
    } else {
      imgObj.scaleX = Math.max(0.1, imgObj.scaleX - scaleAmount);
      imgObj.scaleY = Math.max(0.1, imgObj.scaleY - scaleAmount);
    }
    render();
  });

  // Mousemove for drag
  function onMouseMove(e) {
    if (!dragging) return;

    const previewRect = previewArea.getBoundingClientRect();
    let x = e.clientX - previewRect.left - offsetX;
    let y = e.clientY - previewRect.top - offsetY;

    if (document.getElementById('toggleGrid').checked) {
      const snap = snapToGuides(x, y, imgObj.width, imgObj.height);
      x = snap.x;
      y = snap.y;
    }

    imgObj.x = x;
    imgObj.y = y;
    render();
  }

  // Mouseup for drag
  function onMouseUp() {
    dragging = false;
    currentDrag = null;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    updateGuides(false);
  }

  // Mousemove for resize
  function onMouseResizeMove(e) {
    if (!resizing) return;

    let deltaX = e.clientX - startX;
    let deltaY = e.clientY - startY;

    let newWidth = Math.max(30, startWidth + deltaX);
    let newHeight = Math.max(30, startHeight + deltaY);

    // Bevarer billedets proportioner
    const aspectRatio = startWidth / startHeight;
    if (newWidth / newHeight > aspectRatio) {
      newHeight = newWidth / aspectRatio;
    } else {
      newWidth = newHeight * aspectRatio;
    }

    imgObj.width = newWidth;
    imgObj.height = newHeight;
    render();
  }

  // Mouseup for resize
  function onMouseResizeUp() {
    resizing = false;
    currentDrag = null;
    document.removeEventListener('mousemove', onMouseResizeMove);
    document.removeEventListener('mouseup', onMouseResizeUp);
    updateGuides(false);
  }
}

// ==== Snap funktion til midterlinjer ====
function snapToGuides(x, y, width, height) {
  const guides = {
    vertical: previewArea.clientWidth / 2,
    horizontal: previewArea.clientHeight / 2
  };

  const snapDistance = 10; // px

  // Snap x til lodret midterlinje
  if(Math.abs(x - guides.vertical) < snapDistance) {
    x = guides.vertical;
  } else if (Math.abs(x + width - guides.vertical) < snapDistance) {
    x = guides.vertical - width;
  }

  // Snap y til horisontal midterlinje
  if(Math.abs(y - guides.horizontal) < snapDistance) {
    y = guides.horizontal;
  } else if (Math.abs(y + height - guides.horizontal) < snapDistance) {
    y = guides.horizontal - height;
  }

  return { x, y };
}

// ==== Render preview area ====
function render() {
  images.forEach(imgObj => {
    const { wrapper, img, x, y, width, height, rotation, scaleX, scaleY, mirror, intensity } = imgObj;

    // Opdater wrapper position og størrelse
    wrapper.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg) scale(${scaleX}, ${scaleY})`;
    wrapper.style.width = width + 'px';
    wrapper.style.height = height + 'px';

    // Sørg for billedet fylder wrapperen
    img.style.width = '100%';
    img.style.height = '100%';

    // Håndter spejling horisontalt
    if (mirror) {
      img.style.transform = 'scaleX(-1)';
    } else {
      img.style.transform = 'none';
    }

    // Juster intensiteten som brightness filter
    img.style.filter = `brightness(${intensity})`;
  });

  updateGuides();
}

// ==== Opdater midterlinjer ====
function updateGuides() {
  // Fjern evt. eksisterende guides først
  const existingGuides = previewArea.querySelectorAll('.guide-line');
  existingGuides.forEach(g => g.remove());

  // Tilføj lodret midterlinje
  const verticalGuide = document.createElement('div');
  verticalGuide.classList.add('guide-line', 'vertical');
  previewArea.appendChild(verticalGuide);

  // Tilføj horisontal midterlinje
  const horizontalGuide = document.createElement('div');
  horizontalGuide.classList.add('guide-line', 'horizontal');
  previewArea.appendChild(horizontalGuide);
}

// ==== Clear alle billeder ====
function clearImages() {
  images = [];
  while(previewArea.firstChild) {
    previewArea.removeChild(previewArea.firstChild);
  }
  render();
}

// ==== Export canvas som billede ====
function exportLayout() {
  const canvasSizeValue = document.getElementById('canvasSize').value;
  let width, height;

  if (canvasSizeValue === 'auto') {
    const previewRect = previewArea.getBoundingClientRect();
    width = Math.round(previewRect.width);
    height = Math.round(previewRect.height);
  } else {
    const parts = canvasSizeValue.split('x');
    width = parseInt(parts[0], 10);
    height = parseInt(parts[1], 10);
  }

  exportCanvas.width = width;
  exportCanvas.height = height;

  // Ryd canvas og baggrund
  ctx.clearRect(0, 0, width, height);
  if (document.getElementById('transparentToggle').checked) {
    ctx.clearRect(0, 0, width, height);
  } else {
    ctx.fillStyle = document.getElementById('bgColorPicker').value || '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }

  // Beregn scaling fra preview til export canvas
  const previewRect = previewArea.getBoundingClientRect();
  const scaleXFactor = width / previewRect.width;
  const scaleYFactor = height / previewRect.height;

  images.forEach(imgObj => {
    const { img, x, y, width: w, height: h, scaleX, scaleY, rotation, mirror, intensity } = imgObj;

    ctx.save();

    // Position og størrelse skaleret til export canvas
    const centerX = (x + w / 2) * scaleXFactor;
    const centerY = (y + h / 2) * scaleYFactor;
    ctx.translate(centerX, centerY);

    // Rotation i radianer
    ctx.rotate(rotation * Math.PI / 180);

    // Skalering + spejling
    ctx.scale(scaleX * scaleXFactor * (mirror ? -1 : 1), scaleY * scaleYFactor);

    // Juster lysstyrke (brightness)
    ctx.filter = `brightness(${intensity})`;

    // Tegn billedet centreret
    ctx.drawImage(img, -w / 2, -h / 2, w, h);

    ctx.restore();
  });

  // Trigger download
  exportCanvas.toBlob(blob => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const format = document.getElementById('fileFormat').value || 'png';
    a.download = 'trixie-layout.' + format;
    a.click();
    URL.revokeObjectURL(a.href);
  }, 'image/' + (document.getElementById('fileFormat').value || 'png'));
}
