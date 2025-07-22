const previewArea = document.getElementById("previewArea");
const imageUpload = document.getElementById("imageUpload");
const opacitySlider = document.getElementById("opacitySlider");
const lightAngleSlider = document.getElementById("lightAngleSlider");
const bgColorPicker = document.getElementById("bgColorPicker");
const canvasSizeSelect = document.getElementById("canvasSize");
const fileFormatSelect = document.getElementById("fileFormat");
const toggleGridCheckbox = document.getElementById("toggleGrid");
const clearBtn = document.querySelector("button[onclick='clearImages()']");
const downloadBtn = document.querySelector("button[onclick='exportLayout()']");
const reflectionToggleBtn = document.createElement("button");
const backgroundToggleBtn = document.createElement("button");

reflectionToggleBtn.textContent = "Toggle Reflection";
backgroundToggleBtn.textContent = "Toggle BG Color";

document.querySelector(".controls").appendChild(reflectionToggleBtn);
document.querySelector(".controls").appendChild(backgroundToggleBtn);

let reflectionOn = true;
let backgroundTransparent = true;

let images = []; // Array af image-wrapper elementer

// Snap config
const SNAP_THRESHOLD = 10;

// Midterlinjer element
const middleGuides = document.createElement("div");
middleGuides.id = "middleGuides";
middleGuides.style.display = "none";
middleGuides.innerHTML = `
  <div class="middle-vertical"></div>
  <div class="middle-horizontal"></div>
`;
previewArea.appendChild(middleGuides);

// Opdater baggrund ved toggle
function updateBackground() {
  previewArea.style.backgroundColor = backgroundTransparent ? "transparent" : "#fff";
  bgColorPicker.disabled = backgroundTransparent; // disable color picker if transparent
}

// Reflektion toggle
function updateReflection() {
  images.forEach(wrapper => {
    const reflectionImg = wrapper.querySelector(".reflection");
    if (reflectionOn && reflectionImg) {
      reflectionImg.style.opacity = opacitySlider.value;
      reflectionImg.style.display = "block";
    } else if (reflectionImg) {
      reflectionImg.style.display = "none";
    }
  });
}


// Tilføj billede til previewArea
function addImage(file) {
  const reader = new FileReader();
  reader.onload = function (e) {
    const wrapper = document.createElement("div");
    wrapper.classList.add("image-wrapper");
    wrapper.style.top = "20px";
    wrapper.style.left = "20px";
    
// Tilføj refleksion billede
const reflection = document.createElement("img");
reflection.src = src;
reflection.classList.add("reflection");
reflection.style.position = "absolute";
reflection.style.top = "100%";
reflection.style.left = "0";
reflection.style.width = "100%";
reflection.style.height = "auto";
reflection.style.transform = "scaleY(-1)";
reflection.style.opacity = opacitySlider.value;
reflection.style.pointerEvents = "none"; // Skal ikke interagere
wrapper.appendChild(reflection);

    // Opret billed element
    const img = document.createElement("img");
    img.src = e.target.result;
    img.draggable = false;

    wrapper.appendChild(img);
    previewArea.appendChild(wrapper);

    // Tilføj resize håndtag
    const resizeHandle = document.createElement("div");
    resizeHandle.classList.add("resize-handle", "br");
    wrapper.appendChild(resizeHandle);

    // Gem proportioner
    img.onload = () => {
      const aspectRatio = img.naturalWidth / img.naturalHeight;
      wrapper.dataset.aspectRatio = aspectRatio;

      // Start størrelse max 200px højde uden at squish
      if (img.naturalHeight > 200) {
        wrapper.style.height = "200px";
        wrapper.style.width = `${200 * aspectRatio}px`;
      } else {
        wrapper.style.height = img.naturalHeight + "px";
        wrapper.style.width = img.naturalWidth + "px";
      }

      updateReflection();
    };

    images.push(wrapper);

    makeDraggable(wrapper, resizeHandle);
  };
  reader.readAsDataURL(file);
}

imageUpload.addEventListener("change", (e) => {
  [...e.target.files].forEach(file => {
    if (file.type.startsWith("image/")) addImage(file);
  });
  imageUpload.value = "";
});

// Drag & resize logik
function makeDraggable(wrapper, resizeHandle) {
  let drag = false;
  let resizing = false;
  let dragStartX, dragStartY;
  let origX, origY;
  let origWidth, origHeight;
  let aspectRatio = parseFloat(wrapper.dataset.aspectRatio) || 1;

  // For snap guides
  let snapLines = [];

  // Hold venstreklik nede for at flytte
  wrapper.addEventListener("mousedown", (e) => {
    if (e.target === resizeHandle) return; // resize håndtag tager over

    e.preventDefault();
    drag = true;

    dragStartX = e.clientX;
    dragStartY = e.clientY;

    origX = parseFloat(wrapper.style.left);
    origY = parseFloat(wrapper.style.top);

    wrapper.classList.add("dragging");
  });

  window.addEventListener("mousemove", (e) => {
    if (drag) {
      e.preventDefault();
      let newX = origX + (e.clientX - dragStartX);
      let newY = origY + (e.clientY - dragStartY);

      // Snap logik
      const snap = getSnapPosition(wrapper, newX, newY);

      if (snap.snapX !== null) {
        newX = snap.snapX;
        showSnapLine("vertical", snap.snapX);
      } else {
        hideSnapLine("vertical");
      }

      if (snap.snapY !== null) {
        newY = snap.snapY;
        showSnapLine("horizontal", snap.snapY);
      } else {
        hideSnapLine("horizontal");
      }

      wrapper.style.left = newX + "px";
      wrapper.style.top = newY + "px";
    } else if (resizing) {
      e.preventDefault();

      let deltaX = e.clientX - dragStartX;
      let newWidth = origWidth + deltaX;
      if (newWidth < 50) newWidth = 50;

      let newHeight = newWidth / aspectRatio;

      wrapper.style.width = newWidth + "px";
      wrapper.style.height = newHeight + "px";

      updateReflection();
    }
  });

  window.addEventListener("mouseup", (e) => {
    if (drag) {
      drag = false;
      wrapper.classList.remove("dragging");
      hideSnapLine("vertical");
      hideSnapLine("horizontal");
    }
    if (resizing) {
      resizing = false;
      wrapper.classList.remove("resizing");
    }
  });

  // Resize håndtag down
  resizeHandle.addEventListener("mousedown", (e) => {
    e.preventDefault();
    resizing = true;

    dragStartX = e.clientX;
    dragStartY = e.clientY;

    origWidth = parseFloat(wrapper.style.width);
    origHeight = parseFloat(wrapper.style.height);

    aspectRatio = parseFloat(wrapper.dataset.aspectRatio) || 1;

    wrapper.classList.add("resizing");
  });
}

// Snap funktion: finder positioner hvor vi snapper (top, midt, bund) mod andre billeder
function getSnapPosition(movingWrapper, proposedX, proposedY) {
  let snapX = null;
  let snapY = null;

  const movingRect = {
    left: proposedX,
    top: proposedY,
    width: parseFloat(movingWrapper.style.width),
    height: parseFloat(movingWrapper.style.height),
  };
  movingRect.right = movingRect.left + movingRect.width;
  movingRect.bottom = movingRect.top + movingRect.height;
  movingRect.middleX = movingRect.left + movingRect.width / 2;
  movingRect.middleY = movingRect.top + movingRect.height / 2;

  // Tjek mod alle andre billeder
  for (const wrapper of images) {
    if (wrapper === movingWrapper) continue;

    const left = parseFloat(wrapper.style.left);
    const top = parseFloat(wrapper.style.top);
    const width = parseFloat(wrapper.style.width);
    const height = parseFloat(wrapper.style.height);

    const right = left + width;
    const bottom = top + height;
    const middleX = left + width / 2;
    const middleY = top + height / 2;

    // Snap lodret: left, middleX, right
    // Snap på movingRect.left/right/middleX til andre
    // For enkelhed snap til midterlinjer og kanter der matcher inden for threshold
    // Lodret snap:
    if (Math.abs(movingRect.left - left) < SNAP_THRESHOLD) snapX = left;
    else if (Math.abs(movingRect.left - middleX) < SNAP_THRESHOLD) snapX = middleX;
    else if (Math.abs(movingRect.left - right) < SNAP_THRESHOLD) snapX = right;
    else if (Math.abs(movingRect.middleX - left) < SNAP_THRESHOLD) snapX = left - movingRect.width / 2;
    else if (Math.abs(movingRect.middleX - middleX) < SNAP_THRESHOLD) snapX = middleX - movingRect.width / 2;
    else if (Math.abs(movingRect.middleX - right) < SNAP_THRESHOLD) snapX = right - movingRect.width / 2;
    else if (Math.abs(movingRect.right - left) < SNAP_THRESHOLD) snapX = left - movingRect.width;
    else if (Math.abs(movingRect.right - middleX) < SNAP_THRESHOLD) snapX = middleX - movingRect.width;
    else if (Math.abs(movingRect.right - right) < SNAP_THRESHOLD) snapX = right - movingRect.width;

    // Snap vandret: top, middleY, bottom
    if (Math.abs(movingRect.top - top) < SNAP_THRESHOLD) snapY = top;
    else if (Math.abs(movingRect.top - middleY) < SNAP_THRESHOLD) snapY = middleY;
    else if (Math.abs(movingRect.top - bottom) < SNAP_THRESHOLD) snapY = bottom;
    else if (Math.abs(movingRect.middleY - top) < SNAP_THRESHOLD) snapY = top - movingRect.height / 2;
    else if (Math.abs(movingRect.middleY - middleY) < SNAP_THRESHOLD) snapY = middleY - movingRect.height / 2;
    else if (Math.abs(movingRect.middleY - bottom) < SNAP_THRESHOLD) snapY = bottom - movingRect.height / 2;
    else if (Math.abs(movingRect.bottom - top) < SNAP_THRESHOLD) snapY = top - movingRect.height;
    else if (Math.abs(movingRect.bottom - middleY) < SNAP_THRESHOLD) snapY = middleY - movingRect.height;
    else if (Math.abs(movingRect.bottom - bottom) < SNAP_THRESHOLD) snapY = bottom - movingRect.height;
  }

  return { snapX, snapY };
}

// Snap linjer vis/skjul
const snapLinesElements = {};

function showSnapLine(orientation, position) {
  if (!snapLinesElements[orientation]) {
    const line = document.createElement("div");
    line.classList.add("snap-line", orientation);
    previewArea.appendChild(line);
    snapLinesElements[orientation] = line;
  }
  const line = snapLinesElements[orientation];
  if (orientation === "vertical") {
    line.style.left = position + "px";
    line.style.top = "0";
    line.style.height = previewArea.clientHeight + "px";
  } else {
    line.style.top = position + "px";
    line.style.left = "0";
    line.style.width = previewArea.clientWidth + "px";
  }
  line.style.opacity = 1;
}

function hideSnapLine(orientation) {
  if (snapLinesElements[orientation]) {
    snapLinesElements[orientation].style.opacity = 0;
  }
}

// Toggle midterlinjer
toggleGridCheckbox.addEventListener("change", () => {
  middleGuides.style.display = toggleGridCheckbox.checked ? "block" : "none";
});

// Opdater refleksion opacity slider
opacitySlider.addEventListener("input", () => {
  if (reflectionOn) updateReflection();
});

// Baggrundsfarve picker
bgColorPicker.addEventListener("input", () => {
  if (!backgroundTransparent) {
    previewArea.style.backgroundColor = bgColorPicker.value;
  }
});

// Toggle reflection knap
reflectionToggleBtn.addEventListener("click", () => {
  reflectionOn = !reflectionOn;
  updateReflection();
});

// Toggle baggrund farve knap
backgroundToggleBtn.addEventListener("click", () => {
  backgroundTransparent = !backgroundTransparent;
  updateBackground();
});

// Clear alle billeder
function clearImages() {
  images.forEach(wrapper => wrapper.remove());
  images = [];
}
window.clearImages = clearImages;

// Eksport af layout
async function exportLayout() {
  // Opret canvas i valgt størrelse
  const size = canvasSizeSelect.value;
  let width, height;

  if (size === "640x360") {
    width = 640;
    height = 360;
  } else if (size === "1280x720") {
    width = 1280;
    height = 720;
  } else if (size === "1920x1080") {
    width = 1920;
    height = 1080;
  }

  const offscreenCanvas = document.createElement("canvas");
  offscreenCanvas.width = width;
  offscreenCanvas.height = height;
  const ctx = offscreenCanvas.getContext("2d");

  // Baggrund
  if (backgroundTransparent) {
    ctx.clearRect(0, 0, width, height);
  } else {
    ctx.fillStyle = bgColorPicker.value;
    ctx.fillRect(0, 0, width, height);
  }

  // Skaleringsfaktor fra preview til export canvas
  const scaleX = width / previewArea.clientWidth;
  const scaleY = height / previewArea.clientHeight;

  // Tegn billeder på canvas
  for (const wrapper of images) {
    const img = wrapper.querySelector("img");

    // Position & størrelse
    const x = parseFloat(wrapper.style.left) * scaleX;
    const y = parseFloat(wrapper.style.top) * scaleY;
    const w = parseFloat(wrapper.style.width) * scaleX;
    const h = parseFloat(wrapper.style.height) * scaleY;

    // Tegn billede
    async function drawImageWithReflection(ctx, img, x, y, width, height, reflectionOn, reflectionOpacity) {
  // Tegn originalt billede
  ctx.drawImage(img, x, y, width, height);

  if (reflectionOn) {
    ctx.save();

    // Flyt ned under billedet og vend lodret (spejl)
    ctx.translate(x, y + height * 2);
    ctx.scale(1, -1);

    ctx.globalAlpha = reflectionOpacity;

    // Tegn spejlvendt billede (refleksion)
    ctx.drawImage(img, 0, 0, width, height);

    // Gradient til fading (gør refleksion transparent nedad)
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, `rgba(255, 255, 255, ${reflectionOpacity})`);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 1)');

    ctx.globalCompositeOperation = 'destination-out'; // Mask gradient
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.restore();
  }
}

  }

  // Download
  let dataUrl;
  if (fileFormatSelect.value === "png") {
    dataUrl = offscreenCanvas.toDataURL("image/png");
  } else {
    dataUrl = offscreenCanvas.toDataURL("image/webp");
  }

  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `exported_image.${fileFormatSelect.value}`;
  a.click();
}
window.exportLayout = exportLayout;

// Tegn billede med refleksion
async function drawImageWithReflection(ctx, img, x, y, w, h, reflection, reflectionOpacity) {
  // Tegn billede
  ctx.drawImage(img, x, y, w, h);

  if (!reflection) return;

  // Tegn refleksion (flip y)
  ctx.save();
  ctx.translate(x, y + h * 2);
  ctx.scale(1, -1);

  // Tegn refleksion
  ctx.globalAlpha = parseFloat(reflectionOpacity) || 0.25;
  ctx.filter = "blur(2px)";
  ctx.drawImage(img, 0, 0, w, h);

  ctx.restore();
}

// Initial baggrund
updateBackground();
updateReflection();
