import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import {
  getAllCheckoutAttempts,
  updateCheckoutAttemptResolution,
} from '../services/checkoutAttemptService';
import {
  filterCheckoutAttempts,
  CHECKOUT_STAGES,
  RESOLUTION_STATUSES,
} from '../utils/checkoutAttemptModel';

const RESULTS = Object.freeze(['in_progress', 'failed', 'successful']);
const focusClass = 'focus:outline-none focus:ring-2 focus:ring-[var(--color-forest)] focus:ring-offset-2 focus:ring-offset-[var(--bg-primary)]';

function formatLabel(value) {
  return String(value || 'unknown').replaceAll('_', ' ');
}

function formatDate(value) {
  const date = value?.toDate instanceof Function ? value.toDate() : new Date(value);
  if (!value || Number.isNaN(date.getTime())) return 'Not recorded';
  return date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatMoney(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function primaryContact(attempt) {
  return attempt.customer?.phone
    || attempt.customer?.email
    || attempt.delivery?.phone
    || attempt.delivery?.whatsapp
    || 'No contact recorded';
}

function StatusPill({ children, tone = 'neutral' }) {
  const tones = {
    failed: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
    successful: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300',
    investigating: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
    resolved: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
    neutral: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]',
  };

  return <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold capitalize ${tones[tone] || tones.neutral}`}>{children}</span>;
}

function CheckoutTimeline({ events = [] }) {
  const chronologicalEvents = [...events].sort(
    (left, right) => new Date(left.occurredAt) - new Date(right.occurredAt),
  );

  if (!chronologicalEvents.length) {
    return <p className="text-sm text-[var(--text-secondary)]">No checkout events recorded.</p>;
  }

  return (
    <ol className="relative ml-3 border-l border-[var(--color-forest)]/30">
      {chronologicalEvents.map((event, index) => (
        <li key={event.eventId || `${event.stage}-${event.occurredAt}-${index}`} className="relative pb-5 pl-7 last:pb-0">
          <span className={`absolute -left-3 top-0 flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold ${
            event.outcome === 'failed'
              ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950'
              : 'border-[var(--color-forest)] bg-[var(--bg-secondary)] text-[var(--color-forest)]'
          }`}>
            {index + 1}
          </span>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold capitalize text-[var(--text-primary)]">{formatLabel(event.stage)}</p>
            <time className="text-xs text-[var(--text-secondary)]">{formatDate(event.occurredAt)}</time>
          </div>
          <p className="mt-0.5 text-xs capitalize text-[var(--text-secondary)]">{formatLabel(event.outcome || 'success')}</p>
          {event.error && (
            <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
              <p className="font-semibold">{formatLabel(event.error.category)} · {event.error.code || 'unknown'}</p>
              <p className="mt-0.5">{event.error.message || 'Checkout could not be completed.'}</p>
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}

function AttemptDetails({ attempt, note, onNoteChange, onResolve, saving }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.15fr)_minmax(15rem,0.8fr)]">
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Cart snapshot</h3>
        {attempt.items?.length ? (
          <ul className="mt-3 divide-y divide-[var(--border-color)] text-sm">
            {attempt.items.map((item, index) => (
              <li key={`${item.productId || item.name}-${index}`} className="flex justify-between gap-3 py-2 first:pt-0">
                <span className="min-w-0 text-[var(--text-primary)]">
                  <span className="block truncate font-medium">{item.name || item.productId || 'Unnamed item'}</span>
                  <span className="text-xs text-[var(--text-secondary)]">Qty {item.quantity || 0}</span>
                </span>
                <span className="shrink-0 font-mono text-xs text-[var(--text-primary)]">{formatMoney(item.price)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-[var(--text-secondary)]">No cart items were recorded.</p>
        )}
        {attempt.linkedOrderDocumentId && (
          <NavLink
            to={`/order/${encodeURIComponent(attempt.linkedOrderDocumentId)}`}
            className={`mt-4 inline-flex text-sm font-semibold text-[var(--color-forest)] hover:underline ${focusClass}`}
          >
            Open linked order
          </NavLink>
        )}
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Timeline</h3>
        <div className="mt-3">
          <CheckoutTimeline events={attempt.events} />
        </div>
      </section>

      <section>
        <label htmlFor={`notes-${attempt.id}`} className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
          Internal notes
        </label>
        <textarea
          id={`notes-${attempt.id}`}
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
          disabled={saving}
          maxLength={2000}
          rows={5}
          className={`input mt-3 resize-y text-sm ${focusClass}`}
          placeholder="Add context for the next support follow-up"
        />
        <div className="mt-3 flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
          <button
            type="button"
            disabled={saving}
            onClick={() => onResolve('investigating')}
            className={`btn btn-secondary flex-1 text-xs disabled:cursor-not-allowed disabled:opacity-50 ${focusClass}`}
          >
            Mark investigating
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => onResolve('resolved')}
            className={`btn flex-1 bg-[var(--color-forest)] text-xs text-white disabled:cursor-not-allowed disabled:opacity-50 ${focusClass}`}
          >
            {saving ? 'Saving…' : 'Mark resolved'}
          </button>
        </div>
      </section>
    </div>
  );
}

function AttemptBadges({ attempt }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <StatusPill tone={attempt.result}>{formatLabel(attempt.result)}</StatusPill>
      <StatusPill tone={attempt.resolutionStatus}>{formatLabel(attempt.resolutionStatus)}</StatusPill>
    </div>
  );
}

export default function AdminCheckoutTrackingPage() {
  const location = useLocation();
  const { error, success } = useToast();
  const initialOrderId = new URLSearchParams(location.search).get('orderId') || '';
  const [attempts, setAttempts] = useState([]);
  const [filters, setFilters] = useState({
    query: initialOrderId,
    result: '',
    stage: '',
    resolutionStatus: '',
    from: '',
    to: '',
    includeResolved: false,
  });
  const [notes, setNotes] = useState({});
  const [expandedAttemptId, setExpandedAttemptId] = useState(null);
  const [savingAttemptId, setSavingAttemptId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getAllCheckoutAttempts()
      .then((records) => {
        if (!active) return;
        setAttempts(records);
        setNotes(Object.fromEntries(records.map((attempt) => [attempt.id, attempt.adminNotes || ''])));
      })
      .catch(() => {
        if (active) error('Failed to load checkout attempts');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [error]);

  const summary = useMemo(() => ({
    failures: attempts.filter((attempt) => attempt.result === 'failed').length,
    openInvestigations: attempts.filter((attempt) => attempt.resolutionStatus === 'open' || attempt.resolutionStatus === 'investigating').length,
    resolved: attempts.filter((attempt) => attempt.resolutionStatus === 'resolved').length,
    successful: attempts.filter((attempt) => attempt.result === 'successful').length,
  }), [attempts]);

  const visibleAttempts = useMemo(() => filterCheckoutAttempts(attempts, {
    ...filters,
    includeResolved: filters.includeResolved || filters.resolutionStatus === 'resolved',
  }), [attempts, filters]);

  const setFilter = (name, value) => {
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const saveResolution = async (attempt, resolutionStatus) => {
    setSavingAttemptId(attempt.id);
    try {
      const updated = await updateCheckoutAttemptResolution(attempt.id, {
        resolutionStatus,
        adminNotes: notes[attempt.id] || '',
      });
      setAttempts((current) => current.map((record) => (
        record.id === attempt.id ? { ...record, ...updated } : record
      )));
      setNotes((current) => ({ ...current, [attempt.id]: updated.adminNotes }));
      success(resolutionStatus === 'resolved' ? 'Checkout attempt marked resolved' : 'Checkout attempt marked investigating');
    } catch {
      error('Failed to update checkout attempt');
    } finally {
      setSavingAttemptId(null);
    }
  };

  const toggleAttempt = (id) => {
    setExpandedAttemptId((current) => (current === id ? null : id));
  };

  return (
    <div className="animate-fade-in pb-20">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">Admin support</p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--color-forest)]">Checkout Tracking</h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">Find a customer attempt and follow every recorded checkout step in order.</p>
      </header>

      <section aria-label="Checkout attempt summary" className="mb-4 grid grid-cols-2 overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] sm:grid-cols-4">
        {[
          ['Failures', summary.failures],
          ['Open investigations', summary.openInvestigations],
          ['Resolved', summary.resolved],
          ['Successful', summary.successful],
        ].map(([label, value]) => (
          <div key={label} className="border-b border-r border-[var(--border-color)] p-3 last:border-r-0 sm:border-b-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">{label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-[var(--text-primary)]">{value}</p>
          </div>
        ))}
      </section>

      <section aria-label="Checkout attempt filters" className="mb-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <label className="sm:col-span-2 lg:col-span-2 text-xs font-medium text-[var(--text-secondary)]">
            Search customer, contact, order or support code
            <input
              type="search"
              value={filters.query}
              onChange={(event) => setFilter('query', event.target.value)}
              className={`input mt-1 text-sm ${focusClass}`}
              placeholder="Search checkout attempts"
            />
          </label>
          <label className="text-xs font-medium text-[var(--text-secondary)]">
            Result
            <select value={filters.result} onChange={(event) => setFilter('result', event.target.value)} className={`input mt-1 text-sm capitalize ${focusClass}`}>
              <option value="">All results</option>
              {RESULTS.map((result) => <option key={result} value={result}>{formatLabel(result)}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-[var(--text-secondary)]">
            Last stage
            <select value={filters.stage} onChange={(event) => setFilter('stage', event.target.value)} className={`input mt-1 text-sm capitalize ${focusClass}`}>
              <option value="">All stages</option>
              {CHECKOUT_STAGES.map((stage) => <option key={stage} value={stage}>{formatLabel(stage)}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-[var(--text-secondary)]">
            Resolution status
            <select value={filters.resolutionStatus} onChange={(event) => setFilter('resolutionStatus', event.target.value)} className={`input mt-1 text-sm capitalize ${focusClass}`}>
              <option value="">Open and investigating</option>
              {RESOLUTION_STATUSES.map((status) => <option key={status} value={status}>{formatLabel(status)}</option>)}
            </select>
          </label>
          <label className="flex items-end gap-2 pb-2 text-xs font-medium text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={filters.includeResolved}
              onChange={(event) => setFilter('includeResolved', event.target.checked)}
              className={`h-4 w-4 rounded border-[var(--border-color)] text-[var(--color-forest)] ${focusClass}`}
            />
            Include resolved
          </label>
        </div>
        <div className="mt-3 grid gap-3 border-t border-[var(--border-color)] pt-3 sm:grid-cols-2 lg:max-w-xl">
          <label className="text-xs font-medium text-[var(--text-secondary)]">
            Start date
            <input type="date" value={filters.from} onChange={(event) => setFilter('from', event.target.value)} className={`input mt-1 text-sm ${focusClass}`} />
          </label>
          <label className="text-xs font-medium text-[var(--text-secondary)]">
            End date
            <input type="date" value={filters.to} onChange={(event) => setFilter('to', event.target.value)} className={`input mt-1 text-sm ${focusClass}`} />
          </label>
        </div>
      </section>

      {loading ? (
        <div className="flex min-h-48 items-center justify-center" role="status">
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--color-forest)] border-t-transparent" />
          <span className="sr-only">Loading checkout attempts</span>
        </div>
      ) : visibleAttempts.length === 0 ? (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-8 text-center">
          <p className="font-medium text-[var(--text-primary)]">No checkout attempts match these filters.</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Change a filter or include resolved records.</p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] md:block">
            <table className="hidden md:table w-full table-fixed text-left text-sm">
              <thead className="bg-[var(--bg-tertiary)] text-[11px] uppercase tracking-wide text-[var(--text-secondary)]">
                <tr>
                  <th className="w-[21%] px-3 py-3 font-semibold">Customer</th>
                  <th className="w-[13%] px-3 py-3 font-semibold">Order cost</th>
                  <th className="w-[16%] px-3 py-3 font-semibold">Support code</th>
                  <th className="w-[14%] px-3 py-3 font-semibold">Last stage</th>
                  <th className="w-[20%] px-3 py-3 font-semibold">Attempt time</th>
                  <th className="w-[12%] px-3 py-3 font-semibold">Status</th>
                  <th className="w-[4%] px-2 py-3"><span className="sr-only">Details</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {visibleAttempts.map((attempt) => (
                  <FragmentRow
                    key={attempt.id}
                    attempt={attempt}
                    expanded={expandedAttemptId === attempt.id}
                    note={notes[attempt.id] || ''}
                    onToggle={() => toggleAttempt(attempt.id)}
                    onNoteChange={(value) => setNotes((current) => ({ ...current, [attempt.id]: value }))}
                    onResolve={(status) => saveResolution(attempt, status)}
                    saving={savingAttemptId === attempt.id}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {visibleAttempts.map((attempt) => {
              const expanded = expandedAttemptId === attempt.id;
              return (
                <article key={attempt.id} className="overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]">
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => toggleAttempt(attempt.id)}
                    className={`w-full p-4 text-left ${focusClass}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate font-semibold text-[var(--text-primary)]">{attempt.customer?.name || attempt.delivery?.name || 'Unknown customer'}</h2>
                        <p className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">{primaryContact(attempt)}</p>
                      </div>
                      <span aria-hidden="true" className="text-lg text-[var(--color-forest)]">{expanded ? '−' : '+'}</span>
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                      <div><dt className="text-[var(--text-secondary)]">Order cost</dt><dd className="mt-0.5 font-semibold text-[var(--text-primary)]">{formatMoney(attempt.totalAmount)}</dd></div>
                      <div><dt className="text-[var(--text-secondary)]">Support code</dt><dd className="mt-0.5 font-mono text-[var(--text-primary)]">{attempt.supportCode || 'Not recorded'}</dd></div>
                      <div><dt className="text-[var(--text-secondary)]">Order</dt><dd className="mt-0.5 font-mono text-[var(--text-primary)]">{attempt.orderId || 'Not linked'}</dd></div>
                      <div><dt className="text-[var(--text-secondary)]">Last stage</dt><dd className="mt-0.5 capitalize text-[var(--text-primary)]">{formatLabel(attempt.currentStage)}</dd></div>
                      <div className="col-span-2"><dt className="text-[var(--text-secondary)]">Attempt time</dt><dd className="mt-0.5 text-[var(--text-primary)]">{formatDate(attempt.createdAt)}</dd></div>
                    </dl>
                    <div className="mt-3"><AttemptBadges attempt={attempt} /></div>
                  </button>
                  {expanded && (
                    <div className="border-t border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
                      <AttemptDetails
                        attempt={attempt}
                        note={notes[attempt.id] || ''}
                        onNoteChange={(value) => setNotes((current) => ({ ...current, [attempt.id]: value }))}
                        onResolve={(status) => saveResolution(attempt, status)}
                        saving={savingAttemptId === attempt.id}
                      />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function FragmentRow({ attempt, expanded, note, onToggle, onNoteChange, onResolve, saving }) {
  return (
    <>
      <tr className="align-top hover:bg-[var(--bg-tertiary)]/60">
        <td className="px-3 py-3">
          <p className="truncate font-semibold text-[var(--text-primary)]">{attempt.customer?.name || attempt.delivery?.name || 'Unknown customer'}</p>
          <p className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">{primaryContact(attempt)}</p>
          <p className="mt-1 truncate font-mono text-[11px] text-[var(--text-secondary)]">{attempt.orderId || 'No order ID'}</p>
        </td>
        <td className="px-3 py-3 font-medium text-[var(--text-primary)]">{formatMoney(attempt.totalAmount)}</td>
        <td className="px-3 py-3 font-mono text-xs text-[var(--text-primary)]">{attempt.supportCode || 'Not recorded'}</td>
        <td className="px-3 py-3 capitalize text-[var(--text-primary)]">{formatLabel(attempt.currentStage)}</td>
        <td className="px-3 py-3 text-xs text-[var(--text-secondary)]">{formatDate(attempt.createdAt)}</td>
        <td className="px-3 py-3"><AttemptBadges attempt={attempt} /></td>
        <td className="px-2 py-3 text-right">
          <button type="button" aria-expanded={expanded} onClick={onToggle} className={`rounded-md px-2 py-1 text-lg text-[var(--color-forest)] hover:bg-[var(--bg-secondary)] ${focusClass}`}>
            <span aria-hidden="true">{expanded ? '−' : '+'}</span>
            <span className="sr-only">{expanded ? 'Hide' : 'Show'} checkout details</span>
          </button>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan="7" className="border-t border-[var(--border-color)] bg-[var(--bg-primary)] p-5">
            <AttemptDetails attempt={attempt} note={note} onNoteChange={onNoteChange} onResolve={onResolve} saving={saving} />
          </td>
        </tr>
      )}
    </>
  );
}
