import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import {
  Button,
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
} from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { fetchProducts } from '../services/productService';
import { fetchCustomers } from '../services/customerService';
import { createSale } from '../services/salesService';
import { formatCurrency } from '../utils/formatters';
import { validateSale } from '../utils/validators';
import { generateInvoiceNumber } from '../utils/invoice';
import { SaleItem } from '../components/SaleItem';
import { PAYMENT_METHODS } from '../constants/categories';
import { useAppState } from '../state/AppStateProvider';

export default function NewSaleScreen() {
  const navigation = useNavigation();
  const { refreshAll } = useAppState();

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

  const loadData = useCallback(async () => {
    const [productList, customerList] = await Promise.all([fetchProducts(), fetchCustomers()]);
    setProducts(productList);
    setCustomers(customerList);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  const totalAmount = useMemo(
    () => cartItems.reduce((total, item) => total + item.total_price, 0),
    [cartItems]
  );

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
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    setSubmitting(true);
    try {
      const invoiceNumber = generateInvoiceNumber();
      const saleId = await createSale({
        sale: {
          invoice_number: invoiceNumber,
          customer_id: selectedCustomer?.id ?? null,
          total_amount: totalAmount,
          payment_method: paymentMethod,
          payment_status: paymentMethod === 'credit' ? 'pending' : 'paid',
          notes,
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
                  customer_id: selectedCustomer?.id ?? null,
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
    } catch (error) {
      console.warn('Failed to save sale', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search products"
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={styles.searchbar}
      />

      <View style={styles.checkoutCard}>
        <View style={styles.checkoutHeader}>
          <Text variant="titleMedium">Cart</Text>
          <SegmentedButtons
            value={paymentMethod}
            onValueChange={setPaymentMethod}
            buttons={PAYMENT_METHODS.map((method) => ({
              value: method.key,
              label: method.label,
            }))}
          />
        </View>

        {selectedCustomer ? (
          <List.Item
            title={selectedCustomer.name}
            description={selectedCustomer.phone}
            left={(props) => <List.Icon {...props} icon="account" />}
            right={() => (
              <IconButton icon="close" onPress={() => setSelectedCustomer(null)} size={18} />
            )}
            style={styles.customerItem}
          />
        ) : (
          <Button
            mode="outlined"
            icon="account-plus"
            onPress={() => setCustomerDialog(true)}
            style={styles.customerButton}
          >
            Select Customer (Optional)
          </Button>
        )}

        <FlatList
          data={cartItems}
          keyExtractor={(item) => String(item.product_id)}
          ListEmptyComponent={
            <Text variant="bodyMedium" style={styles.emptyCart}>
              Add products to create an invoice
            </Text>
          }
          renderItem={({ item }) => (
            <SaleItem
              item={item}
              onIncrease={() => handleIncrease(item.product_id)}
              onDecrease={() => handleDecrease(item.product_id)}
              onRemove={() => handleRemove(item.product_id)}
            />
          )}
        />

        <TextInput
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          multiline
          mode="outlined"
          style={styles.notesInput}
        />

        <View style={styles.totalRow}>
          <Text variant="titleLarge">Total</Text>
          <Text variant="headlineSmall">{formatCurrency(totalAmount)}</Text>
        </View>
        <HelperText type="error" visible={!!errors.items}>
          {errors.items}
        </HelperText>
        <HelperText type="error" visible={!!errors.totalAmount}>
          {errors.totalAmount}
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
      </View>

      <Text variant="titleMedium" style={styles.sectionTitle}>
        Products
      </Text>

      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <List.Item
            title={item.name}
            description={`${item.category} • ${formatCurrency(item.retail_price)}`}
            onPress={() => handleAddItem(item)}
            right={() => <IconButton icon="plus-circle" onPress={() => handleAddItem(item)} />}
          />
        )}
        contentContainerStyle={styles.productList}
        ListEmptyComponent={<Text style={styles.emptyState}>No products found</Text>}
      />

      <Portal>
        <Dialog visible={customerDialog} onDismiss={() => setCustomerDialog(false)}>
          <Dialog.Title>Select Customer</Dialog.Title>
          <Dialog.ScrollArea>
            <View style={styles.dialogContent}>
              <RadioButton.Group
                onValueChange={(value) => {
                  const customer = customers.find((item) => String(item.id) === value);
                  setSelectedCustomer(customer ?? null);
                }}
                value={selectedCustomer ? String(selectedCustomer.id) : ''}
              >
                {customers.map((customer) => (
                  <RadioButton.Item
                    key={customer.id}
                    label={`${customer.name}${customer.phone ? ` • ${customer.phone}` : ''}`}
                    value={String(customer.id)}
                  />
                ))}
              </RadioButton.Group>
            </View>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setCustomerDialog(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  searchbar: {
    margin: 16,
    borderRadius: 16,
  },
  checkoutCard: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    elevation: 1,
  },
  checkoutHeader: {
    marginBottom: 12,
  },
  customerButton: {
    marginBottom: 12,
  },
  customerItem: {
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: '#F0F4FF',
  },
  notesInput: {
    marginTop: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  submitButton: {
    marginTop: 12,
  },
  productList: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  emptyCart: {
    textAlign: 'center',
    marginVertical: 12,
    color: '#6B778D',
  },
  emptyState: {
    textAlign: 'center',
    marginTop: 32,
    color: '#6B778D',
  },
  sectionTitle: {
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 8,
  },
  dialogContent: {
    paddingHorizontal: 12,
    maxHeight: 320,
  },
});
