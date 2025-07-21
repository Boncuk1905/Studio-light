const uploadInput = document.getElementById("imageUpload");
const previewArea = document.getElementById("previewArea");
const canvasElement = document.getElementById("exportCanvas"); // <-- ændret navn her
const opacitySlider = document.getElementById("opacitySlider");

uploadInput.addEventListener("change", handleUpload);
opacitySlider.addEventListener("input", updateReflectionOpacity);

function handleUpload(event) {
  previewArea.innerHTML = "";
  const files = Array.from(event.target.files);
  if (!files.length) return;

  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      const url = e.target.result;

      const wrapper = document.createElement("div");
      wrapper.className = "image-wrapper";
      wrapper.style.setProperty("--img-url", `url(${url})`);
      wrapper.style.setProperty("--reflection-opacity", opacitySlider.value);

      const img = document.createElement("img");
      img.src = url;
      wrapper.appendChild(img);
      previewArea.appendChild(wrapper);
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

function exportCanvas() {
  const ctx = canvasElement.getContext("2d"); // <-- brugt det nye navn her
  const wrappers = Array.from(document.querySelectorAll(".image-wrapper"));
  if (!wrappers.length) return;

  const imageWidth = 200;
  const imageHeight = 200;
  const spacing = 30;

  canvasElement.width = wrappers.length * (imageWidth + spacing);
  canvasElement.height = imageHeight * 2.2;

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
  link.download = "studio-layout.png";
  link.href = canvasElement.toDataURL("image/png");
  link.click();
}
