import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { storybookCopy } from "../_shared/copy";
import { tokenCatalog } from "../_shared/tokenData";

type ResolvedTokenMap = Record<string, string>;

type ShapeRole = {
  label: string;
  token: string;
  guidance: string;
  topOnly?: boolean;
};

type ShapeSection = {
  title: string;
  summary: string;
  roles: ShapeRole[];
};

const shapeGuides = storybookCopy.shapeGuides;
const tokenByName = new Map(tokenCatalog.map((token) => [token.name, token]));

const sections = shapeGuides.sections as ShapeSection[];
const allShapeTokenNames = Array.from(
  new Set(sections.flatMap((section) => section.roles.map((role) => role.token))),
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
  return tokenByName.get(tokenName)?.value ?? shapeGuides.unknownValue;
}

function ShapeTokenMeta({
  token,
  resolvedTokens,
}: {
  token: string;
  resolvedTokens: ResolvedTokenMap;
}) {
  return (
    <dl className="sbt-foundation-token-meta">
      <div>
        <dt>{shapeGuides.tokenLabel}</dt>
        <dd>
          <code>{token}</code>
        </dd>
      </div>
      <div>
        <dt>{shapeGuides.valueLabel}</dt>
        <dd>
          <code>{getAuthoredValue(token)}</code>
        </dd>
      </div>
      <div>
        <dt>{shapeGuides.resolvedLabel}</dt>
        <dd>
          <code>{resolvedTokens[token]}</code>
        </dd>
      </div>
    </dl>
  );
}

function ShapeCard({
  role,
  resolvedTokens,
}: {
  role: ShapeRole;
  resolvedTokens: ResolvedTokenMap;
}) {
  const shapeStyle = {
    "--sbt-shape-guide-radius": `var(${role.token})`,
  } as CSSProperties;

  return (
    <article className="sbt-shape-card">
      <div className="sbt-shape-card__visual" style={shapeStyle}>
        <div className="sbt-shape-card__track">
          <span
            aria-label={role.label}
            className="sbt-shape-card__sample"
            data-top-only={role.topOnly ? "true" : undefined}
          />
        </div>
        <code>{resolvedTokens[role.token]}</code>
      </div>

      <div className="sbt-shape-card__content">
        <h3 className="sbt-shape-card__title">{role.label}</h3>
        <div className="sbt-guide-usage">
          <span>{shapeGuides.usageLabel}</span>
          <p>{role.guidance}</p>
        </div>
        <ShapeTokenMeta resolvedTokens={resolvedTokens} token={role.token} />
      </div>
    </article>
  );
}

export function ShapeGuides() {
  const resolvedTokens = useResolvedTokens(allShapeTokenNames);
  const tokenCounts = useMemo(
    () => ({
      roles: sections.reduce((count, section) => count + section.roles.length, 0),
      groups: sections.length,
      rules: shapeGuides.rules.length,
    }),
    [],
  );

  return (
    <main className="sbt-story-shell">
      <div className="sbt-story-stack">
        <header className="sbt-story-header">
          <div className="sbt-story-eyebrow">{shapeGuides.eyebrow}</div>
          <h1 className="sbt-story-title">{shapeGuides.title}</h1>
          <p className="sbt-story-lead">{shapeGuides.lead}</p>
        </header>

        <section aria-label={shapeGuides.rulesTitle} className="sbt-meta-grid">
          <div className="sbt-meta-card">
            <span className="sbt-meta-card__label">{shapeGuides.cornerTitle}</span>
            <strong className="sbt-meta-card__value">{tokenCounts.roles}</strong>
          </div>
          <div className="sbt-meta-card">
            <span className="sbt-meta-card__label">{shapeGuides.groupTitle}</span>
            <strong className="sbt-meta-card__value">{tokenCounts.groups}</strong>
          </div>
          <div className="sbt-meta-card">
            <span className="sbt-meta-card__label">{shapeGuides.rulesTitle}</span>
            <strong className="sbt-meta-card__value">{tokenCounts.rules}</strong>
          </div>
        </section>

        <section className="sbt-panel">
          <h2 className="sbt-panel__heading">{shapeGuides.rulesTitle}</h2>
          <ul className="sbt-governance-list">
            {shapeGuides.rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </section>

        <section className="sbt-token-section">
          <header>
            <h2 className="sbt-token-section__title">{shapeGuides.cornerTitle}</h2>
          </header>

          {sections.map((section) => (
            <section className="sbt-panel" key={section.title}>
              <div>
                <h3 className="sbt-panel__heading">{section.title}</h3>
                <p className="sbt-panel__body">{section.summary}</p>
              </div>

              <div className="sbt-shape-grid">
                {section.roles.map((role) => (
                  <ShapeCard key={role.token} resolvedTokens={resolvedTokens} role={role} />
                ))}
              </div>
            </section>
          ))}
        </section>
      </div>
    </main>
  );
}
