import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  AppSettings,
  Day,
  DayWithExercises,
  Exercise,
  ExerciseType,
  LoggedExercise,
  MuscleGroup,
  Program,
  ProgramExercise,
  ProgramWorkout,
  SetDraft,
  SetEntry,
} from './types';

const MS_PER_DAY = 86_400_000;

export function epochDayFromDate(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MS_PER_DAY);
}

export function todayEpochDay(): number {
  return epochDayFromDate(new Date());
}

export function dateStringFromEpochDay(epochDay: number): string {
  const d = new Date(epochDay * MS_PER_DAY);
  const month = `${d.getUTCMonth() + 1}`.padStart(2, '0');
  const day = `${d.getUTCDate()}`.padStart(2, '0');
  return `${d.getUTCFullYear()}-${month}-${day}`;
}

export function epochDayFromDateString(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}

export function formatEpochDay(epochDay: number): string {
  const d = new Date(epochDay * MS_PER_DAY);
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

interface DayRow {
  id: number;
  epoch_day: number;
  date: string;
  comment: string | null;
  duration_min: number | null;
  started_at: number | null;
}

interface ExerciseRow {
  id: number;
  name: string;
  muscle_group_id: number | null;
  muscle_group_name: string | null;
  muscle_group_color: string | null;
  equipment: string | null;
  type: string;
  description: string | null;
  is_favourite: number;
  is_default: number;
}

interface SetRow {
  id: number;
  day_id: number;
  exercise_id: number;
  position: number;
  weight: number | null;
  reps: number | null;
  difficulty: number | null;
  time_seconds: number | null;
  distance: number | null;
  comment: string | null;
}

const mapDay = (r: DayRow): Day => ({
  id: r.id,
  epochDay: r.epoch_day,
  date: r.date,
  comment: r.comment,
  durationMin: r.duration_min,
  startedAt: r.started_at,
});

const mapExercise = (r: ExerciseRow): Exercise => ({
  id: r.id,
  name: r.name,
  muscleGroupId: r.muscle_group_id,
  muscleGroupName: r.muscle_group_name,
  muscleGroupColor: r.muscle_group_color,
  equipment: r.equipment,
  type: (r.type as ExerciseType) ?? 'reps',
  description: r.description,
  isFavourite: r.is_favourite === 1,
  isDefault: r.is_default === 1,
});

const mapSet = (r: SetRow): SetEntry => ({
  id: r.id,
  dayId: r.day_id,
  exerciseId: r.exercise_id,
  position: r.position,
  weight: r.weight,
  reps: r.reps,
  difficulty: r.difficulty,
  timeSeconds: r.time_seconds,
  distance: r.distance,
  comment: r.comment,
});

const EXERCISE_SELECT = `
  SELECT e.id, e.name, e.muscle_group_id, e.equipment, e.type, e.description,
         e.is_favourite, e.is_default,
         g.name AS muscle_group_name, g.color AS muscle_group_color
  FROM exercise e
  LEFT JOIN muscle_group g ON g.id = e.muscle_group_id
`;

export async function listMuscleGroups(db: SQLiteDatabase): Promise<MuscleGroup[]> {
  const rows = await db.getAllAsync<{ id: number; name: string; color: string | null }>(
    'SELECT id, name, color FROM muscle_group ORDER BY name'
  );
  return rows;
}

export async function listExercises(db: SQLiteDatabase, search = ''): Promise<Exercise[]> {
  const term = `%${search.trim()}%`;
  const rows = await db.getAllAsync<ExerciseRow>(
    `${EXERCISE_SELECT} WHERE e.name LIKE ? ORDER BY e.is_favourite DESC, e.name`,
    term
  );
  return rows.map(mapExercise);
}

export async function getExercise(db: SQLiteDatabase, id: number): Promise<Exercise | null> {
  const rows = await db.getAllAsync<ExerciseRow>(`${EXERCISE_SELECT} WHERE e.id = ?`, id);
  return rows.length ? mapExercise(rows[0]) : null;
}

export async function addExercise(
  db: SQLiteDatabase,
  input: {
    name: string;
    muscleGroupId?: number | null;
    equipment?: string | null;
    type?: ExerciseType;
    description?: string | null;
  }
): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO exercise (name, muscle_group_id, equipment, type, description) VALUES (?, ?, ?, ?, ?)',
    input.name.trim(),
    input.muscleGroupId ?? null,
    input.equipment ?? null,
    input.type ?? 'reps',
    input.description ?? null
  );
  return result.lastInsertRowId;
}

export async function setExerciseFavourite(
  db: SQLiteDatabase,
  id: number,
  favourite: boolean
): Promise<void> {
  await db.runAsync('UPDATE exercise SET is_favourite = ? WHERE id = ?', favourite ? 1 : 0, id);
}

export async function getOrCreateDay(db: SQLiteDatabase, epochDay: number): Promise<Day> {
  const existing = await db.getFirstAsync<DayRow>('SELECT * FROM day WHERE epoch_day = ?', epochDay);
  if (existing) {
    return mapDay(existing);
  }
  await db.runAsync('INSERT INTO day (epoch_day, date) VALUES (?, ?)', epochDay, dateStringFromEpochDay(epochDay));
  const created = await db.getFirstAsync<DayRow>('SELECT * FROM day WHERE epoch_day = ?', epochDay);
  return mapDay(created!);
}

export async function updateDay(
  db: SQLiteDatabase,
  dayId: number,
  patch: { comment?: string | null; durationMin?: number | null }
): Promise<void> {
  await db.runAsync(
    'UPDATE day SET comment = COALESCE(?, comment), duration_min = COALESCE(?, duration_min) WHERE id = ?',
    patch.comment ?? null,
    patch.durationMin ?? null,
    dayId
  );
}

/** Starts or clears the workout timer for a day (epoch milliseconds, or null to stop). */
export async function setDayStartedAt(
  db: SQLiteDatabase,
  dayId: number,
  startedAt: number | null
): Promise<void> {
  await db.runAsync('UPDATE day SET started_at = ? WHERE id = ?', startedAt, dayId);
}

/** Records the finished workout duration in minutes (null clears it). */
export async function setDayDurationMin(
  db: SQLiteDatabase,
  dayId: number,
  durationMin: number | null
): Promise<void> {
  await db.runAsync('UPDATE day SET duration_min = ? WHERE id = ?', durationMin, dayId);
}

export async function getDayWithExercises(
  db: SQLiteDatabase,
  epochDay: number
): Promise<DayWithExercises | null> {
  const dayRow = await db.getFirstAsync<DayRow>('SELECT * FROM day WHERE epoch_day = ?', epochDay);
  if (!dayRow) {
    return null;
  }
  const day = mapDay(dayRow);

  const rows = await db.getAllAsync<SetRow & { ex_name: string; ex_group: string | null; ex_color: string | null; ex_equipment: string | null; ex_type: string; ex_desc: string | null; ex_fav: number; ex_default: number }>(
    `SELECT s.*, e.name AS ex_name, e.equipment AS ex_equipment, e.type AS ex_type,
            e.description AS ex_desc, e.is_favourite AS ex_fav, e.is_default AS ex_default,
            g.name AS ex_group, g.color AS ex_color
     FROM set_entry s
     JOIN exercise e ON e.id = s.exercise_id
     LEFT JOIN muscle_group g ON g.id = e.muscle_group_id
     WHERE s.day_id = ?
     ORDER BY s.position, s.id`,
    day.id
  );

  const byExercise = new Map<number, LoggedExercise>();
  for (const r of rows) {
    let entry = byExercise.get(r.exercise_id);
    if (!entry) {
      entry = {
        exercise: {
          id: r.exercise_id,
          name: r.ex_name,
          muscleGroupId: null,
          muscleGroupName: r.ex_group,
          muscleGroupColor: r.ex_color,
          equipment: r.ex_equipment,
          type: (r.ex_type as ExerciseType) ?? 'reps',
          description: r.ex_desc,
          isFavourite: r.ex_fav === 1,
          isDefault: r.ex_default === 1,
        },
        sets: [],
      };
      byExercise.set(r.exercise_id, entry);
    }
    entry.sets.push(mapSet(r));
  }

  return { ...day, exercises: [...byExercise.values()] };
}

export async function listDaysWithData(db: SQLiteDatabase, limit = 60): Promise<Day[]> {
  const rows = await db.getAllAsync<DayRow>(
    `SELECT d.* FROM day d
     WHERE EXISTS (SELECT 1 FROM set_entry s WHERE s.day_id = d.id)
     ORDER BY d.epoch_day DESC
     LIMIT ?`,
    limit
  );
  return rows.map(mapDay);
}

export async function addSet(
  db: SQLiteDatabase,
  dayId: number,
  exerciseId: number,
  draft: SetDraft = {}
): Promise<number> {
  const posRow = await db.getFirstAsync<{ next: number | null }>(
    'SELECT MAX(position) + 1 AS next FROM set_entry WHERE day_id = ? AND exercise_id = ?',
    dayId,
    exerciseId
  );
  const position = posRow?.next ?? 0;
  const result = await db.runAsync(
    `INSERT INTO set_entry (day_id, exercise_id, position, weight, reps, difficulty, time_seconds, distance, comment)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    dayId,
    exerciseId,
    position,
    draft.weight ?? null,
    draft.reps ?? null,
    draft.difficulty ?? null,
    draft.timeSeconds ?? null,
    draft.distance ?? null,
    draft.comment ?? null
  );
  return result.lastInsertRowId;
}

export async function updateSet(
  db: SQLiteDatabase,
  setId: number,
  draft: SetDraft
): Promise<void> {
  await db.runAsync(
    `UPDATE set_entry
     SET weight = ?, reps = ?, difficulty = ?, time_seconds = ?, distance = ?, comment = ?
     WHERE id = ?`,
    draft.weight ?? null,
    draft.reps ?? null,
    draft.difficulty ?? null,
    draft.timeSeconds ?? null,
    draft.distance ?? null,
    draft.comment ?? null,
    setId
  );
}

export async function deleteSet(db: SQLiteDatabase, setId: number): Promise<void> {
  await db.runAsync('DELETE FROM set_entry WHERE id = ?', setId);
}

/** Copies every exercise/set logged on one day into another day. */
export async function copyDay(db: SQLiteDatabase, fromEpochDay: number, toEpochDay: number): Promise<void> {
  const source = await getDayWithExercises(db, fromEpochDay);
  if (!source) {
    return;
  }
  const target = await getOrCreateDay(db, toEpochDay);
  for (const logged of source.exercises) {
    for (const set of logged.sets) {
      await addSet(db, target.id, logged.exercise.id, {
        weight: set.weight,
        reps: set.reps,
        difficulty: set.difficulty,
        timeSeconds: set.timeSeconds,
        distance: set.distance,
        comment: set.comment,
      });
    }
  }
}

export async function listPrograms(db: SQLiteDatabase): Promise<Program[]> {
  return db.getAllAsync<Program>('SELECT id, name, description FROM program ORDER BY name');
}

export async function createProgram(
  db: SQLiteDatabase,
  name: string,
  description: string | null = null
): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO program (name, description) VALUES (?, ?)',
    name.trim(),
    description
  );
  return result.lastInsertRowId;
}

export async function deleteProgram(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM program WHERE id = ?', id);
}

interface ProgramWorkoutRow {
  id: number;
  program_id: number;
  name: string;
  position: number;
}

interface ProgramExerciseRow {
  id: number;
  workout_id: number;
  exercise_id: number;
  exercise_name: string;
  position: number;
  target_sets: number | null;
  target_reps: number | null;
  target_weight: number | null;
}

export async function getProgramWorkouts(
  db: SQLiteDatabase,
  programId: number
): Promise<ProgramWorkout[]> {
  const workouts = await db.getAllAsync<ProgramWorkoutRow>(
    'SELECT * FROM program_workout WHERE program_id = ? ORDER BY position, id',
    programId
  );
  const result: ProgramWorkout[] = [];
  for (const w of workouts) {
    const exercises = await db.getAllAsync<ProgramExerciseRow>(
      `SELECT pe.*, e.name AS exercise_name
       FROM program_exercise pe
       JOIN exercise e ON e.id = pe.exercise_id
       WHERE pe.workout_id = ?
       ORDER BY pe.position, pe.id`,
      w.id
    );
    result.push({
      id: w.id,
      programId: w.program_id,
      name: w.name,
      position: w.position,
      exercises: exercises.map(mapProgramExercise),
    });
  }
  return result;
}

const mapProgramExercise = (r: ProgramExerciseRow): ProgramExercise => ({
  id: r.id,
  workoutId: r.workout_id,
  exerciseId: r.exercise_id,
  exerciseName: r.exercise_name,
  position: r.position,
  targetSets: r.target_sets,
  targetReps: r.target_reps,
  targetWeight: r.target_weight,
});

export async function addWorkout(
  db: SQLiteDatabase,
  programId: number,
  name: string
): Promise<number> {
  const posRow = await db.getFirstAsync<{ next: number | null }>(
    'SELECT MAX(position) + 1 AS next FROM program_workout WHERE program_id = ?',
    programId
  );
  const result = await db.runAsync(
    'INSERT INTO program_workout (program_id, name, position) VALUES (?, ?, ?)',
    programId,
    name.trim(),
    posRow?.next ?? 0
  );
  return result.lastInsertRowId;
}

export async function addProgramExercise(
  db: SQLiteDatabase,
  workoutId: number,
  exerciseId: number,
  target: { sets?: number | null; reps?: number | null; weight?: number | null } = {}
): Promise<number> {
  const posRow = await db.getFirstAsync<{ next: number | null }>(
    'SELECT MAX(position) + 1 AS next FROM program_exercise WHERE workout_id = ?',
    workoutId
  );
  const result = await db.runAsync(
    `INSERT INTO program_exercise (workout_id, exercise_id, position, target_sets, target_reps, target_weight)
     VALUES (?, ?, ?, ?, ?, ?)`,
    workoutId,
    exerciseId,
    posRow?.next ?? 0,
    target.sets ?? null,
    target.reps ?? null,
    target.weight ?? null
  );
  return result.lastInsertRowId;
}

export async function removeProgramExercise(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM program_exercise WHERE id = ?', id);
}

/** Applies a planned workout to a day: creates one set per target sets for each exercise. */
export async function applyWorkoutToDay(
  db: SQLiteDatabase,
  workoutId: number,
  dayId: number
): Promise<void> {
  const exercises = await db.getAllAsync<ProgramExerciseRow>(
    `SELECT pe.*, e.name AS exercise_name
     FROM program_exercise pe
     JOIN exercise e ON e.id = pe.exercise_id
     WHERE pe.workout_id = ?
     ORDER BY pe.position, pe.id`,
    workoutId
  );
  for (const pe of exercises) {
    const count = Math.max(pe.target_sets ?? 1, 1);
    for (let i = 0; i < count; i++) {
      await addSet(db, dayId, pe.exercise_id, {
        weight: pe.target_weight,
        reps: pe.target_reps,
      });
    }
  }
}

export async function getSettings(db: SQLiteDatabase): Promise<AppSettings> {
  const row = await db.getFirstAsync<{ weight_unit: string; rest_seconds: number; theme: string }>(
    'SELECT weight_unit, rest_seconds, theme FROM app_settings WHERE id = 1'
  );
  return {
    weightUnit: (row?.weight_unit as 'kg' | 'lb') ?? 'kg',
    restSeconds: row?.rest_seconds ?? 90,
    theme: (row?.theme as AppSettings['theme']) ?? 'system',
  };
}

export async function updateSettings(
  db: SQLiteDatabase,
  patch: Partial<AppSettings>
): Promise<void> {
  await db.runAsync(
    `UPDATE app_settings
     SET weight_unit = COALESCE(?, weight_unit),
         rest_seconds = COALESCE(?, rest_seconds),
         theme = COALESCE(?, theme)
     WHERE id = 1`,
    patch.weightUnit ?? null,
    patch.restSeconds ?? null,
    patch.theme ?? null
  );
}

export async function exerciseHistory(
  db: SQLiteDatabase,
  exerciseId: number,
  limit = 50
): Promise<(SetEntry & { date: string })[]> {
  const rows = await db.getAllAsync<SetRow & { date: string }>(
    `SELECT s.*, d.date AS date
     FROM set_entry s
     JOIN day d ON d.id = s.day_id
     WHERE s.exercise_id = ?
     ORDER BY d.epoch_day DESC, s.position
     LIMIT ?`,
    exerciseId,
    limit
  );
  return rows.map((row) => ({ ...mapSet(row), date: row.date }));
}
