const uploadInput = document.getElementById("imageUpload");
const previewArea = document.getElementById("previewArea");
const exportCanvas = document.getElementById("exportCanvas");

uploadInput.addEventListener("change", handleUpload);

function handleUpload(event) {
  previewArea.innerHTML = "";
  const files = Array.from(event.target.files);

  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      const wrapper = document.createElement("div");
      wrapper.className = "image-wrapper";
      wrapper.style.setProperty("--img-url", `url(${e.target.result})`);
      wrapper.style.backgroundImage = `url(${e.target.result})`;
      const img = document.createElement("img");
      img.src = e.target.result;

      wrapper.appendChild(img);
      previewArea.appendChild(wrapper);
    };
    reader.readAsDataURL(file);
  });
}

function clearImages() {
  uploadInput.value = "";
  previewArea.innerHTML = "";
}

function exportCanvas() {
  const canvas = exportCanvas;
  const ctx = canvas.getContext("2d");

  const wrappers = Array.from(document.querySelectorAll(".image-wrapper"));
  if (wrappers.length === 0) return;

  const imageWidth = 200;
  const imageHeight = 200;
  const spacing = 30;

  canvas.width = wrappers.length * (imageWidth + spacing);
  canvas.height = imageHeight * 2.2;

  wrappers.forEach((wrapper, index) => {
    const img = wrapper.querySelector("img");
    const x = index * (imageWidth + spacing);

    // Draw original
    ctx.drawImage(img, x, 0, imageWidth, imageHeight);

    // Draw reflection
    ctx.save();
    ctx.translate(x, imageHeight * 2);
    ctx.scale(1, -1);
    ctx.globalAlpha = 0.3;
    ctx.drawImage(img, 0, 0, imageWidth, imageHeight);
    ctx.restore();
  });

  // Download result
  const link = document.createElement("a");
  link.download = "studio-layout.png";
  link.href = canvas.toDataURL();
  link.click();
}
