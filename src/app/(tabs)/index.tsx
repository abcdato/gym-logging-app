import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ExercisePicker } from '@/components/exercise-picker';
import { ScreenHeader } from '@/components/screen-header';
import { SetEditor } from '@/components/set-editor';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import {
  addSet,
  deleteSet,
  formatEpochDay,
  getDayWithExercises,
  getOrCreateDay,
  getSettings,
  todayEpochDay,
  updateSet,
} from '@/db/repository';
import type { DayWithExercises, Exercise, SetDraft, SetEntry } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';

const DIFFICULTY_LABELS = ['Easy', 'Moderate', 'Hard', 'Very hard', 'Max'];

export default function TodayScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const router = useRouter();
  const epochDay = useMemo(() => todayEpochDay(), []);

  const [day, setDay] = useState<DayWithExercises | null>(null);
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lb'>('kg');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editor, setEditor] = useState<{
    exercise: Exercise;
    set?: SetEntry;
  } | null>(null);

  const load = useCallback(async () => {
    const settings = await getSettings(db);
    setWeightUnit(settings.weightUnit);
    const result = await getDayWithExercises(db, epochDay);
    setDay(result);
  }, [db, epochDay]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleAddExercise = async (exercise: Exercise) => {
    setPickerOpen(false);
    const target = await getOrCreateDay(db, epochDay);
    await addSet(db, target.id, exercise.id);
    await load();
  };

  const handleAddSet = async (exercise: Exercise, previous?: SetEntry) => {
    const target = await getOrCreateDay(db, epochDay);
    await addSet(db, target.id, exercise.id, {
      weight: previous?.weight ?? null,
      reps: previous?.reps ?? null,
      difficulty: previous?.difficulty ?? null,
      timeSeconds: previous?.timeSeconds ?? null,
      distance: previous?.distance ?? null,
    });
    await load();
  };

  const handleSaveSet = async (draft: SetDraft) => {
    if (editor?.set) {
      await updateSet(db, editor.set.id, draft);
    }
    setEditor(null);
    await load();
  };

  const handleDeleteSet = async () => {
    if (editor?.set) {
      await deleteSet(db, editor.set.id);
    }
    setEditor(null);
    await load();
  };

  const exercises = day?.exercises ?? [];
  const totalSets = exercises.reduce((sum, e) => sum + e.sets.length, 0);
  const volume = exercises.reduce(
    (sum, e) =>
      sum +
      e.sets.reduce((inner, s) => inner + (s.weight ?? 0) * (s.reps ?? 0), 0),
    0
  );

  const subtitle =
    exercises.length === 0
      ? 'No sets logged yet'
      : `${exercises.length} exercises · ${totalSets} sets · ${Math.round(volume)} ${weightUnit}`;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScreenHeader
          title="Today"
          subtitle={`${formatEpochDay(epochDay)} — ${subtitle}`}
          right={
            <Button title="Add exercise" compact onPress={() => setPickerOpen(true)} />
          }
        />
        <FlatList
          data={exercises}
          keyExtractor={(item) => `${item.exercise.id}`}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <ThemedView type="backgroundElement" style={styles.emptyCard}>
              <ThemedText type="smallBold">Start your workout</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Add an exercise and log your first set.
              </ThemedText>
            </ThemedView>
          }
          renderItem={({ item }) => (
            <ThemedView type="backgroundElement" style={styles.exerciseCard}>
              <View style={styles.exerciseTop}>
                <Pressable
                  style={styles.exerciseTitle}
                  onPress={() => router.push(`/exercise/${item.exercise.id}`)}>
                  <ThemedText type="smallBold">{item.exercise.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {[item.exercise.muscleGroupName, item.exercise.equipment]
                      .filter(Boolean)
                      .join(' · ')}
                  </ThemedText>
                </Pressable>
                <Button
                  title="+ Set"
                  variant="secondary"
                  compact
                  onPress={() => handleAddSet(item.exercise, item.sets[item.sets.length - 1])}
                />
              </View>

              {item.sets.map((set, index) => (
                <Pressable
                  key={set.id}
                  onPress={() => setEditor({ exercise: item.exercise, set })}
                  style={[styles.setRow, { borderColor: theme.border }]}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.setIndex}>
                    {index + 1}
                  </ThemedText>
                  <ThemedText style={styles.setMain}>{formatSet(item.exercise.type, set, weightUnit)}</ThemedText>
                  {set.difficulty != null ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      {DIFFICULTY_LABELS[set.difficulty] ?? ''}
                    </ThemedText>
                  ) : null}
                  <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
                </Pressable>
              ))}
            </ThemedView>
          )}
        />
      </SafeAreaView>

      <ExercisePicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleAddExercise}
      />

      <SetEditor
        visible={editor != null}
        title={editor ? `${editor.exercise.name} — ${editor.set ? 'Edit set' : 'New set'}` : ''}
        type={editor?.exercise.type ?? 'reps'}
        weightUnit={weightUnit}
        initial={editor?.set ?? {}}
        onCancel={() => setEditor(null)}
        onSave={handleSaveSet}
        onDelete={handleDeleteSet}
      />
    </ThemedView>
  );
}

function formatSet(type: string, set: SetEntry, unit: 'kg' | 'lb'): string {
  if (type === 'time') {
    return `${set.timeSeconds ?? 0}s`;
  }
  if (type === 'distance') {
    return `${set.distance ?? 0} km`;
  }
  const weight = set.weight == null ? '—' : `${set.weight} ${unit}`;
  const reps = set.reps == null ? '—' : `${set.reps}`;
  return `${weight} × ${reps}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  list: {
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  emptyCard: {
    padding: Spacing.four,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  exerciseCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  exerciseTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  exerciseTitle: {
    flex: 1,
    gap: Spacing.half,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
  },
  setIndex: {
    width: 16,
  },
  setMain: {
    flex: 1,
  },
});
