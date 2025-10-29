import { StyleSheet, View } from 'react-native';
import { Divider, IconButton, Text } from 'react-native-paper';
import { colors } from '../constants/colors';
import { radius, spacing } from '../constants/theme';
import { formatCurrency } from '../utils/formatters';

export function SaleItem({ item, onIncrease, onDecrease, onRemove }) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.info}>
          <Text variant="titleSmall" numberOfLines={1}>
            {item.name}
          </Text>
          <Text variant="bodySmall" style={styles.subText}>
            {formatCurrency(item.unit_price)} × {item.quantity}
          </Text>
        </View>
        <Text variant="titleMedium" style={styles.amount}>
          {formatCurrency(item.total_price)}
        </Text>
      </View>

      <Divider style={styles.divider} />

      <View style={styles.footerRow}>
        <View style={styles.counter}>
          <IconButton
            icon="minus"
            size={18}
            onPress={onDecrease}
            disabled={item.quantity <= 1}
            style={styles.counterButton}
          />
          <Text variant="bodyMedium" style={styles.counterValue}>
            {item.quantity}
          </Text>
          <IconButton icon="plus" size={18} onPress={onIncrease} style={styles.counterButton} />
        </View>
        <IconButton icon="delete" onPress={onRemove} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  info: {
    flex: 1,
    marginRight: spacing.md,
    gap: spacing.xs,
  },
  subText: {
    color: colors.textSecondary,
  },
  amount: {
    color: colors.text,
  },
  divider: {
    marginVertical: 0,
    backgroundColor: colors.divider,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
  },
  counterButton: {
    margin: 0,
  },
  counterValue: {
    minWidth: 24,
    textAlign: 'center',
  },
});
