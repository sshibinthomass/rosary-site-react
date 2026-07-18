import type { CareTask, TaskOutcome, UserPlant } from '../domain/models';

interface TaskSheetProps {
  task: CareTask;
  plant?: UserPlant;
  busy?: boolean;
  onOutcome(outcome: TaskOutcome): void;
}

function dayLabel(iso: string) {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(iso));
}

export default function TaskSheet({ task, plant, busy, onOutcome }: TaskSheetProps) {
  return (
    <article className={`care-task priority-${task.priority}`}>
      <header>
        <div>
          <p className="care-eyebrow">{task.action === 'water-check' ? 'Moisture check' : 'Follow-up observation'}</p>
          <h2>{plant?.nickname ?? 'Your plant'}</h2>
        </div>
        <span className="care-source-label">{task.source === 'weather-adjusted' ? 'Weather adjusted' : 'Season based'}</span>
      </header>
      <div className="care-window" aria-label={`Observation window ${dayLabel(task.earliestAt)} to ${dayLabel(task.latestAt)}`}>
        <span>{dayLabel(task.earliestAt)}</span>
        <i aria-hidden="true" />
        <strong>Observe, then act</strong>
        <i aria-hidden="true" />
        <span>{dayLabel(task.latestAt)}</span>
      </div>
      <p className="care-task-prompt">{task.prompt}</p>
      <p className="care-task-explanation">{task.explanation}</p>
      <div className="care-outcome-grid" aria-label="Record what you observed">
        <button disabled={busy} onClick={() => onOutcome('not-needed')}>Soil is still moist</button>
        <button disabled={busy} onClick={() => onOutcome('completed')}>Watered after checking</button>
        <button disabled={busy} onClick={() => onOutcome('postponed')}>Remind me tomorrow</button>
        <button disabled={busy} onClick={() => onOutcome('problem-noted')}>I noticed a problem</button>
      </div>
    </article>
  );
}
