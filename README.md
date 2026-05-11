# 🐾 寵物 AR 體驗 — 專案說明

## 資料夾結構

```
pet-ar/
├── index.html        ← 主頁面（上傳 + 框選）
├── ar.html           ← AR 體驗頁面
├── js/
│   └── crop.js       ← 框選裁切邏輯
└── assets/
    ├── targets.mind  ← ⚠️ 需要你自己產生（見下方說明）
    └── placeholder.png ← 可選，預設佔位圖
```

---

## ⚠️ 最重要的步驟：產生 targets.mind

`targets.mind` 是 Mind AR 的定位點編譯檔，**你必須自己產生**。

### 步驟：

1. 打開這個網址：
   **https://hiukim.github.io/mind-ar-js-doc/tools/compile**

2. 上傳你的定位點圖片（貓腳印 or 你設計的圖案）

3. 點擊 Compile

4. 下載產生的 `.mind` 檔案

5. 把它放到 `assets/targets.mind`

### 定位點圖片設計建議：
- 尺寸：至少 500x500px
- 深色圖案在白色背景上
- 避免純圓形，加入文字或不對稱元素
- 儲存為 JPG 或 PNG

---

## 部署到 GitHub Pages

1. 在 GitHub 建立一個新的 Repository（設為 Public）
2. 把整個 `pet-ar/` 資料夾的內容上傳上去
3. 進入 Repository → Settings → Pages
4. Source 選 `main` branch → 根目錄 `/`
5. 儲存後等約 1 分鐘
6. 你的網址會是：`https://你的帳號.github.io/你的Repo名稱/`

---

## AR 貼圖位置調整

在 `ar.html` 找到這段，調整數值：

```javascript
// 貼圖大小（相對於定位點）
const planeWidth  = 1.2;  // 增大 = 貼圖變大
const planeHeight = 1.2;

// 貼圖位置偏移（相對於定位點中心）
plane.position.set(
  0,    // x：正數=往右，負數=往左
  0,    // y：正數=往上，負數=往下
  0     // z：通常不動
);
```

**實際操作流程：**
1. 先把定位點放在貓咪圖騰旁邊
2. 用手機掃描測試
3. 看貼圖出現在哪裡，調整 position 的 x / y 值
4. 重新上傳到 GitHub Pages，再測試

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
確認裁切 → 可下載圖片
   ↓
點擊「開啟 AR 體驗」→ ar.html
   ↓
允許相機權限
   ↓
對準定位點 → 看到寵物臉部疊加在圖騰上
```
