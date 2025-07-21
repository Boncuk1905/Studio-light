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

  files.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = e => {
      const url = e.target.result;

      const wrapper = document.createElement("div");
      wrapper.className = "image-wrapper";
      wrapper.style.setProperty("--img-url", `url(${url})`);
      wrapper.style.setProperty("--reflection-opacity", opacitySlider.value);

      // Sæt startposition (frit placeret)
      wrapper.style.left = "20px";
      wrapper.style.top = `${20 + index * 320}px`;

      const img = document.createElement("img");
      img.src = url;

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

function clearImages() {
  uploadInput.value = "";
  previewArea.innerHTML = "";
}

// Forbedret drag & drop, kun ét element kan flyttes ad gangen
function makeDraggable(el) {
  el.style.position = "absolute";

  el.addEventListener("mousedown", e => {
    e.preventDefault(); // Forhindrer tekst-markering osv.

    dragData.draggingEl = el;

    // Beregn offset mellem mus og elementets øverste venstre hjørne
    const rect = el.getBoundingClientRect();
    dragData.offsetX = e.clientX - rect.left;
    dragData.offsetY = e.clientY - rect.top;

    // Forbedring: bring element til front, så det ikke bliver "overdækket"
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
    dragData.draggingEl.style.zIndex = 1; // Sæt z-index tilbage
  }
  dragData.draggingEl = null;
});

function exportLayout() {
  const wrappers = Array.from(document.querySelectorAll(".image-wrapper"));
  if (!wrappers.length) return;

  const opacity = parseFloat(opacitySlider.value);
  const fileFormat = fileFormatSelect.value;
  const size = canvasSizeSelect.value;

  // Canvas dimensioner
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

  wrappers.forEach(wrapper => {
    const img = wrapper.querySelector("img");
    const wrapperRect = wrapper.getBoundingClientRect();

    // Beregn position relativt til previewArea
    const x = wrapperRect.left - containerRect.left;
    const y = wrapperRect.top - containerRect.top;

    // Her bruger vi *kun* den skalerede bredde (wrapper.clientWidth)
    // For højde beregnes ud fra proportionen af billedet, så det ikke bliver squished

    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;

    const displayedWidth = wrapper.clientWidth;
    // Beregn højde med samme proportion
    const displayedHeight = naturalHeight * (displayedWidth / naturalWidth);

    // Tegn billede med korrekt proportion
    ctx.drawImage(img, x, y, displayedWidth, displayedHeight);

    // Tegn refleksion
    ctx.save();
    ctx.translate(x, y + displayedHeight * 2);
    ctx.scale(1, -1);
    ctx.globalAlpha = opacity;
    ctx.drawImage(img, 0, 0, displayedWidth, displayedHeight);
    ctx.restore();
  });

  // Download canvas
  const dataUrl = canvasElement.toDataURL(`image/${fileFormat}`, 1.0);
  const link = document.createElement("a");
  link.download = `studio-layout.${fileFormat}`;
  link.href = dataUrl;
  link.click();
}
