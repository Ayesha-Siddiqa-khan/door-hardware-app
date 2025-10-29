import { StyleSheet, View, Image } from 'react-native';
import { Card, Text, Chip, ProgressBar } from 'react-native-paper';
import { colors } from '../constants/colors';
import { getProductCategoryLabel } from '../constants/categories';
import { formatCurrency } from '../utils/formatters';

export function ProductCard({ product, onPress, actions }) {
  const stockLevel = Math.min(
    1,
    product.min_stock_level > 0 ? product.stock_quantity / product.min_stock_level : 1
  );
  const lowStock = product.stock_quantity <= product.min_stock_level;

  return (
    <Card style={styles.card} onPress={onPress}>
      <Card.Content style={styles.row}>
        {product.image_uri ? (
          <Image source={{ uri: product.image_uri }} style={styles.thumbnail} />
        ) : (
          <View style={[styles.thumbnail, styles.placeholder]}>
            <Text variant="titleMedium">{product.name.slice(0, 1).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.content}>
          <View style={styles.header}>
            <Text variant="titleMedium">{product.name}</Text>
            <Chip compact style={styles.categoryChip}>
              {getProductCategoryLabel(product.category)}
            </Chip>
          </View>
          <Text variant="bodyMedium" style={styles.price}>
            {formatCurrency(product.retail_price)}
          </Text>
          <View style={styles.stockRow}>
            <Text variant="labelSmall">Stock: {product.stock_quantity}</Text>
            <Text variant="labelSmall">Min: {product.min_stock_level}</Text>
          </View>
          <ProgressBar
            progress={stockLevel}
            color={lowStock ? colors.error : colors.success}
            style={styles.progress}
          />
          {actions ? <View style={styles.actions}>{actions}</View> : null}
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 6,
  },
  row: {
    flexDirection: 'row',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  price: {
    marginBottom: 4,
  },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progress: {
    marginTop: 4,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginRight: 12,
  },
  placeholder: {
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryChip: {
    backgroundColor: colors.background,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 8,
    justifyContent: 'flex-end',
  },
});
