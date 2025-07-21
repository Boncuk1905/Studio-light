const uploadInput = document.getElementById("imageUpload");
const previewArea = document.getElementById("previewArea");
const canvasElement = document.getElementById("exportCanvas");
const opacitySlider = document.getElementById("opacitySlider");
const canvasSizeSelect = document.getElementById("canvasSize");
const fileFormatSelect = document.getElementById("fileFormat");

uploadInput.addEventListener("change", handleUpload);
opacitySlider.addEventListener("input", updateReflectionOpacity);

let dragData = {
  draggingEl: null,
  offsetX: 0,
  offsetY: 0,
};

function handleUpload(event) {
  const files = Array.from(event.target.files);
  if (!files.length) return;

  // Ryd previewArea inden upload
  previewArea.innerHTML = "";

  const columns = 4; // Hvor mange billeder pr. række
  const spacingX = 230; // afstand mellem billeder vandret
  const spacingY = 320; // afstand mellem billeder lodret

  files.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = e => {
      const url = e.target.result;

      const wrapper = document.createElement("div");
      wrapper.className = "image-wrapper";
      wrapper.style.setProperty("--img-url", `url(${url})`);
      wrapper.style.setProperty("--reflection-opacity", opacitySlider.value);

      // Beregn position i grid (spread ud i rækker og kolonner)
      const col = index % columns;
      const row = Math.floor(index / columns);

      wrapper.style.left = `${20 + col * spacingX}px`;
      wrapper.style.top = `${20 + row * spacingY}px`;

      const img = document.createElement("img");
      img.src = url;

      wrapper.appendChild(img);
      previewArea.appendChild(wrapper);

      makeDraggable(wrapper);
    };
    reader.readAsDataURL(file);
  });

  // Juster højden på previewArea så alle billeder er synlige
  const rows = Math.ceil(files.length / columns);
  previewArea.style.height = `${rows * spacingY + 40}px`;
}

function updateReflectionOpacity() {
  document.querySelectorAll(".image-wrapper").forEach(wrapper => {
    wrapper.style.setProperty("--reflection-opacity", opacitySlider.value);
  });
}

function clearImages() {
  uploadInput.value = "";
  previewArea.innerHTML = "";
  previewArea.style.height = "auto";
}

// Drag & drop - kun ét element kan flyttes ad gangen
function makeDraggable(el) {
  el.style.position = "absolute";

  el.addEventListener("mousedown", e => {
    e.preventDefault();

    dragData.draggingEl = el;

    const rect = el.getBoundingClientRect();
    dragData.offsetX = e.clientX - rect.left;
    dragData.offsetY = e.clientY - rect.top;

    el.style.zIndex = 1000;
  });
}

window.addEventListener("mousemove", e => {
  if (!dragData.draggingEl) return;

  const containerRect = previewArea.getBoundingClientRect();
  const el = dragData.draggingEl;
  const elRect = el.getBoundingClientRect();

  let x = e.clientX - containerRect.left - dragData.offsetX;
  let y = e.clientY - containerRect.top - dragData.offsetY;

  // Begræns inden for previewArea
  if (x < 0) x = 0;
  if (y < 0) y = 0;
  if (x + elRect.width > containerRect.width) x = containerRect.width - elRect.width;
  if (y + elRect.height > containerRect.height) y = containerRect.height - elRect.height;

  el.style.left = x + "px";
  el.style.top = y + "px";
});

window.addEventListener("mouseup", e => {
  if (dragData.draggingEl) {
    dragData.draggingEl.style.zIndex = 1;
  }
  dragData.draggingEl = null;
});

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

  // Hvid baggrund
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const containerRect = previewArea.getBoundingClientRect();

  // Find samlet bounding box for alle billeder
  let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
  wrappers.forEach(wrapper => {
    const r = wrapper.getBoundingClientRect();
    if (r.left < minX) minX = r.left;
    if (r.top < minY) minY = r.top;
    if (r.right > maxX) maxX = r.right;
    if (r.bottom > maxY) maxY = r.bottom;
  });

  // Bredde/højde af alle billeder samlet
  const totalWidth = maxX - minX;
  const totalHeight = maxY - minY;

  // Skaleringsfaktor så de samlet passer i canvas (med lidt margin)
  const margin = 40;
  const scaleX = (canvasWidth - margin * 2) / totalWidth;
  const scaleY = (canvasHeight - margin * 2) / totalHeight;
  const scale = Math.min(scaleX, scaleY, 1);

  // Center offset i canvas
  const offsetX = (canvasWidth - totalWidth * scale) / 2;
  const offsetY = (canvasHeight - totalHeight * scale) / 2;

  wrappers.forEach(wrapper => {
    const img = wrapper.querySelector("img");
    const r = wrapper.getBoundingClientRect();

    // Position relativ til previewArea
    const relX = r.left - minX;
    const relY = r.top - minY;

    const drawX = offsetX + relX * scale;
    const drawY = offsetY + relY * scale;
    const drawWidth = r.width * scale;
    const drawHeight = r.height * scale;

    // Tegn "glasplade" - semi-transparent hvid med blur under billedet
    const glassHeight = drawHeight * 0.2;
    const gradient = ctx.createLinearGradient(drawX, drawY + drawHeight, drawX, drawY + drawHeight + glassHeight);
    gradient.addColorStop(0, 'rgba(255,255,255,0.3)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.shadowColor = "rgba(255,255,255,0.4)";
    ctx.shadowBlur = 15;
    ctx.fillRect(drawX, drawY + drawHeight - glassHeight / 2, drawWidth, glassHeight);

    // Fjern skygge til resten af tegninger
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;

    // Tegn hovedbillede
    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

    // Tegn refleksion
    ctx.save();
    ctx.translate(drawX, drawY + drawHeight * 2);
    ctx.scale(1, -1);
    ctx.globalAlpha = opacity;
    ctx.drawImage(img, 0, 0, drawWidth, drawHeight);
    ctx.restore();
  });

  // Download
  const dataUrl = canvasElement.toDataURL(`image/${fileFormat}`, 1.0);
  const link = document.createElement("a");
  link.download = `studio-layout.${fileFormat}`;
  link.href = dataUrl;
  link.click();
}
