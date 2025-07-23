// ==== Globale variabler ====
const previewArea = document.getElementById('previewArea');
const exportCanvas = document.getElementById('exportCanvas');
const ctx = exportCanvas.getContext('2d');
const images = [];


let images = []; // Array med alle billed-objekter
let currentDrag = null;
let offsetX = 0, offsetY = 0;

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
  wrapper.classList.add('image-wrapper'); // Sørg for CSS matcher klassenavnet
  wrapper.style.position = 'absolute';
  wrapper.style.cursor = 'move';

  // Opret billed-elementet
  const img = document.createElement('img');
  img.src = src;
  img.classList.add('main-image'); // Husk match CSS
  img.style.userSelect = 'none';
  img.style.display = 'block'; // Fjerner whitespace under billedet
  img.style.pointerEvents = 'none'; // Mus-events går til wrapperen

  wrapper.appendChild(img);

  // Resize håndtag
  const resizeHandle = document.createElement('div');
  resizeHandle.classList.add('resize-handle');
  wrapper.appendChild(resizeHandle);

  // Start dimensioner (kan tilpasses)
  const startWidth = 150;
  const startHeight = 150;

  // Placér billedet midt i previewArea
  const previewRect = previewArea.getBoundingClientRect();
  const startX = previewRect.width / 2 - startWidth / 2;
  const startY = previewRect.height / 2 - startHeight / 2;

  // Opret objekt til at holde data
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

  // Tilføj til globalt array
  images.push(imgObj);

  // Tilføj til DOM
  previewArea.appendChild(wrapper);

  // Gør dragbart og resizable
  makeDraggable(wrapper, imgObj);

  // Render
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
  const canvas = document.getElementById("exportCanvas");
  const ctx = canvas.getContext("2d");

  // Læs valgt filformat
  const format = document.getElementById("fileFormat").value;

  // Tjek transparent eller ej
  const transparent = document.getElementById("transparentToggle").checked;

  // Baggrund
  if (!transparent) {
    const bgColor = document.getElementById("bgColorPicker").value;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // transparent
  }

  // Tegn hvert billede
  images.forEach(imgObj => {
    const { img, x, y, width, height, rotation, mirror, intensity } = imgObj;

    ctx.save();

    // Flyt til midten af billedets placering
    ctx.translate(x + width / 2, y + height / 2);

    // Rotation
    ctx.rotate((rotation * Math.PI) / 180);

    // Spejling
    const scaleX = mirror ? -1 : 1;
    ctx.scale(scaleX, 1);

    // Lysstyrke/intensitet
    ctx.filter = `brightness(${intensity})`;

    // Tegn billede (centreret om det punkt vi roterede omkring)
    ctx.drawImage(img, -width / 2, -height / 2, width, height);

    ctx.restore();
  });

  // Download canvas
  canvas.toBlob(blob => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "trixie-layout." + format;
    a.click();
    URL.revokeObjectURL(a.href);
  }, 'image/' + format);
}
