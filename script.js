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
function handleImageUpload(e) {
  Array.from(e.target.files).forEach(file => {
    const img = new Image();
    img.onload = () => addImage(img);
    img.src = URL.createObjectURL(file);
  });
}

function addImage(img) {
  const previewArea = document.getElementById("previewArea");

  // Opret billedobjekt
  const imgObj = {
    img,
    x: 100,
    y: 100,
    width: img.width,
    height: img.height,
    rotation: 0,
    showReflection: true,
    wrapper: null
  };

  // Opret wrapper
  const wrapper = document.createElement("div");
  wrapper.className = "image-wrapper";
  wrapper.style.left = imgObj.x + "px";
  wrapper.style.top = imgObj.y + "px";
  wrapper.style.width = imgObj.width + "px";
  wrapper.style.height = imgObj.height + "px";
  wrapper.style.position = "absolute";

  // Hovedbillede
  const mainImg = img.cloneNode();
  mainImg.className = "main-image";
  mainImg.style.width = "100%";
  mainImg.style.height = "100%";
  wrapper.appendChild(mainImg);

  // Reflektion
  const reflection = img.cloneNode();
  reflection.className = "reflection";
  reflection.style.opacity = "0.3";
  wrapper.appendChild(reflection);

  // Resize-håndtag
  const handle = document.createElement("div");
  handle.className = "resize-handle";
  wrapper.appendChild(handle);

  // Tilføj til DOM
  previewArea.appendChild(wrapper);

  // Gem wrapper i objekt og tilføj til array
  imgObj.wrapper = wrapper;
  images.push(imgObj);

  // Gør billede drag/resizable
  makeDraggable(wrapper, imgObj);

  // Opdater layout
  render();
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

  function onMouseUp() {
    isDragging = false;
    isResizing = false;
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  }
}

  function onMouseMove(e) {
    const previewRect = previewArea.getBoundingClientRect();
    const mouseX = e.clientX - previewRect.left;
    const mouseY = e.clientY - previewRect.top;

    if (dragging) {
      let newX = mouseX - offsetX;
      let newY = mouseY - offsetY;

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

  function onMouseUp() {
    dragging = false;
    resizing = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
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
