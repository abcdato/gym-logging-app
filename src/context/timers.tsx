import * as Haptics from 'expo-haptics';
import { useSQLiteContext } from 'expo-sqlite';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  getDayWithExercises,
  getSettings,
  getOrCreateDay,
  setDayDurationMin,
  setDayStartedAt,
  todayEpochDay,
} from '@/db/repository';

interface TimersValue {
  /** Rest countdown is running. */
  restActive: boolean;
  /** Seconds left on the rest timer, or null when idle. */
  restRemaining: number | null;
  /** Configured rest length in seconds. */
  restDuration: number;
  startRest: (seconds?: number) => void;
  addRestTime: (delta: number) => void;
  stopRest: () => void;

  /** Workout stopwatch is running. */
  workoutActive: boolean;
  /** Elapsed workout seconds while running. */
  workoutElapsed: number;
  startWorkout: () => Promise<void>;
  finishWorkout: () => Promise<void>;
}

const TimersContext = createContext<TimersValue | null>(null);

export function useTimers(): TimersValue {
  const value = useContext(TimersContext);
  if (!value) {
    throw new Error('useTimers must be used within a TimersProvider');
  }
  return value;
}

const TICK_MS = 500;

export function TimersProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [now, setNow] = useState(() => Date.now());
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [restDuration, setRestDuration] = useState(90);
  const [workoutStartedAt, setWorkoutStartedAt] = useState<number | null>(null);

  // Restore the configured rest length and any workout already in progress.
  useEffect(() => {
    let active = true;
    (async () => {
      const settings = await getSettings(db);
      const day = await getDayWithExercises(db, todayEpochDay());
      if (!active) {
        return;
      }
      setRestDuration(settings.restSeconds);
      if (day?.startedAt) {
        setWorkoutStartedAt(day.startedAt);
        setNow(Date.now());
      }
    })();
    return () => {
      active = false;
    };
  }, [db]);

  // Tick only while a timer is running, and fire the rest alert on completion.
  useEffect(() => {
    if (restEndsAt == null && workoutStartedAt == null) {
      return;
    }
    const tick = () => {
      const at = Date.now();
      setNow(at);
      if (restEndsAt != null && at >= restEndsAt) {
        setRestEndsAt(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    };
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, [restEndsAt, workoutStartedAt]);

  const startRest = useCallback(
    (seconds?: number) => {
      const duration = seconds ?? restDuration;
      const at = Date.now();
      setNow(at);
      setRestDuration(duration);
      setRestEndsAt(at + duration * 1000);
    },
    [restDuration]
  );

  const addRestTime = useCallback((delta: number) => {
    const at = Date.now();
    setRestEndsAt((previous) =>
      previous == null ? previous : Math.max(at, previous + delta * 1000)
    );
  }, []);

  const stopRest = useCallback(() => setRestEndsAt(null), []);

  const startWorkout = useCallback(async () => {
    const startedAt = Date.now();
    setNow(startedAt);
    setWorkoutStartedAt(startedAt);
    const day = await getOrCreateDay(db, todayEpochDay());
    await setDayStartedAt(db, day.id, startedAt);
  }, [db]);

  const finishWorkout = useCallback(async () => {
    const startedAt = workoutStartedAt;
    const elapsedMs = startedAt == null ? 0 : Date.now() - startedAt;
    setWorkoutStartedAt(null);
    setRestEndsAt(null);
    const day = await getOrCreateDay(db, todayEpochDay());
    const minutes = Math.max(1, Math.round(elapsedMs / 60_000));
    await setDayDurationMin(db, day.id, minutes);
    await setDayStartedAt(db, day.id, null);
  }, [db, workoutStartedAt]);

  const restRemaining =
    restEndsAt == null ? null : Math.max(0, Math.ceil((restEndsAt - now) / 1000));
  const workoutElapsed =
    workoutStartedAt == null ? 0 : Math.max(0, Math.floor((now - workoutStartedAt) / 1000));

  const value = useMemo<TimersValue>(
    () => ({
      restActive: restEndsAt != null,
      restRemaining,
      restDuration,
      startRest,
      addRestTime,
      stopRest,
      workoutActive: workoutStartedAt != null,
      workoutElapsed,
      startWorkout,
      finishWorkout,
    }),
    [
      restEndsAt,
      restRemaining,
      restDuration,
      startRest,
      addRestTime,
      stopRest,
      workoutStartedAt,
      workoutElapsed,
      startWorkout,
      finishWorkout,
    ]
  );

  return <TimersContext.Provider value={value}>{children}</TimersContext.Provider>;
}
