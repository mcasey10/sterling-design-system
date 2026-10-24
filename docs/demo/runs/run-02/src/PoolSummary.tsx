import type { MouseEvent } from "react";
import { Icon, Link, SummaryMetric } from "sterling-ui";
import {
  formatMillions,
  formatShare,
  pool,
  rules,
  type Filters,
  type PoolTotals,
  type Status,
} from "./model";

interface PoolSummaryProps {
  totals: PoolTotals;
  loading: boolean;
  /** Adds a Status filter to the ones applied. */
  onAddStatus: (status: Status) => void;
  /** Replaces the applied filters. */
  onShow: (filters: Partial<Filters>) => void;
}

/** A link that applies a filter rather than going anywhere. */
function FilterLink({ label, onActivate }: { label: string; onActivate: () => void }) {
  return (
    <Link
      href="#pool-loans-grid"
      label={label}
      onClick={(e: MouseEvent) => {
        e.preventDefault();
        onActivate();
      }}
    />
  );
}

export function PoolSummary({ totals, loading, onAddStatus, onShow }: PoolSummaryProps) {
  const progress = totals.upb / pool.targetUpb;
  const statuses: Status[] = ["Ready", "Exception", "Signed off"];
  const exceptions = totals.byStatus.Exception;

  return (
    <aside className="pool-summary" aria-labelledby="pool-summary-heading">
      <h2 id="pool-summary-heading" className="stl-text-heading">
        Pool summary
      </h2>

      <SummaryMetric
        className="panel"
        label="Pool UPB"
        loading={loading}
        value={formatMillions(totals.upb)}
        progress={progress}
        detail={`${Math.round(progress * 100)}% of ${formatMillions(pool.targetUpb)} target`}
        status={progress > 1 ? "over-target" : "normal"}
      />

      <section className="panel summary-card" aria-labelledby="by-status-heading">
        <h3 id="by-status-heading" className="stl-text-label summary-card__label">
          Loans by status
        </h3>
        <p className="stl-text-body summary-card__links">
          {statuses.map((status, i) => (
            <span key={status}>
              <FilterLink
                label={`${totals.byStatus[status].toLocaleString("en-US")} ${status}`}
                onActivate={() => onAddStatus(status)}
              />
              {i < statuses.length - 1 && <span aria-hidden="true"> ·</span>}
            </span>
          ))}
        </p>
        <p className="stl-text-caption summary-card__muted">Each adds a Status filter.</p>
      </section>

      <section className="panel summary-card" id="pool-issues" aria-labelledby="issues-heading" tabIndex={-1}>
        {totals.issues > 0 ? (
          <h3 id="issues-heading" className="stl-text-body-strong summary-card__title tone-warning">
            <Icon name="alert-triangle" />
            Issues blocking submit ({totals.issues})
          </h3>
        ) : (
          <h3 id="issues-heading" className="stl-text-body-strong summary-card__title tone-positive">
            <Icon name="circle-check" />
            No issues block submit
          </h3>
        )}
        {exceptions > 0 && (
          <div className="summary-card__issue">
            <p className="stl-text-body">Exceptions needing sign-off ({exceptions})</p>
            <FilterLink label="Filter: Status is Exception" onActivate={() => onShow({ status: "Exception" })} />
          </div>
        )}
        {totals.overCap.length > 0 && (
          <div className="summary-card__issue">
            <p className="stl-text-body">
              Limits ({totals.overCap.length}):{" "}
              {totals.overCap
                .map((o) => `${o.lender} at ${formatShare(o.sharePercent)} (cap ${rules.lenderSharePercentCap}%)`)
                .join("; ")}
            </p>
            {totals.overCap.map((o) => (
              <FilterLink
                key={o.lender}
                label={`Filter: Lender is ${o.lender}`}
                onActivate={() => onShow({ lender: o.lender })}
              />
            ))}
          </div>
        )}
        {totals.issues === 0 && (
          <p className="stl-text-body summary-card__muted">Every exception is signed off and every lender is within the cap.</p>
        )}
      </section>
    </aside>
  );
}
