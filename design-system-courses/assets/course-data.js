/* 課程內容：要改文字，改這個檔案就好
   全課 6 部、16 堂、78 分鐘（上限約 80 分鐘）
   每一堂：id、標題、分鐘、形式（講解／示範）、角色、skill、插圖、學到什麼、重點、互動練習、提示詞、小測驗 */
(function () {
  'use strict';
  const DSC = (window.DSC = window.DSC || {});

  DSC.ROLES = {
    designer: { name: '設計師', img: 'coding-1', desc: 'Figma 整理、token 和設計系統文件是你的主場，也會用 Storybook 驗收。' },
    pm: { name: 'PM', img: 'coding-2', desc: '看懂整條流程、用原型驗證想法，決定什麼時候該新增元件。' },
    engineer: { name: '工程師', img: 'coding-3', desc: '建 Storybook、生成元件、驗收畫面，守住不寫死樣式的規則。' }
  };
  const ALL = ['designer', 'pm', 'engineer'];

  DSC.COURSE = [
    {
      short: '開場', title: '開場：先看地圖', img: 'idea',
      tagline: '先知道要去哪、為什麼要去，再出發。',
      goals: ['看懂整門課的五站流水線', '說得出 AI 時代為什麼更需要設計系統', '養成叫 AI 做事前先存檔的習慣'],
      chapters: [
        {
          id: '0-1', title: '課程地圖：五站流水線', mins: 3, kind: '講解', roles: ALL, skills: [], img: 'whiteboard',
          goal: '拿到全課的地圖：五個站，每一站交給哪個 skill。',
          anim: 'pipeline01', animHint: '約 45 秒，分成 4 段。可以隨時暫停，或點上面的段落重看。',
          points: [
            '五站依序是：**Design Token → Figma 整理 → 設計系統文件 → Storybook 元件庫 → 產品界面**。',
            '每一站都有 skill 負責。skill 是寫給 AI 的工作說明書：照什麼步驟做、什麼時候要停下來問你。',
            '每一站只讀上一站交出來的檔案，所以站和站接得起來，中途換人接手也不會亂。',
            '全課用同一個範例：**Mini Shop**，一個虛構的購物 App。為了好懂，大部分時間只看一個功能：商品頁的「**加入購物車**」。token 前綴是 `shop`。'
          ],
          widget: 'pipeline', hint: '點任何一站，看它「放進去」和「拿出來」的是什麼。',
          quiz: {
            q: '「skill」在這門課裡指的是什麼？',
            options: ['一個新的設計軟體', '寫給 AI 的工作說明書：步驟、檢查點，還有什麼時候要停下來問人', '一種 Figma 外掛'],
            answer: 1, explain: 'skill 不是軟體，而是一份 AI 讀得懂的做事方法。同一份 skill 可以在 Cursor、Claude Code 這些 agent 裡使用。'
          }
        },
        {
          id: '0-2', title: '為什麼 AI 時代更需要同一套架構', mins: 4, kind: '講解', roles: ALL, skills: [], img: 'confuse',
          goal: '說得出沒有共用規則時，AI 做得越快、產品越亂的原因。',
          anim: 'arch02', animHint: '約 1 分鐘，分成 5 段。可以隨時暫停，或點上面的段落重看。',
          points: [
            '舊時代的問題：設計 → 開發 → 來回溝通，最後做出「妥協後的產品」。',
            'AI 時代的問題：開發快得像火箭，但每次生成都多一種按鈕、多一個顏色，最後亂到沒人敢改。',
            '解法是兩件事一起做：**設計系統**（規則）加上**產品元件庫**（做好的零件）。AI 有規則可讀、有零件可用，就不會每次重新發明。',
            '設計系統由抽象到具體：設計原則 → 設計元素（色彩、字體、間距）→ 元件 → 組件 → 產品界面。Design Token 就是把「設計元素」變成程式讀得懂的那一層。'
          ],
          widget: 'chaos', hint: '切換上面兩個按鈕，比較 AI 連續三天做出來的商品頁，特別看那顆「加入購物車」按鈕。',
          quiz: {
            q: '團隊請 AI 做了三個頁面，三個「加入購物車」按鈕的顏色和圓角都不一樣。最根本的解法是？',
            options: ['每次生成完再手動修', '換一個更聰明的模型', '給 AI 一套共用的 token 與元件庫，讓它照著用'],
            answer: 2, explain: '問題不在 AI 不夠聰明，而是它每次都沒有東西可以照著做。有了 token 和元件庫，AI 會直接拿現成的。'
          }
        },
        {
          id: '0-3', title: 'Git：讓 agent 改檔前先存檔', mins: 3, kind: '示範', roles: ['designer', 'engineer'], skills: [], img: 'timemachine',
          goal: '叫 agent 做事前先存檔，做完看得懂改了什麼，不滿意就還原。',
          anim: 'git03', animHint: '約 45 秒，分成 4 段。可以隨時暫停，或點上面的段落重看。',
          points: [
            'Git 就像遊戲存檔：打魔王（叫 AI 一次改一堆檔案）之前先存檔，失敗了隨時讀檔重來。',
            '四個動作：**存檔**（commit）、**看差異**（diff）、**還原**（restore）、**開分支試試看**（branch）。設計師可以全部在編輯器左側的「原始檔控制」面板完成。',
            '`.env` 和密鑰不要 commit；公司資料只放公司的私有 repo，不要放進公開的 repo。存過的東西就算之後刪掉，也還留在歷史紀錄裡。'
          ],
          widget: 'git', hint: '不用背指令：每個動作在編輯器裡都按得到。指令旁邊的按鈕可以直接複製。',
          prompt: {
            hint: '叫 agent 做完一件事之後，用這段話請它幫你存檔。',
            text: '列出這次修改的檔案，每個檔案用一句話說明改了什麼。確認沒有 .env、密鑰或 node_modules 之後，用繁體中文訊息 commit，格式是「步驟：做了什麼」。不要 push。'
          },
          quiz: {
            q: 'agent 改了 12 個檔案，其中 3 個你不想要，怎麼辦？',
            options: ['全部刪掉，重新叫 agent 做一次', '先用 git status 和 git diff 看清楚，用 git restore 丟掉那 3 個檔案的修改，再存檔', '先 commit，之後再說'],
            answer: 1, explain: '先看再存。另外要注意：agent「新增」的檔案不會被 git restore 刪掉，用 git status 確認之後再決定要不要刪。'
          }
        }
      ]
    },
    {
      short: 'Design Token', title: 'Design Token：讓 AI 讀得懂的設計值', img: 'study',
      tagline: 'Design Token 是設計稿裡的設定值，也是程式碼裡的變數。',
      goals: ['把任何一個設計值放進 ref、sys、comp 正確的那一層', '照固定的順序替 token 命名，看得出名字哪裡不對', '知道 figma-m3-variables 怎麼把寫死的值變成 Variables'],
      chapters: [
        {
          id: '1-1', title: '三層 token：AI 讀名字比讀色碼準', mins: 5, kind: '講解', roles: ALL, skills: [], img: 'dog-cat-table',
          goal: '把任何一個設計值放進正確的層：ref、sys、comp，並照固定的順序命名。',
          anim: 'tokens11', animHint: '約 70 秒，分成 6 段。可以隨時暫停，或點上面的段落重看。',
          points: [
            '**ref（原始層）**：放原始值，名字只描述值本身，例如 `shop-ref-color-neutral-5`：neutral 是灰階，5 是亮度（0 最暗、100 最亮）。就像餐廳冰箱裡的食材，種類有限、標示清楚。',
            '**sys（語意層）**：放共用的用途，只指向 ref，例如 `shop-sys-color-primary`。很多元件都會用到它。',
            '**comp（元件層）**：某個元件專用，只指向 sys，例如 `shop-comp-button-color-primary-container-default`。只有這一層可以出現元件名稱。',
            '**名字的順序**：前綴 → 類型（ref、sys、comp）→ 元件（只有 comp）→ 角色（color、font、size、spacing、shadow、elevation、motion）→ 變體 → 目標 → 狀態，用不到的段落就省略。例如 `shop-comp-button-color-primary-container-hovered`。同一個目標有不同狀態時，預設狀態也要寫出來：`…-container-default` 和 `…-container-hovered`。',
            '順序每家公司不一定一樣，有的團隊會把目標放在角色前面。但**定案之後，每一個 token 都照同一個順序命名**，AI 才讀得懂，也才會照著建立。',
            'AI 看到 `#111111` 只能猜；看到 `shop-comp-button-color-primary-container-default` 就知道這是主要按鈕的底色。換主題時只改 sys 指向哪個 ref，ref 的值不用動。'
          ],
          widget: 'tokens', hint: '先換主題，看看哪些東西變了、哪些沒變；再到「命名結構」組一個名字、換換欄位順序，最後用「命名檢查器」試試看名字對不對。',
          quiz: {
            q: 'Mini Shop 定案的順序是「前綴-類型-元件-角色-變體-目標-狀態」。哪一個名字照了這個順序？',
            options: ['`shop-comp-color-button-primary-container-default`', '`shop-comp-button-color-primary-container-default`', '`shop-button-comp-color-primary-container-default`'],
            answer: 1, explain: 'comp 後面先寫元件 button，再寫角色 color、變體 primary、目標 container。另外兩個用的字一樣，只是順序不同；順序每家公司可以不同，但定案之後，每一個 token 都要照同一個順序。'
          }
        },
        {
          id: '1-2', title: 'Figma M3 Variables：把寫死的值變成三層 Variables', mins: 6, kind: '示範', roles: ['designer'], skills: ['figma-m3-variables'], img: 'design-element',
          goal: '看懂 figma-m3-variables 怎麼把設計稿裡寫死的值變成三層 Variables，而且外觀不變。',
          anim: 'vars12', animHint: '約 1 分鐘，分成 5 段。可以隨時暫停，或點上面的段落重看。',
          points: [
            '先收集數值：一模一樣的值自動合併，**相近的值**（例如兩個幾乎一樣的黑色）放到比對板上，由你決定。',
            '只是讀取的動作不會打擾你；要綁定之前，會先列出對照表等你點頭；會改到外觀的變更（例如合併相近的值），還會附上比對圖，一組一組問你。',
            '顏色、間距、圓角變成 Variables，文字變成 Text Style，陰影變成 Effect Style。綁定之後會截圖比對，外觀有差異就回報給你。',
            '**命名照你們定案的順序**：skill 會依序找命名順序：prompt 裡寫的、Figma 檔案或專案已經記錄的、檔案裡既有名稱的順序；都沒有，才用 Material Design 3 的順序。用的順序會寫在計畫最上面，可以直接改；確認後會記在檔案裡，下次沿用。Mini Shop 的 `shop/comp/button/color/primary/container/default`，到了程式碼就是 `--shop-comp-button-color-primary-container-default`。狀態放在最後時，預設狀態一定要寫成 `default`：不然 `…/container` 會同時是一個變數、又是 `…/container/hovered` 的群組，匯出成 token 檔就會出錯。'
          ],
          widget: 'sortLayers', hint: '把每張卡片放進它該在的那一層。',
          prompt: {
            hint: '把網址換成你自己的 Figma 元件連結，貼到 agent 的對話框。',
            text: '用 $figma-m3-variables 把 Mini Shop 的「加入購物車」按鈕裡寫死的顏色、字級、圓角、間距和陰影轉成 shop 前綴的 Ref、Sys、Comp Variables 並綁定；名字照我們定案的順序「前綴/類型/元件/角色/變體/目標/狀態」，用不到的段落省略，例如 shop/comp/button/color/primary/container/default；文字用 Text Style，陰影用 Effect Style；外觀不能變，相近的值先列出來讓我決定：https://www.figma.com/design/<FILE_KEY>/Mini-Shop?node-id=<NODE_ID>'
          },
          quiz: {
            q: '比對板上有兩個幾乎一樣的黑色（`#111111` 和 `#121212`），最後由誰決定要不要合併？',
            options: ['skill 自動合併', '你，也就是設計師', '工程師'],
            answer: 1, explain: '相近的值可能是刻意的設計，也可能只是手滑。skill 只負責把它們並排列出來，決定權在你。'
          }
        }
      ]
    },
    {
      short: 'Figma 整理', title: 'Figma 整理：先把設計稿收乾淨', img: 'lego',
      tagline: 'AI 讀到的就是你的圖層。圖層亂，AI 做出來的東西就亂。',
      goals: ['找出還不是元件的 UI，拆出 variants 和屬性', '照「元件 → 組件 → 界面」的順序組回去', '確認已經有的元件不會被重複建立'],
      chapters: [
        {
          id: '2-1', title: '元件整理：找出還不是元件的 UI', mins: 6, kind: '示範', roles: ['designer'], skills: ['figma-componentize'], img: 'bricks',
          goal: '看懂 figma-componentize 怎麼找出該做成元件的 UI，並拆出 variants 和屬性。',
          anim: 'fig21', animHint: '約 1 分鐘，分成 5 段。可以隨時暫停，或點上面的段落重看。',
          points: [
            '把 section、frame 或單一元素的連結交給 skill，它會找出**還不是用元件做的** UI；不一定要重複出現，只有一顆按鈕也能做成元件。',
            '樣式、尺寸、狀態不同 → 做成 **variants**（Style、Size、State）；文字、圖示、開關不同 → 做成**元件屬性**。',
            '動手前先存一個 Figma 版本，元件建在 **Components** 頁，由小到大；建好後接著 token 化（會呼叫 figma-m3-variables）。'
          ],
          widget: 'sortVariant', hint: '這個差異該做成 variant，還是元件屬性？',
          prompt: {
            hint: '把網址換成你自己的 section 連結。',
            text: '幫我把 Mini Shop 商品頁的「加入購物車」面板元件化：https://www.figma.com/design/<FILE_KEY>/Mini-Shop?node-id=<NODE_ID>。Components 頁已經有 Button 元件（Style=Filled），可以沿用的就沿用；這次不要產生設計系統文件。'
          },
          quiz: {
            q: '同一個按鈕有「加入購物車」和「立即購買」兩種文字，應該怎麼做？',
            options: ['做成兩個 variants', '做成一個文字屬性', '做成兩個不同的元件'],
            answer: 1, explain: '只有文字不同時，用元件屬性就好；variants 留給樣式、尺寸、狀態這種「長相」的差異。'
          }
        },
        {
          id: '2-2', title: '組件到界面，不再重複建元件', mins: 5, kind: '示範', roles: ['designer', 'pm'], skills: ['figma-componentize'], img: 'use-house',
          goal: '照「元件 → 組件 → 界面」組回去，並確認已經有的元件不會再被做一次。',
          anim: 'fig22', animHint: '約 1 分鐘，分成 5 段。可以隨時暫停，或點上面的段落重看。',
          points: [
            '先做最小的**元件**（按鈕、尺寸選項、數量加減器），再組成**組件**（加入購物車面板），最後才是**界面**（商品頁）。小元件放進大元件時是一個 **instance**，改原本的元件，所有用到的地方都會更新。',
            '動手前先跟 Components 頁上**現有的元件**比對：完全一樣才直接沿用；只是部分相似時，skill 會放出**審核板**，問你要沿用、加 variant，還是新建。',
            '換成 instance 之前，一定先附上截圖問你；換完會逐項比對外觀，比對不過的地方保留原稿並回報，不會硬換。'
          ],
          widget: 'componentFlow', hint: '先把 UI 分成元件、組件和界面；再到第二個分頁，假裝你是 skill，走一次「會不會重複建元件」。',
          quiz: {
            q: 'skill 找到一個跟現有按鈕「部分相似」的按鈕，它會怎麼做？',
            options: ['自動當成同一個元件', '停下來問你：沿用、加 variant，還是新建', '直接新建一個元件'],
            answer: 1, explain: '只有「完全符合」會直接沿用。部分相似一定會問你，相近的值也不會被自動合併。'
          }
        }
      ]
    },
    {
      short: '設計系統文件', title: '設計系統文件：寫給 AI 看的規則書', img: 'design-doc',
      tagline: '開發前，AI 先讀這份文件；開發時，AI 在文件的規範裡工作。',
      goals: ['說得出設計系統文件包含什麼', '會從 Figma、圖片或 vibe coding 原型萃取設計系統', '在三個停點做出決定'],
      chapters: [
        {
          id: '3-1', title: '設計系統文件裡有什麼', mins: 3, kind: '講解', roles: ALL, skills: ['design-system-extractor'], img: 'ai-read',
          goal: '知道一份給 AI 讀的設計系統文件有哪些內容，以及 AI 會在哪裡停下來問你。',
          anim: 'doc31', animHint: '約 1 分鐘，分成 5 段。可以隨時暫停，或點上面的段落重看。',
          points: [
            '內容包含：設計原則、設計元素、三層 token（連同你們定案的命名順序）、元件清單、元件規格，還有一份可以直接打開的靜態 HTML 文件。快速萃取時，設計原則會先留空，之後再補。',
            '另外有一份**去除 AI 味**的規則，避免 AI 做出千篇一律的畫面。',
            '三個停點：**重複來源**、**相近 token**、**相似元件**。你的回答會寫進表格，變成下一站讀得到的資料。'
          ],
          widget: 'slop', hint: '一個一個套用「去除 AI 味」的規則，看卡片怎麼變乾淨。',
          quiz: {
            q: 'Figma 裡有兩個設計師設定的黑色 #111111 和 #121212，只差一點點。萃取時 skill 會怎麼做？',
            options: ['自動合併成一個', '列在表上停下來問你', '只保留用得比較多的那個'],
            answer: 1, explain: '兩個都是 Figma 設定的值，差一點點可能是刻意的，所以一定停下來問你，不會自動合併。截圖量到的值如果跟 Figma 的值差到看不出來，才會自動併進 Figma 的值。這些決定都會寫進 TOKEN_ARCHITECTURE.md。'
          }
        },
        {
          id: '3-2', title: '從 Figma 設計稿建立', mins: 6, kind: '示範', roles: ['designer', 'engineer'], skills: ['design-system-extractor'], img: 'comp-doc',
          goal: '用 Figma 連結萃取設計系統，並在三個停點回答。',
          anim: 'ext32', animHint: '約 1 分鐘，分成 5 段。可以隨時暫停，或點上面的段落重看。',
          points: [
            'Figma 是證據最完整的來源：Variables、元件、圖層名稱都讀得到。先求快，預設只萃取 1 到 3 個元件，方向對了再擴大。',
            '遇到停點時，用表上的關鍵字回答，例如 `merge`、`keep distinct`、`make variant`。',
            '跑完檢查腳本後，打開 `index.html` 看文件，打開 `review.html` 看還沒決定的事。'
          ],
          widget: 'stops', hint: '三個停點各在問什麼、可以怎麼回答。點關鍵字就能複製。',
          prompt: {
            hint: '把網址換成你自己的 Figma 連結。',
            text: '使用 $design-system-extractor，從這個 Figma 連結萃取一個可重用的設計系統到目前資料夾，token 前綴用 shop：https://www.figma.com/design/<FILE_KEY>/Mini-Shop?node-id=<NODE_ID>。只萃取 1 個主要元件（primary button），不要產生 CLAUDE.md、AGENTS.md 或 .cursor rules。遇到重複來源、相近 token、相似元件時，在該步驟結尾整理成一張表停下來問我，不要自己決定。完成後執行 scripts/extract_check.mjs（--locale zh-Hant），然後停下來列出下一步選項。'
          },
          quiz: {
            q: '為什麼第一次萃取時，只萃取 1 到 3 個元件？',
            options: ['skill 一次只能處理 3 個', '先用少量元件確認方向和 token 對了再擴大，比較快也比較好改', '元件越少，文件越好看'],
            answer: 1, explain: '先求快、先求對。方向確定之後，再請 skill 補齊其他元件。'
          }
        },
        {
          id: '3-3', title: '從圖片、Vibe Coding 原型建立', mins: 4, kind: '示範', roles: ALL, skills: ['design-system-extractor'], img: 'research',
          goal: '沒有 Figma 也能萃取：從截圖或 vibe coding 原型建立設計系統，並知道各自要注意什麼。',
          anim: 'ext33', animHint: '約 1 分鐘，分成 5 段。可以隨時暫停，或點上面的段落重看。',
          points: [
            '**截圖**量得到顏色、間距、圓角和字級，但看不到名字和互動狀態（hover、停用、載入中）。截圖越多張、狀態越齊全越好。',
            '**Vibe coding 原型**的程式碼裡有真實的顏色、字級和元件結構，但常常到處寫死數值、重複做元件；萃取時會整理成三層 token。',
            '截圖量到的值有誤差：差到看不出來的，skill 會**自動合併**並記在表上；差多一點的，列成一張表請你**一次確認**。原型程式碼裡寫的是確切的數字，相近的值不會自動合併，一定交給你決定。長得很像的元件，一定**停下來問你**。'
          ],
          widget: 'sources', hint: '三種來源各讀得到什麼、要注意什麼。切換看看。',
          prompt: {
            hint: '截圖放進 ./design-reference/；如果是原型，就把路徑換成原型資料夾。',
            text: '使用 $design-system-extractor，從 ./design-reference/ 裡的 5 張 Mini Shop 截圖萃取一個可重用的設計系統到目前資料夾，token 前綴用 shop。只萃取 1 個主要元件（primary button），不要跑 rendered capture，不要產生 CLAUDE.md、AGENTS.md 或 .cursor rules。相近 token 照 skill 的規則：差到看不出來的自動合併並記在表上，其餘整理成一張表停下來問我；重複來源和相似元件，一律在該步驟結尾整理成一張表停下來問我。完成後執行 scripts/extract_check.mjs（--locale zh-Hant），更新 SESSION_STATE.md，然後停下來列出下一步選項。'
          },
          quiz: {
            q: '只有截圖時，哪一種資訊最可能缺？',
            options: ['主色', 'hover、停用這些互動狀態', '字級大小'],
            answer: 1, explain: '靜態截圖只拍得到當下的樣子。沒截到的狀態會記在元件清單的「缺少的狀態」；記得補截圖，或在 skill 最後列出下一步時告訴它怎麼處理。'
          }
        }
      ]
    },
    {
      short: 'Storybook', title: 'Storybook 元件庫：產品的中央工廠', img: 'play-lego',
      tagline: '設計師給的是靜態文件，工程師要的是能直接拿來用的元件。Storybook 把兩邊接起來。',
      goals: ['會用 Storybook 找元件、切狀態、看文件', '建好環境，換成自己的前綴', '從設計系統文件生成第一批元件'],
      chapters: [
        {
          id: '4-1', title: 'Storybook 介面、功能列與 Addon', mins: 6, kind: '示範', roles: ALL, skills: [], img: 'ui-pc',
          goal: '會在 Storybook 裡找元件、切狀態、看文件，也知道 addon 能幫它加哪些功能。',
          anim: 'sb41', animHint: '約 1 分鐘，分成 5 段。可以隨時暫停，或點上面的段落重看。',
          points: [
            'Storybook 是元件的展示櫃兼說明書。**一個元件的一種狀態就是一個 story**，不用打開整個 App 就能看。',
            '介面分四區：左側**元件目錄**、中間**畫布**、上方**工具列**（尺寸、背景、量尺、外框）、下方**面板**（Controls 即時改屬性、Actions 看事件），每個元件還有一頁 **Docs**。',
            '**Addon** 是 Storybook 的外掛。Storybook 10 已經內建 Controls、Viewport 這些基本功能；課程 template 另外裝了 Docs、Figma Export 這些外掛；無障礙檢查（a11y）和互動測試（Vitest）要自己加裝。'
          ],
          widget: 'storybookAddons', hint: '第一個分頁是模擬的 Storybook：點綠色數字看每一區在做什麼，也可以直接改 Controls。第二個分頁整理了常用的 addon。',
          quiz: {
            q: '想看 Button 停用狀態在手機寬度下的樣子，要用到介面的哪兩個地方？',
            options: ['左側目錄和 Docs 頁', '下方 Controls（打開 disabled）和上方工具列（切到手機尺寸）', '只要看畫布就好'],
            answer: 1, explain: '在上面的模擬 Storybook 試試看：打開 disabled，再按工具列的手機圖示。'
          }
        },
        {
          id: '4-2', title: '建立 Storybook 環境', mins: 4, kind: '示範', roles: ['engineer'], skills: ['design-system-to-storybook'], img: 'terminal',
          goal: '用課程 template 建好 Storybook 工作區，換成自己的前綴。',
          anim: 'env42', animHint: '約 1 分鐘，分成 5 段。可以隨時暫停，或點上面的段落重看。',
          points: [
            '需要 **Node 22.18 以上**，先用 `node -v` 確認。',
            '安裝套件後，用 `npm run init-template -- --name "Mini Shop" --prefix shop` 換成自己的名字和前綴。',
            '把上一部產出的設計系統文件和 token 放進 `design-system/` 與 `tokens/`，先存檔一次，再用 `npm run storybook` 啟動。'
          ],
          widget: 'envChecklist', hint: '一步一步打勾，指令可以直接複製。',
          prompt: {
            hint: '不想自己打指令，也可以請 agent 幫你啟動。',
            text: '請幫我安裝這個 Storybook 專案的套件並啟動 Storybook，啟動後告訴我網址。遇到錯誤先停下來，用繁體中文說明原因和建議的修法，不要自己改設定檔。'
          },
          quiz: {
            q: '`npm install` 跑完，Storybook 卻啟動失敗，錯誤訊息提到 oxc-parser。最可能的原因是？',
            options: ['網路太慢', 'Node 版本太舊，需要 22.18 以上', 'Storybook 壞了'],
            answer: 1, explain: 'template 用的是 Storybook 10，舊版 Node 會漏裝需要的原生套件。先用 node -v 確認版本，升級後重新 npm install。'
          }
        },
        {
          id: '4-3', title: '從設計系統文件自動生成元件庫', mins: 8, kind: '示範', roles: ['designer', 'engineer'], skills: ['design-system-to-storybook', 'design-system-governance'], img: 'ai-use-computer',
          goal: '看懂元件、樣式和 story 怎麼一起長出來，以及 governance 什麼時候攔下來。',
          anim: 'gen43', animHint: '約 1 分鐘，分成 5 段。可以隨時暫停，或點上面的段落重看。',
          points: [
            '`trace_sources.mjs` 把每個元件對回設計來源；`plan_component_batches.mjs` 依照依賴排出批次，被用到的先做。第一批（B01）先做 Button。',
            'CSS 只能用 `--shop-sys-*` 和 `--shop-comp-*`，不能寫死 `#111111`。缺 token 或缺子元件時，agent 會用中文停下來問；你回答「是」，它才照三層規則新增。',
            '可以互動的元件（例如 Button）有 Default、Hover、FocusVisible、Disabled 四種 story，加上一頁 Docs；組件（例如加入購物車面板）還會多一個示範怎麼用現有元件組起來的 story。還沒做設計比對報告的元件，不會標成 done。'
          ],
          widget: 'orderBuild', hint: '排出 AI 建元件的順序：誰要先存在？',
          prompt: {
            hint: '這段比較長，整段複製就好。',
            text: '使用 $design-system-to-storybook，並讓 $design-system-governance 全程生效。設計系統在 ./design-system 與 ./tokens（token 前綴 shop），這個資料夾是已安裝依賴的 React + Vite + Storybook 10 工作區；不要安裝任何東西，不要問 framework。先執行 governance 的 Phase 0，再跑 scripts/trace_sources.mjs 與 scripts/plan_component_batches.mjs（--write --queue），然後只實作 B01 批次的 Button：CSS 只能用 --shop-sys-* 與 --shop-comp-* token，不寫死任何數值；元件與 story 放在 src/components/Button/，加上 tags: ["autodocs"] 與 parameters.figmaSourceUrl，story 要有 Default、Hover、FocusVisible、Disabled。缺 token 或缺共用子元件時用繁體中文停下來問我。跳過 Design Parity 報告與 import plugin 設定。完成後更新 STORYBOOK_COMPONENT_QUEUE.md 與 STORYBOOK_IMPLEMENTATION_MAP.md，回報重用與新建了什麼，然後停下。'
          },
          quiz: {
            q: '為什麼元件的 CSS 不能直接寫 `#111111`？',
            options: ['瀏覽器不支援色碼', '寫死的值不會跟著主題換，AI 也看不出它的用途', '會讓檔案變大'],
            answer: 1, explain: '改用 `var(--shop-comp-button-color-primary-container-default)`：換主題時跟著變，AI 一看名字就知道它是主要按鈕的底色。'
          }
        }
      ]
    },
    {
      short: '測試與產品', title: '測試、原型與產品', img: 'delivery',
      tagline: '元件庫做好之後，先驗收；接著它就是中央工廠，每個角色都用同一套積木做原型和正式產品。',
      goals: ['看得懂視覺比對報告，照正確順序修', '說得出每個角色怎麼用同一套積木做原型和產品', '讓 governance 盯著做正式產品，新畫面先查再做'],
      chapters: [
        {
          id: '5-1', title: '測試元件：視覺比對與回流 Figma', mins: 5, kind: '示範', roles: ['designer', 'engineer'], skills: ['ui-visual-parity', 'figma-storybook-sync'], img: 'use-paint',
          goal: '確認元件跟設計稿一樣，並在兩邊都改過之後找出差異。',
          anim: 'par51', animHint: '約 1 分鐘，分成 5 段。可以隨時暫停，或點上面的段落重看。',
          points: [
            '`ui-visual-parity` 會做外觀、位置、像素疊圖三種檢查，最後給出 PARITY（一致）或 NOT AT PARITY。報告裡每一筆都有標記，告訴你要不要修。',
            '修的順序：**token → 共用元件 → 組版 → 頁面**。先修源頭，下游的差異常常會自己消失。',
            'Storybook 可以把元件匯出到 Figma。兩邊都改過時，用 `figma-storybook-sync` 比對上次同步、現在的程式和現在的 Figma，指出每一筆該交給誰。'
          ],
          widget: 'parity', hint: '點報告裡的每一行，看它要不要修。',
          prompt: {
            hint: '把檔名換成你的實作與參考畫面。',
            text: '用 $ui-visual-parity 把 ./impl.html 修到跟 ./shop-product.html 一致。參考已擷取在 ./reference.spec.json 與 ./reference.png，根選擇器是 .screen，視窗 390x844、密度 2，第一輪報告在 ./cycle-01。只修標為 fix 的原因，不要動 ↳ 的連帶結果，照 token、共用元件、組版、頁面的順序修，每修完一層就重跑一輪（./cycle-02、./cycle-03……），每次用 --previous 指向上一輪；達到 PARITY 或進度不再下降就停下來，不要改文案、資料或無障礙語意。'
          },
          quiz: {
            q: '報告裡標成「↳」的差異要不要修？',
            options: ['要，每一筆都修', '先不用：它是上面某個原因的連帶結果，修好原因就會消失', '刪掉這一筆'],
            answer: 1, explain: '只修標成 fix 的原因，修完再量一次。↳ 會在下一輪自己消失。'
          }
        },
        {
          id: '5-2', title: '中央工廠：每個角色用同一套積木', mins: 4, kind: '講解', roles: ALL, skills: [], img: 'ui-flow',
          goal: '把 Storybook 元件庫當成產品的中央工廠：設計師、PM、工程師都從這裡拿同一套積木，做原型也好、做正式產品也好，畫面都一樣。',
          anim: 'fac52', animHint: '約 1 分鐘，分成 5 段。可以隨時暫停，或點上面的段落重看。',
          points: [
            '**中央工廠**：token 和元件只在 Storybook 做一次、驗收一次（4-3、5-1）。每個角色都從這裡拿積木，不再各自重畫、重寫。',
            '**同一套積木，三種用法**：設計師在 Storybook 檢查每個狀態，再同步回 Figma；PM 用現有元件拼出能點的原型，先驗證流程；工程師用同一批元件做正式頁面，接上真的資料。原型和產品用的是同一批積木，驗證過的畫面不用重畫。',
            '**改一次，全部跟著變**：改一個 token 或元件，Figma、原型和正式頁面都跟著更新。缺積木時，先補進工廠，不在頁面裡另做一個；下一堂就來做這件事。'
          ],
          widget: 'factory', hint: '點工廠裡的一個積木，看三個角色的畫面哪裡用到它；再換一次主色，三個畫面會一起變。PM 的原型也可以點點看。',
          quiz: {
            q: 'PM 想先驗證「加入購物車」的流程，最好的做法是？',
            options: ['請設計師另外畫一套原型', '用 Storybook 裡現有的元件，拼出能點的原型', '直接開始寫正式產品的程式'],
            answer: 1, explain: '原型和產品用同一套積木：驗證過的畫面不用重畫，接上真的資料就能往正式產品走。另外畫的原型，到了產品又得重做一次。'
          }
        },
        {
          id: '5-3', title: '做成正式產品：先查再做', mins: 5, kind: '示範', roles: ALL, skills: ['design-system-governance'], img: 'ai-coding',
          goal: '讓 design-system-governance 盯著，從中央工廠拿元件做正式產品；遇到新畫面先查再做，讓元件庫越用越完整，而不是越用越亂。',
          anim: 'gov53', animHint: '約 1 分鐘，分成 5 段。可以隨時暫停，或點上面的段落重看。',
          points: [
            '`design-system-governance` 先做 **Phase 0**：找出 token 前綴、共用元件和文案檔在哪裡。之後只用現有的元件和 token：**不寫死樣式、能組合就不新建**。正式頁面還要接上真的資料，補齊**載入中、沒有資料、出錯**這些狀態。',
            '遇到新畫面，**先查**：governance 會對照元件庫，列出可以直接用的、需要加 variant 的、還缺的元件，等你確認。**再補**：缺元件時，它會停下來問「目前既有元件無法完整組裝此組件。是否要先建立新的共用子元件，再繼續？」你確認後，缺的元件先補進 Storybook 的共用元件庫，再回來組畫面。',
            '每做完一段，governance 會回報：重用了哪些元件和 token、新建了什麼、為什麼要新建。走完五站了！到頁面最下面的「結業檢查」看看自己學到哪裡。'
          ],
          widget: 'coverage', hint: '按「先查現有元件」，看新畫面能用現有元件拼出幾成。',
          prompt: {
            hint: '先查再做：你確認清單之後才寫程式。把截圖和資料來源換成你自己的。',
            text: '使用 $design-system-governance，把 ./shop-cart.png 這張「購物車」截圖做成正式產品的頁面。先執行 Phase 0，再對照現有的共用元件，列出可以直接用的、需要加 variant 的、還缺的元件，然後停下來等我確認，先不要寫程式。我確認後，缺的元件先補進 Storybook 的共用元件庫並加上 story，再組頁面：只用 --shop-sys-* 與 --shop-comp-* token，文字放進文案檔，資料接真的購物車 API，並做好載入中、沒有資料、出錯三種狀態。缺 token 或缺共用元件時，用繁體中文停下來問我。完成後回報重用與新建了什麼，然後停下。'
          },
          quiz: {
            q: '做新頁面時發現缺一個「優惠券輸入框」元件，正確做法是？',
            options: ['直接在頁面裡寫一個', '先確認要新增，把它補進 Storybook 的共用元件庫，再用到頁面上', '用一張圖片代替'],
            answer: 1, explain: '寫在頁面裡的元件下次沒人找得到，很快就會出現第二個、第三個版本。'
          }
        }
      ]
    }
  ];
})();
