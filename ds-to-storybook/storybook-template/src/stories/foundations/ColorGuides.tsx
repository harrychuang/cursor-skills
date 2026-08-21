import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { storybookCopy } from "../_shared/copy";
import { tokenCatalog } from "../_shared/tokenData";

type ResolvedTokenMap = Record<string, string>;

type ColorGuideRole = {
  label: string;
  token: string;
  onToken?: string;
  guidance: string;
  avoid: string;
};

type ColorGuideSection = {
  title: string;
  summary: string;
  roles: ColorGuideRole[];
};

type PaletteToken = {
  label: string;
  token: string;
};

type PaletteGroup = {
  title: string;
  summary: string;
  tokens: PaletteToken[];
};

const colorGuides = storybookCopy.colorGuides;
const tokenByName = new Map(tokenCatalog.map((token) => [token.name, token]));

const sections = colorGuides.sections as ColorGuideSection[];
const palettes = colorGuides.palettes as PaletteGroup[];

const allGuideTokenNames = Array.from(
  new Set([
    ...sections.flatMap((section) =>
      section.roles.flatMap((role) => [role.token, role.onToken].filter(Boolean)),
    ),
    ...palettes.flatMap((palette) => palette.tokens.map((token) => token.token)),
  ]),
) as string[];

function useResolvedTokens(tokens: string[]): ResolvedTokenMap {
  const [resolvedTokens, setResolvedTokens] = useState<ResolvedTokenMap>({});

  useEffect(() => {
    const styles = window.getComputedStyle(document.documentElement);
    const nextResolvedTokens = Object.fromEntries(
      tokens.map((token) => [token, styles.getPropertyValue(token).trim()]),
    );
    setResolvedTokens(nextResolvedTokens);
  }, [tokens]);

  return resolvedTokens;
}

function getAuthoredValue(tokenName: string): string {
  return tokenByName.get(tokenName)?.value ?? colorGuides.unknownValue;
}

function ColorTokenMeta({
  label,
  token,
  resolvedTokens,
}: {
  label: string;
  token: string;
  resolvedTokens: ResolvedTokenMap;
}) {
  return (
    <dl className="sbt-color-token-meta">
      <div>
        <dt>{label}</dt>
        <dd>
          <code>{token}</code>
        </dd>
      </div>
      <div>
        <dt>{colorGuides.valueLabel}</dt>
        <dd>
          <code>{getAuthoredValue(token)}</code>
        </dd>
      </div>
      <div>
        <dt>{colorGuides.resolvedLabel}</dt>
        <dd>
          <code>{resolvedTokens[token]}</code>
        </dd>
      </div>
    </dl>
  );
}

function ColorRoleCard({
  role,
  resolvedTokens,
}: {
  role: ColorGuideRole;
  resolvedTokens: ResolvedTokenMap;
}) {
  const swatchStyle = {
    "--sbt-color-guide-swatch": `var(${role.token})`,
  } as CSSProperties;

  return (
    <article className="sbt-color-card">
      <div aria-label={role.label} className="sbt-color-card__swatch" style={swatchStyle} />

      <div className="sbt-color-card__body">
        <div className="sbt-color-card__content">
          <h3 className="sbt-color-card__title">{role.label}</h3>

          <ColorTokenMeta
            label={colorGuides.tokenLabel}
            resolvedTokens={resolvedTokens}
            token={role.token}
          />

          {role.onToken ? (
            <ColorTokenMeta
              label={colorGuides.foregroundLabel}
              resolvedTokens={resolvedTokens}
              token={role.onToken}
            />
          ) : (
            <p className="sbt-color-card__note">{colorGuides.noForeground}</p>
          )}
        </div>

        <div className="sbt-color-guidance">
          <div>
            <span>{colorGuides.guidanceLabel}</span>
            <p>{role.guidance}</p>
          </div>
          <div>
            <span>{colorGuides.avoidLabel}</span>
            <p>{role.avoid}</p>
          </div>
        </div>
      </div>
    </article>
  );
}

function PaletteSwatch({
  color,
  resolvedTokens,
}: {
  color: PaletteToken;
  resolvedTokens: ResolvedTokenMap;
}) {
  const swatchStyle = {
    "--sbt-color-guide-swatch": `var(${color.token})`,
  } as CSSProperties;

  return (
    <li className="sbt-palette-swatch">
      <span aria-label={color.label} className="sbt-palette-swatch__chip" style={swatchStyle} />
      <span className="sbt-palette-swatch__label">{color.label}</span>
      <code>{color.token}</code>
      <code>{resolvedTokens[color.token]}</code>
    </li>
  );
}

export function ColorGuides() {
  const resolvedTokens = useResolvedTokens(allGuideTokenNames);
  const tokenCounts = useMemo(
    () => ({
      semantic: sections.reduce((count, section) => count + section.roles.length, 0),
      reference: palettes.reduce((count, palette) => count + palette.tokens.length, 0),
      rules: colorGuides.rules.length,
    }),
    [],
  );

  return (
    <main className="sbt-story-shell">
      <div className="sbt-story-stack">
        <header className="sbt-story-header">
          <div className="sbt-story-eyebrow">{colorGuides.eyebrow}</div>
          <h1 className="sbt-story-title">{colorGuides.title}</h1>
          <p className="sbt-story-lead">{colorGuides.lead}</p>
        </header>

        <section aria-label={colorGuides.rulesTitle} className="sbt-meta-grid">
          <div className="sbt-meta-card">
            <span className="sbt-meta-card__label">{colorGuides.semanticTitle}</span>
            <strong className="sbt-meta-card__value">{tokenCounts.semantic}</strong>
          </div>
          <div className="sbt-meta-card">
            <span className="sbt-meta-card__label">{colorGuides.referenceTitle}</span>
            <strong className="sbt-meta-card__value">{tokenCounts.reference}</strong>
          </div>
          <div className="sbt-meta-card">
            <span className="sbt-meta-card__label">{colorGuides.rulesTitle}</span>
            <strong className="sbt-meta-card__value">{tokenCounts.rules}</strong>
          </div>
        </section>

        <section className="sbt-panel">
          <h2 className="sbt-panel__heading">{colorGuides.rulesTitle}</h2>
          <ul className="sbt-governance-list">
            {colorGuides.rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </section>

        <section className="sbt-token-section">
          <header>
            <h2 className="sbt-token-section__title">{colorGuides.semanticTitle}</h2>
          </header>

          {sections.map((section) => (
            <section className="sbt-panel" key={section.title}>
              <div>
                <h3 className="sbt-panel__heading">{section.title}</h3>
                <p className="sbt-panel__body">{section.summary}</p>
              </div>
              <div className="sbt-color-grid">
                {section.roles.map((role) => (
                  <ColorRoleCard key={role.token} resolvedTokens={resolvedTokens} role={role} />
                ))}
              </div>
            </section>
          ))}
        </section>

        <section className="sbt-token-section">
          <header>
            <h2 className="sbt-token-section__title">{colorGuides.referenceTitle}</h2>
          </header>

          {palettes.map((palette) => (
            <section className="sbt-panel" key={palette.title}>
              <div>
                <h3 className="sbt-panel__heading">{palette.title}</h3>
                <p className="sbt-panel__body">{palette.summary}</p>
              </div>
              <ul className="sbt-palette-grid">
                {palette.tokens.map((color) => (
                  <PaletteSwatch
                    color={color}
                    key={color.token}
                    resolvedTokens={resolvedTokens}
                  />
                ))}
              </ul>
            </section>
          ))}
        </section>
      </div>
    </main>
  );
}
