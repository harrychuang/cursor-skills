import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { storybookCopy } from "../_shared/copy";
import { tokenCatalog } from "../_shared/tokenData";

type ResolvedTokenMap = Record<string, string>;

type StrokeRole = {
  label: string;
  widthToken: string;
  colorToken: string;
  guidance: string;
};

type StrokeSection = {
  title: string;
  summary: string;
  roles: StrokeRole[];
};

const strokeGuides = storybookCopy.strokeGuides;
const tokenByName = new Map(tokenCatalog.map((token) => [token.name, token]));

const sections = strokeGuides.sections as StrokeSection[];
const allStrokeTokenNames = Array.from(
  new Set(
    sections.flatMap((section) =>
      section.roles.flatMap((role) => [role.widthToken, role.colorToken]),
    ),
  ),
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
  return tokenByName.get(tokenName)?.value ?? strokeGuides.unknownValue;
}

function StrokeTokenMeta({
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
        <span>{strokeGuides.valueLabel}</span>
        <code>{getAuthoredValue(token)}</code>
      </dd>
      <dd>
        <span>{strokeGuides.resolvedLabel}</span>
        <code>{resolvedTokens[token]}</code>
      </dd>
    </div>
  );
}

function StrokeCard({
  role,
  resolvedTokens,
}: {
  role: StrokeRole;
  resolvedTokens: ResolvedTokenMap;
}) {
  const strokeStyle = {
    "--sbt-stroke-guide-width": `var(${role.widthToken})`,
    "--sbt-stroke-guide-color": `var(${role.colorToken})`,
  } as CSSProperties;

  return (
    <article className="sbt-stroke-card">
      <div className="sbt-stroke-card__visual" style={strokeStyle}>
        <div className="sbt-stroke-card__track">
          <span aria-label={role.label} className="sbt-stroke-card__sample" />
        </div>
        <code>{resolvedTokens[role.widthToken]}</code>
      </div>

      <div className="sbt-stroke-card__content">
        <h3 className="sbt-stroke-card__title">{role.label}</h3>
        <div className="sbt-guide-usage">
          <span>{strokeGuides.usageLabel}</span>
          <p>{role.guidance}</p>
        </div>
        <dl className="sbt-guide-token-list sbt-guide-token-list--grid">
          <StrokeTokenMeta
            label={strokeGuides.widthLabel}
            resolvedTokens={resolvedTokens}
            token={role.widthToken}
          />
          <StrokeTokenMeta
            label={strokeGuides.colorLabel}
            resolvedTokens={resolvedTokens}
            token={role.colorToken}
          />
        </dl>
      </div>
    </article>
  );
}

export function StrokeGuides() {
  const resolvedTokens = useResolvedTokens(allStrokeTokenNames);
  const tokenCounts = useMemo(
    () => ({
      roles: sections.reduce((count, section) => count + section.roles.length, 0),
      groups: sections.length,
      rules: strokeGuides.rules.length,
    }),
    [],
  );

  return (
    <main className="sbt-story-shell">
      <div className="sbt-story-stack">
        <header className="sbt-story-header">
          <div className="sbt-story-eyebrow">{strokeGuides.eyebrow}</div>
          <h1 className="sbt-story-title">{strokeGuides.title}</h1>
          <p className="sbt-story-lead">{strokeGuides.lead}</p>
        </header>

        <section aria-label={strokeGuides.rulesTitle} className="sbt-meta-grid">
          <div className="sbt-meta-card">
            <span className="sbt-meta-card__label">{strokeGuides.strokeTitle}</span>
            <strong className="sbt-meta-card__value">{tokenCounts.roles}</strong>
          </div>
          <div className="sbt-meta-card">
            <span className="sbt-meta-card__label">{strokeGuides.groupTitle}</span>
            <strong className="sbt-meta-card__value">{tokenCounts.groups}</strong>
          </div>
          <div className="sbt-meta-card">
            <span className="sbt-meta-card__label">{strokeGuides.rulesTitle}</span>
            <strong className="sbt-meta-card__value">{tokenCounts.rules}</strong>
          </div>
        </section>

        <section className="sbt-panel">
          <h2 className="sbt-panel__heading">{strokeGuides.rulesTitle}</h2>
          <ul className="sbt-governance-list">
            {strokeGuides.rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </section>

        <section className="sbt-token-section">
          <header>
            <h2 className="sbt-token-section__title">{strokeGuides.strokeTitle}</h2>
          </header>

          {sections.map((section) => (
            <section className="sbt-panel" key={section.title}>
              <div>
                <h3 className="sbt-panel__heading">{section.title}</h3>
                <p className="sbt-panel__body">{section.summary}</p>
              </div>

              <div className="sbt-stroke-grid">
                {section.roles.map((role) => (
                  <StrokeCard
                    key={`${role.widthToken}-${role.colorToken}`}
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
