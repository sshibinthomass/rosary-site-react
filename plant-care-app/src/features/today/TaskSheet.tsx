import type { CareTask, TaskOutcome, UserPlant } from '../../domain/models';

interface TaskSheetProps {
  task: CareTask;
  plant?: UserPlant;
  busy?: boolean;
  onOutcome(outcome: TaskOutcome): void;
}

export default function TaskSheet({ task, plant, busy, onOutcome }: TaskSheetProps) {
  return (
    <article className={`care-task priority-${task.priority}`}>
      <header>
        <div>
          <p className="eyebrow">{task.action === 'water-check' ? 'Moisture check' : 'Follow-up observation'}</p>
          <h2>{plant?.nickname ?? 'Your plant'}</h2>
        </div>
        <span className="source-label">{task.source === 'weather-adjusted' ? 'Weather adjusted' : 'Season based'}</span>
      </header>
      <p className="task-prompt">{task.prompt}</p>
      <p className="task-explanation">{task.explanation}</p>
      <div className="outcome-grid" aria-label="Record what you observed">
        <button disabled={busy} onClick={() => onOutcome('not-needed')}>Soil is still moist</button>
        <button disabled={busy} onClick={() => onOutcome('completed')}>Watered after checking</button>
        <button disabled={busy} onClick={() => onOutcome('postponed')}>Remind me tomorrow</button>
        <button disabled={busy} onClick={() => onOutcome('problem-noted')}>I noticed a problem</button>
      </div>
    </article>
  );
}
