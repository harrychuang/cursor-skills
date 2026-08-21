import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { storybookCopy } from "../_shared/copy";
import { tokenCatalog } from "../_shared/tokenData";

type ResolvedTokenMap = Record<string, string>;

type TypefaceRole = {
  label: string;
  token: string;
  sample: string;
  guidance: string;
};

type TypeScaleRole = {
  label: string;
  sizeToken: string;
  lineHeightToken: string;
  weightToken: string;
  typefaceToken: string;
  sample: string;
  guidance: string;
};

type TypeScaleSection = {
  title: string;
  summary: string;
  roles: TypeScaleRole[];
};

const typographyGuides = storybookCopy.typographyGuides;
const tokenByName = new Map(tokenCatalog.map((token) => [token.name, token]));

const typefaces = typographyGuides.typefaces as TypefaceRole[];
const sections = typographyGuides.sections as TypeScaleSection[];

const allTypographyTokenNames = Array.from(
  new Set([
    ...typefaces.map((role) => role.token),
    ...sections.flatMap((section) =>
      section.roles.flatMap((role) => [
        role.sizeToken,
        role.lineHeightToken,
        role.weightToken,
        role.typefaceToken,
      ]),
    ),
  ]),
);

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
  return tokenByName.get(tokenName)?.value ?? typographyGuides.unknownValue;
}

function GuideTokenMeta({
  label,
  token,
  resolvedTokens,
}: {
  label: string;
  token: string;
  resolvedTokens: ResolvedTokenMap;
}) {
  return (
    <div className="sbt-guide-token-meta">
      <dt>{label}</dt>
      <dd>
        <code>{token}</code>
      </dd>
      <dd>
        <span>{typographyGuides.valueLabel}</span>
        <code>{getAuthoredValue(token)}</code>
      </dd>
      <dd>
        <span>{typographyGuides.resolvedLabel}</span>
        <code>{resolvedTokens[token]}</code>
      </dd>
    </div>
  );
}

function TypefaceCard({
  role,
  resolvedTokens,
}: {
  role: TypefaceRole;
  resolvedTokens: ResolvedTokenMap;
}) {
  const sampleStyle = {
    "--sbt-type-guide-family": `var(${role.token})`,
  } as CSSProperties;

  return (
    <article className="sbt-typeface-card">
      <div>
        <h3 className="sbt-typeface-card__title">{role.label}</h3>
        <p className="sbt-typeface-card__sample" style={sampleStyle}>
          {role.sample}
        </p>
      </div>

      <dl className="sbt-guide-token-list">
        <GuideTokenMeta
          label={typographyGuides.tokenLabel}
          resolvedTokens={resolvedTokens}
          token={role.token}
        />
      </dl>

      <div className="sbt-guide-usage">
        <span>{typographyGuides.usageLabel}</span>
        <p>{role.guidance}</p>
      </div>
    </article>
  );
}

function TypeScaleCard({
  role,
  resolvedTokens,
}: {
  role: TypeScaleRole;
  resolvedTokens: ResolvedTokenMap;
}) {
  const sampleStyle = {
    "--sbt-type-guide-family": `var(${role.typefaceToken})`,
    "--sbt-type-guide-size": `var(${role.sizeToken})`,
    "--sbt-type-guide-line-height": `var(${role.lineHeightToken})`,
    "--sbt-type-guide-weight": `var(${role.weightToken})`,
  } as CSSProperties;

  return (
    <article className="sbt-typescale-card">
      <div className="sbt-typescale-card__sample" style={sampleStyle}>
        {role.sample}
      </div>

      <div className="sbt-typescale-card__content">
        <div className="sbt-typescale-card__header">
          <h3 className="sbt-typescale-card__title">{role.label}</h3>
          <p>{role.guidance}</p>
        </div>

        <dl className="sbt-guide-token-list sbt-guide-token-list--grid">
          <GuideTokenMeta
            label={typographyGuides.typefaceLabel}
            resolvedTokens={resolvedTokens}
            token={role.typefaceToken}
          />
          <GuideTokenMeta
            label={typographyGuides.weightLabel}
            resolvedTokens={resolvedTokens}
            token={role.weightToken}
          />
          <GuideTokenMeta
            label={typographyGuides.sizeLabel}
            resolvedTokens={resolvedTokens}
            token={role.sizeToken}
          />
          <GuideTokenMeta
            label={typographyGuides.lineHeightLabel}
            resolvedTokens={resolvedTokens}
            token={role.lineHeightToken}
          />
        </dl>
      </div>
    </article>
  );
}

export function TypographyGuides() {
  const resolvedTokens = useResolvedTokens(allTypographyTokenNames);
  const tokenCounts = useMemo(
    () => ({
      typefaces: typefaces.length,
      typeRoles: sections.reduce((count, section) => count + section.roles.length, 0),
      rules: typographyGuides.rules.length,
    }),
    [],
  );

  return (
    <main className="sbt-story-shell">
      <div className="sbt-story-stack">
        <header className="sbt-story-header">
          <div className="sbt-story-eyebrow">{typographyGuides.eyebrow}</div>
          <h1 className="sbt-story-title">{typographyGuides.title}</h1>
          <p className="sbt-story-lead">{typographyGuides.lead}</p>
        </header>

        <section aria-label={typographyGuides.rulesTitle} className="sbt-meta-grid">
          <div className="sbt-meta-card">
            <span className="sbt-meta-card__label">{typographyGuides.typefaceTitle}</span>
            <strong className="sbt-meta-card__value">{tokenCounts.typefaces}</strong>
          </div>
          <div className="sbt-meta-card">
            <span className="sbt-meta-card__label">{typographyGuides.typescaleTitle}</span>
            <strong className="sbt-meta-card__value">{tokenCounts.typeRoles}</strong>
          </div>
          <div className="sbt-meta-card">
            <span className="sbt-meta-card__label">{typographyGuides.rulesTitle}</span>
            <strong className="sbt-meta-card__value">{tokenCounts.rules}</strong>
          </div>
        </section>

        <section className="sbt-panel">
          <h2 className="sbt-panel__heading">{typographyGuides.rulesTitle}</h2>
          <ul className="sbt-governance-list">
            {typographyGuides.rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </section>

        <section className="sbt-token-section">
          <header>
            <h2 className="sbt-token-section__title">{typographyGuides.typefaceTitle}</h2>
          </header>

          <div className="sbt-typeface-grid">
            {typefaces.map((role) => (
              <TypefaceCard key={role.token} resolvedTokens={resolvedTokens} role={role} />
            ))}
          </div>
        </section>

        <section className="sbt-token-section">
          <header>
            <h2 className="sbt-token-section__title">{typographyGuides.typescaleTitle}</h2>
          </header>

          {sections.map((section) => (
            <section className="sbt-panel" key={section.title}>
              <div>
                <h3 className="sbt-panel__heading">{section.title}</h3>
                <p className="sbt-panel__body">{section.summary}</p>
              </div>

              <div className="sbt-typescale-grid">
                {section.roles.map((role) => (
                  <TypeScaleCard
                    key={`${role.sizeToken}-${role.lineHeightToken}`}
                    resolvedTokens={resolvedTokens}
                    role={role}
                  />
                ))}
              </div>
            </section>
          ))}
        </section>
      </div>
    </main>
  );
}
