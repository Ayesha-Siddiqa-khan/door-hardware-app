import { useCallback, useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  Chip,
  Dialog,
  HelperText,
  IconButton,
  Portal,
  Searchbar,
  SegmentedButtons,
  Text,
  TextInput,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import {
  adjustProductStock,
  createProduct,
  deleteProduct,
  fetchProducts,
  updateProduct,
} from '../services/productService';
import { PRODUCT_CATEGORIES } from '../constants/categories';
import { ProductCard } from '../components/ProductCard';
import { validateProduct } from '../utils/validators';
import { useAppState } from '../state/AppStateProvider';
import { createProductModel } from '../database/models';
import { colors } from '../constants/colors';
import { radius, spacing } from '../constants/theme';
import { useTranslation } from '../localization/LocalizationProvider';

export default function ProductsScreen() {
  const { refreshAll, refreshToken } = useAppState();
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [stockDialog, setStockDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(createProductModel());
  const [stockAdjustment, setStockAdjustment] = useState('0');
  const [stockNotes, setStockNotes] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const loadProducts = useCallback(async () => {
    const data = await fetchProducts();
    setProducts(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [loadProducts, refreshToken])
  );

  const filteredProducts = useMemo(() => {
    let list = products;
    if (categoryFilter !== 'all') {
      list = list.filter((item) => item.category === categoryFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q) ||
          PRODUCT_CATEGORIES.find((category) => category.key === item.category)?.label
            ?.toLowerCase()
            .includes(q)
      );
    }
    return list;
  }, [products, search, categoryFilter]);

  const openDialog = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setForm({
        name: product.name,
        category: product.category,
        description: product.description ?? '',
        retail_price: String(product.retail_price),
        wholesale_price: product.wholesale_price ? String(product.wholesale_price) : '',
        stock_quantity: String(product.stock_quantity),
        min_stock_level: String(product.min_stock_level),
        image_uri: product.image_uri ?? '',
      });
    } else {
      setEditingProduct(null);
      setForm(createProductModel());
    }
    setErrors({});
    setDialogVisible(true);
  };

  const handleSave = async () => {
    const payload = {
      ...form,
      retail_price: Number(form.retail_price),
      wholesale_price: form.wholesale_price ? Number(form.wholesale_price) : null,
      stock_quantity: Number(form.stock_quantity),
      min_stock_level: Number(form.min_stock_level),
    };
    const validation = validateProduct(payload);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    setSaving(true);
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, payload);
      } else {
        await createProduct(payload);
      }
      await loadProducts();
      refreshAll();
      setDialogVisible(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product) => {
    await deleteProduct(product.id);
    await loadProducts();
    refreshAll();
  };

  const openStockDialog = (product) => {
    setEditingProduct(product);
    setStockAdjustment('0');
    setStockNotes('');
    setStockDialog(true);
  };

  const applyStockAdjustment = async () => {
    if (!editingProduct) return;
    const quantity = Number(stockAdjustment);
    if (!Number.isFinite(quantity) || quantity === 0) {
      setStockDialog(false);
      return;
    }

    await adjustProductStock(editingProduct.id, quantity, 'adjustment', stockNotes);
    await loadProducts();
    refreshAll();
    setStockDialog(false);
  };

  const listHeader = (
    <View style={styles.header}>
      <Searchbar
        placeholder={t('products')}
        value={search}
        onChangeText={setSearch}
        style={styles.search}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        <Chip
          selected={categoryFilter === 'all'}
          onPress={() => setCategoryFilter('all')}
          style={styles.filterChip}
        >
          {t('all')}
        </Chip>
        {PRODUCT_CATEGORIES.map((category) => (
          <Chip
            key={category.key}
            selected={categoryFilter === category.key}
            onPress={() => setCategoryFilter(category.key)}
            style={styles.filterChip}
          >
            {category.label}
          </Chip>
        ))}
      </ScrollView>

      <Button icon="plus" mode="contained" onPress={() => openDialog()}>
        {t('addProduct')}
      </Button>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onPress={() => openDialog(item)}
            actions={
              <View style={styles.cardActions}>
                <IconButton size={20} icon="pencil" onPress={() => openDialog(item)} />
                <IconButton
                  size={20}
                  icon="package-variant"
                  onPress={() => openStockDialog(item)}
                />
                <IconButton size={20} icon="delete" onPress={() => handleDelete(item)} />
              </View>
            }
          />
        )}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyState}>{t('noProductsMatch')}</Text>}
      />

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>{editingProduct ? 'Edit Product' : 'Add Product'}</Dialog.Title>
          <Dialog.ScrollArea>
            <View style={styles.dialogContent}>
              <TextInput
                label="Name"
                mode="outlined"
                value={form.name}
                onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))}
                error={!!errors.name}
              />
              <HelperText type="error" visible={!!errors.name}>
                {errors.name}
              </HelperText>

              <SegmentedButtons
                value={form.category}
                onValueChange={(value) => setForm((prev) => ({ ...prev, category: value }))}
                buttons={PRODUCT_CATEGORIES.map((category) => ({
                  value: category.key,
                  label: category.label,
                }))}
                style={styles.categorySelector}
              />

              <View style={styles.priceRow}>
                <TextInput
                  label="Retail Price"
                  mode="outlined"
                  keyboardType="numeric"
                  value={String(form.retail_price ?? '')}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, retail_price: value }))}
                  error={!!errors.retail_price}
                  style={styles.priceField}
                />
                <TextInput
                  label="Wholesale Price"
                  mode="outlined"
                  keyboardType="numeric"
                  value={String(form.wholesale_price ?? '')}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, wholesale_price: value }))}
                  style={styles.priceField}
                />
              </View>

              <View style={styles.priceRow}>
                <TextInput
                  label="Stock Quantity"
                  mode="outlined"
                  keyboardType="numeric"
                  value={String(form.stock_quantity ?? '')}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, stock_quantity: value }))}
                  style={styles.priceField}
                />
                <TextInput
                  label="Minimum Stock Level"
                  mode="outlined"
                  keyboardType="numeric"
                  value={String(form.min_stock_level ?? '')}
                  onChangeText={(value) =>
                    setForm((prev) => ({ ...prev, min_stock_level: value }))
                  }
                  style={styles.priceField}
                />
              </View>

              <HelperText type="error" visible={!!errors.stock_quantity || !!errors.min_stock_level}>
                {errors.stock_quantity || errors.min_stock_level || ''}
              </HelperText>

              <TextInput
                label="Description"
                mode="outlined"
                multiline
                value={form.description}
                onChangeText={(value) => setForm((prev) => ({ ...prev, description: value }))}
              />
            </View>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleSave} loading={saving}>
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={stockDialog} onDismiss={() => setStockDialog(false)}>
          <Dialog.Title>Adjust Stock</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.stockLabel}>
              {editingProduct?.name}
            </Text>
            <TextInput
              label="Quantity (+/-)"
              keyboardType="numeric"
              value={stockAdjustment}
              onChangeText={setStockAdjustment}
            />
            <TextInput
              label="Notes"
              multiline
              value={stockNotes}
              onChangeText={setStockNotes}
              style={styles.notes}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setStockDialog(false)}>Cancel</Button>
            <Button onPress={applyStockAdjustment}>Apply</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  search: {
    borderRadius: radius.lg,
  },
  filterRow: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  filterChip: {
    backgroundColor: colors.surface,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  emptyState: {
    textAlign: 'center',
    marginTop: spacing.lg,
    color: colors.textSecondary,
  },
  dialogContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  categorySelector: {
    marginBottom: spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  priceField: {
    flex: 1,
  },
  stockLabel: {
    marginBottom: spacing.sm,
  },
  notes: {
    marginTop: spacing.sm,
  },
});
