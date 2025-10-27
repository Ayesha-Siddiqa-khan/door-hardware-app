import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, List, Text } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from '../localization/LocalizationProvider';
import { useAppState } from '../state/AppStateProvider';
import { getSalesSummary } from '../services/reportService';
import { fetchLowStockProducts } from '../services/productService';
import { fetchOutstandingCustomers } from '../services/customerService';
import { formatCurrency } from '../utils/formatters';
import { ReportCard } from '../components/ReportCard';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { refreshToken } = useAppState();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [outstanding, setOutstanding] = useState([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [dailySummary, lowStockProducts, outstandingCustomers] = await Promise.all([
        getSalesSummary('daily'),
        fetchLowStockProducts(),
        fetchOutstandingCustomers(),
      ]);

      setSummary(dailySummary);
      setLowStock(lowStockProducts.slice(0, 5));
      setOutstanding(outstandingCustomers.slice(0, 5));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData, refreshToken])
  );

  if (loading && !summary) {
    return (
      <View style={styles.center}>
        <Text>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="headlineSmall" style={styles.heading}>
        {t('home')}
      </Text>
      <View style={styles.cardsRow}>
        <ReportCard
          title={t('todaysSales')}
          value={formatCurrency(summary?.totals?.revenue || 0)}
          subtitle={`${summary?.totals?.invoices ?? 0} invoices`}
          icon="ðŸ“ˆ"
        />
        <ReportCard
          title={t('pendingPayments')}
          value={formatCurrency(summary?.totals?.creditSales || 0)}
          subtitle="Credit outstanding"
          icon="ðŸ§¾"
        />
      </View>
      <View style={styles.cardsRow}>
        <ReportCard
          title="Net Profit"
          value={formatCurrency(summary?.netProfit || 0)}
          subtitle={`Expenses ${formatCurrency(summary?.totalExpenses || 0)}`}
          icon="ðŸ’°"
        />
        <ReportCard
          title="Received"
          value={formatCurrency(summary?.totals?.netRevenue || 0)}
          subtitle="Cash + Digital"
          icon="ðŸ’³"
        />
      </View>

      <Text variant="titleMedium" style={styles.sectionTitle}>
        {t('quickActions')}
      </Text>
      <View style={styles.actionsRow}>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('NewSale')}
          icon="cart-plus"
          style={styles.actionButton}
        >
          {t('newSale')}
        </Button>
        <Button
          mode="outlined"
          onPress={() => navigation.navigate('Products')}
          icon="cube"
          style={styles.actionButton}
        >
          {t('products')}
        </Button>
        <Button
          mode="outlined"
          onPress={() => navigation.navigate('CustomerList')}
          icon="account-group"
          style={styles.actionButton}
        >
          {t('customers')}
        </Button>
      </View>

      <Text variant="titleMedium" style={styles.sectionTitle}>
        {t('lowStock')}
      </Text>
      {lowStock.length === 0 ? (
        <List.Item title={t('noData')} left={(props) => <List.Icon {...props} icon="check" />} />
      ) : (
        lowStock.map((item) => (
          <List.Item
            key={item.id}
            title={item.name}
            description={`Stock ${item.stock_quantity} â€¢ Min ${item.min_stock_level}`}
            left={(props) => <List.Icon {...props} icon="alert-outline" />}
            onPress={() => navigation.navigate('Products', { highlightId: item.id })}
          />
        ))
      )}

      <Text variant="titleMedium" style={styles.sectionTitle}>
        {t('outstandingBalance')}
      </Text>
      {outstanding.length === 0 ? (
        <List.Item title={t('noData')} left={(props) => <List.Icon {...props} icon="check" />} />
      ) : (
        outstanding.map((customer) => (
          <List.Item
            key={customer.id}
            title={customer.name}
            description={`Due ${formatCurrency(customer.balance)}`}
            left={(props) => <List.Icon {...props} icon="account-alert" />}
            onPress={() => navigation.navigate('CustomerDetail', { customerId: customer.id })}
          />
        ))
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  heading: {
    marginBottom: 12,
  },
  cardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  bottomSpacer: {
    height: 48,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

