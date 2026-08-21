import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { storybookCopy } from "../_shared/copy";
import {
  tokenCatalog,
  tokenFamilies,
  tokenLayers,
  type TokenDefinition,
  type TokenFamily,
  type TokenLayer,
} from "../_shared/tokenData";

type TokenCatalogProps = {
  initialLayer?: TokenLayer | "all";
  initialFamily?: TokenFamily | "all";
};

type ResolvedTokenMap = Record<string, string>;

function useResolvedTokens(tokens: TokenDefinition[]): ResolvedTokenMap {
  const [resolvedTokens, setResolvedTokens] = useState<ResolvedTokenMap>({});

  useEffect(() => {
    const styles = window.getComputedStyle(document.documentElement);
    const nextResolvedTokens = Object.fromEntries(
      tokens.map((token) => [token.name, styles.getPropertyValue(token.name).trim()]),
    );
    setResolvedTokens(nextResolvedTokens);
  }, [tokens]);

  return resolvedTokens;
}

function isPreviewableToken(token: TokenDefinition, resolvedValue: string): boolean {
  if (token.family !== "color") return false;
  return Boolean(resolvedValue || token.value.includes("var("));
}

function TokenPreview({
  token,
  resolvedValue,
}: {
  token: TokenDefinition;
  resolvedValue: string;
}) {
  if (!isPreviewableToken(token, resolvedValue)) {
    return <span>{storybookCopy.tokenCatalog.noPreview}</span>;
  }

  return (
    <div
      aria-label={token.name}
      className="sbt-token-swatch"
      style={{ "--token-swatch": `var(${token.name})` } as CSSProperties}
    />
  );
}

export function TokenCatalog({
  initialLayer = "all",
  initialFamily = "all",
}: TokenCatalogProps) {
  const [selectedLayer, setSelectedLayer] = useState<TokenLayer | "all">(initialLayer);
  const [selectedFamily, setSelectedFamily] = useState<TokenFamily | "all">(initialFamily);

  const filteredTokens = useMemo(() => {
    return tokenCatalog.filter((token) => {
      const layerMatches = selectedLayer === "all" || token.layer === selectedLayer;
      const familyMatches = selectedFamily === "all" || token.family === selectedFamily;
      return layerMatches && familyMatches;
    });
  }, [selectedFamily, selectedLayer]);

  const resolvedTokens = useResolvedTokens(filteredTokens);
  const countsByLayer = tokenLayers.map((layer) => ({
    layer,
    count: tokenCatalog.filter((token) => token.layer === layer).length,
  }));

  return (
    <main className="sbt-story-shell">
      <div className="sbt-story-stack">
        <header className="sbt-story-header">
          <div className="sbt-story-eyebrow">{storybookCopy.tokenCatalog.eyebrow}</div>
          <h1 className="sbt-story-title">{storybookCopy.tokenCatalog.title}</h1>
          <p className="sbt-story-lead">{storybookCopy.tokenCatalog.lead}</p>
        </header>

        <section aria-label={storybookCopy.tokenCatalog.summaryLabel} className="sbt-meta-grid">
          {countsByLayer.map(({ layer, count }) => (
            <div className="sbt-meta-card" key={layer}>
              <span className="sbt-meta-card__label">{layer}</span>
              <strong className="sbt-meta-card__value">{count}</strong>
            </div>
          ))}
        </section>

        <section className="sbt-panel">
          <div className="sbt-token-controls">
            <label>
              <span className="sbt-meta-card__label">{storybookCopy.tokenCatalog.layerLabel}</span>
              <select
                className="sbt-token-select"
                onChange={(event) => setSelectedLayer(event.target.value as TokenLayer | "all")}
                value={selectedLayer}
              >
                <option value="all">{storybookCopy.tokenCatalog.allLayers}</option>
                {tokenLayers.map((layer) => (
                  <option key={layer} value={layer}>
                    {layer}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="sbt-meta-card__label">{storybookCopy.tokenCatalog.familyLabel}</span>
              <select
                className="sbt-token-select"
                onChange={(event) => setSelectedFamily(event.target.value as TokenFamily | "all")}
                value={selectedFamily}
              >
                <option value="all">{storybookCopy.tokenCatalog.allFamilies}</option>
                {tokenFamilies.map((family) => (
                  <option key={family} value={family}>
                    {family}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="sbt-token-table-wrap">
            <table className="sbt-token-table">
              <thead>
                <tr>
                  <th>{storybookCopy.tokenCatalog.previewColumn}</th>
                  <th>{storybookCopy.tokenCatalog.tokenColumn}</th>
                  <th>{storybookCopy.tokenCatalog.valueColumn}</th>
                  <th>{storybookCopy.tokenCatalog.resolvedColumn}</th>
                </tr>
              </thead>
              <tbody>
                {filteredTokens.length === 0 ? (
                  <tr>
                    <td colSpan={4}>{storybookCopy.tokenCatalog.emptyState}</td>
                  </tr>
                ) : (
                  filteredTokens.map((token) => (
                    <tr key={token.name}>
                      <td>
                        <TokenPreview token={token} resolvedValue={resolvedTokens[token.name]} />
                      </td>
                      <td>
                        <code className="sbt-token-name">{token.name}</code>
                      </td>
                      <td>
                        <code className="sbt-token-value">{token.value}</code>
                      </td>
                      <td>
                        <code className="sbt-token-value">{resolvedTokens[token.name]}</code>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
