const uploadInput = document.getElementById("imageUpload");
const previewArea = document.getElementById("previewArea");
const canvasElement = document.getElementById("exportCanvas");
const opacitySlider = document.getElementById("opacitySlider");
const canvasSizeSelect = document.getElementById("canvasSize");
const fileFormatSelect = document.getElementById("fileFormat");

uploadInput.addEventListener("change", handleUpload);
opacitySlider.addEventListener("input", updateReflectionOpacity);

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
      wrapper.style.left = "20px";
      wrapper.style.top = `${20 + index * 320}px`;

      const img = document.createElement("img");
      img.src = url;

      // Når billedet loader, sæt max bredde/højde for at kunne flytte
      img.onload = () => {
        // Hvis vil du kan justere størrelsen her, fx maks bredde 300px (stylet i CSS)
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

function clearImages() {
  uploadInput.value = "";
  previewArea.innerHTML = "";
}

// Gør elementet draggbart med mus (fri placering)
function makeDraggable(el) {
  let offsetX, offsetY;
  let isDragging = false;

  el.addEventListener("mousedown", e => {
    isDragging = true;
    const rect = el.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    el.style.cursor = "grabbing";
  });

  window.addEventListener("mousemove", e => {
    if (!isDragging) return;
    let x = e.clientX - offsetX;
    let y = e.clientY - offsetY;

    // Begræns indenfor previewArea
    const containerRect = previewArea.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const maxX = containerRect.width - elRect.width;
    const maxY = containerRect.height - elRect.height;

    if (x < 0) x = 0;
    if (y < 0) y = 0;
    if (x > maxX) x = maxX;
    if (y > maxY) y = maxY;

    el.style.left = x + "px";
    el.style.top = y + "px";
  });

  window.addEventListener("mouseup", e => {
    if (isDragging) {
      isDragging = false;
      el.style.cursor = "move";
    }
  });
}

function exportLayout() {
  const wrappers = Array.from(document.querySelectorAll(".image-wrapper"));
  if (!wrappers.length) return;

  const opacity = parseFloat(opacitySlider.value);
  const fileFormat = fileFormatSelect.value;
  const size = canvasSizeSelect.value;

  // Hvis auto, brug previewArea's størrelse, ellers bruger valgt størrelse
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

    // Beregn position relativ til previewArea
    const x = wrapperRect.left - containerRect.left;
    const y = wrapperRect.top - containerRect.top;

    // Brug original billede dimensioner
    const width = img.naturalWidth;
    const height = img.naturalHeight;

    // For at skalere billedet så det passer med visuel størrelse:
    // Find CSS skala: (wrapper clientWidth / img.naturalWidth)
    // Eller simpel metode: brug wrapper clientWidth og højde for størrelsesforhold

    const scaleX = wrapper.clientWidth / width;
    const scaleY = wrapper.clientHeight / height;
    const scale = Math.min(scaleX, scaleY);

    const drawWidth = width * scale;
    const drawHeight = height * scale;

    // Tegn billedet
    ctx.drawImage(img, x, y, drawWidth, drawHeight);

    // Tegn refleksion
    ctx.save();
    ctx.translate(x, y + drawHeight * 2);
    ctx.scale(1, -1);
    ctx.globalAlpha = opacity;
    ctx.drawImage(img, 0, 0, drawWidth, drawHeight);
    ctx.restore();
  });

  // Download canvas
  const dataUrl = canvasElement.toDataURL(`image/${fileFormat}`, 1.0);
  const link = document.createElement("a");
  link.download = `studio-layout.${fileFormat}`;
  link.href = dataUrl;
  link.click();
}
