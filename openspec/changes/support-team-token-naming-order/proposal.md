## Why

每個團隊會自己決定 token 名稱的段落順序，例如「前綴 → 類型 → 元件 → 角色 → 變體 → 目標 → 狀態」（`shop/comp/button/color/primary/container/hovered`）；順序一旦定案，所有 token 都要照同一個順序。現在 figma-m3-variables 只會用 Material Design 3 的順序，design-system-extractor 只會用 `component-part-property`。稽核規則 17 還會把「狀態放在最後」的名稱當成舊寫法，建議改回 M3 順序，跟團隊定案的順序互相衝突。狀態放在最後時，`…/container` 和 `…/container/hovered` 並存會讓一個名稱同時是變數又是群組；token-spec 禁止這種寫法（DTCG 視為無效），但目前沒有規則偵測，也沒有說明該怎麼修。

## What Changes

- 兩個 skill 都接受團隊宣告的段落順序（slot order，每個 slot 可附詞彙），用不到的段落省略；CSS 名稱就是路徑的 `/` 換成 `-`。
- 決定順序的優先序：使用者的 prompt → 專案已記錄的順序（design-system-extractor 的 `TOKEN_ARCHITECTURE.md` > `## Naming Order`，或 Figma 檔案裡 figma-m3-variables 記錄的順序）→ 從既有 Variables 或 token 推斷（證據互相矛盾時才問）→ 預設（figma-m3-variables 用 M3 順序；design-system-extractor 用原本的 `component-part-property`）。
- 使用的順序一律寫在 skill 原本就會給使用者看的計畫裡（figma-m3-variables 的 token plan；design-system-extractor 寫入 token 前的一句不阻擋說明），使用者可以在那裡改；不新增停點。
- 定案的順序會被記錄，下次沿用：design-system-extractor 寫進 `TOKEN_ARCHITECTURE.md` 的 `## Naming Order`（順序、各 slot 詞彙、範例、CSS 對應）；figma-m3-variables 寫進 Figma 檔案的 shared plugin data。
- figma-m3-variables 稽核規則 17 改為「命名順序」：使用 M3 順序時維持原本的舊狀態順序檢查；使用團隊順序時，改為依團隊順序檢查並提出照團隊順序的改名，不再建議 M3 順序。
- 新增 figma-m3-variables 稽核規則 19「變數同時是群組」：偵測任何一個 variable 名稱同時是另一個 variable 的群組；狀態放在最後的順序下，建議把預設狀態明確寫成 `default`（`…/container/default`），改名走既有的 Tier 2 確認。稽核規則由 18 條變成 19 條。
- design-system-extractor 的 `audit_tokens.mjs` 讀取已記錄的順序：名稱不照順序是 issue；`--x` 與 `--x-<狀態>` 並存時給 warning，建議 `--x-default`（CSS 本身沒有衝突，只影響匯出成 Figma Variables 或 DTCG）；`--json` 新增 `namingOrder` 欄位。新增共用模組、fixture 與回歸測試。
- 更新兩個 skill 的 SKILL.md、references、範本與說明頁。

## Capabilities

### New Capabilities

- `figma-variables-naming-order`：figma-m3-variables 解析、說明、記錄並套用團隊命名順序；稽核規則 17 依使用中的順序檢查；新增規則 19 偵測變數同時是群組並建議明確的 `default` 狀態。
- `extractor-naming-order`：design-system-extractor 的 `## Naming Order` 記錄格式、順序的決定與說明、產生名稱時照順序，以及 `audit_tokens.mjs` 的順序檢查、狀態群組 warning、`namingOrder` JSON 欄位與回歸測試。

### Modified Capabilities

(none)

## Impact

- Affected specs: figma-variables-naming-order、extractor-naming-order（皆為新增）
- Affected code:
  - New:
    - design-system-extractor/scripts/lib/naming_order.mjs
    - design-system-extractor/scripts/fixtures/naming-order/design-system/TOKEN_ARCHITECTURE.md
    - design-system-extractor/scripts/fixtures/naming-order/tokens/tokens-ref.css
    - design-system-extractor/scripts/fixtures/naming-order/tokens/tokens-sys.css
    - design-system-extractor/scripts/fixtures/naming-order/tokens/tokens-comp.css
    - design-system-extractor/scripts/fixtures/naming-order/tokens/tokens.css
  - Modified:
    - figma-m3-variables/SKILL.md
    - figma-m3-variables/references/token-spec.md
    - figma-m3-variables/references/audit-rules.md
    - figma-m3-variables/references/binding-recipes.md
    - figma-m3-variables/references/value-harvest.md
    - figma-m3-variables/docs/index.html
    - design-system-extractor/SKILL.md
    - design-system-extractor/references/token-architecture.md
    - design-system-extractor/references/audits.md
    - design-system-extractor/references/agent-integration.md
    - design-system-extractor/assets/design-system-template/design-system/TOKEN_ARCHITECTURE.md
    - design-system-extractor/scripts/audit_tokens.mjs
    - design-system-extractor/scripts/test_audits.mjs
    - design-system-extractor/docs/extract-flow.html
  - Removed: (none)
- 不修改 `.cursor/skills/`、`.agents/skills/` 底下的巢狀副本，也不修改 `~/.claude/skills/` 的安裝副本。
