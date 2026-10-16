import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import {
  epochDayFromDateString,
  exerciseHistory,
  formatEpochDay,
  getExercise,
  getSettings,
  setExerciseFavourite,
} from '@/db/repository';
import type { Exercise, SetEntry } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';

export default function ExerciseDetailScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const exerciseId = Number(id);

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [history, setHistory] = useState<(SetEntry & { date: string })[]>([]);
  const [unit, setUnit] = useState<'kg' | 'lb'>('kg');

  const load = useCallback(async () => {
    const [ex, rows, settings] = await Promise.all([
      getExercise(db, exerciseId),
      exerciseHistory(db, exerciseId),
      getSettings(db),
    ]);
    setExercise(ex);
    setHistory(rows);
    setUnit(settings.weightUnit);
  }, [db, exerciseId]);

  useEffect(() => {
    const run = async () => {
      await load();
    };
    run();
  }, [load]);

  const best = history.reduce((max, s) => Math.max(max, s.weight ?? 0), 0);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScreenHeader
          title={exercise?.name ?? 'Exercise'}
          subtitle={[exercise?.muscleGroupName, exercise?.equipment].filter(Boolean).join(' · ')}
          onBack={() => router.back()}
          right={
            exercise ? (
              <Pressable
                hitSlop={8}
                onPress={async () => {
                  await setExerciseFavourite(db, exercise.id, !exercise.isFavourite);
                  await load();
                }}>
                <Ionicons
                  name={exercise.isFavourite ? 'star' : 'star-outline'}
                  size={24}
                  color={exercise.isFavourite ? theme.accent : theme.textSecondary}
                />
              </Pressable>
            ) : null
          }
        />

        <View style={styles.stats}>
          <ThemedView type="backgroundElement" style={styles.statCard}>
            <ThemedText type="small" themeColor="textSecondary">
              Sets logged
            </ThemedText>
            <ThemedText type="subtitle">{history.length}</ThemedText>
          </ThemedView>
          <ThemedView type="backgroundElement" style={styles.statCard}>
            <ThemedText type="small" themeColor="textSecondary">
              Best weight
            </ThemedText>
            <ThemedText type="subtitle">
              {best > 0 ? `${best} ${unit}` : '—'}
            </ThemedText>
          </ThemedView>
        </View>

        <ThemedText type="smallBold">History</ThemedText>
        <FlatList
          data={history}
          keyExtractor={(item) => `${item.id}`}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={[styles.row, { borderColor: theme.border }]}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.date}>
                {formatEpochDay(epochDayFromDateString(item.date))}
              </ThemedText>
              <ThemedText>
                {formatEntry(exercise?.type ?? 'reps', item, unit)}
              </ThemedText>
            </View>
          )}
          ListEmptyComponent={
            <ThemedText type="small" themeColor="textSecondary">
              No sets logged for this exercise yet.
            </ThemedText>
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
}

function formatEntry(type: string, set: SetEntry, unit: 'kg' | 'lb'): string {
  if (type === 'time') {
    return `${set.timeSeconds ?? 0}s`;
  }
  if (type === 'distance') {
    return `${set.distance ?? 0} km`;
  }
  return `${set.weight ?? '—'} ${unit} × ${set.reps ?? '—'}`;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
    gap: Spacing.three,
  },
  stats: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  statCard: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.half,
  },
  list: {
    gap: Spacing.two,
    paddingBottom: Spacing.six,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
  },
  date: {
    flexShrink: 1,
  },
});
