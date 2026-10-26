import assert from 'node:assert/strict';
import test from 'node:test';
import { ANATOMY } from '../src/data/muscle-anatomy';
import { detailedMuscleWorkload, MUSCLES, sessionTouchesMuscle } from '../src/data/muscle-detail';
import { muscleIntensity } from '../src/data/muscle-intensity';
import type { WorkoutSession, WorkoutSet } from '../src/data/types';

const set = (done = true, type: WorkoutSet['type'] = 'normal'): WorkoutSet => ({ id: crypto.randomUUID(), weight: '60', reps: '10', seconds: '', distance: '', type, done, rpe: '' });
const session: WorkoutSession = { id: 'session', title: 'Push', startedAt: Date.now(), endedAt: Date.now() + 300000, pausedAt: null, pausedMs: 0, notes: '', restEndsAt: null, feeling: null, exercises: [{ id: 'exercise', exerciseId: 'bench-press', name: 'Bench press', muscle: 'chest', secondaryMuscles: ['shoulders', 'triceps'], equipment: 'Barbell', kind: 'weighted', sets: [set(), set(), set(), set(false), set(true, 'warmup')], restSeconds: 90, notes: '', supersetId: null }] };

test('BHIM anatomy covers every detailed muscle in both views', () => {
  assert.equal(MUSCLES.length, 25);
  const ids = new Set(MUSCLES.map(muscle => muscle.id));
  for (const side of ['front', 'back'] as const) {
    assert.ok(ANATOMY[side].pieces.length > 40);
    for (const piece of ANATOMY[side].pieces) assert.ok(ids.has(piece.id), piece.id);
  }
});

test('BHIM fixed intensity bins separate direct from assisting sets', () => {
  assert.deepEqual([0, 1, 3, 4, 7, 8, 11, 12].map(directSets => muscleIntensity({ directSets, assistingSets: 0 })), [0, 2, 2, 3, 3, 4, 4, 5]);
  assert.equal(muscleIntensity({ directSets: 0, assistingSets: 20 }), 1);
});

test('completed work projects onto detailed anatomy without counting warmups', () => {
  const work = detailedMuscleWorkload([session]);
  assert.equal(work.find(muscle => muscle.id === 'chest')?.directSets, 3);
  assert.equal(work.find(muscle => muscle.id === 'front_delts')?.assistingSets, 3);
  assert.equal(work.find(muscle => muscle.id === 'triceps')?.sessions, 1);
  assert.equal(work.find(muscle => muscle.id === 'upper_chest')?.directSets, 0);
  assert.equal(sessionTouchesMuscle(session, 'chest'), true);
  assert.equal(sessionTouchesMuscle(session, 'lats'), false);
});
