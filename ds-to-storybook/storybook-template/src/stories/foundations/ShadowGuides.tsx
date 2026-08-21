import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { storybookCopy } from "../_shared/copy";
import { tokenCatalog } from "../_shared/tokenData";

type ResolvedTokenMap = Record<string, string>;

type ShadowRole = {
  label: string;
  token: string;
  guidance: string;
};

type ShadowSection = {
  title: string;
  summary: string;
  roles: ShadowRole[];
};

const shadowGuides = storybookCopy.shadowGuides;
const tokenByName = new Map(tokenCatalog.map((token) => [token.name, token]));

const sections = shadowGuides.sections as ShadowSection[];
const allShadowTokenNames = Array.from(
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
  return tokenByName.get(tokenName)?.value ?? shadowGuides.unknownValue;
}

function ShadowTokenMeta({
  token,
  resolvedTokens,
}: {
  token: string;
  resolvedTokens: ResolvedTokenMap;
}) {
  return (
    <dl className="sbt-foundation-token-meta">
      <div>
        <dt>{shadowGuides.tokenLabel}</dt>
        <dd>
          <code>{token}</code>
        </dd>
      </div>
      <div>
        <dt>{shadowGuides.valueLabel}</dt>
        <dd>
          <code>{getAuthoredValue(token)}</code>
        </dd>
      </div>
      <div>
        <dt>{shadowGuides.resolvedLabel}</dt>
        <dd>
          <code>{resolvedTokens[token]}</code>
        </dd>
      </div>
    </dl>
  );
}

function ShadowCard({
  role,
  resolvedTokens,
}: {
  role: ShadowRole;
  resolvedTokens: ResolvedTokenMap;
}) {
  const shadowStyle = {
    "--sbt-shadow-guide-shadow": `var(${role.token})`,
  } as CSSProperties;

  return (
    <article className="sbt-shadow-card">
      <div className="sbt-shadow-card__visual" style={shadowStyle}>
        <div className="sbt-shadow-card__track">
          <span aria-label={role.label} className="sbt-shadow-card__sample" />
        </div>
        <code>{resolvedTokens[role.token]}</code>
      </div>

      <div className="sbt-shadow-card__content">
        <h3 className="sbt-shadow-card__title">{role.label}</h3>
        <div className="sbt-guide-usage">
          <span>{shadowGuides.usageLabel}</span>
          <p>{role.guidance}</p>
        </div>
        <ShadowTokenMeta resolvedTokens={resolvedTokens} token={role.token} />
      </div>
    </article>
  );
}

export function ShadowGuides() {
  const resolvedTokens = useResolvedTokens(allShadowTokenNames);
  const tokenCounts = useMemo(
    () => ({
      roles: sections.reduce((count, section) => count + section.roles.length, 0),
      groups: sections.length,
      rules: shadowGuides.rules.length,
    }),
    [],
  );

  return (
    <main className="sbt-story-shell">
      <div className="sbt-story-stack">
        <header className="sbt-story-header">
          <div className="sbt-story-eyebrow">{shadowGuides.eyebrow}</div>
          <h1 className="sbt-story-title">{shadowGuides.title}</h1>
          <p className="sbt-story-lead">{shadowGuides.lead}</p>
        </header>

        <section aria-label={shadowGuides.rulesTitle} className="sbt-meta-grid">
          <div className="sbt-meta-card">
            <span className="sbt-meta-card__label">{shadowGuides.shadowTitle}</span>
            <strong className="sbt-meta-card__value">{tokenCounts.roles}</strong>
          </div>
          <div className="sbt-meta-card">
            <span className="sbt-meta-card__label">{shadowGuides.groupTitle}</span>
            <strong className="sbt-meta-card__value">{tokenCounts.groups}</strong>
          </div>
          <div className="sbt-meta-card">
            <span className="sbt-meta-card__label">{shadowGuides.rulesTitle}</span>
            <strong className="sbt-meta-card__value">{tokenCounts.rules}</strong>
          </div>
        </section>

        <section className="sbt-panel">
          <h2 className="sbt-panel__heading">{shadowGuides.rulesTitle}</h2>
          <ul className="sbt-governance-list">
            {shadowGuides.rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </section>

        <section className="sbt-token-section">
          <header>
            <h2 className="sbt-token-section__title">{shadowGuides.shadowTitle}</h2>
          </header>

          {sections.map((section) => (
            <section className="sbt-panel" key={section.title}>
              <div>
                <h3 className="sbt-panel__heading">{section.title}</h3>
                <p className="sbt-panel__body">{section.summary}</p>
              </div>

              <div className="sbt-shadow-grid">
                {section.roles.map((role) => (
                  <ShadowCard key={role.token} resolvedTokens={resolvedTokens} role={role} />
                ))}
              </div>
            </section>
          ))}
        </section>
      </div>
    </main>
  );
}
