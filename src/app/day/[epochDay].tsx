import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import {
  copyDay,
  formatEpochDay,
  getDayWithExercises,
  getSettings,
  todayEpochDay,
} from '@/db/repository';
import type { DayWithExercises, SetEntry } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';

export default function DayDetailScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const router = useRouter();
  const { epochDay: epochDayParam } = useLocalSearchParams<{ epochDay: string }>();
  const epochDay = Number(epochDayParam);

  const [day, setDay] = useState<DayWithExercises | null>(null);
  const [unit, setUnit] = useState<'kg' | 'lb'>('kg');
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const [result, settings] = await Promise.all([
      getDayWithExercises(db, epochDay),
      getSettings(db),
    ]);
    setDay(result);
    setUnit(settings.weightUnit);
  }, [db, epochDay]);

  useEffect(() => {
    const run = async () => {
      await load();
    };
    run();
  }, [load]);

  const handleCopy = async () => {
    await copyDay(db, epochDay, todayEpochDay());
    setCopied(true);
    router.push('/');
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScreenHeader
          title={formatEpochDay(epochDay)}
          subtitle={
            day
              ? `${day.exercises.length} exercises · ${day.exercises.reduce(
                  (sum, e) => sum + e.sets.length,
                  0
                )} sets`
              : undefined
          }
          onBack={() => router.back()}
        />
        <ScrollView contentContainerStyle={styles.scroll}>
          {day?.comment ? (
            <ThemedView type="backgroundElement" style={styles.comment}>
              <ThemedText type="small" themeColor="textSecondary">
                {day.comment}
              </ThemedText>
            </ThemedView>
          ) : null}

          {day?.exercises.map((logged) => (
            <ThemedView
              key={logged.exercise.id}
              type="backgroundElement"
              style={styles.card}>
              <ThemedText type="smallBold">{logged.exercise.name}</ThemedText>
              {logged.sets.map((set, index) => (
                <View key={set.id} style={[styles.setRow, { borderColor: theme.border }]}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.index}>
                    {index + 1}
                  </ThemedText>
                  <ThemedText>
                    {formatSet(logged.exercise.type, set, unit)}
                  </ThemedText>
                </View>
              ))}
            </ThemedView>
          ))}

          {day && day.exercises.length > 0 ? (
            <Button
              title={copied ? 'Copied to today' : "Copy this day to today's diary"}
              onPress={handleCopy}
            />
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              No sets were logged on this day.
            </ThemedText>
          )}
        </ScrollView>
      </SafeAreaView>
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
  },
  scroll: {
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  comment: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
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
  index: {
    width: 16,
  },
});
