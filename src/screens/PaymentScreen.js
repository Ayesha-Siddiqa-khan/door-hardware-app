import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, HelperText, RadioButton, Text, TextInput } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { PAYMENT_METHODS } from '../constants/categories';
import { fetchCustomerById } from '../services/customerService';
import { fetchSaleDetail, recordPayment } from '../services/salesService';
import { useAppState } from '../state/AppStateProvider';
import { colors } from '../constants/colors';
import { radius, spacing } from '../constants/theme';
import { useTranslation } from '../localization/LocalizationProvider';

export default function PaymentScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { refreshAll } = useAppState();
  const { t } = useTranslation();
  const { saleId, customerId } = route.params ?? {};

  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [customer, setCustomer] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadDefaults = useCallback(async () => {
    if (saleId) {
      const sale = await fetchSaleDetail(saleId);
      if (sale) {
        setCustomer({ id: sale.sale.customer_id, name: sale.sale.customer_name });
        setAmount(String(sale.sale.total_amount));
      }
    } else if (customerId) {
      const customerRecord = await fetchCustomerById(customerId);
      setCustomer(customerRecord);
    }
  }, [saleId, customerId]);

  useEffect(() => {
    loadDefaults();
  }, [loadDefaults]);

  const handleSubmit = async () => {
    if (!amount || Number(amount) <= 0) {
      setError('Enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      await recordPayment({
        sale_id: saleId ?? null,
        customer_id: customer?.id ?? customerId ?? null,
        amount: Number(amount),
        payment_method: paymentMethod,
        notes,
      });
      refreshAll();
      navigation.goBack();
    } catch (err) {
      setError('Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card} mode="contained">
        <Card.Content>
          <Text variant="titleLarge" style={styles.title}>
            {t('recordPayment')}
          </Text>

          {customer ? (
            <Text variant="bodyMedium" style={styles.subtitle}>
              {t('customers')}: {customer.name}
            </Text>
          ) : null}

          {saleId ? (
            <Text variant="bodySmall" style={styles.subtitle}>
              Invoice: {saleId}
            </Text>
          ) : null}

          <TextInput
            label="Amount"
            mode="outlined"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
            style={styles.input}
          />
          <HelperText type="error" visible={!!error}>
            {error}
          </HelperText>

          <RadioButton.Group onValueChange={setPaymentMethod} value={paymentMethod}>
            {PAYMENT_METHODS.map((method) => (
              <RadioButton.Item
                key={method.key}
                label={`${method.label}${method.key === 'credit' ? ' (Due)' : ''}`}
                value={method.key}
              />
            ))}
          </RadioButton.Group>

          <TextInput
            label={t('notesLabel')}
            value={notes}
            onChangeText={setNotes}
            multiline
            mode="outlined"
            style={styles.input}
          />

          <Button
            mode="contained"
            icon="cash-plus"
            onPress={handleSubmit}
            loading={loading}
            style={styles.button}
          >
            Save Payment
          </Button>
          <Button mode="text" onPress={() => navigation.goBack()}>
            Cancel
          </Button>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  title: {
    marginBottom: spacing.sm,
  },
  subtitle: {
    marginBottom: spacing.xs,
    color: colors.textSecondary,
  },
  input: {
    marginVertical: spacing.sm,
  },
  button: {
    marginTop: spacing.md,
  },
});
