# 🪷 Ezdict — Obsidian 高效能離線 Markdown 辭典外掛

[![GitHub Release](https://img.shields.io/github/v/release/jmedzen/ezdict?color=orange)](https://github.com/jmedzen/ezdict/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**`Ezdict`** 是一款專為 [Obsidian](https://obsidian.md) 設計的高效能、純離線辭典查詢與閱讀外掛。特別針對數十 MB 巨型 Markdown 辭典（如《佛光大辭典》、《法相辭典》、《南山律學辭典》等各類百科辭典）進行深度底層優化，解決 Obsidian 開啟大檔案時卡死數十秒的痛點。

---

## ✨ 核心特色

- ⚡ **Byte-Range 毫秒級切片讀取**：
  - 徹底解決 Obsidian 開啟 20MB+ 大檔案時卡頓 20~40 秒的問題。
  - 採用自研 Section 切片索引，直接透過位元組偏移量（`byteOffset`）按需讀取目標詞條，讀取耗時 **< 1ms**。
- 🔍 **三種專業檢索模式**：
  - 📖 **詞條前綴 (Prefix)**：基於 $O(\log N)$ 二分搜尋，隨打即顯，0 延遲自動補全。
  - 🔍 **詞條模糊 (Fuzzy)**：基於 CJK Bigram 集合求交集，快速匹配詞頭內任意子字串。
  - 📑 **內文全文 (Full-Text)**：跨辭典內文檢索，支援空白分隔多詞交集（AND 搜尋）與**鄰近詞距上限過濾（Proximity Filter）**，各模式搜尋結果獨立快取不丟失。
- 🔗 **辭典內部連結就地開啟**：
  - 釋義內文中的 `[[詞條]]` 內部連結直接在 Ezdict 閱讀區秒開跳轉，並支援「上一條」多層歷史返回。
- 📚 **多辭典動態管理**：
  - 自動掃描指定目錄下之多本 `.md` 辭典（支援 Vault 內部資料夾或電腦本機絕對路徑）。
  - 支援一鍵勾選啟用/停用各辭典、拖曳排序辭典優先級。
- 📝 **Obsidian 深度整合與劃詞即查**：
  - **劃詞即查**：在筆記中選取文字，右鍵選單「在 Ezdict 查詢」或按下快捷鍵立即彈窗查詢。
  - **一鍵引用**：支援一鍵將詞條釋義插入為 **引用區塊 (`> [!quote]`)**、**腳註 (`[^詞條]`)** 或 **雙向連結 (`[[詞條]]`)**。
  - **原生渲染**：辭典內文直接調用 Obsidian 內建 `MarkdownRenderer`，完美相容現有主題配色、Callouts 與 LaTeX，支援自由選取文字。
- 🚀 **純離線、零外部伺服器依賴**：完全在本地端運作，不需啟動任何後端服務，即使在無網路環境也能極速查詢。

---

## 📦 安裝教學

### 方式一：手動安裝（推薦）
1. 至 [GitHub Releases](https://github.com/jmedzen/ezdict/releases) 下載最新版的 `main.js`、`manifest.json`、`styles.css`。
2. 開啟您的 Obsidian Vault 資料夾，進入 `.obsidian/plugins/` 目錄。
3. 建立名為 `ezdict` 的資料夾，並將上述 3 個檔案放入該目錄：
   ```text
   YourVault/
   └── .obsidian/
       └── plugins/
           └── ezdict/
               ├── main.js
               ├── manifest.json
               └── styles.css
   ```
4. 開啟 Obsidian ➔ **設定** ➔ **社群外掛** ➔ 重新載入並啟用 **Ezdict**。

---

## ⚙️ 設定指南

在 Obsidian 的 **設定 ➔ Ezdict** 中可自訂以下選項：

| 設定項目 | 說明 | 預設值 |
| :--- | :--- | :--- |
| **辭典目錄路徑** | 存放辭典 `.md` 檔案的資料夾路徑。支援相對路徑（如 `dicts` 或 `dictionary`）或電腦絕對路徑。 | `dicts` |
| **詞條標題層級** | 定義 Markdown 中作為獨立詞條開頭的標題層級（支援 `h2 ~ h6` 或自動偵測）。 | `h3 (###)` |
| **預設搜尋模式** | 開啟側邊欄時的預設搜尋模式（詞條 / 模糊 / 全文）。 | 詞條 (Prefix) |
| **每本辭典最大搜尋筆數** | 限制每本辭典回傳之搜尋結果上限，防止 DOM 節點過多。 | `350` 筆 |
| **搜尋鄰近詞距上限** | 全文檢索多關鍵詞時允許之最大字元間距。 | `150` 字元 |
| **一鍵引用插入格式** | 點擊引用按鈕時寫入目前筆記的格式（引用區塊 / 腳註 / 雙向連結 / 原始文字）。 | 引用區塊 |
| **劃詞即查選單** | 是否在編輯器右鍵選單顯示「在 Ezdict 查詢」。 | 啟用 |

---

## ⌨️ 指令與快捷鍵

可在 Obsidian 的 **設定 ➔ 快捷鍵** 中為以下指令綁定熱鍵：

- **`Ezdict: show md dictionary panel`**：在右側面板開啟辭典查詢視圖。
- **`Ezdict: quick dictionary lookup (modal)`**：開啟浮動搜尋彈窗（若有選取文字將自動填入）。
- **`Ezdict: search selection in dictionary panel`**：選取文字後直接在右側側邊欄展開查詢結果。

---

## 📝 辭典 Markdown 檔案格式建議

辭典 `.md` 檔案格式非常簡單，每一條詞目以 Markdown 標題標示即可（支援 `h2 ~ h6`，預設為 `### 詞頭`）：

```markdown
### 一乘
指唯一的成佛之教法。大乘佛教主張一切眾生皆有佛性...

### 阿賴耶識
【阿賴耶識】（梵 ālaya-vijñāna）八識之一。又作藏識...
```

---

## 📄 開源授權

本專案採用 [MIT 授權條款](LICENSE) 開源。
GitHub 儲存庫：[https://github.com/jmedzen/ezdict](https://github.com/jmedzen/ezdict)
