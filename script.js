const uploadInput = document.getElementById("imageUpload");
const previewArea = document.getElementById("previewArea");
const canvasElement = document.getElementById("exportCanvas");
const opacitySlider = document.getElementById("opacitySlider");
const lightAngleSlider = document.getElementById("lightAngleSlider");
const canvasSizeSelect = document.getElementById("canvasSize");
const fileFormatSelect = document.getElementById("fileFormat");
const reflectionToggle = document.getElementById("reflectionToggle");
const bgToggle = document.getElementById("bgToggle");
const midlineToggle = document.getElementById("midlineToggle");

uploadInput.addEventListener("change", handleUpload);
opacitySlider.addEventListener("input", updateReflectionOpacity);
lightAngleSlider.addEventListener("input", updateLightDirection);
reflectionToggle.addEventListener("change", updateReflectionVisibility);
bgToggle.addEventListener("change", updateBackground);
midlineToggle.addEventListener("change", updateGuides);

let dragData = {
  draggingEl: null,
  offsetX: 0,
  offsetY: 0,
  resizingEl: null,
  resizeStart: null,
  resizeDir: null
};

let lightAngleRad = (lightAngleSlider.value * Math.PI) / 180;

function handleUpload(event) {
  const files = Array.from(event.target.files);
  if (!files.length) return;

  previewArea.innerHTML = "";
  clearGuides();

  files.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = e => {
      const url = e.target.result;

      const wrapper = document.createElement("div");
      wrapper.className = "image-wrapper";
      wrapper.style.position = "absolute";
      wrapper.style.left = 20 + index * 150 + "px";
      wrapper.style.top = 20 + "px";
      wrapper.style.cursor = "move";
      wrapper.style.userSelect = "none";

      const img = document.createElement("img");
      img.src = url;
      img.draggable = false;

      img.onload = () => {
        // Sæt proportional størrelse max 200x200 px i preview, behold ratio
        const maxDim = 200;
        let width = img.naturalWidth;
        let height = img.naturalHeight;
        if (width > height && width > maxDim) {
          height = (height / width) * maxDim;
          width = maxDim;
        } else if (height > width && height > maxDim) {
          width = (width / height) * maxDim;
          height = maxDim;
        } else if (width === height && width > maxDim) {
          width = maxDim;
          height = maxDim;
        }
        wrapper.style.width = width + "px";
        wrapper.style.height = height + "px";

        updateShadow(wrapper);
      };

      wrapper.appendChild(img);
      previewArea.appendChild(wrapper);

      makeDraggable(wrapper);
      makeResizable(wrapper);
    };
    reader.readAsDataURL(file);
  });
}

// Opdater refleksionens opacity i CSS variabler (kan bruges til preview refleksion visning hvis lavet)
function updateReflectionOpacity() {
  // Kan bruges til fremtidig preview refleksion opacity, men reflektion tegnes på canvas ved export
}

function updateLightDirection() {
  lightAngleRad = (lightAngleSlider.value * Math.PI) / 180;
  document.querySelectorAll(".image-wrapper").forEach(wrapper => updateShadow(wrapper));
}

function updateShadow(wrapper) {
  const distance = 10;
  const xOffset = Math.cos(lightAngleRad) * distance;
  const yOffset = Math.sin(lightAngleRad) * distance;

  wrapper.style.filter = `drop-shadow(${xOffset}px ${yOffset}px 8px rgba(0,0,0,0.15))`;
}

function updateReflectionVisibility() {
  // Her kan vi lave evt preview ændring, men reflektion tegnes først ved export
}

function updateBackground() {
  if (bgToggle.checked) {
    previewArea.style.backgroundColor = "#ffffff";
  } else {
    previewArea.style.backgroundColor = "transparent";
  }
}

function updateGuides() {
  if (midlineToggle.checked) {
    drawMidGuides();
  } else {
    clearGuides();
  }
}

function drawMidGuides() {
  clearGuides();
  const w = previewArea.clientWidth;
  const h = previewArea.clientHeight;

  const vLine = document.createElement("div");
  vLine.className = "mid-guide";
  vLine.style.left = w / 2 + "px";
  vLine.style.top = "0px";
  vLine.style.height = h + "px";
  vLine.style.width = "1px";
  previewArea.appendChild(vLine);

  const hLine = document.createElement("div");
  hLine.className = "mid-guide";
  hLine.style.top = h / 2 + "px";
  hLine.style.left = "0px";
  hLine.style.width = w + "px";
  hLine.style.height = "1px";
  previewArea.appendChild(hLine);
}

function clearGuides() {
  const guides = previewArea.querySelectorAll(".mid-guide");
  guides.forEach(g => g.remove());
}

function makeDraggable(el) {
  el.addEventListener("mousedown", e => {
    if (e.button !== 0) return; // Kun venstreklik
    dragData.draggingEl = el;
    const rect = el.getBoundingClientRect();
    const previewRect = previewArea.getBoundingClientRect();
    dragData.offsetX = e.clientX - rect.left;
    dragData.offsetY = e.clientY - rect.top;
    el.style.zIndex = 1000;

    e.preventDefault();
  });
}

window.addEventListener("mousemove", e => {
  if (!dragData.draggingEl) return;
  const el = dragData.draggingEl;
  const previewRect = previewArea.getBoundingClientRect();
  let x = e.clientX - previewRect.left - dragData.offsetX;
  let y = e.clientY - previewRect.top - dragData.offsetY;

  // Begræns bevægelse indenfor preview area
  if (x < 0) x = 0;
  if (y < 0) y = 0;
  if (x + el.offsetWidth > previewRect.width) x = previewRect.width - el.offsetWidth;
  if (y + el.offsetHeight > previewRect.height) y = previewRect.height - el.offsetHeight;

  // Snap til midterlinie
  const midX = previewRect.width / 2 - el.offsetWidth / 2;
  const snapDist = 10;
  if (Math.abs(x - midX) < snapDist) {
    x = midX;
  }

  // Snap til andre billeder horisontalt hvis højde er næsten samme (±5 px)
  const wrappers = [...document.querySelectorAll(".image-wrapper")].filter(w => w !== el);
  wrappers.forEach(other => {
    if (Math.abs(other.offsetTop - y) < 5) {
      y = other.offsetTop;
    }
  });

  el.style.left = x + "px";
  el.style.top = y + "px";
});

window.addEventListener("mouseup", e => {
  if (dragData.draggingEl) {
    dragData.draggingEl.style.zIndex = 1;
  }
  dragData.draggingEl = null;
});

// Resize funktion (lavet simpel til nederste højre hjørne)
function makeResizable(el) {
  const resizer = document.createElement("div");
  resizer.className = "resizer";
  resizer.style.position = "absolute";
  resizer.style.width = "12px";
  resizer.style.height = "12px";
  resizer.style.right = "0";
  resizer.style.bottom = "0";
  resizer.style.cursor = "nwse-resize";
  resizer.style.background = "rgba(0,0,0,0.5)";
  el.appendChild(resizer);

  resizer.addEventListener("mousedown", e => {
    dragData.resizingEl = el;
    dragData.resizeStart = {x: e.clientX, y: e.clientY};
    dragData.startWidth = el.offsetWidth;
    dragData.startHeight = el.offsetHeight;
    e.preventDefault();
    e.stopPropagation();
  });
}

window.addEventListener("mousemove", e => {
  if (!dragData.resizingEl) return;
  const el = dragData.resizingEl;
  const dx = e.clientX - dragData.resizeStart.x;
  const dy = e.clientY - dragData.resizeStart.y;

  // Proportional resizing based on initial aspect ratio
  const aspectRatio = dragData.startWidth / dragData.startHeight;
  let newWidth = dragData.startWidth + dx;
  let newHeight = newWidth / aspectRatio;

  if (newWidth < 50) newWidth = 50;
  if (newHeight < 50) newHeight = 50;

  el.style.width = newWidth + "px";
  el.style.height = newHeight + "px";
});

window.addEventListener("mouseup", e => {
  dragData.resizingEl = null;
});

// Funktion der tegner billede + refleksion med fading
async function drawImageWithReflection(ctx, img, x, y, width, height, reflectionOn, reflectionOpacity) {
  // Tegn originalt billede
  ctx.drawImage(img, x, y, width, height);

  if (reflectionOn) {
    ctx.save();

    // Spejl refleksion under billedet
    ctx.translate(x, y + height * 2);
    ctx.scale(1, -1);

    ctx.globalAlpha = reflectionOpacity;

    ctx.drawImage(img, 0, 0, width, height);

    // Gradient fade out (fading refleksion)
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, `rgba(255,255,255,${reflectionOpacity})`);
    gradient.addColorStop(1, 'rgba(255,255,255,1)');

    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.restore();
  }
}

// Eksporterer det hele til canvas og downloader som billede
async function exportLayout() {
  // Vælg størrelse
  let sizeVal = canvasSizeSelect.value.split("x");
  let exportWidth = parseInt(sizeVal[0]);
  let exportHeight = parseInt(sizeVal[1]);

  // Clear canvas og baggrund
  const ctx = canvasElement.getContext("2d");
  canvasElement.width = exportWidth;
  canvasElement.height = exportHeight;

  if (bgToggle.checked) {
    ctx.fillStyle = "#fff"; // hvid baggrund
    ctx.fillRect(0, 0, exportWidth, exportHeight);
  } else {
    ctx.clearRect(0, 0, exportWidth, exportHeight);
  }

  // Tegn alle billeder proportionelt og placeret ift preview (skaleret op til canvas size)
  const wrappers = [...document.querySelectorAll(".image-wrapper")];
  const previewRect = previewArea.getBoundingClientRect();

  for (let wrapper of wrappers) {
    const img = wrapper.querySelector("img");
    if (!img.complete) await new Promise(r => img.onload = r);

    // Beregn proportional størrelse og position ift canvas:
    let scaleX = exportWidth / previewRect.width;
    let scaleY = exportHeight / previewRect.height;

    // Behold billedets proportioner
    const naturalAspect = img.naturalWidth / img.naturalHeight;
    let w = wrapper.offsetWidth * scaleX;
    let h = wrapper.offsetHeight * scaleY;

    // Tjek for forvrængning: juster enten bredde eller højde for at holde aspekt
    if (w / h > naturalAspect) {
      w = h * naturalAspect;
    } else {
      h = w / naturalAspect;
    }

    let x = wrapper.offsetLeft * scaleX;
    let y = wrapper.offsetTop * scaleY;

    await drawImageWithReflection(
      ctx,
      img,
      x,
      y,
      w,
      h,
      reflectionToggle.checked,
      parseFloat(opacitySlider.value)
    );
  }
}

// Download canvas som billede i valgt format
function downloadImage() {
  const format = fileFormatSelect.value;
  let mimeType = "image/png";
  if (format === "jpeg") mimeType = "image/jpeg";

  canvasElement.toBlob(blob => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `exported_image.${format}`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, mimeType);
}

// Bind eksport og download knap (antaget de findes i HTML)
document.getElementById("exportBtn").addEventListener("click", exportLayout);
document.getElementById("downloadBtn").addEventListener("click", downloadImage);

// Init preview baggrund
updateBackground();
