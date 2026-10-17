import { Pressable, StyleSheet, View } from 'react-native';

import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTimers } from '@/context/timers';
import { useTheme } from '@/hooks/use-theme';
import { formatClock } from '@/utils/time';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

export function RestTimerBar() {
  const theme = useTheme();
  const { restActive, restRemaining, restDuration, addRestTime, stopRest } = useTimers();

  if (!restActive || restRemaining == null) {
    return null;
  }

  const progress =
    restDuration > 0 ? Math.max(0, Math.min(1, restRemaining / restDuration)) : 0;

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <ThemedView style={[styles.card, { borderColor: theme.border }]}>
        <View style={styles.top}>
          <ThemedText type="smallBold">Rest · {formatClock(restRemaining)}</ThemedText>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => addRestTime(15)}
              style={[styles.chip, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="small">+15s</ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={stopRest}
              style={[styles.chip, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="small">Skip</ThemedText>
            </Pressable>
          </View>
        </View>
        <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
          <View
            style={[styles.fill, { backgroundColor: theme.accent, width: `${progress * 100}%` }]}
          />
        </View>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: BottomTabInset + Spacing.two,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  card: {
    width: '100%',
    maxWidth: MaxContentWidth,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  chip: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.four,
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
});
