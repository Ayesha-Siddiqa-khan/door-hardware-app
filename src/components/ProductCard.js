import { Image, StyleSheet, View } from 'react-native';
import { Card, Chip, ProgressBar, Text } from 'react-native-paper';
import { colors } from '../constants/colors';
import { elevation, radius, spacing } from '../constants/theme';
import { getProductCategoryLabel } from '../constants/categories';
import { formatCurrency } from '../utils/formatters';

function getStockState(product) {
  if (product.stock_quantity <= product.min_stock_level) {
    return { label: 'Low stock', tint: colors.warning };
  }
  if (product.stock_quantity === 0) {
    return { label: 'Out of stock', tint: colors.error };
  }
  return { label: 'In stock', tint: colors.success };
}

export function ProductCard({ product, onPress, actions }) {
  const { label: stockLabel, tint } = getStockState(product);
  const progress =
    product.min_stock_level > 0
      ? Math.min(product.stock_quantity / Math.max(product.min_stock_level * 1.5, 1), 1)
      : 1;

  return (
    <Card style={styles.card} mode="contained" onPress={onPress}>
      <Card.Content style={styles.content}>
        <View style={styles.header}>
          <View style={styles.titleBlock}>
            <Text variant="titleMedium" numberOfLines={1}>
              {product.name}
            </Text>
            <Chip compact style={styles.categoryChip} textStyle={styles.categoryText}>
              {getProductCategoryLabel(product.category)}
            </Chip>
          </View>
          {product.image_uri ? (
            <Image source={{ uri: product.image_uri }} style={styles.thumbnail} />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <Text variant="titleMedium">{product.name.slice(0, 1).toUpperCase()}</Text>
            </View>
          )}
        </View>

        <Text variant="titleLarge" style={styles.price}>
          {formatCurrency(product.retail_price)}
        </Text>
        {product.wholesale_price ? (
          <Text variant="bodySmall" style={styles.subPrice}>
            Wholesale {formatCurrency(product.wholesale_price)}
          </Text>
        ) : null}

        <View style={styles.metaRow}>
          <Chip compact icon="cube-outline" style={[styles.stockChip, { backgroundColor: colors.surfaceMuted }]}>
            {stockLabel}
          </Chip>
          <Text variant="bodySmall" style={styles.stockDetail}>
            {product.stock_quantity} in stock • Min {product.min_stock_level}
          </Text>
        </View>

        <ProgressBar progress={progress} color={tint} style={styles.progress} />

        {product.description ? (
          <Text variant="bodySmall" style={styles.description} numberOfLines={2}>
            {product.description}
          </Text>
        ) : null}

        {actions ? <View style={styles.actions}>{actions}</View> : null}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    ...elevation.base,
  },
  content: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleBlock: {
    flex: 1,
    marginRight: spacing.md,
    gap: spacing.xs,
  },
  categoryChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.chip,
  },
  categoryText: {
    color: colors.textSecondary,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
  },
  thumbnailPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  price: {
    color: colors.text,
  },
  subPrice: {
    color: colors.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  stockChip: {
    backgroundColor: colors.overlay,
  },
  stockDetail: {
    color: colors.textSecondary,
  },
  progress: {
    height: 6,
    borderRadius: radius.pill,
  },
  description: {
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
});
