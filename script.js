const imageUpload = document.getElementById("imageUpload");
const previewArea = document.getElementById("previewArea");
const downloadBtn = document.getElementById("downloadBtn");
const opacitySlider = document.getElementById("opacitySlider");
const reflectionToggle = document.getElementById("reflectionToggle");
const bgColorPicker = document.getElementById("bgColorPicker");
const canvas = document.getElementById("exportCanvas");

let dragData = {
  draggedElem: null,
  offsetX: 0,
  offsetY: 0,
};

// Upload billeder og vis i previewArea
imageUpload.addEventListener("change", (e) => {
  const files = e.target.files;
  for (let file of files) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wrapper = document.createElement("div");
      wrapper.classList.add("image-wrapper");
      wrapper.style.left = "10px";
      wrapper.style.top = "10px";
      wrapper.style.width = "150px";

      const img = document.createElement("img");
      img.src = ev.target.result;
      img.draggable = false;

      wrapper.appendChild(img);
      previewArea.appendChild(wrapper);

      enableDrag(wrapper);
    };
    reader.readAsDataURL(file);
  }
});

// Træk-funktion (klik og hold venstre museknap nede)
function enableDrag(elem) {
  elem.addEventListener("mousedown", (e) => {
    e.preventDefault();
    dragData.draggedElem = elem;
    const rect = elem.getBoundingClientRect();
    const previewRect = previewArea.getBoundingClientRect();

    dragData.offsetX = e.clientX - rect.left;
    dragData.offsetY = e.clientY - rect.top;
    elem.classList.add("dragging");

    // Optional: bring image to front on drag start
    elem.style.zIndex = 1000;
  });
}

// Flyt billedet mens musen bevæger sig
document.addEventListener("mousemove", (e) => {
  if (!dragData.draggedElem) return;

  const previewRect = previewArea.getBoundingClientRect();
  let x = e.clientX - dragData.offsetX - previewRect.left;
  let y = e.clientY - dragData.offsetY - previewRect.top;

  // Begræns til preview-området
  x = Math.max(0, Math.min(x, previewArea.clientWidth - dragData.draggedElem.clientWidth));
  y = Math.max(0, Math.min(y, previewArea.clientHeight - dragData.draggedElem.clientHeight));

  dragData.draggedElem.style.left = x + "px";
  dragData.draggedElem.style.top = y + "px";
});

// Slip musen = stop flytning
document.addEventListener("mouseup", () => {
  if (dragData.draggedElem) {
    dragData.draggedElem.classList.remove("dragging");
    dragData.draggedElem.style.zIndex = "";
  }
  dragData.draggedElem = null;
});

// Download knap funktion
downloadBtn.addEventListener("click", () => {
  const ctx = canvas.getContext("2d");
  const w = previewArea.clientWidth;
  const h = previewArea.clientHeight;

  canvas.width = w;
  canvas.height = h;

  // Baggrund
  const bgColor = bgColorPicker.value;
  if (bgColor === "#00000000") {
    ctx.clearRect(0, 0, w, h);
  } else {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, w, h);
  }

  // Tegn hvert billede og refleksion hvis aktiveret
  const wrappers = previewArea.querySelectorAll(".image-wrapper");
  wrappers.forEach((wrapper) => {
    const img = wrapper.querySelector("img");
    const x = parseFloat(wrapper.style.left);
    const y = parseFloat(wrapper.style.top);
    const iw = wrapper.clientWidth;
    const ih = wrapper.clientHeight;

    // Tegn billede
    ctx.drawImage(img, x, y, iw, ih);

    // Reflektion
    if (reflectionToggle.checked) {
      ctx.save();
      ctx.translate(x + iw / 2, y + ih * 2);
      ctx.scale(1, -1);
      ctx.globalAlpha = parseFloat(opacitySlider.value);
      ctx.drawImage(img, -iw / 2, 0, iw, ih);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  });

  // Gem som PNG
  canvas.toBlob((blob) => {
    if (!blob) {
      alert("Fejl ved oprettelse af billede.");
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "layout.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, "image/png");
});
