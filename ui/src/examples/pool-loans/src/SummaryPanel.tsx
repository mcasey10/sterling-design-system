import { Icon, Link, SummaryMetric } from "sterling-ui";
import { CAPPED_LENDER, STATUSES, formatMillions, formatShare, plural, pool, rules, shortLender, type PoolSummary, type Status } from "./data";

interface Props {
  summary: PoolSummary;
  loading: boolean;
  onFilterStatus: (status: Status) => void;
  onFilterLender: (lender: string) => void;
}

/** A link that applies a filter: Sterling's Link is an anchor, so the click is handled here. */
function FilterLink({ label, onApply }: { label: string; onApply: () => void }) {
  return (
    <Link
      label={label}
      size="md"
      href="#pool-loans-grid"
      onClick={(event) => {
        event.preventDefault();
        onApply();
      }}
    />
  );
}

export function SummaryPanel({ summary, loading, onFilterStatus, onFilterLender }: Props) {
  const progress = summary.upb / pool.targetUpb;
  const exceptions = summary.openExceptions.length;
  const shownStatuses = STATUSES.filter((status) => summary.byStatus[status] > 0);

  return (
    <aside className="pl-summary" aria-labelledby="pl-summary-title">
      <h2 id="pl-summary-title" className="stl-text-heading pl-summary__title">
        Pool summary
      </h2>

      <SummaryMetric
        className="pl-card pl-metric"
        label="Pool UPB"
        value={formatMillions(summary.upb)}
        progress={progress}
        status={progress > 1 ? "over-target" : "normal"}
        detail={`${Math.round(progress * 100)}% of ${formatMillions(pool.targetUpb)} target`}
        loading={loading}
      />

      <section className="pl-card" aria-labelledby="pl-by-status">
        <h3 id="pl-by-status" className="stl-text-label pl-card__label">
          Loans by status
        </h3>
        <p className="stl-text-body pl-inline-list">
          {/* Each separator follows its link, in the same unbreakable item, so a wrapped line never starts with one. */}
          {shownStatuses.map((status, index) => (
            <span key={status} className="pl-inline-list__item">
              <FilterLink label={`${summary.byStatus[status]} ${status}`} onApply={() => onFilterStatus(status)} />
              {index < shownStatuses.length - 1 && (
                <span aria-hidden="true" className="pl-inline-list__separator">
                  ·
                </span>
              )}
            </span>
          ))}
        </p>
        <p className="stl-text-caption pl-muted">Each adds a Status filter.</p>
      </section>

      <section id="pl-issues" tabIndex={-1} className="pl-card pl-issues" aria-labelledby="pl-issues-title">
        {summary.issueCount > 0 ? (
          <>
            <h3 id="pl-issues-title" className="stl-text-body-strong pl-issues__title pl-issues__title--warning">
              <Icon name="alert-triangle" />
              Issues blocking submit ({summary.issueCount})
            </h3>
            {exceptions > 0 && (
              <div className="pl-issue">
                <p className="stl-text-body">Exceptions needing sign-off ({exceptions})</p>
                <FilterLink label="Filter: Status is Exception" onApply={() => onFilterStatus("Exception")} />
              </div>
            )}
            {summary.overCap && (
              <div className="pl-issue">
                <p className="stl-text-body">
                  Limits (1): {shortLender(CAPPED_LENDER)} at {formatShare(summary.cappedShare)} (cap {rules.lenderSharePercentCap}%)
                </p>
                <FilterLink label={`Filter: Lender is ${shortLender(CAPPED_LENDER)}`} onApply={() => onFilterLender(CAPPED_LENDER)} />
              </div>
            )}
          </>
        ) : (
          <>
            <h3 id="pl-issues-title" className="stl-text-body-strong pl-issues__title pl-issues__title--positive">
              <Icon name="circle-check" />
              No issues block submit
            </h3>
            <p className="stl-text-body pl-muted">
              Every exception is signed off and no lender is over {rules.lenderSharePercentCap}% of the pool (
              {plural(summary.loanCount, "loan")}).
            </p>
          </>
        )}
      </section>
    </aside>
  );
}
