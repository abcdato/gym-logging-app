import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'gymkeeper.db';
const DATABASE_VERSION = 1;

const TABLES = `
PRAGMA journal_mode = 'wal';
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS muscle_group (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT
);

CREATE TABLE IF NOT EXISTS exercise (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  muscle_group_id INTEGER REFERENCES muscle_group(id) ON DELETE SET NULL,
  equipment TEXT,
  type TEXT NOT NULL DEFAULT 'reps',
  description TEXT,
  is_favourite INTEGER NOT NULL DEFAULT 0,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS day (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  epoch_day INTEGER NOT NULL UNIQUE,
  date TEXT NOT NULL,
  comment TEXT,
  duration_min INTEGER
);

CREATE TABLE IF NOT EXISTS set_entry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day_id INTEGER NOT NULL REFERENCES day(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercise(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  weight REAL,
  reps INTEGER,
  difficulty INTEGER,
  time_seconds INTEGER,
  distance REAL,
  comment TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_set_entry_day ON set_entry(day_id, position);
CREATE INDEX IF NOT EXISTS idx_set_entry_exercise ON set_entry(exercise_id);

CREATE TABLE IF NOT EXISTS program (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS program_workout (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program_id INTEGER NOT NULL REFERENCES program(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS program_exercise (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_id INTEGER NOT NULL REFERENCES program_workout(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercise(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  target_sets INTEGER,
  target_reps INTEGER,
  target_weight REAL
);

CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  weight_unit TEXT NOT NULL DEFAULT 'kg',
  rest_seconds INTEGER NOT NULL DEFAULT 90,
  theme TEXT NOT NULL DEFAULT 'system'
);
`;

const MUSCLE_GROUPS: [string, string][] = [
  ['Chest', '#E4572E'],
  ['Back', '#2E86AB'],
  ['Shoulders', '#F3A712'],
  ['Biceps', '#8E5572'],
  ['Triceps', '#4E8098'],
  ['Legs', '#5B8C5A'],
  ['Glutes', '#C46BAE'],
  ['Core', '#B08D57'],
  ['Cardio', '#7E6BC4'],
  ['Full body', '#6C757D'],
];

const EXERCISES: [string, string, string, string][] = [
  // name, muscle group, equipment, type
  ['Bench Press', 'Chest', 'Barbell', 'reps'],
  ['Incline Bench Press', 'Chest', 'Barbell', 'reps'],
  ['Dumbbell Bench Press', 'Chest', 'Dumbbell', 'reps'],
  ['Push-Up', 'Chest', 'Bodyweight', 'reps'],
  ['Cable Fly', 'Chest', 'Cable', 'reps'],
  ['Dumbbell Fly', 'Chest', 'Dumbbell', 'reps'],
  ['Deadlift', 'Back', 'Barbell', 'reps'],
  ['Barbell Row', 'Back', 'Barbell', 'reps'],
  ['Dumbbell Row', 'Back', 'Dumbbell', 'reps'],
  ['Pull-Up', 'Back', 'Bodyweight', 'reps'],
  ['Lat Pulldown', 'Back', 'Cable', 'reps'],
  ['Seated Cable Row', 'Back', 'Cable', 'reps'],
  ['Overhead Press', 'Shoulders', 'Barbell', 'reps'],
  ['Dumbbell Shoulder Press', 'Shoulders', 'Dumbbell', 'reps'],
  ['Lateral Raise', 'Shoulders', 'Dumbbell', 'reps'],
  ['Face Pull', 'Shoulders', 'Cable', 'reps'],
  ['Barbell Curl', 'Biceps', 'Barbell', 'reps'],
  ['Dumbbell Curl', 'Biceps', 'Dumbbell', 'reps'],
  ['Hammer Curl', 'Biceps', 'Dumbbell', 'reps'],
  ['Triceps Pushdown', 'Triceps', 'Cable', 'reps'],
  ['Overhead Triceps Extension', 'Triceps', 'Dumbbell', 'reps'],
  ['Dips', 'Triceps', 'Bodyweight', 'reps'],
  ['Squat', 'Legs', 'Barbell', 'reps'],
  ['Front Squat', 'Legs', 'Barbell', 'reps'],
  ['Leg Press', 'Legs', 'Machine', 'reps'],
  ['Romanian Deadlift', 'Legs', 'Barbell', 'reps'],
  ['Leg Curl', 'Legs', 'Machine', 'reps'],
  ['Leg Extension', 'Legs', 'Machine', 'reps'],
  ['Walking Lunge', 'Legs', 'Dumbbell', 'reps'],
  ['Calf Raise', 'Legs', 'Machine', 'reps'],
  ['Hip Thrust', 'Glutes', 'Barbell', 'reps'],
  ['Glute Bridge', 'Glutes', 'Bodyweight', 'reps'],
  ['Plank', 'Core', 'Bodyweight', 'time'],
  ['Hanging Leg Raise', 'Core', 'Bodyweight', 'reps'],
  ['Cable Crunch', 'Core', 'Cable', 'reps'],
  ['Russian Twist', 'Core', 'Bodyweight', 'reps'],
  ['Crunch', 'Core', 'Bodyweight', 'reps'],
  ['Running', 'Cardio', 'None', 'distance'],
  ['Cycling', 'Cardio', 'Machine', 'distance'],
  ['Rowing', 'Cardio', 'Machine', 'distance'],
  ['Jump Rope', 'Cardio', 'Rope', 'time'],
  ['Burpee', 'Full body', 'Bodyweight', 'reps'],
  ['Kettlebell Swing', 'Full body', 'Kettlebell', 'reps'],
  ['Clean and Press', 'Full body', 'Barbell', 'reps'],
  ['Farmer Carry', 'Full body', 'Dumbbell', 'time'],
];

const escapeSql = (value: string) => value.replace(/'/g, "''");

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let currentVersion = row?.user_version ?? 0;

  if (currentVersion >= DATABASE_VERSION) {
    return;
  }

  if (currentVersion === 0) {
    await db.execAsync(TABLES);

    const groupIds = new Map<string, number>();
    for (const [name, color] of MUSCLE_GROUPS) {
      const result = await db.runAsync(
        'INSERT INTO muscle_group (name, color) VALUES (?, ?)',
        name,
        color
      );
      groupIds.set(name, result.lastInsertRowId);
    }

    let sql = '';
    for (const [name, group, equipment, type] of EXERCISES) {
      const groupId = groupIds.get(group);
      sql += `INSERT INTO exercise (name, muscle_group_id, equipment, type, is_default) VALUES (`;
      sql += `'${escapeSql(name)}', ${groupId ?? 'NULL'}, '${escapeSql(equipment)}', '${escapeSql(type)}', 1);\n`;
    }
    await db.execAsync(sql);

    await db.runAsync("INSERT OR IGNORE INTO app_settings (id) VALUES (1)");
    currentVersion = 1;
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
