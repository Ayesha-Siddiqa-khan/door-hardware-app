import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
  Dialog,
  HelperText,
  IconButton,
  List,
  Portal,
  RadioButton,
  Searchbar,
  SegmentedButtons,
  Text,
  TextInput,
  Chip,
} from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { fetchProducts } from '../services/productService';
import { fetchCustomers } from '../services/customerService';
import { createSale } from '../services/salesService';
import { formatCurrency } from '../utils/formatters';
import { validateSale } from '../utils/validators';
import { generateInvoiceNumber } from '../utils/invoice';
import { SaleItem } from '../components/SaleItem';
import { PAYMENT_METHODS, getProductCategoryLabel } from '../constants/categories';
import { useAppState } from '../state/AppStateProvider';
import { colors } from '../constants/colors';
import { radius, spacing } from '../constants/theme';
import { useTranslation } from '../localization/LocalizationProvider';

export default function NewSaleScreen() {
  const navigation = useNavigation();
  const { refreshAll, refreshToken } = useAppState();
  const { t } = useTranslation();

  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cartItems, setCartItems] = useState([]);
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerDialog, setCustomerDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [customerMode, setCustomerMode] = useState('guest');
  const [guestInfo, setGuestInfo] = useState({ name: '', phone: '' });
  const [customerSearch, setCustomerSearch] = useState('');

  const loadData = useCallback(async () => {
    const [productList, customerList] = await Promise.all([fetchProducts(), fetchCustomers()]);
    setProducts(productList);
    setCustomers(customerList);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData, refreshToken])
  );

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query) ||
        getProductCategoryLabel(product.category).toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  const totalAmount = useMemo(
    () => cartItems.reduce((total, item) => total + item.total_price, 0),
    [cartItems]
  );

  const filteredCustomerList = useMemo(() => {
    if (!customerSearch) return customers;
    const query = customerSearch.toLowerCase();
    return customers.filter((customer) => {
      const name = customer.name?.toLowerCase() ?? '';
      const phone = customer.phone?.toLowerCase() ?? '';
      return name.includes(query) || phone.includes(query);
    });
  }, [customers, customerSearch]);

  const quickCustomers = useMemo(() => customers.slice(0, 5), [customers]);

  const paymentButtons = useMemo(
    () =>
      PAYMENT_METHODS.map((method) => ({
        value: method.key,
        label: method.label,
        disabled: customerMode === 'guest' && method.key === 'credit',
      })),
    [customerMode]
  );

  const handleCustomerModeChange = useCallback(
    (mode) => {
      setCustomerMode(mode);
      setErrors((prev) => {
        if (!prev || (mode === 'guest' && !prev.customer && !prev.guestName)) {
          return prev;
        }
        const next = { ...prev };
        delete next.customer;
        delete next.guestName;
        return next;
      });
      if (mode === 'guest') {
        setSelectedCustomer(null);
      }
    },
    [setCustomerMode, setSelectedCustomer, setErrors]
  );

  useEffect(() => {
    if (customerMode === 'guest' && paymentMethod === 'credit') {
      setPaymentMethod('cash');
    }
  }, [customerMode, paymentMethod]);

  const handleAddItem = (product) => {
    setCartItems((items) => {
      const existing = items.find((item) => item.product_id === product.id);
      if (existing) {
        return items.map((item) =>
          item.product_id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                total_price: (item.quantity + 1) * item.unit_price,
              }
            : item
        );
      }
      return [
        ...items,
        {
          product_id: product.id,
          name: product.name,
          quantity: 1,
          unit_price: product.retail_price,
          total_price: product.retail_price,
        },
      ];
    });
  };

  const handleIncrease = (productId) => {
    setCartItems((items) =>
      items.map((item) =>
        item.product_id === productId
          ? {
              ...item,
              quantity: item.quantity + 1,
              total_price: (item.quantity + 1) * item.unit_price,
            }
          : item
      )
    );
  };

  const handleDecrease = (productId) => {
    setCartItems((items) =>
      items
        .map((item) =>
          item.product_id === productId
            ? {
                ...item,
                quantity: item.quantity - 1,
                total_price: (item.quantity - 1) * item.unit_price,
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemove = (productId) => {
    setCartItems((items) => items.filter((item) => item.product_id !== productId));
  };

  const handleSubmit = async () => {
    const validation = validateSale({ items: cartItems, totalAmount });
    const extraErrors = {};

    if (customerMode === 'guest') {
      if (!guestInfo.name.trim()) {
        extraErrors.guestName = t('guestNameRequired');
      }
    } else if (!selectedCustomer) {
      extraErrors.customer = t('selectCustomerFirst');
    }

    const nextErrors = { ...validation, ...extraErrors };
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const invoiceNumber = generateInvoiceNumber();
      const guestNote =
        customerMode === 'guest'
          ? `${t('guestLabel')}: ${guestInfo.name || t('guestWalkIn')}${
              guestInfo.phone ? ` (${guestInfo.phone})` : ''
            }`
          : '';
      const combinedNotes = [guestNote, notes].filter(Boolean).join('\n').trim();

      const saleId = await createSale({
        sale: {
          invoice_number: invoiceNumber,
          customer_id: customerMode === 'registered' ? selectedCustomer?.id ?? null : null,
          total_amount: totalAmount,
          payment_method: paymentMethod,
          payment_status: paymentMethod === 'credit' ? 'pending' : 'paid',
          notes: combinedNotes,
        },
        items: cartItems.map((item) => ({
          sale_id: null,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
        })),
        payments:
          paymentMethod === 'credit'
            ? []
            : [
                {
                  sale_id: null,
                  customer_id:
                    customerMode === 'registered' ? selectedCustomer?.id ?? null : null,
                  amount: totalAmount,
                  payment_method: paymentMethod,
                  notes: 'Auto payment on sale',
                },
              ],
      });

      refreshAll();
      navigation.navigate('Invoice', { saleId });
      setCartItems([]);
      setNotes('');
      setSelectedCustomer(null);
      setGuestInfo({ name: '', phone: '' });
      setCustomerMode('guest');
      setCustomerSearch('');
      setErrors({});
    } catch (error) {
      console.warn('Failed to save sale', error);
    } finally {
      setSubmitting(false);
    }
  };

  const cartHeader = (
    <View style={styles.header}>
      <Searchbar
        placeholder={t('products')}
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={styles.searchbar}
      />

      <Card style={styles.cartCard} mode="contained">
        <Card.Content>
          <View style={styles.cartHeader}>
            <View>
              <Text variant="titleMedium" style={styles.cartTitle}>
                {t('cartTitle')}
              </Text>
              <Text variant="bodySmall" style={styles.cartSubtitle}>
                {cartItems.length} {t('cartItemsLabel')} |{' '}
                {paymentMethod === 'credit' ? t('creditSale') : t('instantPayment')}
              </Text>
            </View>
            <Text variant="titleLarge" style={styles.totalAmount}>
              {formatCurrency(totalAmount)}
            </Text>
          </View>

          <SegmentedButtons
            value={customerMode}
            onValueChange={handleCustomerModeChange}
            buttons={[
              { value: 'guest', label: t('guestCheckout'), icon: 'account-outline' },
              { value: 'registered', label: t('registeredCustomer'), icon: 'account-check' },
            ]}
            style={styles.customerSegment}
          />

          {customerMode === 'guest' ? (
            <View style={styles.guestContainer}>
              <Text variant="bodySmall" style={styles.guestHint}>
                {t('guestCheckoutHint')}
              </Text>
              <TextInput
                label={t('guestName')}
                value={guestInfo.name}
                onChangeText={(value) => {
                  setGuestInfo((prev) => ({ ...prev, name: value }));
                  setErrors((prev) => (prev?.guestName ? { ...prev, guestName: undefined } : prev));
                }}
                mode="outlined"
                style={styles.guestInput}
              />
              <TextInput
                label={t('guestPhone')}
                value={guestInfo.phone}
                onChangeText={(value) => setGuestInfo((prev) => ({ ...prev, phone: value }))}
                mode="outlined"
                keyboardType="phone-pad"
                style={styles.guestInput}
              />
              <HelperText type="error" visible={!!errors.guestName}>
                {errors.guestName}
              </HelperText>
            </View>
          ) : (
            <View style={styles.registeredContainer}>
              <SegmentedButtons
                value={paymentMethod}
                onValueChange={setPaymentMethod}
                buttons={paymentButtons}
                style={styles.paymentSegment}
              />
              {quickCustomers.length ? (
                <View style={styles.quickCustomers}>
                  <Text variant="labelSmall" style={styles.quickCustomersLabel}>
                    {t('recentCustomers')}
                  </Text>
                  <View style={styles.quickCustomersChips}>
                    {quickCustomers.map((customer) => (
                      <Chip
                        key={customer.id}
                        onPress={() => {
                          setSelectedCustomer(customer);
                          setErrors((prev) =>
                            prev?.customer ? { ...prev, customer: undefined } : prev
                          );
                        }}
                        selected={selectedCustomer?.id === customer.id}
                        style={styles.quickCustomerChip}
                      >
                        {customer.name}
                      </Chip>
                    ))}
                  </View>
                </View>
              ) : null}

              <View style={styles.customerSummary}>
                {selectedCustomer ? (
                  <View style={styles.customerSummaryContent}>
                    <View>
                      <Text variant="titleSmall" style={styles.customerName}>
                        {selectedCustomer.name}
                      </Text>
                      {selectedCustomer.phone ? (
                        <Text variant="bodySmall" style={styles.customerMeta}>
                          {selectedCustomer.phone}
                        </Text>
                      ) : null}
                    </View>
                    <Button
                      mode="text"
                      onPress={() => setCustomerDialog(true)}
                      style={styles.customerButton}
                    >
                      {t('changeCustomer')}
                    </Button>
                  </View>
                ) : (
                  <View style={styles.customerActions}>
                    <Text variant="bodySmall" style={styles.customerPlaceholder}>
                      {t('selectRegisteredCustomer')}
                    </Text>
                    <View style={styles.customerButtons}>
                      <Button
                        mode="contained-tonal"
                        icon="account-search"
                        onPress={() => setCustomerDialog(true)}
                        style={styles.customerButton}
                      >
                        {t('browseCustomers')}
                      </Button>
                      <Button
                        mode="text"
                        icon="account-plus"
                        onPress={() => navigation.navigate('CustomerList')}
                        style={styles.customerButton}
                      >
                        {t('addCustomer')}
                      </Button>
                    </View>
                  </View>
                )}
              </View>
              <HelperText type="error" visible={!!errors.customer}>
                {errors.customer}
              </HelperText>
            </View>
          )}

          {customerMode === 'guest' ? (
            <SegmentedButtons
              value={paymentMethod}
              onValueChange={setPaymentMethod}
              buttons={paymentButtons}
              style={styles.paymentSegment}
            />
          ) : null}

          {cartItems.length === 0 ? (
            <Text variant="bodySmall" style={styles.emptyCart}>
              {t('cartEmpty')}
            </Text>
          ) : (
            <View style={styles.cartItems}>
              {cartItems.map((item) => (
                <SaleItem
                  key={item.product_id}
                  item={item}
                  onIncrease={() => handleIncrease(item.product_id)}
                  onDecrease={() => handleDecrease(item.product_id)}
                  onRemove={() => handleRemove(item.product_id)}
                />
              ))}
            </View>
          )}

          <TextInput
            label={t('notesLabel')}
            value={notes}
            onChangeText={setNotes}
            mode="outlined"
            multiline
            style={styles.notesInput}
          />

          <View style={styles.totalRow}>
            <Text variant="bodyMedium" style={styles.totalLabel}>
              {t('totalLabel')}
            </Text>
            <Text variant="titleMedium" style={styles.totalAmount}>
              {formatCurrency(totalAmount)}
            </Text>
          </View>

          <HelperText type="error" visible={!!errors.items || !!errors.totalAmount}>
            {errors.items || errors.totalAmount || ''}
          </HelperText>

          <Button
            mode="contained"
            icon="content-save"
            onPress={handleSubmit}
            disabled={submitting}
            loading={submitting}
            style={styles.submitButton}
          >
            Save & Generate Invoice
          </Button>
        </Card.Content>
      </Card>

      <Text variant="titleMedium" style={styles.sectionTitle}>
        {t('products')}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => {
          const subtitle = `${getProductCategoryLabel(item.category)} | ${formatCurrency(
            item.retail_price
          )}`;
          return (
            <List.Item
              title={item.name}
              description={subtitle}
              onPress={() => handleAddItem(item)}
              right={() => <IconButton icon="plus-circle" onPress={() => handleAddItem(item)} />}
              style={styles.productItem}
            />
          );
        }}
        ListHeaderComponent={cartHeader}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyState}>{t('noData')}</Text>}
      />

      <Portal>
        <Dialog
          visible={customerDialog}
          onDismiss={() => {
            setCustomerDialog(false);
            setCustomerSearch('');
          }}
        >
          <Dialog.Title>{t('selectCustomer')}</Dialog.Title>
          <Dialog.ScrollArea>
            <View style={styles.dialogContent}>
              <Searchbar
                placeholder={t('searchCustomers')}
                value={customerSearch}
                onChangeText={setCustomerSearch}
                style={styles.dialogSearch}
              />
              {filteredCustomerList.length ? (
                <RadioButton.Group
                  onValueChange={(value) => {
                    const customer = filteredCustomerList.find((item) => String(item.id) === value);
                    setSelectedCustomer(customer ?? null);
                    setErrors((prev) =>
                      prev?.customer ? { ...prev, customer: undefined } : prev
                    );
                  }}
                  value={selectedCustomer ? String(selectedCustomer.id) : ''}
                >
                  {filteredCustomerList.map((customer) => (
                    <RadioButton.Item
                      key={customer.id}
                      label={`${customer.name}${customer.phone ? ` | ${customer.phone}` : ''}`}
                      value={String(customer.id)}
                    />
                  ))}
                </RadioButton.Group>
              ) : (
                <Text style={styles.emptyState}>{t('noCustomersMatch')}</Text>
              )}
            </View>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button
              onPress={() => {
                setCustomerDialog(false);
                setCustomerSearch('');
              }}
            >
              Close
            </Button>
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
  listContent: {
    paddingBottom: spacing.xxl,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  searchbar: {
    borderRadius: radius.lg,
  },
  cartCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cartTitle: {
    color: colors.text,
  },
  cartSubtitle: {
    color: colors.textSecondary,
  },
  totalAmount: {
    color: colors.text,
  },
  paymentSegment: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  customerSegment: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  guestContainer: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  guestHint: {
    color: colors.textSecondary,
  },
  guestInput: {
    backgroundColor: colors.surface,
  },
  registeredContainer: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  quickCustomers: {
    gap: spacing.xs,
  },
  quickCustomersLabel: {
    color: colors.textSecondary,
  },
  quickCustomersChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  quickCustomerChip: {
    backgroundColor: colors.surfaceMuted,
  },
  customerSummary: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  customerSummaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  customerName: {
    color: colors.text,
    fontWeight: '600',
  },
  customerMeta: {
    color: colors.textSecondary,
  },
  customerActions: {
    gap: spacing.sm,
  },
  customerPlaceholder: {
    color: colors.textSecondary,
  },
  customerButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  customerButton: {
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  cartItems: {
    gap: spacing.sm,
  },
  emptyCart: {
    textAlign: 'center',
    color: colors.textSecondary,
    paddingVertical: spacing.sm,
  },
  notesInput: {
    marginTop: spacing.md,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  totalLabel: {
    color: colors.textSecondary,
  },
  submitButton: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
  },
  productItem: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  emptyState: {
    textAlign: 'center',
    marginTop: spacing.lg,
    color: colors.textSecondary,
  },
  dialogContent: {
    paddingHorizontal: spacing.md,
    maxHeight: 320,
  },
  dialogSearch: {
    marginBottom: spacing.sm,
  },
});


