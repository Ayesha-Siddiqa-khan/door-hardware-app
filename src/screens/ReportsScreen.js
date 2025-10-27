import { useCallback, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Card, Chip, List, SegmentedButtons, Text } from 'react-native-paper';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { useFocusEffect } from '@react-navigation/native';
import { useAppState } from '../state/AppStateProvider';
import {
  getSalesSummary,
  getTopSellingProducts,
  getCustomerCreditSummary,
} from '../services/reportService';
import { formatCurrency } from '../utils/formatters';

const chartWidth = Dimensions.get('window').width - 32;

export default function ReportsScreen() {
  const { refreshToken } = useAppState();
  const [range, setRange] = useState('daily');
  const [summary, setSummary] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [creditCustomers, setCreditCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryData, topProductsData, creditData] = await Promise.all([
        getSalesSummary(range),
        getTopSellingProducts(5, range),
        getCustomerCreditSummary(),
      ]);
      setSummary(summaryData);
      setTopProducts(topProductsData);
      setCreditCustomers(creditData);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [loadReports, refreshToken])
  );

  if (loading && !summary) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const paymentBreakdown = summary?.paymentBreakdown ?? [];
  const paymentChartData = {
    labels: paymentBreakdown.map((item) => item.payment_method.toUpperCase()),
    datasets: [
      {
        data: paymentBreakdown.map((item) => Number(item.total || 0)),
        color: () => '#1F4690',
      },
    ],
  };

  const pieData = paymentBreakdown.map((item, index) => ({
    name: item.payment_method,
    amount: Number(item.total || 0),
    color: ['#1F4690', '#FF7A00', '#4CAF50', '#9C27B0'][index % 4],
    legendFontColor: '#333',
    legendFontSize: 12,
  }));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <SegmentedButtons
        value={range}
        onValueChange={setRange}
        buttons={[
          { value: 'daily', label: 'Daily' },
          { value: 'weekly', label: 'Weekly' },
          { value: 'monthly', label: 'Monthly' },
        ]}
        style={styles.segmented}
      />

      <View style={styles.summaryRow}>
        <Card style={styles.summaryCard}>
          <Card.Content>
            <Text variant="labelMedium">Revenue</Text>
            <Text variant="headlineSmall">{formatCurrency(summary?.totals?.revenue || 0)}</Text>
            <Text variant="bodySmall">Invoices: {summary?.totals?.invoices || 0}</Text>
          </Card.Content>
        </Card>
        <Card style={styles.summaryCard}>
          <Card.Content>
            <Text variant="labelMedium">Net Profit</Text>
            <Text variant="headlineSmall">{formatCurrency(summary?.netProfit || 0)}</Text>
            <Text variant="bodySmall">Expenses {formatCurrency(summary?.totalExpenses || 0)}</Text>
          </Card.Content>
        </Card>
      </View>

      <Card style={styles.chartCard}>
        <Card.Title title="Payment Breakdown" subtitle={`${paymentBreakdown.length} methods`} />
        <Card.Content>
          {paymentBreakdown.length ? (
            <PieChart
              data={pieData}
              width={chartWidth}
              height={220}
              accessor="amount"
              backgroundColor="transparent"
              paddingLeft="16"
              chartConfig={chartConfig}
            />
          ) : (
            <Text>No payments recorded for this range.</Text>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.chartCard}>
        <Card.Title title="Collections" subtitle="Cash vs Digital" />
        <Card.Content>
          {paymentBreakdown.length ? (
            <LineChart
              data={paymentChartData}
              width={chartWidth}
              height={220}
              chartConfig={chartConfig}
              bezier
            />
          ) : (
            <Text>No data to display.</Text>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.chartCard}>
        <Card.Title title="Top Products" subtitle="Quantity sold" />
        <Card.Content>
          {topProducts.length ? (
            topProducts.map((product) => (
              <List.Item
                key={product.id}
                title={product.name}
                description={`${product.total_quantity} pcs â€¢ ${formatCurrency(product.total_sales)}`}
                left={(props) => <List.Icon {...props} icon="star" />}
              />
            ))
          ) : (
            <Text>No product sales in this range.</Text>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.chartCard}>
        <Card.Title title="Outstanding Credit" subtitle="Top customers" />
        <Card.Content>
          {creditCustomers.length ? (
            creditCustomers.slice(0, 5).map((customer) => (
              <List.Item
                key={customer.id}
                title={customer.name}
                description={`Due ${formatCurrency(customer.balance)} â€¢ Paid ${formatCurrency(customer.total_paid)}`}
                left={(props) => <List.Icon {...props} icon="account-alert" />}
              />
            ))
          ) : (
            <Text>No outstanding credit customers.</Text>
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const chartConfig = {
  backgroundColor: '#1F4690',
  backgroundGradientFrom: '#1F4690',
  backgroundGradientTo: '#1F4690',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: '#FFA500',
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  segmented: {
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
  },
  chartCard: {
    marginTop: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

