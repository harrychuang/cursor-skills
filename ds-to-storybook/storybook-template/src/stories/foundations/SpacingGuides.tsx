import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { storybookCopy } from "../_shared/copy";
import { tokenCatalog } from "../_shared/tokenData";

type ResolvedTokenMap = Record<string, string>;

type SpacingRole = {
  label: string;
  token: string;
  guidance: string;
};

type SpacingSection = {
  title: string;
  summary: string;
  roles: SpacingRole[];
};

const spacingGuides = storybookCopy.spacingGuides;
const tokenByName = new Map(tokenCatalog.map((token) => [token.name, token]));

const sections = spacingGuides.sections as SpacingSection[];
const allSpacingTokenNames = Array.from(
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
  return tokenByName.get(tokenName)?.value ?? spacingGuides.unknownValue;
}

function SpacingTokenMeta({
  token,
  resolvedTokens,
}: {
  token: string;
  resolvedTokens: ResolvedTokenMap;
}) {
  return (
    <dl className="sbt-spacing-token-meta">
      <div>
        <dt>{spacingGuides.tokenLabel}</dt>
        <dd>
          <code>{token}</code>
        </dd>
      </div>
      <div>
        <dt>{spacingGuides.valueLabel}</dt>
        <dd>
          <code>{getAuthoredValue(token)}</code>
        </dd>
      </div>
      <div>
        <dt>{spacingGuides.resolvedLabel}</dt>
        <dd>
          <code>{resolvedTokens[token]}</code>
        </dd>
      </div>
    </dl>
  );
}

function SpacingCard({
  role,
  resolvedTokens,
}: {
  role: SpacingRole;
  resolvedTokens: ResolvedTokenMap;
}) {
  const spacingStyle = {
    "--sbt-space-guide-size": `var(${role.token})`,
  } as CSSProperties;

  return (
    <article className="sbt-spacing-card">
      <div className="sbt-spacing-card__visual" style={spacingStyle}>
        <div className="sbt-spacing-card__track">
          <span
            aria-label={role.label}
            className="sbt-spacing-card__bar"
            data-zero={role.token === "--sbt-sys-spacing-none" ? "true" : undefined}
          />
        </div>
        <code>{resolvedTokens[role.token]}</code>
      </div>

      <div className="sbt-spacing-card__content">
        <h3 className="sbt-spacing-card__title">{role.label}</h3>
        <div className="sbt-guide-usage">
          <span>{spacingGuides.usageLabel}</span>
          <p>{role.guidance}</p>
        </div>
        <SpacingTokenMeta resolvedTokens={resolvedTokens} token={role.token} />
      </div>
    </article>
  );
}

export function SpacingGuides() {
  const resolvedTokens = useResolvedTokens(allSpacingTokenNames);
  const tokenCounts = useMemo(
    () => ({
      roles: sections.reduce((count, section) => count + section.roles.length, 0),
      groups: sections.length,
      rules: spacingGuides.rules.length,
    }),
    [],
  );

  return (
    <main className="sbt-story-shell">
      <div className="sbt-story-stack">
        <header className="sbt-story-header">
          <div className="sbt-story-eyebrow">{spacingGuides.eyebrow}</div>
          <h1 className="sbt-story-title">{spacingGuides.title}</h1>
          <p className="sbt-story-lead">{spacingGuides.lead}</p>
        </header>

        <section aria-label={spacingGuides.rulesTitle} className="sbt-meta-grid">
          <div className="sbt-meta-card">
            <span className="sbt-meta-card__label">{spacingGuides.spacingTitle}</span>
            <strong className="sbt-meta-card__value">{tokenCounts.roles}</strong>
          </div>
          <div className="sbt-meta-card">
            <span className="sbt-meta-card__label">{spacingGuides.groupTitle}</span>
            <strong className="sbt-meta-card__value">{tokenCounts.groups}</strong>
          </div>
          <div className="sbt-meta-card">
            <span className="sbt-meta-card__label">{spacingGuides.rulesTitle}</span>
            <strong className="sbt-meta-card__value">{tokenCounts.rules}</strong>
          </div>
        </section>

        <section className="sbt-panel">
          <h2 className="sbt-panel__heading">{spacingGuides.rulesTitle}</h2>
          <ul className="sbt-governance-list">
            {spacingGuides.rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </section>

        <section className="sbt-token-section">
          <header>
            <h2 className="sbt-token-section__title">{spacingGuides.spacingTitle}</h2>
          </header>

          {sections.map((section) => (
            <section className="sbt-panel" key={section.title}>
              <div>
                <h3 className="sbt-panel__heading">{section.title}</h3>
                <p className="sbt-panel__body">{section.summary}</p>
              </div>

              <div className="sbt-spacing-grid">
                {section.roles.map((role) => (
                  <SpacingCard key={role.token} resolvedTokens={resolvedTokens} role={role} />
                ))}
              </div>
            </section>
          ))}
        </section>
      </div>
    </main>
  );
}
