// === Global variables ===
let images = [];
let currentDrag = null;
let offsetX = 0, offsetY = 0;
let reflectionOpacity = 0.25;

// === Init ===
document.getElementById("imageUpload").addEventListener("change", handleImageUpload);
document.getElementById("opacitySlider").addEventListener("input", e => {
  reflectionOpacity = parseFloat(e.target.value);
  render();
});
document.getElementById("bgColorPicker").addEventListener("input", e => {
  backgroundColor = e.target.value;
  render();
});
document.getElementById("transparentToggle").addEventListener("change", e => {
  transparentBackground = e.target.checked;
  render();
});
document.getElementById("canvasSize").addEventListener("change", e => {
  setCanvasSize(e.target.value);
});
document.getElementById("toggleGrid").addEventListener("change", () => render());

let backgroundColor = "#ffffff";
let transparentBackground = false;

// === Handle Upload ===
document.getElementById("imageUpload").addEventListener("change", handleImageUpload);

document.getElementById("imageUpload").addEventListener("change", handleImageUpload);

function handleImageUpload(e) {
  Array.from(e.target.files).forEach(file => {
    const src = URL.createObjectURL(file);
    addImage(src);
  });
}

function addImage(src) {
  const wrapper = document.createElement('div');
  wrapper.classList.add('image-wrapper');
  wrapper.style.position = 'absolute';
  wrapper.style.left = '100px';
  wrapper.style.top = '100px';

  const img = document.createElement('img');
  img.classList.add('main-image');
  img.src = src;
  img.onload = () => {
    const width = img.naturalWidth;
    const height = img.naturalHeight;

    wrapper.style.width = width + "px";
    wrapper.style.height = height + "px";

    const reflection = img.cloneNode();
    reflection.classList.add("reflection");

    wrapper.appendChild(img);
    wrapper.appendChild(reflection);

    const resizeHandle = document.createElement("div");
    resizeHandle.classList.add("resize-handle");
    wrapper.appendChild(resizeHandle);

    const imgObj = {
      wrapper,
      img,
      x: 100,
      y: 100,
      width,
      height,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      mirror: false,
      intensity: 1,
      showReflection: true
    };

    images.push(imgObj);
    previewArea.appendChild(wrapper);
    makeDraggable(wrapper, imgObj);
    render();
  };
}


// === Drag, Snap & Resize ===
function makeDraggable(wrapper, imgObj) {
  const handle = wrapper.querySelector(".resize-handle");

  let isDragging = false;
  let isResizing = false;

  let startX, startY;
  let startWidth, startHeight;
  let offsetX, offsetY;

  // --- Resize ---
  handle.addEventListener("mousedown", (e) => {
    e.stopPropagation();
    isResizing = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = wrapper.getBoundingClientRect();
    startWidth = rect.width;
    startHeight = rect.height;
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });

  // --- Drag ---
  wrapper.addEventListener("mousedown", (e) => {
    if (e.target.classList.contains("resize-handle")) return;

    isDragging = true;
    const previewRect = previewArea.getBoundingClientRect();
    offsetX = e.clientX - previewRect.left - imgObj.x;
    offsetY = e.clientY - previewRect.top - imgObj.y;
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });

  // Mouse Move
  function onMouseMove(e) {
    const previewRect = previewArea.getBoundingClientRect();

    if (isDragging) {
      let x = e.clientX - previewRect.left - offsetX;
      let y = e.clientY - previewRect.top - offsetY;

      // Snap til midte hvis aktiveret
      if (document.getElementById("toggleGrid")?.checked) {
        const snap = snapToGuides(x, y, imgObj.width, imgObj.height);
        x = snap.x;
        y = snap.y;
      }

      imgObj.x = x;
      imgObj.y = y;
    }

    if (isResizing) {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      imgObj.width = Math.max(20, startWidth + deltaX);
      imgObj.height = Math.max(20, startHeight + deltaY);
    }

    render();
  }
// mouse Up
  function onMouseUp() {
    isDragging = false;
    isResizing = false;
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    UpdateGuides(false);
  }
}

      // Snap til midten hvis ønsket
      if (document.getElementById("toggleGrid")?.checked) {
        const snap = snapToGuides(newX, newY, imgObj.width, imgObj.height);
        newX = snap.x;
        newY = snap.y;
      }

      imgObj.x = newX;
      imgObj.y = newY;
      render();
    }

    if (resizing) {
      let newWidth = startWidth + (mouseX - startX);
      let newHeight = startHeight + (mouseY - startY);

      // Bevar billedets proportioner
      const aspectRatio = startWidth / startHeight;
      if (newWidth / newHeight > aspectRatio) {
        newHeight = newWidth / aspectRatio;
      } else {
        newWidth = newHeight * aspectRatio;
      }

      if (newWidth < 20) newWidth = 20;
      if (newHeight < 20) newHeight = 20;

      imgObj.width = newWidth;
      imgObj.height = newHeight;
      render();
    }
  }

function updateWrapperStyle(imgObj) {
  const { wrapper, x, y, width, height, rotation, reflection } = imgObj;
  wrapper.style.left = x + "px";
  wrapper.style.top = y + "px";
  wrapper.style.width = width + "px";
  wrapper.style.height = height + "px";
  wrapper.style.transform = `rotate(${rotation}deg)`;
  reflection.style.opacity = reflectionOpacity;
}
// === Render billeder og refleksion på canvas ===
function render() {
  const canvas = document.getElementById('exportCanvas');
  const ctx = canvas.getContext('2d');

  canvas.width = parseInt(previewArea.style.width);
  canvas.height = parseInt(previewArea.style.height);

  // Ryd canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Baggrund
  if (!transparentBackground) {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Tegn hvert billede
  images.forEach(imgObj => {
    const { img, x, y, width, height, rotation, showReflection } = imgObj;

    ctx.save();
    ctx.translate(x + width / 2, y + height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(img, -width / 2, -height / 2, width, height);
    ctx.restore();

    if (showReflection) {
      ctx.save();
      ctx.translate(x + width / 2, y + height * 1.5);
      ctx.scale(1, -1);
      ctx.globalAlpha = reflectionOpacity;
      ctx.drawImage(img, -width / 2, -height / 2, width, height);
      ctx.restore();

      const gradient = ctx.createLinearGradient(0, y + height, 0, y + height * 1.5);
      gradient.addColorStop(0, `rgba(255,255,255,${reflectionOpacity})`);
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y + height, width, height / 2);
    }
  });

  updateGuides(document.getElementById("toggleGrid")?.checked);
}

// === Snap til centerlinjer ===
function snapToGuides(x, y, width, height) {
  const canvasMidX = previewArea.clientWidth / 2;
  const canvasMidY = previewArea.clientHeight / 2;
  const snapThreshold = 10;

  const centerX = x + width / 2;
  const centerY = y + height / 2;

  if (Math.abs(centerX - canvasMidX) < snapThreshold) {
    x = canvasMidX - width / 2;
  }
  if (Math.abs(centerY - canvasMidY) < snapThreshold) {
    y = canvasMidY - height / 2;
  }

  return { x, y };
}

// === Midterlinje guides ===
function updateGuides(show) {
  const xGuide = document.querySelector(".guide-x");
  const yGuide = document.querySelector(".guide-y");
  if (!xGuide || !yGuide) return;

  xGuide.style.left = (previewArea.clientWidth / 2) + "px";
  yGuide.style.top = (previewArea.clientHeight / 2) + "px";

  xGuide.style.display = show ? "block" : "none";
  yGuide.style.display = show ? "block" : "none";
}

// === Download ===
function exportLayout() {
  render(); // sørg for canvas er opdateret

  const canvas = document.getElementById("exportCanvas");
  const link = document.createElement("a");
  const format = document.getElementById("fileFormat").value;

  link.download = "layout." + format;
  link.href = canvas.toDataURL(`image/${format}`);
  link.click();
}
// --- Zoom funktion ---
let zoomLevel = 1;
const zoomStep = 0.1;
const minZoom = 0.3;
const maxZoom = 3;

const previewWrapper = document.getElementById("previewWrapper");

function applyZoom() {
  previewArea.style.transform = `scale(${zoomLevel})`;
  previewArea.style.transformOrigin = "top left";
}

// Scroll for zoom
previewWrapper.addEventListener("wheel", (e) => {
  e.preventDefault();
  if (e.deltaY < 0) {
    zoomLevel = Math.min(zoomLevel + zoomStep, maxZoom);
  } else {
    zoomLevel = Math.max(zoomLevel - zoomStep, minZoom);
  }
  applyZoom();
});
