import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { formatEpochDay, listDaysWithData } from '@/db/repository';
import type { Day } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';

export default function HistoryScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const router = useRouter();
  const [days, setDays] = useState<Day[]>([]);

  useFocusEffect(
    useCallback(() => {
      listDaysWithData(db).then(setDays);
    }, [db])
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScreenHeader title="History" subtitle={`${days.length} training days`} />
        <FlatList
          data={days}
          keyExtractor={(item) => `${item.id}`}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/day/${item.epochDay}`)}
              style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText>{formatEpochDay(item.epochDay)}</ThemedText>
              {item.comment ? (
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  {item.comment}
                </ThemedText>
              ) : null}
            </Pressable>
          )}
          ListEmptyComponent={
            <ThemedView type="backgroundElement" style={styles.emptyCard}>
              <ThemedText type="smallBold">No history yet</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Days with logged sets will appear here.
              </ThemedText>
            </ThemedView>
          }
        />
      </SafeAreaView>
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
  list: {
    gap: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  row: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.half,
  },
  emptyCard: {
    padding: Spacing.four,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
});
