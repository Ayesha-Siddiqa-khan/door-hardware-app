import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Card, Chip, List, Text } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';

import { useTranslation } from '../localization/LocalizationProvider';
import { useAppState } from '../state/AppStateProvider';
import { getSalesSummary } from '../services/reportService';
import { fetchLowStockProducts } from '../services/productService';
import { fetchOutstandingCustomers } from '../services/customerService';
import { formatCurrency } from '../utils/formatters';
import { ReportCard } from '../components/ReportCard';
import { colors } from '../constants/colors';
import { radius, spacing } from '../constants/theme';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { refreshToken } = useAppState();
  const db = useSQLiteContext();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange] = useState('daily');
  const [summary, setSummary] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [outstanding, setOutstanding] = useState([]);

  const periodLabels = useMemo(
    () => ({
      daily: t('dailyReport'),
      weekly: t('weeklyReport'),
      monthly: t('monthlyReport'),
    }),
    [t]
  );

  const periodOptions = useMemo(
    () => [
      { key: 'daily', label: periodLabels.daily },
      { key: 'weekly', label: periodLabels.weekly },
      { key: 'monthly', label: periodLabels.monthly },
    ],
    [periodLabels]
  );

  const quickActions = useMemo(
    () => [
      {
        label: t('newSale'),
        icon: 'cart-plus',
        onPress: () => navigation.navigate('NewSale'),
      },
      {
        label: t('products'),
        icon: 'cube-outline',
        onPress: () => navigation.navigate('Products'),
      },
      {
        label: t('customers'),
        icon: 'account-group',
        onPress: () => navigation.navigate('CustomerList'),
      },
      {
        label: t('expenses'),
        icon: 'cash-minus',
        onPress: () => navigation.navigate('Expenses'),
      },
    ],
    [navigation, t]
  );

  const loadData = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setLoading(true);
      }
      try {
        const [salesSummary, lowStockProducts, outstandingCustomers] = await Promise.all([
          getSalesSummary(range, {}, db),
          fetchLowStockProducts(db),
          fetchOutstandingCustomers(db),
        ]);

        setSummary(salesSummary);
        setLowStock(lowStockProducts.slice(0, 5));
        setOutstanding(outstandingCustomers.slice(0, 5));
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [db, range]
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData({ silent: true });
    setRefreshing(false);
  }, [loadData]);

  const timeframeCaption = useMemo(() => {
    if (!summary?.range) return '';
    const start = new Date(summary.range.startDate);
    const end = new Date(summary.range.endDate);
    const startLabel = start.toLocaleDateString();
    const endLabel = end.toLocaleDateString();
    return startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;
  }, [summary]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData, refreshToken])
  );

  const invoicesCount = summary?.totals?.invoices ?? 0;
  const invoiceAverage = invoicesCount > 0 ? (summary?.totals?.revenue || 0) / invoicesCount : 0;

  const kpis = [
    {
      metric: 'revenue',
      title: t('totalRevenue'),
      value: formatCurrency(summary?.totals?.revenue || 0),
      subtitle: `${invoicesCount} ${t('invoices')}`,
      icon: <MaterialCommunityIcons name="chart-line" size={22} color={colors.primary} />,
    },
    {
      metric: 'averageSale',
      title: t('averageSale'),
      value: formatCurrency(invoiceAverage),
      subtitle: periodLabels[range],
      icon: <MaterialCommunityIcons name="calculator-variant" size={22} color={colors.primary} />,
    },
    {
      metric: 'profit',
      title: t('netProfit'),
      value: formatCurrency(summary?.netProfit || 0),
      subtitle: `${t('expensesLabel')} ${formatCurrency(summary?.totalExpenses || 0)}`,
      icon: <MaterialCommunityIcons name="cash-multiple" size={22} color={colors.primary} />,
    },
    {
      metric: 'expenses',
      title: t('expensesLabel'),
      value: formatCurrency(summary?.totalExpenses || 0),
      subtitle: periodLabels[range],
      icon: <MaterialCommunityIcons name="receipt" size={22} color={colors.primary} />,
    },
  ];

  if (loading && !summary) {
    return (
      <View style={styles.center}>
        <Text>{t('loadingDashboard')}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.heading}>
          {t('home')}
        </Text>
        <Text variant="bodySmall" style={styles.periodLabel}>
          {periodLabels[range]}
        </Text>
        {timeframeCaption ? (
          <Text variant="bodySmall" style={styles.subheading}>
            {timeframeCaption}
          </Text>
        ) : null}
      </View>

      <View style={styles.periodToggle}>
        {periodOptions.map((option) => (
          <Chip
            key={option.key}
            mode={range === option.key ? 'flat' : 'outlined'}
            selected={range === option.key}
            style={[styles.periodChip, range === option.key && styles.periodChipSelected]}
            textStyle={[styles.periodChipText, range === option.key && styles.periodChipTextSelected]}
            onPress={() => setRange(option.key)}
          >
            {option.label}
          </Chip>
        ))}
      </View>

      <Card style={styles.summaryCard} mode="contained">
        <Card.Content>
          <View style={styles.summaryHeader}>
            <View>
              <Text variant="labelSmall" style={styles.summaryCaption}>
                {periodLabels[range]}
              </Text>
              <Text variant="headlineMedium" style={styles.summaryHighlight}>
                {formatCurrency(summary?.totals?.revenue || 0)}
              </Text>
            </View>
            <View style={styles.summaryInvoices}>
              <Text variant="labelSmall" style={styles.summaryCaption}>
                {t('invoices')}
              </Text>
              <Text variant="titleLarge" style={styles.summaryInvoicesValue}>
                {summary?.totals?.invoices ?? 0}
              </Text>
            </View>
          </View>
          {timeframeCaption ? (
            <Text variant="bodySmall" style={styles.summaryRange}>
              {timeframeCaption}
            </Text>
          ) : null}
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text variant="labelMedium" style={styles.summaryLabel}>
                {t('received')}
              </Text>
              <Text variant="titleMedium" style={styles.summaryValue}>
                {formatCurrency(summary?.totals?.netRevenue || 0)}
              </Text>
              <Text variant="bodySmall" style={styles.summarySubvalue}>
                {t('cashDigital')}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text variant="labelMedium" style={styles.summaryLabel}>
                {t('pendingPayments')}
              </Text>
              <Text variant="titleMedium" style={styles.summaryValue}>
                {formatCurrency(summary?.totals?.creditSales || 0)}
              </Text>
              <Text variant="bodySmall" style={styles.summarySubvalue}>
                {t('creditOutstanding')}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.kpiScroller}
        style={styles.kpiScrollWrapper}
      >
        {kpis.map((item) => (
          <ReportCard
            key={item.metric}
            title={item.title}
            value={item.value}
            subtitle={item.subtitle}
            icon={item.icon}
            onPress={() =>
              navigation.navigate('AnalyticsDetail', {
                metric: item.metric,
                range,
                periodLabel: periodLabels[range],
                timeframe: timeframeCaption,
                rangeDates: summary?.range,
              })
            }
          />
        ))}
      </ScrollView>

      <View style={styles.quickActions}>
        {quickActions.map((action) => (
          <Chip
            key={action.label}
            icon={action.icon}
            style={styles.actionChip}
            textStyle={styles.actionChipText}
            onPress={action.onPress}
          >
            {action.label}
          </Chip>
        ))}
      </View>

      <DashboardSection
        title={t('lowStock')}
        emptyText={t('noData')}
        items={lowStock}
        renderItem={(item) => (
          <List.Item
            key={item.id}
            title={item.name}
            description={`${t('stockLabel')} ${item.stock_quantity} | ${t('minLabel')} ${item.min_stock_level}`}
            left={(props) => <List.Icon {...props} icon="alert-outline" color={colors.warning} />}
            onPress={() => navigation.navigate('Products', { highlightId: item.id })}
          />
        )}
      />

      <DashboardSection
        title={t('outstandingBalance')}
        emptyText={t('noData')}
        items={outstanding}
        renderItem={(customer) => (
          <List.Item
            key={customer.id}
            title={customer.name}
            description={`${t('dueLabel')} ${formatCurrency(customer.balance)}`}
            left={(props) => <List.Icon {...props} icon="account-alert" color={colors.warning} />}
            onPress={() => navigation.navigate('CustomerDetail', { customerId: customer.id })}
          />
        )}
      />

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

function DashboardSection({ title, items, emptyText, renderItem }) {
  return (
    <Card style={styles.sectionCard} mode="contained">
      <Card.Title title={title} titleVariant="titleMedium" />
      <Card.Content style={styles.sectionContent}>
        {items.length === 0 ? (
          <Text variant="bodySmall" style={styles.emptyText}>
            {emptyText}
          </Text>
        ) : (
          items.map(renderItem)
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  header: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  heading: {
    color: colors.text,
  },
  subheading: {
    color: colors.muted,
  },
  periodLabel: {
    marginTop: spacing.xs / 2,
    color: colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  periodToggle: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  periodChip: {
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: colors.surface,
  },
  periodChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  periodChipText: {
    fontWeight: '600',
    color: colors.textSecondary,
  },
  periodChipTextSelected: {
    color: '#FFFFFF',
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  summaryCaption: {
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  summaryHighlight: {
    color: colors.text,
    fontWeight: '700',
  },
  summaryInvoices: {
    alignItems: 'flex-end',
  },
  summaryInvoicesValue: {
    color: colors.primary,
    fontWeight: '700',
  },
  summaryRange: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
    flexWrap: 'wrap',
  },
  summaryItem: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  summaryLabel: {
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  summaryValue: {
    color: colors.text,
    fontWeight: '700',
  },
  summarySubvalue: {
    marginTop: spacing.xs,
    color: colors.muted,
  },
  kpiScrollWrapper: {
    marginBottom: spacing.lg,
  },
  kpiScroller: {
    paddingHorizontal: spacing.xs,
    paddingRight: spacing.lg,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  actionChip: {
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionChipText: {
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  sectionContent: {
    paddingTop: 0,
  },
  emptyText: {
    paddingVertical: spacing.md,
    color: colors.textSecondary,
  },
  bottomSpacer: {
    height: spacing.xxl,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});




