# 🪷 Ezdict — High-Performance Offline Markdown Dictionary Plugin for Obsidian

[![GitHub Release](https://img.shields.io/github/v/release/jmedzen/ezdict?color=orange)](https://github.com/jmedzen/ezdict/releases)
[![Obsidian Downloads](https://img.shields.io/badge/Obsidian-Community%20Plugin-7C3AED.svg)](https://obsidian.md/plugins?id=ezdict)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**Languages / 語言 / 语言 / Idiomas / 言語 / 언어 / ภาษา**:  
[English](#english) | [繁體中文](#繁體中文) | [简体中文](#简体中文) | [Español](#español) | [日本語](#日本語) | [한국어](#한국어) | [ไทย](#ไทย)

---

<a name="english"></a>
## 🇬🇧 English

**`Ezdict`** is a lightning-fast, 100% offline dictionary lookup and reader plugin for [Obsidian](https://obsidian.md). Specifically engineered for massive multi-megabyte Markdown dictionaries (e.g., Buddhist encyclopedias, literature lexicons, terminology databases), Ezdict eliminates Obsidian freezing when opening huge files by using instant byte-range file slicing.

### ✨ Key Features

- ⚡ **Byte-Range Instant Slicing (< 1ms)**: Slices and reads dictionary definitions directly from disk via byte offsets (`byteOffset`) on demand.
- 🔍 **3 Professional Search Modes**:
  - 📖 **Prefix**: Instant $O(\log N)$ binary search on headwords with zero latency.
  - 🔍 **Fuzzy**: Fast substring matching based on CJK bigram intersection.
  - 📑 **Full-Text**: Cross-dictionary full-text search with multi-term `AND` queries, proximity distance filtering, and multi-mode result caching.
- 📥 **One-Click Sample Dictionary Download**: Download official curated sample dictionaries directly from plugin settings with automatic ZIP extraction and indexing.
- 🔗 **In-Panel Internal Link Navigation**: Click `[[wikilinks]]` within definitions to jump directly inside the reader with history back stack.
- 🎨 **Deep Theme & i18n Integration**: Fully integrated with Obsidian theme colors, font scaling, and multi-language support (English, Traditional Chinese, Simplified Chinese, Spanish, Japanese, Korean, Thai).
- 📝 **Selection Lookup & One-Click Citation**: Look up highlighted text via right-click menu or modal, and insert definitions as Callouts (`> [!quote]`), Footnotes (`[^term]`), or Wikilinks (`[[term]]`).

### ⚙️ Quick Configuration

Go to **Settings ➔ Ezdict**:
- **Dictionary Path**: Directory containing dictionary `.md` files (Vault relative or absolute disk path).
- **Entry Heading Level**: Heading level marking headwords in Markdown (`h2 ~ h6` or auto-detect).
- **Download Sample Dictionaries**: Click to download official sample dictionaries in one click.

---

<a name="繁體中文"></a>
## 🇹🇼 繁體中文

**`Ezdict`** 是一款專為 [Obsidian](https://obsidian.md) 設計的高效能、純離線 Markdown 辭典查詢與閱讀外掛。特別針對數十 MB 巨型辭典進行底層優化，徹底解決開啟大檔案時畫面卡頓的問題。

### ✨ 核心特色

- ⚡ **Byte-Range 毫秒級切片讀取 (< 1ms)**：自研 Section 切片索引，按需透過位元組偏移量（`byteOffset`）讀取詞條，單詞讀取耗時 **< 1ms**。
- 🔍 **三種專業檢索模式**：
  - 📖 **詞條前綴 (Prefix)**：基於 $O(\log N)$ 二分搜尋，0 延遲隨打即顯。
  - 🔍 **詞條模糊 (Fuzzy)**：基於 CJK Bigram 集合求交集，快速匹配任意子字串。
  - 📑 **內文全文 (Full-Text)**：跨辭典全文檢索，支援空白多詞交集 (AND) 與鄰近詞距上限過濾。
- 📥 **一鍵下載範例辭典**：設定頁支援一鍵從雲端下載官方精選辭典包，自動解壓縮至辭典目錄並建立索引。
- 🔗 **辭典內部連結秒開跳轉**：內文中的 `[[詞條]]` 內部連結直接在側邊欄秒開，支援多層歷史返回。
- 🎨 **多國語言 i18n 與主題適配**：支援繁中、簡中、英文、西文、日文、韓文、泰文 7 大語系；字體大小自動連動 Obsidian 外觀設定。
- 📝 **劃詞即查與一鍵引用**：支援右鍵選單劃詞即查，一鍵將釋義插入為引用區塊 (`> [!quote]`)、腳註 (`[^詞條]`) 或雙向連結 (`[[詞條]]`)。

### ⚙️ 快速設定

開啟 Obsidian **「設定」➔「Ezdict」**：
- **辭典目錄路徑**：存放 `.md` 辭典的資料夾（支援相對或絕對路徑）。
- **詞條標題層級**：定義作為詞條開頭的標題層級（預設 `h3 ###`）。
- **下載範例辭典**：點擊按鈕一鍵取得官方範例辭典包。

---

<a name="简体中文"></a>
## 🇨🇳 简体中文

**`Ezdict`** 是一款专为 [Obsidian](https://obsidian.md) 打造的高性能、纯离线 Markdown 词典查询与阅读插件。针对数十 MB 超大型词典文件进行深度底层优化，彻底解决打开大文件时的卡顿问题。

### ✨ 核心特性

- ⚡ **Byte-Range 毫秒级切片读取 (< 1ms)**：基于字节偏移量（`byteOffset`）按需读取目标词条，单词读取耗时 **< 1ms**。
- 🔍 **三种专业检索模式**：
  - 📖 **词条前缀 (Prefix)**：$O(\log N)$ 二分搜索，0 延迟即时呈现。
  - 🔍 **词条模糊 (Fuzzy)**：CJK Bigram 集合交集匹配，高效检索任意子字符串。
  - 📑 **正文全文 (Full-Text)**：跨词典正文检索，支持空格多词交集 (AND) 与邻近词距过滤。
- 📥 **一键下载示例词典**：在设置面板中一键下载官方精选词典包，自动解压至词典目录并建立索引。
- 🔗 **词典内链即时跳转**：正文中的 `[[词条]]` 链接在阅读面板内直接跳转，支持多层历史返回。
- 🎨 **多语言 i18n 与主题深度适配**：支持中、英、西、日、韩、泰等多种语言；字体大小自动同步系统外观。
- 📝 **划词即查与一键引用**：支持划词右键菜单查询，一键插入为引用区块 (`> [!quote]`)、脚注 (`[^词条]`) 或双向链接 (`[[词条]]`)。

---

<a name="español"></a>
## 🇪🇸 Español

**`Ezdict`** es un complemento de consulta y lectura de diccionarios Markdown 100% sin conexión y ultrarrápido para [Obsidian](https://obsidian.md). Diseñado específicamente para diccionarios grandes de varios megabytes, elimina los bloqueos al abrir archivos gigantes mediante la lectura instantánea por rangos de bytes.

### ✨ Características principales

- ⚡ **Lectura instantánea por rangos de bytes (< 1ms)**: Lee definiciones directamente del disco mediante desplazamientos de bytes (`byteOffset`) bajo demanda.
- 🔍 **3 modos de búsqueda profesionales**:
  - 📖 **Prefijo**: Búsqueda binaria instantánea $O(\log N)$ con latencia cero.
  - 🔍 **Difuso**: Coincidencia rápida de subcadenas basada en bigramas.
  - 📑 **Texto completo**: Búsqueda en el cuerpo de todos los diccionarios con consultas `AND` multitérrmino y filtros de distancia de proximidad.
- 📥 **Descarga de diccionarios de ejemplo en un clic**: Descarga diccionarios oficiales directamente desde la configuración con descompresión ZIP e indexación automática.
- 🔗 **Navegación por enlaces internos**: Haga clic en `[[enlaces]]` dentro de las definiciones para navegar dentro del panel con historial de retroceso.
- 🎨 **Integración con temas e i18n**: Totalmente compatible con 7 idiomas (inglés, español, chino tradicional/simplificado, japonés, coreano y tailandés).
- 📝 **Búsqueda de selección y citas en un clic**: Busque texto seleccionado mediante el menú contextual y cite definiciones como bloques (`> [!quote]`), notas al pie (`[^término]`) o enlaces internos (`[[término]]`).

---

<a name="日本語"></a>
## 🇯🇵 日本語

**`Ezdict`** は、[Obsidian](https://obsidian.md) 向けの超高速・完全オフライン対応 Markdown 辞書検索・閲覧プラグインです。数十MBに及ぶ巨大な辞書ファイル（仏教大辞典、文学用語集、専門百科事典など）でも、ファイル読み込みによるフリーズを発生させず、バイト範囲の即時スライスによってミリ秒単位で瞬時に見出し語を表示します。

### ✨ 主な機能

- ⚡ **バイト範囲のミリ秒スライス読み込み (< 1ms)**: バイトオフセット（`byteOffset`）により、必要な見出し語の本文のみをディスクからオンデマンドで直接読み込みます。
- 🔍 **3つの専門検索モード**:
  - 📖 **見出し語前方一致 (Prefix)**: $O(\log N)$ 二分探索による遅延ゼロの即時検索。
  - 🔍 **部分一致 (Fuzzy)**: CJK Bigram 交差アルゴリズムによる高速あいまい検索。
  - 📑 **本文全文検索 (Full-Text)**: 複数キーワード (AND) 検索、近接単語距離フィルタリング、検索結果キャッシュに対応。
- 📥 **サンプル辞書のワンクリックダウンロード**: 設定画面から公式サンプル辞書パックをワンクリックでダウンロード、自動解凍およびインデックス作成。
- 🔗 **辞書内リンクの即時ジャンプ**: 解説文中の `[[内部リンク]]` をクリックして辞書内で即座にジャンプ表示、多段階の履歴「戻る」に対応。
- 🎨 **Obsidian テーマ連動 & 多言語対応**: 日本語、英語、繁体字/簡体字中国語、スペイン語、韓国語、タイ語など7言語の i18n に対応。フォントサイズは Obsidian の外観設定と自動同期。
- 📝 **選択テキスト検索 & ワンクリック引用**: 右クリックメニューからの辞書検索、引用ブロック (`> [!quote]`)、脚注 (`[^見出し]`)、内部リンク (`[[見出し]]`) へのワンクリック挿入。

---

<a name="한국어"></a>
## 🇰🇷 한국어

**`Ezdict`**는 [Obsidian](https://obsidian.md)을 위한 초고속 완전 오프라인 Markdown 사전 검색 및 리더 플러그인입니다. 수십 메가바이트 크기의 방대한 마크다운 사전 파일을 열 때 발생하는 지연 현상을 바이트 단위 슬라이싱 기술을 통해 완벽하게 해결합니다.

### ✨ 주요 기능

- ⚡ **바이트 범위 초고속 슬라이싱 (< 1ms)**: 바이트 오프셋(`byteOffset`)을 사용하여 필요한 표제어 본문만 디스크에서 즉시 읽어옵니다.
- 🔍 **3가지 전문 검색 모드**:
  - 📖 **표제어 접두사 (Prefix)**: $O(\log N)$ 이진 검색으로 지연 없는 즉각적인 결과 제공.
  - 🔍 **유사 검색 (Fuzzy)**: CJK Bigram 교집합 기반의 빠른 부분 문자열 검색.
  - 📑 **본문 전체 텍스트 (Full-Text)**: 다중 키워드(AND) 검색 및 단어 근접 거리 필터링 지원.
- 📥 **원클릭 샘플 사전 다운로드**: 플러그인 설정에서 공식 샘플 사전 패키지를 한 번의 클릭으로 다운로드하고 자동 압축 해제 및 인덱싱.
- 🔗 **사전 내부 링크 이동**: 정의 내 `[[내부 링크]]`를 클릭하여 사전 리더 내에서 즉시 이동하며 뒤로 가기 히스토리 지원.
- 🎨 **다국어 i18n 및 테마 통합**: 한국어, 영어, 중국어(번체/간체), 일본어, 스페인어, 태국어 등 7개 언어 지원 및 폰트 크기 자동 동기화.
- 📝 **선택 영역 검색 및 원클릭 인용**: 우클릭 메뉴 검색 지원 및 인용 블록(`> [!quote]`), 각주(`[^표제어]`), 내부 링크(`[[표제어]]`) 형식으로 손쉬운 삽입.

---

<a name="ไทย"></a>
## 🇹🇭 ไทย

**`Ezdict`** เป็นปลั๊กอินค้นหาและอ่านพจนานุกรม Markdown แบบออฟไลน์ 100% ที่เร็วเป็นพิเศษสำหรับ [Obsidian](https://obsidian.md) ออกแบบมาโดยเฉพาะสำหรับไฟล์พจนานุกรมขนาดใหญ่หลายสิบเมกะไบต์ ช่วยแก้ปัญหาการค้างของโปรแกรมด้วยเทคโนโลยีการอ่านไฟล์ตามช่วงไบต์ในทันที

### ✨ คุณสมบัติเด่น

- ⚡ **การอ่านไฟล์ตามช่วงไบต์ (< 1ms)**: อ่านเนื้อหาคำศัพท์โดยตรงจากดิสก์ผ่าน byte offset (`byteOffset`) ตามความต้องการภายในเสี้ยววินาที
- 🔍 **3 โหมดการค้นหาขั้นสูง**:
  - 📖 **คำขึ้นต้น (Prefix)**: ค้นหาแบบทวิภาค $O(\log N)$ อย่างรวดเร็วโดยไม่มีความหน่วง
  - 🔍 **คลุมเครือ (Fuzzy)**: ค้นหาข้อความย่อยอย่างรวดเร็ว
  - 📑 **ข้อความเต็ม (Full-Text)**: ค้นหาในเนื้อหาทั้งหมด รองรับการค้นหาหลายคำพร้อมกัน (AND) และการกรองระยะห่างของคำ
- 📥 **ดาวน์โหลดพจนานุกรมตัวอย่างในคลิกเดียว**: ดาวน์โหลดชุดพจนานุกรมตัวอย่างจากเมนูการตั้งค่า พร้อมแตกไฟล์ ZIP และสร้างดัชนีอัตโนมัติ
- 🔗 **ลิงก์ข้ามคำศัพท์ในแผงอ่าน**: คลิก `[[ลิงก์ภายใน]]` ในคำอธิบายเพื่อเปิดอ่านคำศัพท์ที่เกี่ยวข้องได้ทันที พร้อมประวัติการย้อนกลับ
- 🎨 **รองรับหลายภาษาและธีม**: รองรับ 7 ภาษา (ไทย, อังกฤษ, จีนตัวเต็ม/ตัวย่อ, สเปน, ญี่ปุ่น, เกาหลี) และปรับขนาดฟอนต์ตามการตั้งค่าของ Obsidian อัตโนมัติ
- 📝 **ค้นหาข้อความที่เลือกและอ้างอิงง่ายดาย**: ค้นหาข้อความที่เลือกผ่านเมนูคลิกขวา และแทรกคำอธิบายลงในบันทึกเป็นกล่องข้อความอ้างอิง (`> [!quote]`), เชิงอรรถ (`[^คำศัพท์]`) หรือลิงก์ภายใน (`[[คำศัพท์]]`)

---

## 📄 License / 開源授權

Released under the [MIT License](LICENSE).  
GitHub Repository: [https://github.com/jmedzen/ezdict](https://github.com/jmedzen/ezdict)
