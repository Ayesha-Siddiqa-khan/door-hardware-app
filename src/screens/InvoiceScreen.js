import { useCallback, useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { Button, Card, List, Text } from 'react-native-paper';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { useAppState } from '../state/AppStateProvider';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import { fetchSaleDetail } from '../services/salesService';
import { formatCurrency } from '../utils/formatters';
import { formatDateTime } from '../utils/date';
import { colors } from '../constants/colors';
import { radius, spacing } from '../constants/theme';

export default function InvoiceScreen() {
  const route = useRoute();
  const { saleId } = route.params ?? {};
  const { refreshToken } = useAppState();
  const [sale, setSale] = useState(null);
  const [items, setItems] = useState([]);
  const [payments, setPayments] = useState([]);

  const loadInvoice = useCallback(async () => {
    if (!saleId) return;
    const detail = await fetchSaleDetail(saleId);
    if (detail) {
      setSale(detail.sale);
      setItems(detail.items);
      setPayments(detail.payments);
    }
  }, [saleId]);

  useFocusEffect(
    useCallback(() => {
      loadInvoice();
    }, [loadInvoice, refreshToken])
  );

  if (!sale) {
    return (
      <View style={styles.center}>
        <Text>Loading invoice...</Text>
      </View>
    );
  }

  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);

  const buildInvoiceHtml = () => `
    <html>
      <body>
        <h1>Invoice ${sale.invoice_number}</h1>
        <p>Date: ${formatDateTime(sale.sale_date)}</p>
        <p>Customer: ${sale.customer_name ?? 'Walk-in'}</p>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr>
              <th style="border:1px solid #ccc;padding:8px;text-align:left;">Item</th>
              <th style="border:1px solid #ccc;padding:8px;text-align:right;">Qty</th>
              <th style="border:1px solid #ccc;padding:8px;text-align:right;">Rate</th>
              <th style="border:1px solid #ccc;padding:8px;text-align:right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map(
                (item) => `
                  <tr>
                    <td style="border:1px solid #ccc;padding:8px;">${item.product_name}</td>
                    <td style="border:1px solid #ccc;padding:8px;text-align:right;">${item.quantity}</td>
                    <td style="border:1px solid #ccc;padding:8px;text-align:right;">${item.unit_price}</td>
                    <td style="border:1px solid #ccc;padding:8px;text-align:right;">${item.total_price}</td>
                  </tr>
                `
              )
              .join('')}
          </tbody>
        </table>
        <h3>Total: ${sale.total_amount}</h3>
        <p>Paid: ${totalPaid}</p>
      </body>
    </html>
  `;

  const handlePrint = async () => {
    const html = buildInvoiceHtml();
    await Print.printAsync({ html });
  };

  const handleShare = async () => {
    const html = buildInvoiceHtml();
    const fileUri = `${FileSystem.cacheDirectory}invoice-${sale.invoice_number}.html`;
    await FileSystem.writeAsStringAsync(fileUri, html, { encoding: FileSystem.EncodingType.UTF8 });
    await Share.share({ url: fileUri, message: `Invoice ${sale.invoice_number}` });
  };

  return (
    <View style={styles.container}>
      <Card style={styles.summaryCard} mode="contained">
        <Card.Title title={`Invoice ${sale.invoice_number}`} subtitle={formatDateTime(sale.sale_date)} />
        <Card.Content>
          <Text variant="bodyMedium">Customer: {sale.customer_name ?? 'Walk-in'}</Text>
          <Text variant="bodyMedium">Payment: {sale.payment_method}</Text>
          <Text variant="bodyMedium">Status: {sale.payment_status}</Text>
          <Text variant="titleMedium" style={styles.total}>Total {formatCurrency(sale.total_amount)}</Text>
          <Text variant="bodySmall" style={styles.subtotal}>Paid {formatCurrency(totalPaid)}</Text>
        </Card.Content>
      </Card>

      <Card style={styles.sectionCard} mode="contained">
        <Card.Title title="Items" />
        <Card.Content>
          {items.map((item) => (
            <List.Item
              key={item.id}
              title={`${item.product_name} × ${item.quantity}`}
              description={formatCurrency(item.total_price)}
              style={styles.listItem}
            />
          ))}
        </Card.Content>
      </Card>

      <Card style={styles.sectionCard} mode="contained">
        <Card.Title title="Payments" />
        <Card.Content>
          {payments.length ? (
            payments.map((payment) => (
              <List.Item
                key={payment.id}
                title={formatCurrency(payment.amount)}
                description={`${payment.payment_method} • ${formatDateTime(payment.payment_date)}`}
                style={styles.listItem}
              />
            ))
          ) : (
            <Text style={styles.empty}>No payments recorded</Text>
          )}
        </Card.Content>
      </Card>

      <View style={styles.actions}>
        <Button icon="printer" mode="outlined" onPress={handlePrint}>
          Print
        </Button>
        <Button icon="share-variant" mode="contained" onPress={handleShare}>
          Share
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.lg,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  total: {
    marginTop: spacing.sm,
  },
  subtotal: {
    color: colors.textSecondary,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  listItem: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  empty: {
    textAlign: 'center',
    color: colors.textSecondary,
    paddingVertical: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
});
