import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ExercisePicker } from '@/components/exercise-picker';
import { Field } from '@/components/field';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import {
  addProgramExercise,
  addWorkout,
  applyWorkoutToDay,
  deleteProgram,
  getOrCreateDay,
  getProgramWorkouts,
  removeProgramExercise,
  todayEpochDay,
} from '@/db/repository';
import type { Exercise, Program, ProgramWorkout } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';

export default function ProgramDetailScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const programId = Number(id);

  const [program, setProgram] = useState<Program | null>(null);
  const [workouts, setWorkouts] = useState<ProgramWorkout[]>([]);
  const [workoutFormOpen, setWorkoutFormOpen] = useState(false);
  const [workoutName, setWorkoutName] = useState('');
  const [pickerForWorkout, setPickerForWorkout] = useState<number | null>(null);

  const load = useCallback(async () => {
    const row = await db.getFirstAsync<Program>(
      'SELECT id, name, description FROM program WHERE id = ?',
      programId
    );
    setProgram(row);
    setWorkouts(await getProgramWorkouts(db, programId));
  }, [db, programId]);

  useEffect(() => {
    const run = async () => {
      await load();
    };
    run();
  }, [load]);

  const handlePickExercise = async (exercise: Exercise) => {
    if (pickerForWorkout == null) {
      return;
    }
    await addProgramExercise(db, pickerForWorkout, exercise.id, { sets: 3, reps: 8 });
    setPickerForWorkout(null);
    await load();
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScreenHeader
          title={program?.name ?? 'Program'}
          subtitle={program?.description ?? undefined}
          onBack={() => router.back()}
          right={<Button title="Add day" compact onPress={() => setWorkoutFormOpen(true)} />}
        />
        <ScrollView contentContainerStyle={styles.scroll}>
          {workouts.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              Add a training day, then attach planned exercises to it.
            </ThemedText>
          ) : null}

          {workouts.map((workout) => (
            <ThemedView key={workout.id} type="backgroundElement" style={styles.workoutCard}>
              <View style={styles.workoutHeader}>
                <ThemedText type="smallBold">{workout.name}</ThemedText>
                <Button
                  title="+ Exercise"
                  variant="secondary"
                  compact
                  onPress={() => setPickerForWorkout(workout.id)}
                />
              </View>

              {workout.exercises.map((pe) => (
                <View key={pe.id} style={[styles.exerciseRow, { borderColor: theme.border }]}>
                  <ThemedText style={styles.exerciseName}>{pe.exerciseName}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {pe.targetSets != null && pe.targetReps != null
                      ? `${pe.targetSets} × ${pe.targetReps}`
                      : '—'}
                  </ThemedText>
                  <Pressable hitSlop={8} onPress={async () => {
                    await removeProgramExercise(db, pe.id);
                    await load();
                  }}>
                    <Ionicons name="close" size={18} color={theme.textSecondary} />
                  </Pressable>
                </View>
              ))}

              {workout.exercises.length > 0 ? (
                <Button
                  title="Start this day today"
                  variant="success"
                  compact
                  onPress={async () => {
                    const day = await getOrCreateDay(db, todayEpochDay());
                    await applyWorkoutToDay(db, workout.id, day.id);
                    router.push('/');
                  }}
                />
              ) : null}
            </ThemedView>
          ))}

          <Button
            title="Delete program"
            variant="danger"
            onPress={async () => {
              await deleteProgram(db, programId);
              router.back();
            }}
          />
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={workoutFormOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setWorkoutFormOpen(false)}>
        <View style={styles.backdrop}>
          <ThemedView style={styles.sheet}>
            <ThemedText type="subtitle">New training day</ThemedText>
            <Field
              label="Name"
              value={workoutName}
              onChangeText={setWorkoutName}
              autoFocus
              placeholder="e.g. Push"
            />
            <View style={styles.actions}>
              <Button title="Cancel" variant="secondary" compact onPress={() => setWorkoutFormOpen(false)} />
              <Button
                title="Add"
                compact
                disabled={workoutName.trim() === ''}
                onPress={async () => {
                  await addWorkout(db, programId, workoutName);
                  setWorkoutName('');
                  setWorkoutFormOpen(false);
                  await load();
                }}
              />
            </View>
          </ThemedView>
        </View>
      </Modal>

      <ExercisePicker
        visible={pickerForWorkout != null}
        onClose={() => setPickerForWorkout(null)}
        onSelect={handlePickExercise}
        title="Add planned exercise"
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  scroll: {
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  workoutCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
  },
  exerciseName: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },
});
