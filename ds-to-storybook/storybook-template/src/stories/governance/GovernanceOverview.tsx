import { storybookCopy } from "../_shared/copy";

function GovernancePanel({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="sbt-panel">
      <h2 className="sbt-panel__heading">{title}</h2>
      <ul className="sbt-governance-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

export function GovernanceOverview() {
  return (
    <main className="sbt-story-shell">
      <div className="sbt-story-stack">
        <header className="sbt-story-header">
          <div className="sbt-story-eyebrow">{storybookCopy.governance.eyebrow}</div>
          <h1 className="sbt-story-title">{storybookCopy.governance.title}</h1>
          <p className="sbt-story-lead">{storybookCopy.governance.lead}</p>
        </header>

        <GovernancePanel
          items={storybookCopy.governance.findings}
          title={storybookCopy.governance.findingsTitle}
        />
        <GovernancePanel
          items={storybookCopy.governance.workflow}
          title={storybookCopy.governance.workflowTitle}
        />
        <GovernancePanel
          items={storybookCopy.governance.folders}
          title={storybookCopy.governance.architectureTitle}
        />
      </div>
    </main>
  );
}
