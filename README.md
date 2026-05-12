# 寵物 AR

## 資料夾結構

```
pet-ar/
├── index.html        ← 主頁面（上傳 + 框選）
├── ar.html           ← AR 體驗頁面
├── js/
│   └── crop.js       ← 框選裁切邏輯
└── assets/
    ├── targets.mind  ← 需要自己產生（見下方說明）
    └── cat-mask.svg ← 作為貓臉擷取路徑的svg向量檔案
```

---

## 產生 targets.mind

`targets.mind` 是 Mind AR 的定位點編譯檔，**必須自己產生**。

### 步驟：

1. 打開這個網址：
   **https://hiukim.github.io/mind-ar-js-doc/tools/compile**

2. 上傳定位點圖片

3. 點擊 Compile

4. 下載產生的 `.mind` 檔案

5. 把它放到 `assets/targets.mind`

### 定位點圖片設計建議：
- 尺寸：至少 500x500px
- 以置中為佳，因為預設座標為0,0,0置中，如定位點圖片想成像的地方不是正中央的話，在多個來源圖像時位置會有問題，因為成像只有一個，無法根據不同來源圖像客製化座標位置
- 深色圖案在白色背景上
- 避免純圓形，加入文字或不對稱元素
- 儲存為 JPG 或 PNG

---

## AR 貼圖大小調整

在 `ar.html` 找到這段，調整數值：

```javascript
// 依實體尺寸換算：貓臉 9*0.9cm × 6.5*0.9cm，定位圖 14.5cm = 1 unit
const geometry = new THREE.PlaneGeometry(8.1 / 14.5, 5.85 / 14.5);
```

---

## 使用者操作流程

```
掃 QR Code
   ↓
進入 index.html
   ↓
上傳寵物照片
   ↓
手指拖曳框選臉部
   ↓
確認裁切
   ↓
點擊「開啟 AR 體驗」→ ar.html
   ↓
允許相機權限
   ↓
對準定位點 → 看到寵物臉部疊加在圖騰上
```
