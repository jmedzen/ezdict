# 🪷 Ezdict — High-Performance Offline Markdown Dictionary Plugin for Obsidian

[![GitHub Release](https://img.shields.io/github/v/release/jmedzen/ezdict?color=orange)](https://github.com/jmedzen/ezdict/releases)
[![Obsidian Downloads](https://img.shields.io/badge/Obsidian-Community%20Plugin-7C3AED.svg)](https://obsidian.md/plugins?id=ezdict)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**Languages / 語言 / 语言 / Idiomas / 言語 / 언어 / ภาษา**:  
[English](#english) | [繁體中文](#繁體中文) | [简体中文](#简体中文) | [Español](#español) | [日本語](#日本語) | [한국어](#한국어) | [ไทย](#ไทย)

---

<a name="english"></a>
## English

**`Ezdict`** turns standard Markdown files into blazing-fast, offline dictionaries inside [Obsidian](https://obsidian.md). Whether you want to browse massive reference lexicons or craft your own personal terminology databases, Ezdict offers lightning-speed lookups with zero memory lag.

### 🌟 4 Core Pillars

1. 📖 **Turn Any Markdown into a Dictionary**
   - No proprietary formats (like MDX or SQLite). Any plain `.md` file in your folder instantly becomes a full-featured dictionary.
   - Any heading (`### Headword`) automatically serves as an indexed dictionary entry.
2. ✍️ **Craft & Edit Your Own Dictionaries with Ease**
   - Write your own glossaries, course vocabularies, medical codices, legal terms, or personal encyclopedias using human-readable Markdown.
   - Fully supports native Obsidian formatting: Callouts, LaTeX math (`$E=mc^2$`), tables, images, and clickable internal `[[wikilinks]]`.
3. ⚡ **Ultra-High Performance (< 1ms Slicing, Zero Freezes)**
   - Solves the notorious 20–40 second freeze when opening 20MB~100MB+ Markdown files in Obsidian.
   - **Byte-Range Slicing**: Calculates byte offsets (`byteOffset`) and streams only the needed entry directly from disk in under 1ms.
   - **3 Search Modes**:
     - 📖 **Prefix**: Instant $O(\log N)$ binary search with zero latency.
     - 🔍 **Fuzzy**: Substring matching based on CJK bigram intersection.
     - 📑 **Full-Text**: Cross-dictionary in-body search with multi-word `AND` queries and proximity distance filtering.
4. 🔒 **100% Offline, Private & Effortlessly Shareable**
   - Completely local: Zero telemetry, zero external server dependency, works seamlessly in air-gapped environments.
   - **Easy to Share**: Dictionaries are just plain `.md` files or `.zip` archives. Sync via Git, iCloud, or Dropbox, or share with colleagues and students in one click.

---

### ✍️ How to Write Your Own Dictionary

Writing a dictionary is as simple as creating a standard Markdown note:

```markdown
### Prajna
Direct insight into the true nature of reality. In Mahayana Buddhism, it is the wisdom that understands emptiness (Śūnyatā).

> [!tip] Related Concepts
> See also [[Sunyata]] and [[Nirvana]].

### Nirvana
The ultimate state of liberation and freedom from suffering.
```

---

### 🔍 Search, Navigate & Cite

- **In-Reader Wikilink Jumping**: Click `[[wikilinks]]` inside definitions to navigate immediately inside the Ezdict reader without opening extra tabs, with full history back/forward navigation.
- **Selection Lookup**: Highlight any text in your note ➔ Right-click "Search in Ezdict" or press hotkey modal.
- **One-Click Citation**: Insert definitions into your active note as **Callout (`> [!quote]`)**, **Footnote (`[^term]`)**, **Wikilink (`[[term]]`)**, or **Raw text**.

---

### ⚙️ Quick Configuration

Open Obsidian **Settings ➔ Ezdict**:

| Setting | Description | Default |
| :--- | :--- | :--- |
| **Dictionary Path** | Folder containing `.md` dictionary files (relative or absolute). | `dictionary_folder` |
| **Entry Heading Level** | Heading level defining headwords (`h2 ~ h6` or auto-detect). | `h3 (###)` |
| **Download Sample Dictionaries** | One-click download of curated sample dictionaries with auto-unzip. | Button |
| **Default Search Mode** | Initial mode when searching (Prefix / Fuzzy / Full-Text). | Prefix |
| **Citation Template** | Format when inserting definitions into notes. | Callout (`> [!quote]`) |

---

<a name="繁體中文"></a>
## 繁體中文

**`Ezdict`** 是一款專為 [Obsidian](https://obsidian.md) 設計的高效能、純離線 Markdown 辭典外掛。它能將任意 `.md` 筆記檔案直接轉化為即查即用的專業辭典，讓您輕鬆打造、離線查閱並隨心分享屬於自己的知識庫。

### 🌟 4 大核心特色

1. 📖 **把 Markdown 檔案直接變成辭典**
   - 告別 MDX、StarDict 或 SQLite 等專有封閉格式，**純文字 `.md` 檔案就是辭典**。
   - 檔案內只要有 Markdown 標題（如 `### 詞頭`），外掛便會自動掃描並建立高精度索引。
2. ✍️ **自由編寫屬於你的專屬辭典**
   - 無論是個人生詞庫、專業學科術語（醫學、法律、佛學、文史）、讀書筆記還是各類百科，都能用最熟悉的 Markdown 自由編寫與維護。
   - 完整支援 Obsidian 原生語法：Callout 提示框、LaTeX 數學公式（`$E=mc^2$`）、表格、圖片以及 `[[雙向連結]]`。
3. ⚡ **極致高效能（< 1ms 切片讀取、零卡頓）**
   - 徹底根治 Obsidian 開啟 20MB～100MB+ 巨型 Markdown 檔案時嚴重卡頓 20~40 秒的痛點。
   - **Byte-Range 毫秒級切片**：依位元組偏移量（`byteOffset`）按需精確讀取單條詞義，耗時 **< 1ms**，不佔記憶體。
   - **三種專業檢索模式**：
     - 📖 **詞條前綴 (Prefix)**：基於 $O(\log N)$ 二分搜尋，0 延遲隨打即顯。
     - 🔍 **詞條模糊 (Fuzzy)**：基於 CJK Bigram 快速匹配任意子字串。
     - 📑 **內文全文 (Full-Text)**：跨辭典內文檢索，支援空白多詞交集 (AND) 與鄰近詞距上限過濾。
4. 🔒 **100% 離線隨身、隨心分享**
   - **純本機運作**：無須任何後端伺服器或連網環境，保護個人資料隱私與離線使用體驗。
   - **極簡分享與同步**：辭典就是普通的 `.md` 檔案或 `.zip` 壓縮包，可透過 Git、iCloud、Dropbox 輕鬆跨裝置同步，或一鍵打包分享給朋友與研究夥伴；設定頁亦支援一鍵下載官方範例辭典包。

---

### ✍️ 如何編寫自己的辭典

編寫辭典就像寫一般 Markdown 筆記一樣直覺：

```markdown
### 般若
梵語 prajñā。意譯為智慧。指通達真理、證悟空性之最高智慧。

> [!tip] 相關概念
> 請參見 [[空性]] 與 [[涅槃]]。

### 涅槃
梵語 nirvāṇa。意譯為滅度、寂滅。指斷除一切煩惱，達到究竟解脫之境界。
```

---

### 🔍 查詢、跳轉與一鍵引用

- **釋義內跳轉**：點擊釋義中的 `[[詞條]]` 連結直接在側邊欄秒開，支援多層歷史返回（`← 前一條 / 後一條 →`）。
- **劃詞即查**：在筆記中選取文字 ➔ 右鍵選單「在 Ezdict 查詢」或快捷鍵即刻彈窗查詢。
- **一鍵引用**：一鍵將詞條釋義插入為 **引用區塊 (`> [!quote]`)**、**腳註 (`[^詞條]`)**、**雙向連結 (`[[詞條]]`)** 或 **原始文字**。

---

### ⚙️ 快速設定指南

開啟 Obsidian **「設定」➔「Ezdict」**：

| 設定項目 | 說明 | 預設值 |
| :--- | :--- | :--- |
| **辭典目錄路徑** | 存放辭典 `.md` 檔案的資料夾（支援相對或絕對路徑）。 | `dictionary_folder` |
| **詞條標題層級** | 定義作為詞條開頭的標題層級（支援 `h2 ~ h6` 或自動偵測）。 | `h3 (###)` |
| **下載範例辭典** | 一鍵自雲端下載官方精選辭典包並自動解壓縮建立索引。 | 按鈕 |
| **預設搜尋模式** | 開啟側邊欄時的預設模式（詞條 / 模糊 / 全文）。 | 詞條 (Prefix) |
| **一鍵引用格式** | 點擊插入筆記時使用的格式樣板。 | 引用區塊 (`> [!quote]`) |

---

<a name="简体中文"></a>
## 简体中文

**`Ezdict`** 是一款专为 [Obsidian](https://obsidian.md) 打造的高性能、纯离线 Markdown 词典插件。将任意 `.md` 笔记文件瞬间变为检索极速的专业词典，助您轻松创建、离线查阅与便捷分享个人知识库。

### 🌟 4 大核心优势

1. 📖 **把 Markdown 文件直接变为词典**
   - 无需任何专有格式（如 MDX、SQLite），**纯文本 `.md` 文件就是词典**。
   - 文件内使用 Markdown 标题（如 `### 词头`）即可自动索引为词条。
2. ✍️ **自由编写专属词典与术语库**
   - 随心编写单词本、学科专业术语（医学、法学、佛学等）、文献专名或个人百科。
   - 完美支持 Obsidian 原生语法：Callout 引用块、LaTeX 公式（`$E=mc^2$`）、表格与 `[[双向链接]]`。
3. ⚡ **极致高性能（< 1ms 切片读取、告别卡顿）**
   - 彻底解决 Obsidian 打开 20MB～100MB+ 大型 Markdown 文件卡死几十秒的问题。
   - **Byte-Range 毫秒级切片**：根据字节偏移量按需读取单词释义，耗时 **< 1ms**。
   - **3 种检索模式**：前缀秒搜（Prefix）、模糊匹配（Fuzzy）、正文全文检索（Full-Text）。
4. 🔒 **100% 离线安全、随心分享**
   - **纯本地运行**：零数据上传，无网络环境亦可稳定使用。
   - **轻松同步与分享**：词典即为普通 `.md` 或 `.zip` 文件，可通过 Git/网盘同步，或一键分发给同学与团队。

---

<a name="español"></a>
## Español

**`Ezdict`** convierte cualquier archivo Markdown estándar en un diccionario sin conexión y ultrarrápido dentro de [Obsidian](https://obsidian.md).

### 🌟 4 Pilares Fundamentales

1. 📖 **Convierte Markdown en Diccionarios**: Sin formatos propietarios. Cualquier archivo `.md` con encabezados (`### Término`) se convierte al instante en un diccionario indexado.
2. ✍️ **Crea y Edita tus Propios Diccionarios**: Escribe glosarios, términos médicos, jurídicos o enciclopedias personales con sintaxis Markdown nativa (Callouts, LaTeX, tablas y `[[enlaces]]`).
3. ⚡ **Rendimiento Ultra Alto (< 1ms)**: Elimina bloqueos en archivos grandes de 20MB~100MB+ leyendo solo las entradas necesarias mediante desplazamiento de bytes (`byteOffset`). Incluye 3 modos de búsqueda (Prefijo, Difuso y Texto completo).
4. 🔒 **100% Sin Conexión y Fácil de Compartir**: Totalmente privado y local. Comparte tus diccionarios en archivos `.md` o `.zip` con un solo clic.

---

<a name="日本語"></a>
## 日本語

**`Ezdict`** は、通常の Markdown ファイルを [Obsidian](https://obsidian.md) 内で超高速なオフライン辞書に変換するプラグインです。

### 🌟 4つのコア機能

1. 📖 **Markdown ファイルをそのまま辞書化**: 独自形式（MDX/SQLite等）は不要。見出し（`### 見出し語`）を記述した `.md` ファイルがそのまま辞書になります。
2. ✍️ **自分だけの専用辞書を自由に作成**: 専門用語集、語学ノート、法律・医学用語、百科事典などを Markdown で自由に作成・編集可能（Callout、LaTeX数式、`[[内部リンク]]` 対応）。
3. ⚡ **超高速・フリーズゼロ (< 1ms スライス)**: 20MB〜100MB+ の巨大ファイルでも、バイトオフセット（`byteOffset`）による即時スライスでフリーズなくミリ秒未満で表示。前方一致・あいまい・全文検索の3モード搭載。
4. 🔒 **完全オフライン・手軽に共有**: 外部サーバー通信なしで安心。辞書は通常の `.md` や `.zip` なので、クラウド同期や友人・研究仲間への配布も簡単です。

---

<a name="한국어"></a>
## 한국어

**`Ezdict`**는 일반 Markdown 파일을 [Obsidian](https://obsidian.md)에서 초고속 오프라인 사전으로 활용할 수 있게 해주는 플러그인입니다.

### 🌟 4대 핵심 특징

1. 📖 **Markdown 파일을 즉시 사전으로 변환**: 전용 포맷 변환 없이 일반 `.md` 파일의 제목(`### 표제어`)을 그대로 사전 항목으로 자동 색인합니다.
2. ✍️ **나만의 맞춤형 사전 자유 제작**: 전문 용어집, 학습 단어장, 학술 용어 사전을 Markdown으로 쉽게 작성하고 Callout, LaTeX 수식, `[[내부 링크]]`를 완벽 지원합니다.
3. ⚡ **초고속 성능 (< 1ms 슬라이싱, 지연 제로)**: 수십 MB 대용량 파일도 바이트 오프셋 슬라이싱 기술로 멈춤 없이 1ms 미만으로 즉시 로드합니다. (접두사/유사/전체 텍스트 검색 지원)
4. 🔒 **100% 오프라인 & 간편한 공유**: 외부 서버 없는 완벽한 개인정보 보호 및 `.md` / `.zip` 파일 기반의 손쉬운 동기화와 공유.

---

<a name="ไทย"></a>
## ไทย

**`Ezdict`** เปลี่ยนไฟล์ Markdown ทั่วไปให้เป็นพจนานุกรมออฟไลน์ความเร็วสูงใน [Obsidian](https://obsidian.md)

### 🌟 4 จุดเด่นสำคัญ

1. 📖 **เปลี่ยนไฟล์ Markdown ให้เป็นพจนานุกรม**: ไม่ต้องแปลงไฟล์เป็นรูปแบบเฉพาะ แค่ใช้หัวข้อ (`### คำศัพท์`) ในไฟล์ `.md` ก็กลายเป็นพจนานุกรมทันที
2. ✍️ **สร้างและแก้ไขพจนานุกรมของตัวเองได้ง่ายดาย**: เขียนคำศัพท์เฉพาะทาง บันทึกการเรียน หรือสารานุกรมส่วนตัวด้วย Markdown พร้อมรองรับ Callouts, สูตร LaTeX และ `[[ลิงก์ภายใน]]`
3. ⚡ **ประสิทธิภาพสูงสุด (< 1ms อ่านไฟล์เร็วทันใจ ไม่ค้าง)**: อ่านเฉพาะส่วนคำศัพท์ที่ต้องการผ่าน Byte-Range ช่วยแก้ปัญหาโปรแกรมค้างจากไฟล์ขนาดใหญ่ 20MB~100MB+ พร้อมโหมดค้นหา 3 แบบ
4. 🔒 **ออฟไลน์ 100% ปลอดภัยและแชร์ต่อง่าย**: ทำงานในเครื่องทั้งหมด ปลอดภัย ไร้กังวล และแชร์ไฟล์ `.md` หรือ `.zip` ให้เพื่อนร่วมงานได้ทันที

---

## 📄 License / 開源授權

Released under the [MIT License](LICENSE).  
GitHub Repository: [https://github.com/jmedzen/ezdict](https://github.com/jmedzen/ezdict)
