import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Card, Chip, IconButton, List, Text } from 'react-native-paper';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { fetchCustomerById } from '../services/customerService';
import {
  fetchCustomerPaymentsTotal,
  fetchSalesByCustomer,
  fetchSaleDetail,
} from '../services/salesService';
import { formatCurrency } from '../utils/formatters';
import { formatDateTime } from '../utils/date';

export default function CustomerDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { customerId } = route.params ?? {};
  const [customer, setCustomer] = useState(null);
  const [sales, setSales] = useState([]);
  const [totals, setTotals] = useState({ sales: 0, paid: 0, balance: 0 });

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
    setTotals({
      sales: totalSales,
      paid: totalPaid,
      balance: totalSales - totalPaid,
    });
  }, [customerId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
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
        <Text>Loading customer...</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      ListHeaderComponent={
        <Card style={styles.card}>
          <Card.Title
            title={customer.name}
            subtitle={customer.phone}
            right={(props) => (
              <IconButton
                {...props}
                icon="cash-plus"
                onPress={() => navigation.navigate('Payment', { customerId })}
              />
            )}
          />
          <Card.Content>
            {customer.address ? (
              <Text variant="bodySmall" style={styles.muted}>
                {customer.address}, {customer.city}
              </Text>
            ) : null}
            <View style={styles.summaryRow}>
              <Chip icon="shopping" mode="outlined">
                Sales: {formatCurrency(totals.sales)}
              </Chip>
              <Chip icon="cash-check" mode="outlined">
                Paid: {formatCurrency(totals.paid)}
              </Chip>
              <Chip icon="cash-remove" mode="outlined" selected={totals.balance > 0}>
                Balance: {formatCurrency(totals.balance)}
              </Chip>
            </View>
            <View style={styles.actions}>
              <Chip icon="cash-plus" onPress={() => navigation.navigate('Payment', { customerId })}>
                Record Payment
              </Chip>
            </View>
          </Card.Content>
        </Card>
      }
      data={sales}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => (
        <List.Item
          title={`${item.invoice_number} • ${formatCurrency(item.total_amount)}`}
          description={`${formatDateTime(item.sale_date)} • ${item.payment_status}`}
          onPress={() => openSale(item.id)}
          right={() => <IconButton icon="chevron-right" />}
        />
      )}
      ListEmptyComponent={<Text style={styles.empty}>No sales recorded yet</Text>}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  content: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  actions: {
    marginTop: 16,
    flexDirection: 'row',
  },
  empty: {
    textAlign: 'center',
    marginTop: 32,
    color: '#6B778D',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  muted: {
    color: '#6B778D',
  },
});
