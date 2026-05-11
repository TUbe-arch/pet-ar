// ── crop.js ──
// 負責：上傳照片、框選（SVG 貓臉遮罩）、裁切、傳遞圖片給 AR 頁面

const fileInput  = document.getElementById('fileInput');
const cropCanvas = document.getElementById('cropCanvas');
const confirmBtn = document.getElementById('confirmCropBtn');
const previewImg = document.getElementById('previewImg');
const ctx        = cropCanvas.getContext('2d');

let originalImage = null;
let scaleRatio    = 1;
let isDrawing     = false;
let startX = 0, startY = 0;
let currentRect   = null;

// ── SVG 遮罩載入 ──
const svgMaskImg = new Image();
let svgReady = false;
svgMaskImg.onload  = () => { svgReady = true; };
svgMaskImg.onerror = () => { console.warn('cat-mask.svg 載入失敗'); };
svgMaskImg.src = 'assets/cat-mask.svg';

// SVG viewBox 長寬比（468 × 341）
const SVG_ASPECT = 341 / 468;

// 重用的 offscreen canvas（避免每幀 GC）
let maskCanvas = null;

// ── STEP 切換 ──
function setStep(n) {
  document.querySelectorAll('.screen').forEach((s, i) => {
    s.classList.toggle('active', i + 1 === n);
  });
  document.querySelectorAll('.step').forEach((s, i) => {
    s.classList.remove('active', 'done');
    if (i + 1 < n)  s.classList.add('done');
    if (i + 1 === n) s.classList.add('active');
  });
}

function resetToUpload() {
  originalImage = null;
  currentRect   = null;
  fileInput.value = '';
  setStep(1);
}

// ── 1. 上傳照片 ──
const MAX_SOURCE_PX = 1600;

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      const maxDim = Math.max(img.width, img.height);
      if (maxDim > MAX_SOURCE_PX) {
        const scale = MAX_SOURCE_PX / maxDim;
        const tmp = document.createElement('canvas');
        tmp.width  = Math.round(img.width  * scale);
        tmp.height = Math.round(img.height * scale);
        tmp.getContext('2d').drawImage(img, 0, 0, tmp.width, tmp.height);
        const scaled = new Image();
        scaled.onload = () => { originalImage = scaled; setStep(2); setupCanvas(scaled); };
        scaled.src = tmp.toDataURL('image/jpeg', 0.9);
      } else {
        originalImage = img;
        setStep(2);
        setupCanvas(img);
      }
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});

// ── 2. 設定 Canvas ──
function setupCanvas(img) {
  const maxW = cropCanvas.parentElement.clientWidth;
  scaleRatio  = maxW / img.width;

  cropCanvas.width  = img.width;
  cropCanvas.height = img.height;
  cropCanvas.style.width  = maxW + 'px';
  cropCanvas.style.height = (img.height * scaleRatio) + 'px';

  drawImage();
}

// ── 拖曳矩形 → SVG overlay 位置（維持長寬比置中）──
function rectToOverlay({ x, y, w, h }) {
  const aspect = svgReady && svgMaskImg.naturalWidth > 0
    ? svgMaskImg.naturalHeight / svgMaskImg.naturalWidth
    : SVG_ASPECT;

  const fitByW = { w, h: w * aspect };
  const fitByH = { w: h / aspect, h };
  const { w: ow, h: oh } = (fitByW.h <= h) ? fitByW : fitByH;
  return {
    x: x + (w - ow) / 2,
    y: y + (h - oh) / 2,
    w: ow,
    h: oh,
  };
}

// ── 3. 繪製 ──
function drawImage() {
  ctx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
  ctx.drawImage(originalImage, 0, 0);
  if (currentRect) {
    if (svgReady) {
      drawSvgOverlay(rectToOverlay(currentRect));
    } else {
      drawFallbackRect(currentRect);
    }
  }
}

// SVG 遮罩預覽：貓臉範圍內透出原圖，外圍暗化
function drawSvgOverlay({ x, y, w, h }) {
  // offscreen canvas：原圖 × SVG alpha mask → 只保留貓臉內部
  if (!maskCanvas) maskCanvas = document.createElement('canvas');
  maskCanvas.width  = cropCanvas.width;
  maskCanvas.height = cropCanvas.height;
  const mc = maskCanvas.getContext('2d');
  mc.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
  mc.drawImage(originalImage, 0, 0);
  mc.globalCompositeOperation = 'destination-in';
  mc.drawImage(svgMaskImg, x, y, w, h);
  mc.globalCompositeOperation = 'source-over';

  // 主畫布：暗化全圖 → 疊上貓臉內的原圖
  ctx.fillStyle = 'rgba(0,0,0,0.52)';
  ctx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);
  ctx.drawImage(maskCanvas, 0, 0);

  // SVG 輪廓（半透明疊在上方作為視覺引導）
  ctx.globalAlpha = 0.55;
  ctx.drawImage(svgMaskImg, x, y, w, h);
  ctx.globalAlpha = 1;
}

// SVG 尚未載入時的備用矩形顯示
function drawFallbackRect({ x, y, w, h }) {
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);
  ctx.clearRect(x, y, w, h);
  ctx.drawImage(originalImage, x, y, w, h, x, y, w, h);
  ctx.strokeStyle = '#C47C2B';
  ctx.lineWidth = Math.max(3, 3 / scaleRatio);
  ctx.strokeRect(x, y, w, h);
}

// ── 4. 觸控 / 滑鼠事件 ──
function getCanvasPos(e) {
  const rect  = cropCanvas.getBoundingClientRect();
  const touch = e.touches ? e.touches[0] : e;
  return {
    x: (touch.clientX - rect.left) / scaleRatio,
    y: (touch.clientY - rect.top)  / scaleRatio,
  };
}

function onStart(e) {
  e.preventDefault();
  const pos = getCanvasPos(e);
  startX = pos.x;
  startY = pos.y;
  isDrawing = true;
  confirmBtn.disabled = true;
}

function onMove(e) {
  if (!isDrawing) return;
  e.preventDefault();
  const pos = getCanvasPos(e);
  currentRect = {
    x: Math.min(startX, pos.x),
    y: Math.min(startY, pos.y),
    w: Math.abs(pos.x - startX),
    h: Math.abs(pos.y - startY),
  };
  drawImage();
}

function onEnd(e) {
  if (!isDrawing) return;
  isDrawing = false;
  if (currentRect && currentRect.w > 20 && currentRect.h > 20) {
    confirmBtn.disabled = false;
  }
}

cropCanvas.addEventListener('mousedown',  onStart);
cropCanvas.addEventListener('mousemove',  onMove);
cropCanvas.addEventListener('mouseup',    onEnd);
cropCanvas.addEventListener('touchstart', onStart, { passive: false });
cropCanvas.addEventListener('touchmove',  onMove,  { passive: false });
cropCanvas.addEventListener('touchend',   onEnd);

// ── 5. 確認裁切（PNG 保留透明度）──
const MAX_CROP_PX = 800;

confirmBtn.addEventListener('click', () => {
  if (!currentRect) return;

  const { x, y, w, h } = rectToOverlay(currentRect);
  const scale  = Math.min(1, MAX_CROP_PX / Math.max(w, h));
  const finalW = Math.round(w * scale);
  const finalH = Math.round(h * scale);

  const offscreen = document.createElement('canvas');
  offscreen.width  = finalW;
  offscreen.height = finalH;
  const oc = offscreen.getContext('2d');

  // 裁切對應區域的原圖
  oc.drawImage(originalImage, x, y, w, h, 0, 0, finalW, finalH);

  // 套用 SVG 貓臉遮罩（destination-in：只保留 SVG 形狀內的像素）
  if (svgReady) {
    oc.globalCompositeOperation = 'destination-in';
    oc.drawImage(svgMaskImg, 0, 0, finalW, finalH);
  }

  const dataURL = offscreen.toDataURL('image/png');

  try {
    sessionStorage.setItem('petFaceImage', dataURL);
    localStorage.removeItem('petFaceImage');
  } catch {
    try { localStorage.setItem('petFaceImage', dataURL); } catch {}
  }

  previewImg.src = dataURL;
  setStep(3);
});
