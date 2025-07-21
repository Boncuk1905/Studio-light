const uploadInput = document.getElementById("imageUpload");
const previewArea = document.getElementById("previewArea");
const canvasElement = document.getElementById("exportCanvas");
const opacitySlider = document.getElementById("opacitySlider");
const lightAngleSlider = document.getElementById("lightAngleSlider");
const canvasSizeSelect = document.getElementById("canvasSize");
const fileFormatSelect = document.getElementById("fileFormat");

const guideLineVertical = document.getElementById("guideLineVertical");
const guideLineHorizontal = document.getElementById("guideLineHorizontal");
const toggleGridCheckbox = document.getElementById("toggleGrid");

uploadInput.addEventListener("change", handleUpload);
opacitySlider.addEventListener("input", updateReflectionOpacity);
lightAngleSlider.addEventListener("input", updateLightDirection);

let dragData = {
  draggingEl: null,
  offsetX: 0,
  offsetY: 0,
  isDragging: false,
};

let lightAngleRad = (lightAngleSlider.value * Math.PI) / 180;

function handleUpload(event) {
  const files = Array.from(event.target.files);
  if (!files.length) return;

  previewArea.innerHTML = "";

  const spacingX = 230;
  const spacingY = 320;
  const columns = Math.floor(previewArea.clientWidth / spacingX);

  files.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = e => {
      const url = e.target.result;

      const wrapper = document.createElement("div");
      wrapper.className = "image-wrapper";
      wrapper.style.setProperty("--reflection-opacity", opacitySlider.value);

      // Beregn grid position
      const col = index % columns;
      const row = Math.floor(index / columns);

      wrapper.style.left = `${20 + col * spacingX}px`;
      wrapper.style.top = `${20 + row * spacingY}px`;

      const img = document.createElement("img");
      img.src = url;

      img.onload = () => {
        const ratio = img.naturalHeight / img.naturalWidth;
        wrapper.style.height = `${200 * ratio}px`;
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

function checkSnapLines(movingEl) {
  if (!toggleGridCheckbox.checked) {
    guideLineVertical.style.display = "none";
    guideLineHorizontal.style.display = "none";
    return;
  }

  const SNAP_DISTANCE = 10;

  guideLineVertical.style.display = "none";
  guideLineHorizontal.style.display = "none";

  const containerRect = previewArea.getBoundingClientRect();
  const movingRect = movingEl.getBoundingClientRect();

  // Beregn snap-punkter for det flyttede element
  const movingPointsX = [
    movingRect.left,
    movingRect.left + movingRect.width / 2,
    movingRect.left + movingRect.width,
  ];
  const movingPointsY = [
    movingRect.top,
    movingRect.top + movingRect.height / 2,
    movingRect.top + movingRect.height,
  ];

  let snapX = null;
  let snapY = null;
  let snapXValue = null; // coordinate to snap to inside previewArea
  let snapYValue = null;

  // Saml alle snap-punkter fra de andre elementer
  const others = Array.from(document.querySelectorAll(".image-wrapper")).filter(el => el !== movingEl);

  const otherPointsX = [];
  const otherPointsY = [];

  others.forEach(el => {
    const r = el.getBoundingClientRect();
    otherPointsX.push(r.left, r.left + r.width / 2, r.left + r.width);
    otherPointsY.push(r.top, r.top + r.height / 2, r.top + r.height);
  });

  // Snap X
  for (const px of movingPointsX) {
    for (const ox of otherPointsX) {
      if (Math.abs(px - ox) <= SNAP_DISTANCE) {
        snapX = px;
        snapXValue = ox - containerRect.left;
        break;
      }
    }
    if (snapX !== null) break;
  }

  // Snap Y
  for (const py of movingPointsY) {
    for (const oy of otherPointsY) {
      if (Math.abs(py - oy) <= SNAP_DISTANCE) {
        snapY = py;
        snapYValue = oy - containerRect.top;
        break;
      }
    }
    if (snapY !== null) break;
  }

  // Hvis vi skal snappe, sæt position på movingEl + vis guide linjer
  if (snapXValue !== null) {
    // Beregn forskydning mellem hvilket punkt vi snapper fra og til
    // Find index i movingPointsX for snapX, og brug samme index til placering
    let index = movingPointsX.indexOf(snapX);
    let newLeft = snapXValue - (index === 0 ? 0 : index === 1 ? movingRect.width / 2 : movingRect.width);

    // Sørg for at det ikke går udenfor previewArea
    if (newLeft < 0) newLeft = 0;
    if (newLeft + movingRect.width > containerRect.width) newLeft = containerRect.width - movingRect.width;

    movingEl.style.left = newLeft + "px";

    guideLineVertical.style.left = snapXValue + "px";
    guideLineVertical.style.display = "block";
  } else {
    guideLineVertical.style.display = "none";
  }

  if (snapYValue !== null) {
    let index = movingPointsY.indexOf(snapY);
    let newTop = snapYValue - (index === 0 ? 0 : index === 1 ? movingRect.height / 2 : movingRect.height);

    if (newTop < 0) newTop = 0;
    if (newTop + movingRect.height > containerRect.height) newTop = containerRect.height - movingRect.height;

    movingEl.style.top = newTop + "px";

    guideLineHorizontal.style.top = snapYValue + "px";
    guideLineHorizontal.style.display = "block";
  } else {
    guideLineHorizontal.style.display = "none";
  }
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
}

window.addEventListener("mousemove", e => {
  if (!dragData.isDragging || !dragData.draggingEl) return;

  const containerRect = previewArea.getBoundingClientRect();
  const el = dragData.draggingEl;
  const elRect = el.getBoundingClientRect();

  let x = e.clientX - containerRect.left - dragData.offsetX;
  let y = e.clientY - containerRect.top - dragData.offsetY;

  // Begræns indenfor previewArea
  if (x < 0) x = 0;
  if (y < 0) y = 0;
  if (x + elRect.width > containerRect.width) x = containerRect.width - elRect.width;
  if (y + elRect.height > containerRect.height) y = containerRect.height - elRect.height;

  el.style.left = x + "px";
  el.style.top = y + "px";

  checkSnapLines(el);
});

window.addEventListener("mouseup", e => {
  if (dragData.isDragging && dragData.draggingEl) {
    dragData.draggingEl.style.zIndex = 1;
  }
  dragData.isDragging = false;
  dragData.draggingEl = null;

  guideLineVertical.style.display = "none";
  guideLineHorizontal.style.display = "none";
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
  ctx.imageSmoothingQuality = "high";

  const containerRect = previewArea.getBoundingClientRect();

  wrappers.forEach(wrapper => {
    const img = wrapper.querySelector("img");
    const wrapperRect = wrapper.getBoundingClientRect();

    const xRatio = canvasWidth / containerRect.width;
    const yRatio = canvasHeight / containerRect.height;

    const x = (wrapperRect.left - containerRect.left) * xRatio;
    const y = (wrapperRect.top - containerRect.top) * yRatio;

    const displayedWidth = wrapperRect.width * xRatio;
    const displayedHeight = wrapperRect.height * yRatio;

    ctx.drawImage(img, x, y, displayedWidth, displayedHeight);

    // Reflection
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
