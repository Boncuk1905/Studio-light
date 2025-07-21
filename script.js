const uploadInput = document.getElementById("imageUpload");
const previewArea = document.getElementById("previewArea");
const canvasElement = document.getElementById("exportCanvas");
const opacitySlider = document.getElementById("opacitySlider");
const lightAngleSlider = document.getElementById("lightAngleSlider");
const canvasSizeSelect = document.getElementById("canvasSize");
const fileFormatSelect = document.getElementById("fileFormat");
const toggleGrid = document.getElementById("toggleGrid");

uploadInput.addEventListener("change", handleUpload);
opacitySlider.addEventListener("input", updateReflectionOpacity);
lightAngleSlider.addEventListener("input", updateLightDirection);

let dragData = {
  draggingEl: null,
  offsetX: 0,
  offsetY: 0,
  isDragging: false
};

let lightAngleRad = (lightAngleSlider.value * Math.PI) / 180;

function handleUpload(event) {
  const files = Array.from(event.target.files);
  if (!files.length) return;

  previewArea.innerHTML = "";

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

      const col = index % columns;
      const row = Math.floor(index / columns);

      wrapper.style.left = `${20 + col * spacingX}px`;
      wrapper.style.top = `${20 + row * spacingY}px`;

      const img = document.createElement("img");
      img.src = url;

      // Når billedet loader, sæt højde så den passer med bredden og bevarer prop.
      img.onload = () => {
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
}

function makeDraggable(el) {
  el.style.position = "absolute";

  el.addEventListener("mousedown", e => {
    e.preventDefault();
    dragData.draggingEl = el;
    dragData.offsetX = e.clientX - el.getBoundingClientRect().left;
    dragData.offsetY = e.clientY - el.getBoundingClientRect().top;
    dragData.isDragging = true;
    el.style.zIndex = 1000;
  });

  window.addEventListener("mousemove", e => {
    if (!dragData.isDragging || !dragData.draggingEl) return;

    const containerRect = previewArea.getBoundingClientRect();
    const el = dragData.draggingEl;
    const elRect = el.getBoundingClientRect();

    let x = e.clientX - containerRect.left - dragData.offsetX;
    let y = e.clientY - containerRect.top - dragData.offsetY;

    if (x < 0) x = 0;
    if (y < 0) y = 0;
    if (x + elRect.width > containerRect.width) x = containerRect.width - elRect.width;
    if (y + elRect.height > containerRect.height) y = containerRect.height - elRect.height;

    el.style.left = x + "px";
    el.style.top = y + "px";
  });

  window.addEventListener("mouseup", e => {
    if (dragData.isDragging && dragData.draggingEl) {
      dragData.draggingEl.style.zIndex = 1;
    }
    dragData.isDragging = false;
    dragData.draggingEl = null;
  });
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

  // Hvid baggrund i eksport
  ctx.fillStyle = "#fff";
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

    // Tegn billede
    ctx.drawImage(img, x, y, displayedWidth, displayedHeight);

    // Tegn refleksion (flip lodret)
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate(x, y + displayedHeight * 2);
    ctx.scale(1, -1);
    ctx.drawImage(img, 0, 0, displayedWidth, displayedHeight);
    ctx.restore();
  });

  const dataURL = canvasElement.toDataURL(`image/${fileFormat}`);
  const link = document.createElement("a");
  link.download = `layout.${fileFormat}`;
  link.href = dataURL;
  link.click();
}
