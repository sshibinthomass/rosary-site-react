import { useState } from 'react';

import type { CareTask, TaskOutcome } from '../domain/models';
import { usePlantCare } from '../PlantCareProvider';
import TaskSheet from '../components/TaskSheet';

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(iso));
}

export default function TodayPage() {
  const { tasks, plants, completeTask, loading, error } = usePlantCare();
  const [busyId, setBusyId] = useState<string>();
  const [nextTasks, setNextTasks] = useState<CareTask[]>([]);
  const [actionError, setActionError] = useState<string>();
  const now = Date.now();
  const openTasks = tasks.filter((task) => task.status === 'open');
  const dueTasks = openTasks.filter((task) => new Date(task.earliestAt).getTime() <= now);
  const upcomingTasks = openTasks.filter((task) => new Date(task.earliestAt).getTime() > now);

  async function recordOutcome(task: CareTask, outcome: TaskOutcome) {
    try {
      setBusyId(task.id);
      setActionError(undefined);
      setNextTasks(await completeTask(task.id, outcome));
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'This check could not be saved.');
    } finally {
      setBusyId(undefined);
    }
  }

  return (
    <section className="care-page-stack care-today-page">
      <header className="care-page-heading care-split-heading">
        <div><p className="care-eyebrow">Care desk</p><h1>Today</h1></div>
        <div className="care-checks-count"><strong>{dueTasks.length}</strong><span>checks due</span></div>
      </header>
      <p className="care-page-intro">Check the plant and soil first. A schedule is a prompt to observe, never an instruction to water blindly.</p>
      {(error || actionError) && <p className="care-notice error" role="alert">{error || actionError}</p>}
      {nextTasks.length > 0 && <p className="care-notice success" role="status">Saved. Check scheduled for {formatDate(nextTasks[0].earliestAt)}.</p>}
      {loading ? <p className="care-loading-line">Opening your local garden…</p> : dueTasks.length === 0 ? (
        <article className="care-empty-card"><p className="care-eyebrow">Nothing due</p><h2>Your plants have a quiet day.</h2><p>Add a plant or return when the next observation window opens.</p></article>
      ) : <div className="care-task-list">{dueTasks.map((task) => <TaskSheet key={task.id} task={task} plant={plants.find((plant) => plant.id === task.plantId)} busy={busyId === task.id} onOutcome={(outcome) => void recordOutcome(task, outcome)} />)}</div>}
      {upcomingTasks.length > 0 && (
        <section className="care-upcoming" aria-labelledby="care-upcoming-heading">
          <p className="care-eyebrow" id="care-upcoming-heading">Coming up</p>
          {upcomingTasks.slice(0, 4).map((task) => <p key={task.id}><strong>{plants.find((plant) => plant.id === task.plantId)?.nickname ?? 'Your plant'}</strong><span>Next check {formatDate(task.earliestAt)}</span></p>)}
        </section>
      )}
    </section>
  );
}
