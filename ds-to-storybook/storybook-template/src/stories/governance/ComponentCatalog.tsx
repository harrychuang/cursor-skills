import {
  componentCatalogEntries,
  componentCategoryOrder,
  type ComponentCatalogEntry,
} from "../../storybook/componentCatalog";
import { storybookCopy } from "../_shared/copy";

type CatalogGroup = {
  category: string;
  entries: readonly ComponentCatalogEntry[];
};

const catalogGroups = componentCategoryOrder
  .map((category) => ({
    category,
    entries: componentCatalogEntries.filter((entry) => entry.category === category),
  }))
  .filter((group) => group.entries.length > 0) satisfies CatalogGroup[];

function CatalogTags({ values }: { values: readonly string[] }) {
  return (
    <span className="sbt-component-catalog__tag-list">
      {values.map((value) => (
        <span className="sbt-component-catalog__tag" key={value}>
          {value}
        </span>
      ))}
    </span>
  );
}

function CatalogStats() {
  const copy = storybookCopy.componentCatalog;

  return (
    <section className="sbt-panel">
      <h2 className="sbt-panel__heading">{copy.statsTitle}</h2>
      <div className="sbt-meta-grid">
        <div className="sbt-meta-card">
          <span className="sbt-meta-card__label">{copy.categoriesLabel}</span>
          <span className="sbt-meta-card__value">{catalogGroups.length}</span>
        </div>
        <div className="sbt-meta-card">
          <span className="sbt-meta-card__label">{copy.componentsLabel}</span>
          <span className="sbt-meta-card__value">{componentCatalogEntries.length}</span>
        </div>
        <div className="sbt-meta-card">
          <span className="sbt-meta-card__label">{copy.metadataLabel}</span>
          <span className="sbt-meta-card__value">{copy.metadataValue}</span>
        </div>
      </div>
    </section>
  );
}

function CatalogGroupTable({ group }: { group: CatalogGroup }) {
  const copy = storybookCopy.componentCatalog;

  return (
    <section className="sbt-panel">
      <h2 className="sbt-panel__heading">{group.category}</h2>
      <div className="sbt-token-table-wrap">
        <table className="sbt-token-table sbt-component-catalog__table">
          <thead>
            <tr>
              <th>{copy.tableHeaders.component}</th>
              <th>{copy.tableHeaders.role}</th>
              <th>{copy.tableHeaders.useWhen}</th>
              <th>{copy.tableHeaders.dependencies}</th>
              <th>{copy.tableHeaders.keywords}</th>
            </tr>
          </thead>
          <tbody>
            {group.entries.map((entry) => (
              <tr key={entry.id}>
                <td>
                  <strong className="sbt-component-catalog__name">{entry.name}</strong>
                  <span className="sbt-component-catalog__path">{entry.storyTitle}</span>
                  <span className="sbt-component-catalog__purpose">{entry.purpose}</span>
                </td>
                <td>{entry.compositionRole}</td>
                <td>{entry.useWhen.join(" ")}</td>
                <td>
                  {entry.dependencies?.length ? (
                    <CatalogTags values={entry.dependencies} />
                  ) : (
                    <span className="sbt-component-catalog__empty">
                      {copy.emptyDependencies}
                    </span>
                  )}
                </td>
                <td>
                  <CatalogTags values={entry.keywords} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function ComponentCatalog() {
  const copy = storybookCopy.componentCatalog;

  return (
    <main className="sbt-story-shell">
      <div className="sbt-story-stack">
        <header className="sbt-story-header">
          <div className="sbt-story-eyebrow">{copy.eyebrow}</div>
          <h1 className="sbt-story-title">{copy.title}</h1>
          <p className="sbt-story-lead">{copy.lead}</p>
        </header>

        <CatalogStats />

        {catalogGroups.map((group) => (
          <CatalogGroupTable group={group} key={group.category} />
        ))}
      </div>
    </main>
  );
}
