import { StyleSheet, View } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { colors } from '../constants/colors';
import { elevation, radius, spacing } from '../constants/theme';

export function ReportCard({ title, value, subtitle, icon, onPress }) {
  return (
    <Card
      style={[styles.card, onPress && styles.cardPressable]}
      mode="contained"
      onPress={onPress}
      accessible
      accessibilityRole={onPress ? 'button' : 'text'}
    >
      <Card.Content>
        <View style={styles.header}>
          {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
          <Text variant="labelMedium" style={styles.title}>
            {title}
          </Text>
        </View>
        <Text variant="headlineMedium" style={styles.value}>
          {value}
        </Text>
        {subtitle ? <Text variant="bodySmall" style={styles.subtitle}>{subtitle}</Text> : null}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 220,
    marginRight: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...elevation.base,
  },
  cardPressable: {
    borderColor: colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.overlay,
    marginRight: spacing.sm,
  },
  title: {
    flexShrink: 1,
    color: colors.textSecondary,
  },
  value: {
    marginBottom: spacing.xs,
    color: colors.text,
  },
  subtitle: {
    color: colors.textSecondary,
  },
});
