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
      wrapper.draggable = true;
      wrapper.style.setProperty("--img-url", `url(${url})`);
      wrapper.style.setProperty("--reflection-opacity", opacitySlider.value);

      const img = document.createElement("img");
     img.onload = () => {
  const cleanImg = removeWhiteBackground(img);
  wrapper.appendChild(cleanImg);
};
img.src = url;
      previewArea.appendChild(wrapper);

      // Drag events
      wrapper.addEventListener("dragstart", e => {
        wrapper.classList.add("dragging");
      });

      wrapper.addEventListener("dragend", e => {
        wrapper.classList.remove("dragging");
      });
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

function exportLayout() {
  const wrappers = Array.from(document.querySelectorAll(".image-wrapper"));
  if (!wrappers.length) return;

  const imageWidth = 200;
  const imageHeight = 200;
  const spacing = 30;

  const size = canvasSizeSelect.value;
  const fileFormat = fileFormatSelect.value;

  let canvasWidth = wrappers.length * (imageWidth + spacing);
  let canvasHeight = imageHeight * 2.2;

  if (size !== "auto") {
    const [w, h] = size.split("x").map(Number);
    canvasWidth = w;
    canvasHeight = h;
  }

  canvasElement.width = canvasWidth;
  canvasElement.height = canvasHeight;

  const ctx = canvasElement.getContext("2d");
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  wrappers.forEach((wrapper, index) => {
    const img = wrapper.querySelector("img");
    const x = index * (imageWidth + spacing);
    const y = 0;

    ctx.drawImage(img, x, y, imageWidth, imageHeight);

    ctx.save();
    ctx.translate(x, imageHeight * 2);
    ctx.scale(1, -1);
    ctx.globalAlpha = parseFloat(opacitySlider.value);
    ctx.drawImage(img, 0, 0, imageWidth, imageHeight);
    ctx.restore();
  });

  const link = document.createElement("a");
  link.download = `studio-layout.${fileFormat}`;
  link.href = canvasElement.toDataURL(`image/${fileFormat}`, 1.0);
  link.click();
}

// Drag container logic
previewArea.addEventListener("dragover", e => {
  e.preventDefault();
  const afterElement = getDragAfterElement(previewArea, e.clientX);
  const dragging = document.querySelector(".dragging");
  if (!dragging) return;
  if (afterElement == null) {
    previewArea.appendChild(dragging);
  } else {
    previewArea.insertBefore(dragging, afterElement);
  }
});

function getDragAfterElement(container, x) {
  const elements = [...container.querySelectorAll(".image-wrapper:not(.dragging)")];

  return elements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = x - box.left - box.width / 2;

    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}
function removeWhiteBackground(imgElement) {
  const tempCanvas = document.createElement("canvas");
  const ctx = tempCanvas.getContext("2d");

  tempCanvas.width = imgElement.width;
  tempCanvas.height = imgElement.height;

  ctx.drawImage(imgElement, 0, 0);

  const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i+1];
    const b = data[i+2];

    // Hvis pixel er næsten hvid (kan justeres)
    if (r > 240 && g > 240 && b > 240) {
      data[i+3] = 0; // Gør gennemsigtig
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const resultImg = new Image();
  resultImg.src = tempCanvas.toDataURL("image/png");
  return resultImg;
}
