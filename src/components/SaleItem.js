import { StyleSheet, View } from 'react-native';
import { Text, IconButton, Divider } from 'react-native-paper';
import { formatCurrency } from '../utils/formatters';

export function SaleItem({ item, onIncrease, onDecrease, onRemove }) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.info}>
          <Text variant="titleSmall">{item.name}</Text>
          <Text variant="bodySmall" style={styles.subText}>
            {formatCurrency(item.unit_price)} × {item.quantity}
          </Text>
        </View>
        <Text variant="titleMedium">{formatCurrency(item.total_price)}</Text>
      </View>
      <Divider style={styles.divider} />
      <View style={styles.actions}>
        <View style={styles.counter}>
          <IconButton icon="minus" size={18} onPress={onDecrease} disabled={item.quantity <= 1} />
          <Text variant="bodyMedium">{item.quantity}</Text>
          <IconButton icon="plus" size={18} onPress={onIncrease} />
        </View>
        <IconButton icon="delete" onPress={onRemove} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    elevation: 1,
    marginVertical: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginRight: 12,
  },
  subText: {
    color: '#7A8CA5',
  },
  divider: {
    marginVertical: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
