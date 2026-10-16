import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { createProgram, listPrograms } from '@/db/repository';
import type { Program } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';

export default function ProgramsScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const router = useRouter();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState('');

  const load = useCallback(async () => {
    setPrograms(await listPrograms(db));
  }, [db]);

  useEffect(() => {
    const run = async () => {
      await load();
    };
    run();
  }, [load]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScreenHeader
          title="Programs"
          subtitle={`${programs.length} saved`}
          right={<Button title="New" compact onPress={() => setFormOpen(true)} />}
        />
        <FlatList
          data={programs}
          keyExtractor={(item) => `${item.id}`}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/program/${item.id}`)}
              style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText>{item.name}</ThemedText>
              {item.description ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {item.description}
                </ThemedText>
              ) : null}
            </Pressable>
          )}
          ListEmptyComponent={
            <ThemedView type="backgroundElement" style={styles.emptyCard}>
              <ThemedText type="smallBold">No programs yet</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Create a program to plan your workouts.
              </ThemedText>
            </ThemedView>
          }
        />
      </SafeAreaView>

      <Modal visible={formOpen} animationType="slide" transparent onRequestClose={() => setFormOpen(false)}>
        <View style={styles.backdrop}>
          <ThemedView style={styles.sheet}>
            <ThemedText type="subtitle">New program</ThemedText>
            <Field label="Name" value={name} onChangeText={setName} autoFocus placeholder="e.g. Push / Pull / Legs" />
            <View style={styles.actions}>
              <Button title="Cancel" variant="secondary" compact onPress={() => setFormOpen(false)} />
              <Button
                title="Create"
                compact
                disabled={name.trim() === ''}
                onPress={async () => {
                  const id = await createProgram(db, name);
                  setName('');
                  setFormOpen(false);
                  await load();
                  router.push(`/program/${id}`);
                }}
              />
            </View>
          </ThemedView>
        </View>
      </Modal>
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
