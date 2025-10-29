import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Chip, IconButton, List, Text } from 'react-native-paper';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useAppState } from '../state/AppStateProvider';
import { fetchCustomerById } from '../services/customerService';
import {
  fetchCustomerPaymentsTotal,
  fetchSalesByCustomer,
  fetchSaleDetail,
} from '../services/salesService';
import { formatCurrency } from '../utils/formatters';
import { formatDateTime } from '../utils/date';
import { colors } from '../constants/colors';
import { radius, spacing } from '../constants/theme';
import { useTranslation } from '../localization/LocalizationProvider';

export default function CustomerDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { customerId } = route.params ?? {};
  const { refreshToken } = useAppState();
  const { t } = useTranslation();
  const [customer, setCustomer] = useState(null);
  const [sales, setSales] = useState([]);
  const [summary, setSummary] = useState({ sales: 0, paid: 0, balance: 0 });

  const loadData = useCallback(async () => {
    if (!customerId) return;
    const [customerRecord, customerSales] = await Promise.all([
      fetchCustomerById(customerId),
      fetchSalesByCustomer(customerId),
    ]);
    const totalSales = customerSales.reduce((acc, sale) => acc + sale.total_amount, 0);
    const totalPaid = await fetchCustomerPaymentsTotal(customerId);
    setCustomer(customerRecord);
    setSales(customerSales);
    setSummary({
      sales: totalSales,
      paid: totalPaid,
      balance: totalSales - totalPaid,
    });
  }, [customerId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData, refreshToken])
  );

  const openSale = async (saleId) => {
    const sale = await fetchSaleDetail(saleId);
    if (sale) {
      navigation.navigate('Invoice', { saleId });
    }
  };

  if (!customer) {
    return (
      <View style={styles.center}>
        <Text>{t('loadingDashboard')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Card style={styles.headerCard} mode="contained">
        <Card.Content>
          <View style={styles.headerRow}>
            <View style={styles.identity}>
              <Text variant="titleLarge" style={styles.name}>
                {customer.name}
              </Text>
              {customer.phone ? (
                <Text variant="bodySmall" style={styles.meta}>
                  {customer.phone}
                </Text>
              ) : null}
              <Text variant="bodySmall" style={styles.meta}>
                {customer.address ? `${customer.address}, ${customer.city}` : customer.city || '—'}
              </Text>
            </View>
            <IconButton
              icon="cash-plus"
              size={24}
              onPress={() => navigation.navigate('Payment', { customerId })}
            />
          </View>

          <View style={styles.statRow}>
            <Chip icon="shopping" style={styles.statChip}>
              {formatCurrency(summary.sales)} sold
            </Chip>
            <Chip icon="cash-check" style={styles.statChip}>
              {formatCurrency(summary.paid)} paid
            </Chip>
            <Chip
              icon={summary.balance > 0 ? 'alert-circle' : 'check-circle'}
              style={[
                styles.statChip,
                summary.balance > 0 && { backgroundColor: colors.overlay },
              ]}
            >
              {t('dueLabel')} {formatCurrency(summary.balance)}
            </Chip>
          </View>

          <View style={styles.actions}>
            <Chip icon="cash-plus" onPress={() => navigation.navigate('Payment', { customerId })}>
              {t('recordPayment')}
            </Chip>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.listCard} mode="contained">
        <Card.Title title={t('salesHistory')} titleVariant="titleMedium" />
        <Card.Content>
          {sales.length === 0 ? (
            <Text style={styles.empty}>{t('noData')}</Text>
          ) : (
            sales.map((item) => (
              <List.Item
                key={item.id}
                title={`${item.invoice_number} • ${formatCurrency(item.total_amount)}`}
                description={`${formatDateTime(item.sale_date)} • ${item.payment_status}`}
                style={styles.saleItem}
                onPress={() => openSale(item.id)}
                right={() => <IconButton icon="chevron-right" />}
              />
            ))
          )}
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.md,
  },
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  identity: {
    flex: 1,
    gap: spacing.xs,
  },
  name: {
    color: colors.text,
  },
  meta: {
    color: colors.textSecondary,
  },
  statRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  statChip: {
    backgroundColor: colors.surfaceMuted,
  },
  actions: {
    marginTop: spacing.md,
    flexDirection: 'row',
  },
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  saleItem: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  empty: {
    textAlign: 'center',
    color: colors.textSecondary,
    paddingVertical: spacing.lg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
