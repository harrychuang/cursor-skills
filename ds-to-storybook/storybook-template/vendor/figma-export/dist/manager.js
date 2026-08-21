// src/manager.tsx
import { CopyIcon } from "@storybook/icons";
import { createElement } from "react";
import { ToggleButton } from "storybook/internal/components";
import { addons, types, useGlobals } from "storybook/manager-api";

// src/options.ts
var defaultFigmaExportGlobalName = "figmaExport";

// src/manager.tsx
var figmaExportAddonId = "storybook/figma-export";
function registerFigmaExportTool(options = {}) {
  const addonId = options.addonId ?? figmaExportAddonId;
  const globalName = options.globalName ?? defaultFigmaExportGlobalName;
  const toolId = `${addonId}/tool`;
  function FigmaExportToggle() {
    const [globals, updateGlobals] = useGlobals();
    const enabled = globals[globalName] === "on";
    const title = enabled ? "Figma export on" : "Figma export off";
    return createElement(
      ToggleButton,
      {
        ariaLabel: title,
        key: toolId,
        onClick: () => {
          updateGlobals({
            [globalName]: enabled ? "off" : "on"
          });
        },
        padding: "small",
        pressed: enabled,
        title,
        tooltip: title,
        variant: "ghost"
      },
      createElement(CopyIcon),
      createElement("span", null, title)
    );
  }
  addons.register(addonId, () => {
    addons.add(toolId, {
      render: () => createElement(FigmaExportToggle),
      title: "Figma export",
      type: types.TOOL
    });
  });
}

// src/manager-entry.ts
registerFigmaExportTool();
//# sourceMappingURL=manager.js.map