import { CopyIcon } from "@storybook/icons";
import { createElement } from "react";
import { ToggleButton } from "storybook/internal/components";
import { addons, types, useGlobals } from "storybook/manager-api";

import { defaultFigmaExportGlobalName } from "./options";

export type FigmaExportToolOptions = {
  addonId?: string;
  globalName?: string;
};

export const figmaExportAddonId = "storybook/figma-export";

export function registerFigmaExportTool(options: FigmaExportToolOptions = {}) {
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
            [globalName]: enabled ? "off" : "on",
          });
        },
        padding: "small",
        pressed: enabled,
        title,
        tooltip: title,
        variant: "ghost",
      },
      createElement(CopyIcon),
      createElement("span", null, title),
    );
  }

  addons.register(addonId, () => {
    addons.add(toolId, {
      render: () => createElement(FigmaExportToggle),
      title: "Figma export",
      type: types.TOOL,
    });
  });
}
