import "./ExampleCard.css";

export type ExampleCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  status: "Ready" | "Draft" | "Review";
};

export function ExampleCard({
  eyebrow,
  title,
  description,
  status,
}: ExampleCardProps) {
  return (
    <article className="sbt-example-card">
      <div className="sbt-example-card__header">
        <p className="sbt-example-card__eyebrow">{eyebrow}</p>
        <span className="sbt-example-card__status">{status}</span>
      </div>
      <h3 className="sbt-example-card__title">{title}</h3>
      <p className="sbt-example-card__description">{description}</p>
    </article>
  );
}
