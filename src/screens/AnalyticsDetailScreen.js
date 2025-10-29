import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Card, List, Text } from 'react-native-paper';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';

import { useTranslation } from '../localization/LocalizationProvider';
import { useAppState } from '../state/AppStateProvider';
import {
  getExpenseSummary,
  getSalesSummary,
  getTopSellingProducts,
} from '../services/reportService';
import { formatCurrency } from '../utils/formatters';
import { colors } from '../constants/colors';
import { radius, spacing } from '../constants/theme';

const METRIC_KEYS = {
  revenue: 'revenue',
  averageSale: 'averageSale',
  profit: 'profit',
  expenses: 'expenses',
};

function formatRangeLabel(range) {
  if (!range?.startDate || !range?.endDate) {
    return '';
  }
  const start = new Date(range.startDate);
  const end = new Date(range.endDate);
  const startLabel = start.toLocaleDateString();
  const endLabel = end.toLocaleDateString();
  return startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;
}

export default function AnalyticsDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { refreshToken } = useAppState();
  const db = useSQLiteContext();

  const metric = route.params?.metric ?? METRIC_KEYS.revenue;
  const range = route.params?.range ?? 'daily';
  const periodLabel = route.params?.periodLabel;
  const passedRange = route.params?.rangeDates;
  const passedTimeframe = route.params?.timeframe;

  const metricContent = useMemo(
    () => ({
      [METRIC_KEYS.revenue]: {
        title: t('analyticsRevenueTitle'),
        description: t('analyticsRevenueDescription'),
      },
      [METRIC_KEYS.averageSale]: {
        title: t('analyticsAverageSaleTitle'),
        description: t('analyticsAverageSaleDescription'),
      },
      [METRIC_KEYS.profit]: {
        title: t('analyticsProfitTitle'),
        description: t('analyticsProfitDescription'),
      },
      [METRIC_KEYS.expenses]: {
        title: t('analyticsExpenseTitle'),
        description: t('analyticsExpenseDescription'),
      },
    }),
    [t]
  );

  const config = metricContent[metric] ?? metricContent[METRIC_KEYS.revenue];

  const [summary, setSummary] = useState(null);
  const [expensesByCategory, setExpensesByCategory] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({ title: config.title });
  }, [navigation, config.title]);

  const timeframeLabel = useMemo(() => {
    if (passedTimeframe) return passedTimeframe;
    if (passedRange) return formatRangeLabel(passedRange);
    if (summary?.range) return formatRangeLabel(summary.range);
    if (periodLabel) return periodLabel;
    return '';
  }, [passedTimeframe, passedRange, summary, periodLabel]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const salesSummary = await getSalesSummary(range, {}, db);
      setSummary(salesSummary);

      if (metric === METRIC_KEYS.averageSale) {
        const products = await getTopSellingProducts(5, range, {}, db);
        setTopProducts(products);
      } else {
        setTopProducts([]);
      }

      if (metric === METRIC_KEYS.expenses || metric === METRIC_KEYS.profit) {
        const expenseSummary = await getExpenseSummary(range, {}, db);
        setExpensesByCategory(expenseSummary);
      } else {
        setExpensesByCategory([]);
      }
    } finally {
      setLoading(false);
    }
  }, [db, metric, range]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData, refreshToken])
  );

  if (loading && !summary) {
    return (
      <View style={styles.center}>
        <Text>{t('loadingDashboard')}</Text>
      </View>
    );
  }

  const totals = summary?.totals ?? {};
  const totalRevenue = totals.revenue ?? 0;
  const netRevenue = totals.netRevenue ?? 0;
  const creditSales = totals.creditSales ?? 0;
  const invoiceCount = totals.invoices ?? 0;
  const avgInvoiceValue = invoiceCount > 0 ? totalRevenue / invoiceCount : 0;
  const totalExpenses = summary?.totalExpenses ?? 0;
  const netProfit = summary?.netProfit ?? 0;
  const margin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const paymentBreakdown = summary?.paymentBreakdown ?? [];
  const categorySales = summary?.categorySales ?? [];

  const totalExpenseEntries = expensesByCategory.reduce(
    (acc, item) => acc + (item.entries ?? 0),
    0
  );

  const noRecordsText = t('analyticsNoRecords');

  const renderPaymentBreakdown = () => (
    <Card style={styles.sectionCard}>
      <Card.Title title={t('analyticsPaymentMethods')} />
      <Card.Content>
        {paymentBreakdown.length === 0 ? (
          <Text style={styles.emptyText}>{noRecordsText}</Text>
        ) : (
          paymentBreakdown.map((item) => {
            const label =
              item.payment_method
                ?.replace(/_/g, ' ')
                ?.replace(/\b\w/g, (char) => char.toUpperCase()) ?? t('noData');
            return (
              <List.Item
                key={item.payment_method ?? label}
                title={label}
                right={() => (
                  <Text style={styles.listAmount}>{formatCurrency(item.total ?? 0)}</Text>
                )}
              />
            );
          })
        )}
      </Card.Content>
    </Card>
  );

  const renderCategorySales = () => (
    <Card style={styles.sectionCard}>
      <Card.Title title={t('analyticsTopCategories')} />
      <Card.Content>
        {categorySales.length === 0 ? (
          <Text style={styles.emptyText}>{noRecordsText}</Text>
        ) : (
          categorySales.map((item, index) => (
            <List.Item
              key={item.category || index}
              title={item.category || t('noData')}
              description={`${item.quantity ?? 0} ${t('analyticsUnitsSold')}`}
              right={() => (
                <Text style={styles.listAmount}>{formatCurrency(item.total ?? 0)}</Text>
              )}
            />
          ))
        )}
      </Card.Content>
    </Card>
  );

  const renderTopProducts = () => (
    <Card style={styles.sectionCard}>
      <Card.Title title={t('analyticsTopProducts')} />
      <Card.Content>
        {topProducts.length === 0 ? (
          <Text style={styles.emptyText}>{t('analyticsNoProducts')}</Text>
        ) : (
          topProducts.map((item) => (
            <List.Item
              key={item.id}
              title={item.name}
              description={`${item.total_quantity ?? 0} ${t('analyticsUnitsSold')}`}
              right={() => (
                <Text style={styles.listAmount}>{formatCurrency(item.total_sales ?? 0)}</Text>
              )}
            />
          ))
        )}
      </Card.Content>
    </Card>
  );

  const renderExpenseBreakdown = (titleText = t('analyticsExpenseTitle')) => (
    <Card style={styles.sectionCard}>
      <Card.Title title={titleText} />
      <Card.Content>
        {expensesByCategory.length === 0 ? (
          <Text style={styles.emptyText}>{t('analyticsNoExpenses')}</Text>
        ) : (
          expensesByCategory.map((item) => (
            <List.Item
              key={item.category}
              title={item.category || t('noData')}
              description={`${item.entries ?? 0} ${t('analyticsEntries')}`}
              right={() => (
                <Text style={styles.listAmount}>{formatCurrency(item.total ?? 0)}</Text>
              )}
            />
          ))
        )}
      </Card.Content>
    </Card>
  );

  const renderIntroCard = () => (
    <Card style={styles.introCard} mode="contained">
      <Card.Content>
        <Text variant="titleMedium" style={styles.introTitle}>
          {config.title}
        </Text>
        <Text variant="bodyMedium" style={styles.introDescription}>
          {config.description}
        </Text>
        {timeframeLabel ? (
          <Text variant="labelSmall" style={styles.introRange}>
            {t('analyticsTimeRange')}: {timeframeLabel}
          </Text>
        ) : null}
      </Card.Content>
    </Card>
  );

  const renderMetricSummary = () => {
    switch (metric) {
      case METRIC_KEYS.revenue:
        return (
          <>
            <Card style={styles.statCard}>
              <Card.Content>
                <Text variant="labelMedium" style={styles.statLabel}>
                  {t('analyticsTotalRevenue')}
                </Text>
                <Text variant="headlineLarge" style={styles.statValue}>
                  {formatCurrency(totalRevenue)}
                </Text>
                <View style={styles.statRow}>
                  <View style={styles.statItem}>
                    <Text variant="labelSmall" style={styles.statSubLabel}>
                      {t('analyticsCollected')}
                    </Text>
                    <Text variant="titleMedium" style={styles.statSubValue}>
                      {formatCurrency(netRevenue)}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text variant="labelSmall" style={styles.statSubLabel}>
                      {t('analyticsCreditOutstanding')}
                    </Text>
                    <Text variant="titleMedium" style={styles.statSubValue}>
                      {formatCurrency(creditSales)}
                    </Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
            {renderPaymentBreakdown()}
            {renderCategorySales()}
          </>
        );
      case METRIC_KEYS.averageSale:
        return (
          <>
            <Card style={styles.statCard}>
              <Card.Content>
                <Text variant="labelMedium" style={styles.statLabel}>
                  {t('analyticsAverageInvoiceValue')}
                </Text>
                <Text variant="headlineLarge" style={styles.statValue}>
                  {formatCurrency(avgInvoiceValue)}
                </Text>
                <View style={styles.statRow}>
                  <View style={styles.statItem}>
                    <Text variant="labelSmall" style={styles.statSubLabel}>
                      {t('analyticsRevenue')}
                    </Text>
                    <Text variant="titleMedium" style={styles.statSubValue}>
                      {formatCurrency(totalRevenue)}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text variant="labelSmall" style={styles.statSubLabel}>
                      {t('analyticsInvoices')}
                    </Text>
                    <Text variant="titleMedium" style={styles.statSubValue}>
                      {invoiceCount}
                    </Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
            {renderTopProducts()}
            {renderCategorySales()}
          </>
        );
      case METRIC_KEYS.profit:
        return (
          <>
            <Card style={styles.statCard}>
              <Card.Content>
                <Text variant="labelMedium" style={styles.statLabel}>
                  {t('netProfit')}
                </Text>
                <Text variant="headlineLarge" style={styles.statValue}>
                  {formatCurrency(netProfit)}
                </Text>
                <View style={styles.statRow}>
                  <View style={styles.statItem}>
                    <Text variant="labelSmall" style={styles.statSubLabel}>
                      {t('analyticsRevenue')}
                    </Text>
                    <Text variant="titleMedium" style={styles.statSubValue}>
                      {formatCurrency(totalRevenue)}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text variant="labelSmall" style={styles.statSubLabel}>
                      {t('analyticsTotalExpenses')}
                    </Text>
                    <Text variant="titleMedium" style={styles.statSubValue}>
                      {formatCurrency(totalExpenses)}
                    </Text>
                  </View>
                </View>
                <Text variant="bodySmall" style={styles.statFootnote}>
                  {t('analyticsMargin')}: {margin.toFixed(1)}%
                </Text>
              </Card.Content>
            </Card>
            {renderExpenseBreakdown(t('analyticsExpenseTitle'))}
          </>
        );
      case METRIC_KEYS.expenses:
      default:
        return (
          <>
            <Card style={styles.statCard}>
              <Card.Content>
                <Text variant="labelMedium" style={styles.statLabel}>
                  {t('analyticsTotalExpenses')}
                </Text>
                <Text variant="headlineLarge" style={styles.statValue}>
                  {formatCurrency(totalExpenses)}
                </Text>
                <Text variant="bodySmall" style={styles.statFootnote}>
                  {t('analyticsEntries')}: {totalExpenseEntries}
                </Text>
              </Card.Content>
            </Card>
            {renderExpenseBreakdown(t('analyticsExpenseTitle'))}
          </>
        );
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {renderIntroCard()}
      {renderMetricSummary()}
      <View style={styles.bottomSpacer} />
    </ScrollView>
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  introCard: {
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  introTitle: {
    color: colors.text,
    marginBottom: spacing.xs,
  },
  introDescription: {
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  introRange: {
    color: colors.muted,
  },
  statCard: {
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  statLabel: {
    color: colors.textSecondary,
  },
  statValue: {
    color: colors.text,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  statItem: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  statSubLabel: {
    color: colors.textSecondary,
    marginBottom: spacing.xs / 2,
  },
  statSubValue: {
    color: colors.text,
    fontWeight: '600',
  },
  statFootnote: {
    marginTop: spacing.sm,
    color: colors.muted,
  },
  sectionCard: {
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  listAmount: {
    color: colors.text,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: spacing.xxl,
  },
});
