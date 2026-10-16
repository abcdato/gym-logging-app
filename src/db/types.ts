/**
 * Domain types for GymKeeper.
 *
 * The shape mirrors the concepts recovered from the reference app's data model:
 * a training diary groups days, a day holds exercises, and each exercise holds
 * ordered sets. Programs describe planned workouts separately from logged data.
 */

export type ExerciseType = 'reps' | 'time' | 'distance';

export interface MuscleGroup {
  id: number;
  name: string;
  color: string | null;
}

export interface Exercise {
  id: number;
  name: string;
  muscleGroupId: number | null;
  muscleGroupName?: string | null;
  muscleGroupColor?: string | null;
  equipment: string | null;
  type: ExerciseType;
  description: string | null;
  isFavourite: boolean;
  isDefault: boolean;
}

export interface Day {
  id: number;
  epochDay: number;
  date: string;
  comment: string | null;
  durationMin: number | null;
}

export interface SetEntry {
  id: number;
  dayId: number;
  exerciseId: number;
  position: number;
  weight: number | null;
  reps: number | null;
  /** 0 = easy ... 4 = very hard, null = unrated. */
  difficulty: number | null;
  timeSeconds: number | null;
  distance: number | null;
  comment: string | null;
}

/** An exercise logged on a given day together with its ordered sets. */
export interface LoggedExercise {
  exercise: Exercise;
  sets: SetEntry[];
}

export interface DayWithExercises extends Day {
  exercises: LoggedExercise[];
}

export interface Program {
  id: number;
  name: string;
  description: string | null;
}

export interface ProgramWorkout {
  id: number;
  programId: number;
  name: string;
  position: number;
  exercises: ProgramExercise[];
}

export interface ProgramExercise {
  id: number;
  workoutId: number;
  exerciseId: number;
  exerciseName: string;
  position: number;
  targetSets: number | null;
  targetReps: number | null;
  targetWeight: number | null;
}

export interface AppSettings {
  weightUnit: 'kg' | 'lb';
  restSeconds: number;
  theme: 'system' | 'light' | 'dark';
}

export interface SetDraft {
  weight?: number | null;
  reps?: number | null;
  difficulty?: number | null;
  timeSeconds?: number | null;
  distance?: number | null;
  comment?: string | null;
}
