import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import type { ExerciseType, SetDraft } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';

import { Button } from './button';
import { Field } from './field';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

const DIFFICULTIES = ['Easy', 'Moderate', 'Hard', 'Very hard', 'Max'];

const toText = (value: number | null | undefined) => (value == null ? '' : `${value}`);
const toNumber = (text: string) => {
  const normalized = text.replace(',', '.').trim();
  if (normalized === '') {
    return null;
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
};

interface SetEditorProps {
  visible: boolean;
  title: string;
  type: ExerciseType;
  weightUnit: 'kg' | 'lb';
  initial: SetDraft;
  onCancel: () => void;
  onSave: (draft: SetDraft) => void;
  onDelete?: () => void;
}

export function SetEditor({
  visible,
  title,
  type,
  weightUnit,
  initial,
  onCancel,
  onSave,
  onDelete,
}: SetEditorProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [time, setTime] = useState('');
  const [distance, setDistance] = useState('');
  const [comment, setComment] = useState('');
  const [difficulty, setDifficulty] = useState<number | null>(null);
  const [prevVisible, setPrevVisible] = useState(visible);

  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setWeight(toText(initial.weight));
      setReps(toText(initial.reps));
      setTime(toText(initial.timeSeconds));
      setDistance(toText(initial.distance));
      setComment(initial.comment ?? '');
      setDifficulty(initial.difficulty ?? null);
    }
  }

  const showWeight = type === 'reps' || type === 'distance';
  const showReps = type === 'reps';
  const showTime = type === 'time';
  const showDistance = type === 'distance';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable
            style={styles.dismissArea}
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel="Close"
          />
          <ThemedView style={[styles.sheet, { paddingBottom: insets.bottom }]}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.content}>
              <ThemedText type="subtitle">{title}</ThemedText>

              {showWeight ? (
                <Field
                  label="Weight"
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="decimal-pad"
                  suffix={weightUnit}
                />
              ) : null}
              {showReps ? (
                <Field
                  label="Reps"
                  value={reps}
                  onChangeText={setReps}
                  keyboardType="number-pad"
                />
              ) : null}
              {showTime ? (
                <Field
                  label="Time"
                  value={time}
                  onChangeText={setTime}
                  keyboardType="number-pad"
                  suffix="sec"
                />
              ) : null}
              {showDistance ? (
                <Field
                  label="Distance"
                  value={distance}
                  onChangeText={setDistance}
                  keyboardType="decimal-pad"
                  suffix="km"
                />
              ) : null}

              <View style={styles.difficulty}>
                <ThemedText type="small" themeColor="textSecondary">
                  Difficulty
                </ThemedText>
                <View style={styles.chipRow}>
                  {DIFFICULTIES.map((label, index) => {
                    const active = difficulty === index;
                    return (
                      <Pressable
                        key={label}
                        onPress={() => setDifficulty(active ? null : index)}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: active ? theme.accent : theme.backgroundElement,
                            borderColor: theme.border,
                          },
                        ]}>
                        <ThemedText
                          type="small"
                          themeColor={active ? 'accentText' : 'textSecondary'}>
                          {label}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <Field
                label="Comment"
                value={comment}
                onChangeText={setComment}
                placeholder="Optional"
              />

              <View style={styles.actions}>
                {onDelete ? (
                  <Button title="Delete set" variant="danger" compact onPress={onDelete} />
                ) : null}
                <View style={styles.spacer} />
                <Button title="Cancel" variant="secondary" compact onPress={onCancel} />
                <Button
                  title="Save"
                  compact
                  onPress={() =>
                    onSave({
                      weight: toNumber(weight),
                      reps: toNumber(reps),
                      timeSeconds: toNumber(time),
                      distance: toNumber(distance),
                      difficulty,
                      comment: comment.trim() === '' ? null : comment.trim(),
                    })
                  }
                />
              </View>
            </ScrollView>
          </ThemedView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  fill: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    maxHeight: '90%',
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  difficulty: {
    gap: Spacing.two,
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
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  spacer: {
    flex: 1,
  },
});
