import { useMemo, useState } from "react";

import { examplePrototypeRequest } from "./examplePrototypeData";
import {
  examplePrototypeRoutes,
  type ExamplePrototypeRouteId,
} from "./examplePrototypeFlow";
import "./example-prototype.css";

export type ExamplePrototypeProps = {
  initialRouteId?: ExamplePrototypeRouteId;
  isFlowPreview?: boolean;
};

function getRouteFromLocation(): ExamplePrototypeRouteId | null {
  if (typeof window === "undefined") {
    return null;
  }

  const route = new URLSearchParams(window.location.search).get("prototypeRoute");
  return examplePrototypeRoutes.some((item) => item.id === route)
    ? (route as ExamplePrototypeRouteId)
    : null;
}

function getRouteTitle(routeId: ExamplePrototypeRouteId) {
  return (
    examplePrototypeRoutes.find((route) => route.id === routeId)?.title ??
    "Project Intake"
  );
}

export function ExamplePrototype({
  initialRouteId = "intake",
  isFlowPreview = false,
}: ExamplePrototypeProps) {
  const previewRoute = getRouteFromLocation();
  const [routeId, setRouteId] = useState<ExamplePrototypeRouteId>(
    previewRoute ?? initialRouteId,
  );
  const visibleRoute = previewRoute ?? routeId;
  const routeTitle = getRouteTitle(visibleRoute);
  const statusLabel = useMemo(() => {
    if (visibleRoute === "handoff") return "Approved";
    if (visibleRoute === "review") return "Review";
    return "Draft";
  }, [visibleRoute]);

  const goTo = (nextRoute: ExamplePrototypeRouteId) => {
    if (!previewRoute) {
      setRouteId(nextRoute);
    }
  };

  return (
    <main
      className={[
        "sbt-example-prototype",
        isFlowPreview ? "sbt-example-prototype--flow-preview" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-prototype-root="true"
      data-route={visibleRoute}
    >
      <section
        className="sbt-example-prototype__shell"
        data-prototype-route-preview="true"
      >
        <header className="sbt-example-prototype__topbar">
          <div>
            <p>{examplePrototypeRequest.id}</p>
            <h1>{routeTitle}</h1>
          </div>
          <span>{statusLabel}</span>
        </header>

        <nav className="sbt-example-prototype__tabs" aria-label="Prototype routes">
          {examplePrototypeRoutes.map((route) => (
            <button
              aria-current={visibleRoute === route.id ? "page" : undefined}
              key={route.id}
              onClick={() => goTo(route.id)}
              type="button"
            >
              {route.title}
            </button>
          ))}
        </nav>

        <section className="sbt-example-prototype__body">
          {visibleRoute === "intake" ? (
            <article className="sbt-example-prototype__panel">
              <p className="sbt-example-prototype__eyebrow">Request</p>
              <h2>{examplePrototypeRequest.name}</h2>
              <p>{examplePrototypeRequest.summary}</p>
              <dl className="sbt-example-prototype__details">
                <div>
                  <dt>Owner</dt>
                  <dd>{examplePrototypeRequest.owner}</dd>
                </div>
                <div>
                  <dt>Target</dt>
                  <dd>{examplePrototypeRequest.targetDate}</dd>
                </div>
              </dl>
              <button onClick={() => goTo("review")} type="button">
                Submit intake
              </button>
            </article>
          ) : null}

          {visibleRoute === "review" ? (
            <article className="sbt-example-prototype__panel">
              <p className="sbt-example-prototype__eyebrow">Review</p>
              <h2>Scope and readiness</h2>
              <ul className="sbt-example-prototype__list">
                {examplePrototypeRequest.requirements.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <div className="sbt-example-prototype__actions">
                <button onClick={() => goTo("handoff")} type="button">
                  Request approval
                </button>
                <button onClick={() => goTo("intake")} type="button">
                  Edit intake
                </button>
              </div>
            </article>
          ) : null}

          {visibleRoute === "handoff" ? (
            <article className="sbt-example-prototype__panel">
              <p className="sbt-example-prototype__eyebrow">Handoff</p>
              <h2>Ready for implementation</h2>
              <p>
                Scope, route metadata, fixture data, and acceptance criteria are
                ready for the next implementation pass.
              </p>
              <ul className="sbt-example-prototype__list">
                <li>Prototype docs are attached to Storybook.</li>
                <li>UI Flow key transitions are visible in review mode.</li>
                <li>Static Flow export is available for Figma review.</li>
              </ul>
              <button onClick={() => goTo("intake")} type="button">
                Start another request
              </button>
            </article>
          ) : null}
        </section>
      </section>
    </main>
  );
}
