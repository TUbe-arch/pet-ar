// ── crop.js ──
// 負責：上傳照片、框選、裁切、下載、傳遞圖片給 AR 頁面

const fileInput     = document.getElementById('fileInput');
const cropCanvas    = document.getElementById('cropCanvas');
const confirmBtn    = document.getElementById('confirmCropBtn');
const previewImg    = document.getElementById('previewImg');
const downloadBtn   = document.getElementById('downloadBtn');
const ctx           = cropCanvas.getContext('2d');

let originalImage   = null;   // 原始 Image 物件
let scaleRatio      = 1;      // 顯示縮放比（canvas顯示尺寸 vs 原圖尺寸）

// 框選狀態
let isDrawing = false;
let startX = 0, startY = 0;
let currentRect = null;       // { x, y, w, h } 在 canvas 座標系

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
const MAX_SOURCE_PX = 1600; // 超過此尺寸先縮小，避免 canvas 記憶體不足

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

// ── 2. 設定 Canvas（填滿寬度，保持比例）──
function setupCanvas(img) {
  const maxW = cropCanvas.parentElement.clientWidth;
  scaleRatio  = maxW / img.width;

  cropCanvas.width  = img.width;
  cropCanvas.height = img.height;
  cropCanvas.style.width  = maxW + 'px';
  cropCanvas.style.height = (img.height * scaleRatio) + 'px';

  drawImage();
}

function drawImage() {
  ctx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
  ctx.drawImage(originalImage, 0, 0);
  if (currentRect) drawRect(currentRect);
}

function drawRect(r) {
  // 半透明遮罩
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);

  // 挖出選取區域
  ctx.clearRect(r.x, r.y, r.w, r.h);
  ctx.drawImage(originalImage, r.x, r.y, r.w, r.h, r.x, r.y, r.w, r.h);

  // 邊框
  ctx.strokeStyle = '#C47C2B';
  ctx.lineWidth   = Math.max(3, 3 / scaleRatio);
  ctx.strokeRect(r.x, r.y, r.w, r.h);

  // 四角標記
  const cs = Math.max(16, 16 / scaleRatio);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth   = Math.max(2, 2 / scaleRatio);
  [[r.x, r.y], [r.x + r.w, r.y], [r.x, r.y + r.h], [r.x + r.w, r.y + r.h]].forEach(([cx, cy]) => {
    ctx.beginPath();
    ctx.moveTo(cx - cs * Math.sign(r.w - (cx - r.x) * 2 || 1), cy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy - cs * Math.sign(r.h - (cy - r.y) * 2 || 1));
    ctx.stroke();
  });
}

// ── 3. 觸控 / 滑鼠事件（轉換座標）──
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
  if (currentRect && currentRect.w > 10 && currentRect.h > 10) {
    confirmBtn.disabled = false;
  }
}

cropCanvas.addEventListener('mousedown',  onStart);
cropCanvas.addEventListener('mousemove',  onMove);
cropCanvas.addEventListener('mouseup',    onEnd);
cropCanvas.addEventListener('touchstart', onStart, { passive: false });
cropCanvas.addEventListener('touchmove',  onMove,  { passive: false });
cropCanvas.addEventListener('touchend',   onEnd);

// ── 4. 確認裁切 ──
const MAX_CROP_PX = 800; // 裁切輸出最大邊長，JPEG 壓縮後體積可控

confirmBtn.addEventListener('click', () => {
  if (!currentRect) return;

  const { x, y, w, h } = currentRect;

  // 限制輸出尺寸
  const scale = Math.min(1, MAX_CROP_PX / Math.max(w, h));
  const outW = Math.round(w * scale);
  const outH = Math.round(h * scale);

  const offscreen = document.createElement('canvas');
  offscreen.width  = outW;
  offscreen.height = outH;
  offscreen.getContext('2d').drawImage(originalImage, x, y, w, h, 0, 0, outW, outH);

  // JPEG 壓縮大幅降低體積，避免 storage 超限
  const dataURL = offscreen.toDataURL('image/jpeg', 0.85);

  // sessionStorage 優先；失敗時備援至 localStorage（跨頁可讀）
  try {
    sessionStorage.setItem('petFaceImage', dataURL);
    localStorage.removeItem('petFaceImage');
  } catch {
    try {
      localStorage.setItem('petFaceImage', dataURL);
    } catch {
      // 極端情況：兩個 storage 都滿，ar.html 會顯示佔位圖
    }
  }

  previewImg.src = dataURL;
  setStep(3);
});

// ── 5. 下載圖片 ──
downloadBtn.addEventListener('click', () => {
  const link = document.createElement('a');
  link.href     = previewImg.src;
  link.download = 'my-pet-face.png';
  link.click();
});
