import { Fragment, type MouseEvent } from "react";
import { Icon, Link, SummaryMetric } from "sterling-ui";
import { fmtMillions, fmtShare, fullLender, plural, pool, type Filters, type PoolSummary, type Status } from "./pool";

interface Props {
  summary: PoolSummary;
  loading: boolean;
  /** Sets one filter, keeping the others. */
  onFilter: (patch: Filters) => void;
}

const SHOWN_STATUSES: Status[] = ["Ready", "Exception", "Signed off", "Ineligible"];

export function PoolSummaryPanel({ summary, loading, onFilter }: Props) {
  const progress = summary.upb / pool.targetUpb;
  const shortcut = (patch: Filters) => (e: MouseEvent) => {
    e.preventDefault();
    onFilter(patch);
  };
  const statuses = SHOWN_STATUSES.filter((s) => s !== "Ineligible" || summary.byStatus[s] > 0);

  return (
    <aside className="summary stack" aria-labelledby="summary-title">
      <h2 id="summary-title" className="stl-text-heading heading">
        Pool summary
      </h2>

      <SummaryMetric
        className="full"
        label="Pool UPB"
        value={fmtMillions(summary.upb)}
        detail={`${Math.round(progress * 100)}% of ${fmtMillions(pool.targetUpb)} target`}
        progress={progress}
        status={summary.upb > pool.targetUpb ? "over-target" : "normal"}
        loading={loading}
      />

      <section className="panel" aria-labelledby="by-status-title">
        <h3 id="by-status-title" className="stl-text-label muted">
          Loans by status
        </h3>
        <p className="stl-text-body inline-list">
          {statuses.map((s, i) => (
            <Fragment key={s}>
              {i > 0 && <span aria-hidden="true"> · </span>}
              <Link
                size="md"
                href="#loans"
                label={`${summary.byStatus[s]} ${s}`}
                aria-label={`${summary.byStatus[s]} ${s}: add the filter Status is ${s}`}
                onClick={shortcut({ status: s })}
              />
            </Fragment>
          ))}
        </p>
        <p className="stl-text-caption muted">Each adds a Status filter.</p>
      </section>

      <section id="pool-issues" tabIndex={-1} className="panel" aria-labelledby="issues-title">
        {summary.issues > 0 ? (
          <>
            <h3 id="issues-title" className="stl-text-body-strong icon-text ink-warning">
              <Icon name="alert-triangle" />
              Issues blocking submit ({summary.issues})
            </h3>
            <ul className="plain-list stack">
              {summary.openExceptions.length > 0 && (
                <li className="stack stack--tight">
                  <span className="stl-text-body">
                    Exceptions needing sign-off ({summary.openExceptions.length})
                  </span>
                  <Link size="md" href="#loans" label="Filter: Status is Exception" onClick={shortcut({ status: "Exception" })} />
                </li>
              )}
              {summary.overCap.length > 0 && (
                <li className="stack stack--tight">
                  <span className="stl-text-body">
                    Limits ({summary.overCap.length}):{" "}
                    {summary.overCap
                      .map((o) => `${o.lender} at ${fmtShare(o.sharePercent)} (cap ${o.capPercent}%)`)
                      .join("; ")}
                  </span>
                  {summary.overCap.map((o) => (
                    <Link
                      key={o.lender}
                      size="md"
                      href="#loans"
                      label={`Filter: Lender is ${o.lender}`}
                      onClick={shortcut({ lender: fullLender(o.lender) })}
                    />
                  ))}
                </li>
              )}
            </ul>
          </>
        ) : (
          <>
            <h3 id="issues-title" className="stl-text-body-strong icon-text ink-positive">
              <Icon name="circle-check" />
              No issues block submit
            </h3>
            <p className="stl-text-body">Every exception is signed off and every lender is within the limit.</p>
          </>
        )}
      </section>
    </aside>
  );
}
