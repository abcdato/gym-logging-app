import { useEffect, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';

import { Spacing } from '@/constants/theme';
import { listExercises } from '@/db/repository';
import type { Exercise } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';

import { Button } from './button';
import { Field } from './field';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

interface ExercisePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
  title?: string;
}

export function ExercisePicker({ visible, onClose, onSelect, title = 'Add exercise' }: ExercisePickerProps) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<Exercise[]>([]);
  const [prevVisible, setPrevVisible] = useState(visible);

  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setSearch('');
    }
  }

  useEffect(() => {
    if (!visible) {
      return;
    }
    let active = true;
    listExercises(db, search).then((rows) => {
      if (active) {
        setItems(rows);
      }
    });
    return () => {
      active = false;
    };
  }, [db, search, visible]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="subtitle">{title}</ThemedText>
          <Button title="Close" variant="ghost" compact onPress={onClose} />
        </View>
        <Field placeholder="Search exercises" value={search} onChangeText={setSearch} />
        <FlatList
          data={items}
          keyExtractor={(item) => `${item.id}`}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onSelect(item)}
              style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.rowText}>
                <ThemedText>{item.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {[item.muscleGroupName, item.equipment].filter(Boolean).join(' · ')}
                </ThemedText>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
              No exercises match your search.
            </ThemedText>
          }
        />
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  list: {
    gap: Spacing.two,
    paddingBottom: Spacing.six,
  },
  row: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  rowText: {
    gap: Spacing.half,
  },
  empty: {
    marginTop: Spacing.four,
    textAlign: 'center',
  },
});
