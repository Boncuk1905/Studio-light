body {
  font-family: sans-serif;
  padding: 10px;
  background-color: #f5f5f5;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 15px;
  align-items: center;
}

#previewContainer {
  position: relative;
  border: 1px solid #ccc;
  background-color: white;
  min-height: 600px;
  overflow: hidden;
}

#previewArea {
  position: relative;
  width: 100%;
  height: 100%;
}

.image-wrapper {
  position: absolute;
  cursor: grab;
  transition: box-shadow 0.2s;
}

.image-wrapper img {
  display: block;
  width: 100%;
  height: auto;
}

.image-reflection {
  transform: scaleY(-1);
  opacity: var(--reflection-opacity, 0.25);
}

.snap-line {
  position: absolute;
  background: limegreen;
  z-index: 9999;
  pointer-events: none;
}

.snap-line.vertical {
  width: 1px;
  height: 100%;
}

.snap-line.horizontal {
  height: 1px;
  width: 100%;
}

.center-guide {
  position: absolute;
  background: rgba(0,0,255,0.3);
  pointer-events: none;
  z-index: 1000;
  display: none;
}

.center-guide.vertical {
  width: 1px;
  top: 0;
  bottom: 0;
  left: 50%;
}

.center-guide.horizontal {
  height: 1px;
  left: 0;
  right: 0;
  top: 50%;
}
