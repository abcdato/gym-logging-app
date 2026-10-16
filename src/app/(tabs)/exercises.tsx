import { Ionicons } from '@expo/vector-icons';
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
import { addExercise, listExercises, listMuscleGroups, setExerciseFavourite } from '@/db/repository';
import type { Exercise, ExerciseType, MuscleGroup } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';

const TYPES: { key: ExerciseType; label: string }[] = [
  { key: 'reps', label: 'Reps' },
  { key: 'time', label: 'Time' },
  { key: 'distance', label: 'Distance' },
];

export default function ExercisesScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [items, setItems] = useState<Exercise[]>([]);
  const [groups, setGroups] = useState<MuscleGroup[]>([]);
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(async () => {
    const rows = await listExercises(db, search);
    setItems(rows);
  }, [db, search]);

  useEffect(() => {
    const run = async () => {
      await load();
    };
    run();
  }, [load]);

  useEffect(() => {
    let active = true;
    listMuscleGroups(db).then((rows) => {
      if (active) {
        setGroups(rows);
      }
    });
    return () => {
      active = false;
    };
  }, [db]);

  const toggleFavourite = async (exercise: Exercise) => {
    await setExerciseFavourite(db, exercise.id, !exercise.isFavourite);
    await load();
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScreenHeader
          title="Exercises"
          subtitle={`${items.length} in your library`}
          right={<Button title="New" compact onPress={() => setFormOpen(true)} />}
        />
        <Field placeholder="Search exercises" value={search} onChangeText={setSearch} />
        <FlatList
          data={items}
          keyExtractor={(item) => `${item.id}`}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/exercise/${item.id}`)}
              style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: item.muscleGroupColor ?? theme.textSecondary },
                ]}
              />
              <View style={styles.rowText}>
                <ThemedText>{item.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {[item.muscleGroupName, item.equipment, item.type].filter(Boolean).join(' · ')}
                </ThemedText>
              </View>
              <Pressable onPress={() => toggleFavourite(item)} hitSlop={8}>
                <Ionicons
                  name={item.isFavourite ? 'star' : 'star-outline'}
                  size={22}
                  color={item.isFavourite ? theme.accent : theme.textSecondary}
                />
              </Pressable>
            </Pressable>
          )}
          ListEmptyComponent={
            <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
              No exercises match your search.
            </ThemedText>
          }
        />
      </SafeAreaView>

      <NewExerciseModal
        visible={formOpen}
        groups={groups}
        onClose={() => setFormOpen(false)}
        onCreate={async (input) => {
          await addExercise(db, input);
          setFormOpen(false);
          await load();
        }}
      />
    </ThemedView>
  );
}

function NewExerciseModal({
  visible,
  groups,
  onClose,
  onCreate,
}: {
  visible: boolean;
  groups: MuscleGroup[];
  onClose: () => void;
  onCreate: (input: {
    name: string;
    muscleGroupId: number | null;
    equipment: string | null;
    type: ExerciseType;
  }) => void;
}) {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [equipment, setEquipment] = useState('');
  const [groupId, setGroupId] = useState<number | null>(null);
  const [type, setType] = useState<ExerciseType>('reps');
  const [prevVisible, setPrevVisible] = useState(visible);

  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setName('');
      setEquipment('');
      setGroupId(null);
      setType('reps');
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <ThemedView style={styles.sheet}>
          <ThemedText type="subtitle">New exercise</ThemedText>
          <Field label="Name" value={name} onChangeText={setName} autoFocus />
          <Field label="Equipment" value={equipment} onChangeText={setEquipment} placeholder="Optional" />

          <ThemedText type="small" themeColor="textSecondary">
            Type
          </ThemedText>
          <View style={styles.chipRow}>
            {TYPES.map((option) => {
              const active = type === option.key;
              return (
                <Pressable
                  key={option.key}
                  onPress={() => setType(option.key)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? theme.accent : theme.backgroundElement,
                      borderColor: theme.border,
                    },
                  ]}>
                  <ThemedText type="small" themeColor={active ? 'accentText' : 'textSecondary'}>
                    {option.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          <ThemedText type="small" themeColor="textSecondary">
            Muscle group
          </ThemedText>
          <View style={styles.chipRow}>
            {groups.map((group) => {
              const active = groupId === group.id;
              return (
                <Pressable
                  key={group.id}
                  onPress={() => setGroupId(active ? null : group.id)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? theme.accent : theme.backgroundElement,
                      borderColor: theme.border,
                    },
                  ]}>
                  <ThemedText type="small" themeColor={active ? 'accentText' : 'textSecondary'}>
                    {group.name}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.actions}>
            <Button title="Cancel" variant="secondary" compact onPress={onClose} />
            <Button
              title="Create"
              compact
              disabled={name.trim() === ''}
              onPress={() =>
                onCreate({
                  name,
                  muscleGroupId: groupId,
                  equipment: equipment.trim() === '' ? null : equipment.trim(),
                  type,
                })
              }
            />
          </View>
        </ThemedView>
      </View>
    </Modal>
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
    gap: Spacing.three,
  },
  list: {
    gap: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rowText: {
    flex: 1,
    gap: Spacing.half,
  },
  empty: {
    marginTop: Spacing.four,
    textAlign: 'center',
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.four,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
});
