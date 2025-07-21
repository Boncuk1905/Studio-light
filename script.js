const uploadInput = document.getElementById("imageUpload");
const previewArea = document.getElementById("previewArea");
const canvasElement = document.getElementById("exportCanvas");
const opacitySlider = document.getElementById("opacitySlider");
const lightAngleSlider = document.getElementById("lightAngleSlider");
const canvasSizeSelect = document.getElementById("canvasSize");
const fileFormatSelect = document.getElementById("fileFormat");

// Guide-linjer
const verticalGuide = document.createElement("div");
verticalGuide.className = "guide-line vertical";
const horizontalGuide = document.createElement("div");
horizontalGuide.className = "guide-line horizontal";
previewArea.appendChild(verticalGuide);
previewArea.appendChild(horizontalGuide);

uploadInput.addEventListener("change", handleUpload);
opacitySlider.addEventListener("input", updateReflectionOpacity);
lightAngleSlider.addEventListener("input", updateLightDirection);

let dragData = {
  draggingEl: null,
  offsetX: 0,
  offsetY: 0,
};

let lightAngleRad = (lightAngleSlider.value * Math.PI) / 180;

function handleUpload(event) {
  const files = Array.from(event.target.files);
  if (!files.length) return;

  previewArea.innerHTML = "";
  previewArea.appendChild(verticalGuide);
  previewArea.appendChild(horizontalGuide);

  const columns = 4;
  const spacingX = 230;
  const spacingY = 320;

  files.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = e => {
      const url = e.target.result;

      const wrapper = document.createElement("div");
      wrapper.className = "image-wrapper";
      wrapper.style.setProperty("--img-url", `url(${url})`);
      wrapper.style.setProperty("--reflection-opacity", opacitySlider.value);

      // Initial position i grid
      const col = index % columns;
      const row = Math.floor(index / columns);

      wrapper.style.left = `${20 + col * spacingX}px`;
      wrapper.style.top = `${20 + row * spacingY}px`;

      const img = document.createElement("img");
      img.src = url;

      img.onload = () => {
        // Bevar proportioner ved at sætte højde efter bredde
        const ratio = img.naturalHeight / img.naturalWidth;
        wrapper.style.height = `${wrapper.clientWidth * ratio}px`;
        applyShadow(wrapper, lightAngleRad);
      };

      wrapper.appendChild(img);
      previewArea.appendChild(wrapper);

      makeDraggable(wrapper);
    };
    reader.readAsDataURL(file);
  });

  // Juster preview-area højde
  const rows = Math.ceil(files.length / columns);
  previewArea.style.height = `${rows * spacingY + 40}px`;
}

function updateReflectionOpacity() {
  document.querySelectorAll(".image-wrapper").forEach(wrapper => {
    wrapper.style.setProperty("--reflection-opacity", opacitySlider.value);
  });
}

function updateLightDirection() {
  lightAngleRad = (lightAngleSlider.value * Math.PI) / 180;
  document.querySelectorAll(".image-wrapper").forEach(wrapper => {
    applyShadow(wrapper, lightAngleRad);
  });
}

function applyShadow(wrapper, angleRad) {
  const distance = 10;
  const xOffset = Math.cos(angleRad) * distance;
  const yOffset = Math.sin(angleRad) * distance;
  wrapper.style.filter = `drop-shadow(${xOffset}px ${yOffset}px 8px rgba(0,0,0,0.15))`;
}

function clearImages() {
  uploadInput.value = "";
  previewArea.innerHTML = "";
  previewArea.style.height = "auto";
  previewArea.appendChild(verticalGuide);
  previewArea.appendChild(horizontalGuide);
}

function makeDraggable(el) {
  el.style.position = "absolute";

  el.addEventListener("mousedown", e => {
    e.preventDefault();
    dragData.draggingEl = el;

    const rect = el.getBoundingClientRect();
    const containerRect = previewArea.getBoundingClientRect();

    dragData.offsetX = e.clientX - rect.left;
    dragData.offsetY = e.clientY - rect.top;

    el.style.zIndex = 1000;
  });

  el.addEventListener("mouseup", e => {
    dragData.draggingEl = null;
    el.style.zIndex = 1;
    hideGuides();
  });
}

window.addEventListener("mousemove", e => {
  if (!dragData.draggingEl) return;

  const containerRect = previewArea.getBoundingClientRect();
  const el = dragData.draggingEl;
  const elRect = el.getBoundingClientRect();

  let x = e.clientX - containerRect.left - dragData.offsetX;
  let y = e.clientY - containerRect.top - dragData.offsetY;

  // Begræns så det ikke går uden for previewArea
  x = Math.max(0, Math.min(x, containerRect.width - elRect.width));
  y = Math.max(0, Math.min(y, containerRect.height - elRect.height));

  // Snap til grid i Y-retning (sammenlign med andre billeder)
  const snapThreshold = 15;
  let snappedY = y;
  let showHorizontal = false;

  document.querySelectorAll(".image-wrapper").forEach(other => {
    if (other === el) return;
    const oy = other.offsetTop;
    if (Math.abs(y - oy) < snapThreshold) {
      snappedY = oy;
      showHorizontal = true;
    }
  });

  y = snappedY;

  // Snap til midten i X-retning
  const centerX = containerRect.width / 2 - elRect.width / 2;
  let showVertical = false;
  if (Math.abs(x - centerX) < snapThreshold) {
    x = centerX;
    showVertical = true;
  }

  el.style.left = x + "px";
  el.style.top = y + "px";

  // Vis guide-linjer kun ved snap
  if (showVertical) {
    verticalGuide.style.left = `${centerX}px`;
    verticalGuide.style.display = "block";
  } else {
    verticalGuide.style.display = "none";
  }
  if (showHorizontal) {
    horizontalGuide.style.top = `${y}px`;
    horizontalGuide.style.display = "block";
  } else {
    horizontalGuide.style.display = "none";
  }
});

window.addEventListener("mouseup", () => {
  if (dragData.draggingEl) {
    dragData.draggingEl.style.zIndex = 1;
  }
  dragData.draggingEl = null;
  hideGuides();
});

function hideGuides() {
  verticalGuide.style.display = "none";
  horizontalGuide.style.display = "none";
}

function exportLayout() {
  const wrappers = Array.from(document.querySelectorAll(".image-wrapper"));
  if (!wrappers.length) return;

  const opacity = parseFloat(opacitySlider.value);
  const fileFormat = fileFormatSelect.value;
  const size = canvasSizeSelect.value;

  let canvasWidth, canvasHeight;
  if (size === "auto") {
    const rect = previewArea.getBoundingClientRect();
    canvasWidth = rect.width;
    canvasHeight = rect.height;
  } else {
    [canvasWidth, canvasHeight] = size.split("x").map(Number);
  }

  canvasElement.width = canvasWidth;
  canvasElement.height = canvasHeight;

  const ctx = canvasElement.getContext("2d");
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.imageSmoothingQuality = "high";

  const containerRect = previewArea.getBoundingClientRect();

  // Tegn hvid baggrund
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  wrappers.forEach(wrapper => {
    const img = wrapper.querySelector("img");
    const wrapperRect = wrapper.getBoundingClientRect();

    const xRatio = canvasWidth / containerRect.width;
    const yRatio = canvasHeight / containerRect.height;

    const x = (wrapperRect.left - containerRect.left) * xRatio;
    const y = (wrapperRect.top - containerRect.top) * yRatio;

    const displayedWidth = wrapperRect.width * xRatio;
    const displayedHeight = wrapperRect.height * yRatio;

    // Tegn hovedbillede
    ctx.drawImage(img, x, y, displayedWidth, displayedHeight);

    // Tegn refleksion (spejling)
    ctx.save();
    ctx.translate(x, y + displayedHeight * 2);
    ctx.scale(1, -1);
    ctx.globalAlpha = opacity;
    ctx.drawImage(img, 0, 0, displayedWidth, displayedHeight);
    ctx.restore();
  });

  const dataUrl = canvasElement.toDataURL(`image/${fileFormat}`, 1.0);
  const link = document.createElement("a");
  link.download = `studio-layout.${fileFormat}`;
  link.href = dataUrl;
  link.click();
}
