import { StyleSheet, View } from 'react-native';
import { Card, Text, Chip, IconButton } from 'react-native-paper';
import { formatCurrency, formatPhoneNumber } from '../utils/formatters';

export function CustomerCard({ customer, onPress, onCollect }) {
  const balance = customer.balance ?? 0;

  return (
    <Card style={styles.card} onPress={onPress}>
      <Card.Content>
        <View style={styles.header}>
          <Text variant="titleMedium">{customer.name}</Text>
          {balance > 0 ? (
            <Chip icon="alert-circle" compact mode="outlined">
              {formatCurrency(balance)}
            </Chip>
          ) : (
            <Chip compact mode="outlined">
              {formatCurrency(customer.total_sales || 0)}
            </Chip>
          )}
        </View>
        {customer.phone ? (
          <Text variant="bodySmall" style={styles.subText}>
            {formatPhoneNumber(customer.phone)}
          </Text>
        ) : null}
        {customer.city ? (
          <Text variant="bodySmall" style={styles.subText}>
            {customer.city}
          </Text>
        ) : null}
        {onCollect ? (
          <View style={styles.actions}>
            <IconButton icon="cash-plus" onPress={onCollect} />
          </View>
        ) : null}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  subText: {
    color: '#6B778D',
  },
  actions: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
});
