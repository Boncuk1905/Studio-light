const uploadInput = document.getElementById("imageUpload");
const rawPreview = document.getElementById("rawPreview");
const previewArea = document.getElementById("previewArea");
const exportCanvas = document.getElementById("exportCanvas");
const opacitySlider = document.getElementById("opacitySlider");

uploadInput.addEventListener("change", handleUpload);
opacitySlider.addEventListener("input", updateReflectionOpacity);

function handleUpload(event) {
  rawPreview.innerHTML = "";
  previewArea.innerHTML = "";

  const files = Array.from(event.target.files);
  if (!files.length) return;

  files.forEach(file => {
    const reader = new FileReader();

    reader.onload = e => {
      const imageData = e.target.result;

      // Raw preview image
      const rawImg = document.createElement("img");
      rawImg.src = imageData;
      rawImg.alt = "Raw upload";
      rawImg.style.width = "120px";
      rawImg.style.margin = "8px";
      rawImg.style.border = "1px solid #ccc";
      rawPreview.appendChild(rawImg);

      // Styled studio layout image
      const wrapper = document.createElement("div");
      wrapper.className = "image-wrapper";
      wrapper.style.setProperty("--img-url", `url(${imageData})`);
      wrapper.style.setProperty("--reflection-opacity", opacitySlider.value);
      wrapper.style.backgroundImage = `url(${imageData})`;

      const styledImg = document.createElement("img");
      styledImg.src = imageData;
      styledImg.alt = "Styled product";

      wrapper.appendChild(styledImg);
      previewArea.appendChild(wrapper);
    };

    reader.readAsDataURL(file);
  });
}

function updateReflectionOpacity() {
  const allWrappers = document.querySelectorAll(".image-wrapper");
  allWrappers.forEach(wrapper => {
    wrapper.style.setProperty("--reflection-opacity", opacitySlider.value);
  });
}

function clearImages() {
  uploadInput.value = "";
  rawPreview.innerHTML = "";
  previewArea.innerHTML = "";
}

function exportCanvas() {
  const ctx = exportCanvas.getContext("2d");
  const wrappers = Array.from(document.querySelectorAll(".image-wrapper"));
  if (!wrappers.length) return;

  const imageWidth = 200;
  const imageHeight = 200;
  const spacing = 30;

  exportCanvas.width = wrappers.length * (imageWidth + spacing);
  exportCanvas.height = imageHeight * 2.2;

  wrappers.forEach((wrapper, index) => {
    const img = wrapper.querySelector("img");
    const x = index * (imageWidth + spacing);

    ctx.drawImage(img, x, 0, imageWidth, imageHeight);

    ctx.save();
    ctx.translate(x, imageHeight * 2);
    ctx.scale(1, -1);
    ctx.globalAlpha = parseFloat(opacitySlider.value);
    ctx.drawImage(img, 0, 0, imageWidth, imageHeight);
    ctx.restore();
  });

  const link = document.createElement("a");
  link.download = "trixie-layout.png";
  link.href = exportCanvas.toDataURL("image/png");
  link.click();
}
