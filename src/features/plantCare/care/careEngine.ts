import type { CareEngineInput, CareTaskDraft, OutcomeInput } from '../domain/models';
import { getCheckInterval } from './profiles';

const dayMs = 86_400_000;

function atDayOffset(now: Date, days: number) {
  return new Date(now.getTime() + days * dayMs).toISOString();
}

function weatherFactor(input: CareEngineInput) {
  const { weather, location } = input;
  if (!weather || weather.availability !== 'live') return 1;

  let factor = 1;
  if ((weather.humidityPercent ?? 0) >= 80) factor += 0.15;
  else if ((weather.humidityPercent ?? 0) >= 65) factor += 0.08;
  else if ((weather.humidityPercent ?? 100) < 40) factor -= 0.1;

  if (location.kind === 'balcony' && location.exposure === 'exposed' && (weather.precipitationMm ?? 0) >= 10) {
    factor += 0.2;
  }
  if ((weather.temperatureMaxC ?? 0) >= 36) factor -= 0.2;
  return Math.max(0.7, Math.min(1.3, factor));
}

function promptFor(category: CareEngineInput['plant']['category']) {
  if (category === 'cactus' || category === 'succulent') {
    return 'Check that the mix is dry well below the surface and the pot feels light. Water only if both checks pass.';
  }
  return "Check the top 3 cm of soil and the plant's leaves. Water only if the soil is dry for this plant.";
}

function explanationFor(input: CareEngineInput, adjusted: boolean) {
  const rainRelevant = input.location.kind === 'balcony' && input.location.exposure === 'exposed' && (input.weather?.precipitationMm ?? 0) >= 10;
  if (rainRelevant) return 'Recent rain and monsoon humidity can keep an exposed balcony pot wet for longer.';
  if (adjusted) return 'Humidity and temperature adjusted this inspection window for your location.';
  return `This conservative check window follows the ${input.season} rhythm for this plant type.`;
}

export function generateCareTasks(input: CareEngineInput): CareTaskDraft[] {
  const interval = getCheckInterval(input.plant.category, input.season);
  const factor = weatherFactor(input);
  const earliestDays = Math.max(interval.minimumDays, Math.round(interval.minimumDays * factor));
  const latestDays = Math.min(
    Math.ceil(interval.maximumDays * 1.3),
    Math.max(earliestDays, Math.round(interval.maximumDays * factor)),
  );
  const adjusted = Boolean(input.weather?.availability === 'live');

  return [{
    action: 'water-check',
    earliestAt: atDayOffset(input.now, earliestDays),
    latestAt: atDayOffset(input.now, latestDays),
    prompt: promptFor(input.plant.category),
    explanation: explanationFor(input, adjusted),
    source: adjusted ? 'weather-adjusted' : 'season-based',
    priority: 'normal',
  }];
}

export function rescheduleAfterOutcome(input: OutcomeInput): CareTaskDraft[] {
  if (input.outcome === 'problem-noted') {
    return [{
      action: 'observe',
      earliestAt: atDayOffset(input.now, 1),
      latestAt: atDayOffset(input.now, 2),
      prompt: 'Observe the affected leaves, soil, and stem again. Note any visible change before choosing an action.',
      explanation: 'A short follow-up helps you compare observations without guessing at a diagnosis.',
      source: input.weather?.availability === 'live' ? 'weather-adjusted' : 'season-based',
      priority: 'high',
    }];
  }

  const delay = input.outcome === 'not-needed' ? 2 : input.outcome === 'postponed' ? 1 : 0;
  return generateCareTasks({ ...input, now: new Date(input.now.getTime() + delay * dayMs) });
}
