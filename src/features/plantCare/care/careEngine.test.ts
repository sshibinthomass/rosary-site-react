import { describe, expect, it } from 'vitest';

import { generateCareTasks, rescheduleAfterOutcome } from './careEngine';
import type { CareEngineInput, CareTaskDraft } from '../domain/models';

const baseInput: CareEngineInput = {
  now: new Date('2026-07-14T08:00:00.000Z'),
  plant: {
    id: 'plant-1',
    speciesId: 'rph-1',
    nickname: 'Aloe',
    category: 'succulent',
    locationId: 'balcony-1',
    provenance: { kind: 'catalogue' },
    createdAt: '2026-07-01T08:00:00.000Z',
    updatedAt: '2026-07-01T08:00:00.000Z',
  },
  location: {
    id: 'balcony-1',
    name: 'East balcony',
    kind: 'balcony',
    exposure: 'covered',
    climateZone: 'humid-coastal',
    city: 'Kochi',
    createdAt: '2026-07-01T08:00:00.000Z',
    updatedAt: '2026-07-01T08:00:00.000Z',
  },
  season: 'monsoon',
};

function daysBetween(task: CareTaskDraft) {
  return Math.round((new Date(task.latestAt).getTime() - baseInput.now.getTime()) / 86_400_000);
}

describe('generateCareTasks', () => {
  it('asks for observations before watering', () => {
    const task = generateCareTasks(baseInput)[0];
    expect(task.prompt).toMatch(/check/i);
    expect(task.prompt).toMatch(/water only if/i);
    expect(task.prompt).not.toMatch(/^water\b/i);
  });

  it('checks succulents later than houseplants', () => {
    const succulent = generateCareTasks(baseInput)[0];
    const houseplant = generateCareTasks({
      ...baseInput,
      plant: { ...baseInput.plant, category: 'houseplant' },
    })[0];
    expect(new Date(succulent.latestAt).getTime()).toBeGreaterThan(new Date(houseplant.latestAt).getTime());
  });

  it('uses rain only for exposed balconies', () => {
    const exposed = generateCareTasks({
      ...baseInput,
      location: { ...baseInput.location, exposure: 'exposed' },
      weather: { availability: 'live', precipitationMm: 24, humidityPercent: 89, fetchedAt: baseInput.now.toISOString() },
    })[0];
    const covered = generateCareTasks({
      ...baseInput,
      weather: { availability: 'live', precipitationMm: 24, humidityPercent: 89, fetchedAt: baseInput.now.toISOString() },
    })[0];
    expect(exposed.explanation).toMatch(/rain|monsoon/i);
    expect(daysBetween(exposed)).toBeGreaterThanOrEqual(daysBetween(covered));
  });

  it('labels missing weather as season based', () => {
    expect(generateCareTasks(baseInput)[0].source).toBe('season-based');
  });
});

describe('rescheduleAfterOutcome', () => {
  const task = generateCareTasks(baseInput)[0];

  it('moves a not-needed check later without claiming it was watered', () => {
    const next = rescheduleAfterOutcome({ ...baseInput, task, outcome: 'not-needed' })[0];
    expect(new Date(next.earliestAt).getTime()).toBeGreaterThan(new Date(task.earliestAt).getTime());
    expect(next.prompt).toMatch(/check/i);
  });

  it('creates a high-priority observation after a problem is noted', () => {
    const next = rescheduleAfterOutcome({ ...baseInput, task, outcome: 'problem-noted' })[0];
    expect(next.priority).toBe('high');
    expect(next.prompt).toMatch(/observe|check/i);
    expect(next.prompt).not.toMatch(/disease|diagnos/i);
  });
});
