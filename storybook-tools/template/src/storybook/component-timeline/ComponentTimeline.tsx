import { useEffect, useState } from "react";

import {
  componentCatalog,
  type ComponentCatalogEntry,
  type ComponentCatalogId,
} from "../componentCatalog";
import { componentTimelineEntries } from "../componentTimeline";
import { getTimelineExtras } from "./timelineExtrasRegistry";
import "./component-timeline.css";

/**
 * Component budget per page. Pages hold whole date groups packed up to this
 * budget — a date group is never split across pages, and a single date group
 * larger than the budget occupies a page of its own. Each card mounts a live
 * story iframe, so the budget is what keeps the number of concurrently
 * mounted iframes bounded (by the larger of the budget and the largest
 * single-date group).
 */
const pageComponentBudget = 36;

const copy = {
  eyebrow: "Timeline",
  title: "Component Timeline",
  lead: "Every shared component in creation order, newest first, so you can see what was added on any given day. Each card renders the component's live story, so previews never go stale.",
  statsTitle: "Timeline coverage",
  componentsLabel: "Components",
  datesLabel: "Build dates",
  latestLabel: "Latest addition",
  rangeLabel: "Showing {start}–{end} of {total} components · page {page} of {pages}",
  groupCount: "{count} new",
  pagerLabel: "Timeline pages",
  previousPage: "Previous",
  nextPage: "Next",
  previewTitle: "{component} live preview",
  previewUnavailable: "No story preview available",
  uncatalogued: "Not in catalog",
  openStory: "Open story",
  emptyValue: "—",
};

type TimelineItem = {
  id: string;
  firstSeen: string;
  commit: string;
  subject: string;
  entry: ComponentCatalogEntry | undefined;
};

type DateGroup = {
  date: string;
  items: readonly TimelineItem[];
};

const timelineItems: readonly TimelineItem[] = componentTimelineEntries.map(
  (record) => ({
    ...record,
    entry: componentCatalog[record.id as ComponentCatalogId],
  }),
);

const timelineDates = new Set(timelineItems.map((item) => item.firstSeen));

/**
 * Packs consecutive whole date groups into pages: a group joins the current
 * page unless that would push the page past the component budget, and a group
 * larger than the budget occupies a page of its own. Groups are never split,
 * so every date header shows the date's full component count.
 */
function packGroupsIntoPages(
  groups: readonly DateGroup[],
  budget: number,
): readonly (readonly DateGroup[])[] {
  const pages: DateGroup[][] = [];
  let current: DateGroup[] = [];
  let currentCount = 0;

  for (const group of groups) {
    if (current.length > 0 && currentCount + group.items.length > budget) {
      pages.push(current);
      current = [];
      currentCount = 0;
    }

    current.push(group);
    currentCount += group.items.length;
  }

  if (current.length > 0) {
    pages.push(current);
  }

  return pages;
}

const timelinePages = packGroupsIntoPages(
  groupByDate(timelineItems),
  pageComponentBudget,
);
const pageCount = Math.max(1, timelinePages.length);

/**
 * Builds an absolute link to the story inside the full Storybook manager UI.
 * The page renders inside `iframe.html`, so a bare `?path=…` href would resolve
 * against the preview frame and open the component on its own; strip
 * `iframe.html` off the top-level URL instead. Mirrors the coverage tool's
 * storyManagerUrl.
 */
function storyManagerUrl(storyId: string) {
  const path = `/story/${encodeURIComponent(storyId)}`;
  const search = `?path=${path}`;

  if (typeof window === "undefined") {
    return search;
  }

  let managerHref = window.location.href;

  try {
    if (window.top && window.top !== window) {
      managerHref = window.top.location.href;
    }
  } catch {
    // Cross-origin manager — fall back to this frame's URL, stripped below.
  }

  try {
    const url = new URL(managerHref);

    url.hash = "";
    url.search = "";
    url.pathname = url.pathname.replace(/\/iframe\.html$/, "/");
    url.searchParams.set("path", path);
    return url.toString();
  } catch {
    return search;
  }
}

/** Groups an already date-sorted page into consecutive date runs. */
function groupByDate(items: readonly TimelineItem[]): readonly DateGroup[] {
  const groups: DateGroup[] = [];

  for (const item of items) {
    const current = groups.at(-1);

    if (current?.date === item.firstSeen) {
      (current.items as TimelineItem[]).push(item);
      continue;
    }

    groups.push({ date: item.firstSeen, items: [item] });
  }

  return groups;
}

/**
 * Maps catalog story titles to story ids using the Storybook index. Mirrors
 * the lookup the coverage tool performs; on failure the page degrades to
 * metadata-only cards instead of blank frames.
 */
function useStoryIndex() {
  const [storyIndex, setStoryIndex] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    let active = true;

    async function loadStoryIndex() {
      try {
        const response = await fetch("./index.json");

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as {
          entries?: Record<
            string,
            { id?: string; title?: string; type?: string }
          >;
        };
        const titleToStoryId = new Map<string, string>();

        for (const entry of Object.values(data.entries ?? {})) {
          if (
            entry?.type === "story" &&
            typeof entry.title === "string" &&
            typeof entry.id === "string" &&
            !titleToStoryId.has(entry.title)
          ) {
            titleToStoryId.set(entry.title, entry.id);
          }
        }

        if (active) {
          setStoryIndex(titleToStoryId);
        }
      } catch {
        // Metadata-only rendering is the intended fallback.
      }
    }

    void loadStoryIndex();

    return () => {
      active = false;
    };
  }, []);

  return storyIndex;
}

function TimelineStats() {
  const latestDate = timelineItems[0]?.firstSeen ?? copy.emptyValue;

  return (
    <section className="ctl-panel">
      <h2 className="ctl-panel__heading">{copy.statsTitle}</h2>
      <div className="ctl-meta-grid">
        <div className="ctl-meta-card">
          <span className="ctl-meta-card__label">{copy.componentsLabel}</span>
          <span className="ctl-meta-card__value">{timelineItems.length}</span>
        </div>
        <div className="ctl-meta-card">
          <span className="ctl-meta-card__label">{copy.datesLabel}</span>
          <span className="ctl-meta-card__value">{timelineDates.size}</span>
        </div>
        <div className="ctl-meta-card">
          <span className="ctl-meta-card__label">{copy.latestLabel}</span>
          <span className="ctl-meta-card__value">{latestDate}</span>
        </div>
      </div>
    </section>
  );
}

/**
 * Project-owned extras area (statistics panels, pipeline dashboards, …).
 * Populated through timelineExtrasRegistry.tsx; renders nothing while the
 * registry keeps its default null implementation.
 */
function TimelineExtras() {
  const extras = getTimelineExtras();

  if (extras === null || extras === undefined) {
    return null;
  }

  return <section className="ctl-panel ctl-extras">{extras}</section>;
}

function TimelineCard({
  item,
  storyId,
}: {
  item: TimelineItem;
  storyId: string | undefined;
}) {
  const name = item.entry?.name ?? item.id;

  return (
    <article className="ctl-card">
      <div className="ctl-card__preview">
        {storyId ? (
          <iframe
            className="ctl-card__frame"
            loading="lazy"
            src={`iframe.html?id=${encodeURIComponent(storyId)}&viewMode=story`}
            title={copy.previewTitle.replace("{component}", name)}
          />
        ) : (
          <p className="ctl-card__fallback">{copy.previewUnavailable}</p>
        )}
      </div>
      <div className="ctl-card__meta">
        <h4 className="ctl-card__name">{name}</h4>
        <p className="ctl-card__category">
          {item.entry?.category ?? copy.uncatalogued}
        </p>
        <p className="ctl-card__subject" title={item.subject}>
          {item.subject}
        </p>
        <p className="ctl-card__commit">
          <code>{item.commit}</code>
          {storyId ? (
            <a
              className="ctl-card__link"
              href={storyManagerUrl(storyId)}
              rel="noreferrer"
              target="_top"
            >
              {copy.openStory}
            </a>
          ) : null}
        </p>
      </div>
    </article>
  );
}

function TimelinePager({
  onSelect,
  page,
}: {
  onSelect: (next: number) => void;
  page: number;
}) {
  if (pageCount <= 1) {
    return null;
  }

  return (
    <nav aria-label={copy.pagerLabel} className="ctl-pager">
      <button
        className="ctl-pager__step"
        disabled={page === 0}
        onClick={() => onSelect(page - 1)}
        type="button"
      >
        {copy.previousPage}
      </button>
      <ol className="ctl-pager__list">
        {Array.from({ length: pageCount }, (_, index) => (
          <li key={index}>
            <button
              aria-current={index === page ? "page" : undefined}
              className="ctl-pager__page"
              onClick={() => onSelect(index)}
              type="button"
            >
              {index + 1}
            </button>
          </li>
        ))}
      </ol>
      <button
        className="ctl-pager__step"
        disabled={page === pageCount - 1}
        onClick={() => onSelect(page + 1)}
        type="button"
      >
        {copy.nextPage}
      </button>
    </nav>
  );
}

export function ComponentTimeline() {
  const storyIndex = useStoryIndex();
  const [page, setPage] = useState(0);

  const dateGroups = timelinePages[page] ?? [];
  const pageItemCount = dateGroups.reduce(
    (count, group) => count + group.items.length,
    0,
  );
  const priorItemCount = timelinePages
    .slice(0, page)
    .reduce(
      (count, groups) =>
        count + groups.reduce((n, group) => n + group.items.length, 0),
      0,
    );

  const rangeStart = priorItemCount + 1;
  const rangeEnd = priorItemCount + pageItemCount;

  return (
    <main className="ctl-shell">
      <div className="ctl-stack">
        <header className="ctl-header">
          <div className="ctl-header__eyebrow">{copy.eyebrow}</div>
          <h1 className="ctl-header__title">{copy.title}</h1>
          <p className="ctl-header__lead">{copy.lead}</p>
        </header>

        <TimelineStats />

        <TimelineExtras />

        <p className="ctl-range">
          {copy.rangeLabel
            .replace("{start}", String(rangeStart))
            .replace("{end}", String(rangeEnd))
            .replace("{total}", String(timelineItems.length))
            .replace("{page}", String(page + 1))
            .replace("{pages}", String(pageCount))}
        </p>

        <TimelinePager onSelect={setPage} page={page} />

        {dateGroups.map((group) => (
          <section className="ctl-panel ctl-group" key={group.date}>
            <header className="ctl-group__header">
              <h2 className="ctl-group__date">{group.date}</h2>
              <span className="ctl-group__count">
                {copy.groupCount.replace("{count}", String(group.items.length))}
              </span>
            </header>
            <div className="ctl-grid">
              {group.items.map((item) => (
                <TimelineCard
                  item={item}
                  key={item.id}
                  storyId={
                    item.entry
                      ? storyIndex.get(item.entry.storyTitle)
                      : undefined
                  }
                />
              ))}
            </div>
          </section>
        ))}

        <TimelinePager onSelect={setPage} page={page} />
      </div>
    </main>
  );
}
