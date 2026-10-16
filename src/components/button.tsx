import { ActivityIndicator, Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed-text';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  compact?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  compact = false,
}: ButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const background: Record<Variant, string> = {
    primary: theme.accent,
    secondary: theme.backgroundSelected,
    danger: theme.danger,
    success: theme.success,
    ghost: 'transparent',
  };
  const textColor: Record<Variant, 'accentText' | 'text' | 'accent'> = {
    primary: 'accentText',
    secondary: 'text',
    danger: 'accentText',
    success: 'accentText',
    ghost: 'accent',
  };

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        { backgroundColor: background[variant], opacity: isDisabled ? 0.5 : pressed ? 0.8 : 1 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={theme.text} />
      ) : (
        <ThemedText type="smallBold" themeColor={textColor[variant]}>
          {title}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compact: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
});
