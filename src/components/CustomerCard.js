import { StyleSheet, View } from 'react-native';
import { Card, Chip, IconButton, Text } from 'react-native-paper';
import { useTranslation } from '../localization/LocalizationProvider';
import { colors } from '../constants/colors';
import { elevation, radius, spacing } from '../constants/theme';
import { formatCurrency, formatPhoneNumber } from '../utils/formatters';

export function CustomerCard({ customer, onPress, onCollect }) {
  const { t } = useTranslation();
  const balance = customer.balance ?? 0;
  const isDue = balance > 0;

  return (
    <Card style={styles.card} mode="contained" onPress={onPress}>
      <Card.Content style={styles.content}>
        <View style={styles.header}>
          <View style={styles.nameBlock}>
            <Text variant="titleMedium" numberOfLines={1}>
              {customer.name}
            </Text>
            <Text variant="bodySmall" style={styles.metaText}>
              {customer.city || '--'}
            </Text>
          </View>
          {onCollect ? (
            <IconButton
              icon="cash-plus"
              size={22}
              onPress={onCollect}
              style={styles.collectButton}
              accessibilityLabel={t('recordPayment')}
            />
          ) : null}
        </View>

        {customer.phone ? (
          <Text variant="bodySmall" style={styles.metaText}>
            {formatPhoneNumber(customer.phone)}
          </Text>
        ) : null}

        <View style={styles.footer}>
          <Chip
            compact
            icon={isDue ? 'alert-circle' : 'check-circle'}
            style={[
              styles.balanceChip,
              { backgroundColor: isDue ? colors.overlay : colors.surfaceMuted },
            ]}
            textStyle={[
              styles.balanceLabel,
              { color: isDue ? colors.warning : colors.textSecondary },
            ]}
          >
            {isDue ? `${t('dueLabel')} ${formatCurrency(balance)}` : t('noDues')}
          </Chip>
          <Text variant="bodySmall" style={styles.summary}>
            {formatCurrency(customer.total_sales || 0)} lifetime •{' '}
            {formatCurrency(customer.total_paid || 0)} paid
          </Text>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginBottom: spacing.md,
    ...elevation.base,
  },
  content: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nameBlock: {
    flex: 1,
    marginRight: spacing.sm,
  },
  metaText: {
    color: colors.textSecondary,
  },
  collectButton: {
    margin: 0,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  balanceChip: {
    backgroundColor: colors.overlay,
  },
  balanceLabel: {
    fontWeight: '600',
  },
  summary: {
    color: colors.textSecondary,
  },
});
