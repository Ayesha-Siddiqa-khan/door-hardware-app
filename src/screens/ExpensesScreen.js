import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
  Dialog,
  HelperText,
  List,
  Menu,
  Portal,
  Text,
  TextInput,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import {
  createExpense,
  deleteExpense,
  fetchExpenses,
  getExpenseCategories,
} from '../services/expenseService';
import { formatCurrency } from '../utils/formatters';
import { useAppState } from '../state/AppStateProvider';
import { colors } from '../constants/colors';
import { radius, spacing } from '../constants/theme';
import { useTranslation } from '../localization/LocalizationProvider';

export default function ExpensesScreen() {
  const { refreshToken, refreshAll } = useAppState();
  const { t } = useTranslation();
  const [expenses, setExpenses] = useState([]);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [categoryMenu, setCategoryMenu] = useState(false);
  const [form, setForm] = useState({
    category: getExpenseCategories()[0],
    amount: '',
    description: '',
  });
  const [errors, setErrors] = useState({});

  const loadExpenses = useCallback(async () => {
    const data = await fetchExpenses('monthly');
    setExpenses(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadExpenses();
    }, [loadExpenses, refreshToken])
  );

  const totalSpent = useMemo(
    () => expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
    [expenses]
  );

  const handleSave = async () => {
    const validation = {};
    if (!form.amount || Number(form.amount) <= 0) {
      validation.amount = 'Enter a valid amount';
    }
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    await createExpense({
      category: form.category,
      amount: Number(form.amount),
      description: form.description,
    });
    refreshAll();
    loadExpenses();
    setDialogVisible(false);
    setForm({ category: getExpenseCategories()[0], amount: '', description: '' });
  };

  const handleDelete = async (expense) => {
    await deleteExpense(expense.id);
    refreshAll();
    loadExpenses();
  };

  return (
    <View style={styles.container}>
      <Card style={styles.summaryCard} mode="contained">
        <Card.Content>
          <Text variant="titleMedium" style={styles.summaryTitle}>
            {t('expenses')}
          </Text>
          <Text variant="bodySmall" style={styles.summarySubtitle}>
            {expenses.length} entries this month
          </Text>
          <Text variant="headlineSmall" style={styles.summaryValue}>
            {formatCurrency(totalSpent)}
          </Text>
        </Card.Content>
      </Card>

      <FlatList
        data={expenses}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <List.Item
            title={item.category || t('noData')}
            description={item.description || t('noData')}
            style={styles.listItem}
            right={() => (
              <Button onPress={() => handleDelete(item)} mode="text">
                Delete
              </Button>
            )}
          />
        )}
        ListEmptyComponent={<Text style={styles.empty}>{t('noData')}</Text>}
      />

      <Button
        icon='plus'
        mode='contained'
        style={styles.addButton}
        onPress={() => setDialogVisible(true)}
      >
        {t('addExpense') || 'Add Expense'}
      </Button>

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>{t('addExpense') || 'Add Expense'}</Dialog.Title>
          <Dialog.Content>
            <Menu
              visible={categoryMenu}
              onDismiss={() => setCategoryMenu(false)}
              anchor={
                <TextInput
                  label="Category"
                  value={form.category}
                  mode="outlined"
                  onFocus={() => setCategoryMenu(true)}
                />
              }
            >
              {getExpenseCategories().map((category) => (
                <Menu.Item
                  key={category}
                  title={category}
                  onPress={() => {
                    setForm((prev) => ({ ...prev, category }));
                    setCategoryMenu(false);
                  }}
                />
              ))}
            </Menu>
            <TextInput
              label="Amount"
              mode="outlined"
              keyboardType="numeric"
              value={form.amount}
              onChangeText={(value) => setForm((prev) => ({ ...prev, amount: value }))}
              error={!!errors.amount}
            />
            <HelperText type="error" visible={!!errors.amount}>
              {errors.amount}
            </HelperText>
            <TextInput
              label="Description"
              mode="outlined"
              value={form.description}
              onChangeText={(value) => setForm((prev) => ({ ...prev, description: value }))}
              multiline
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleSave}>Save</Button>
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
    padding: spacing.lg,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  summaryTitle: {
    color: colors.text,
  },
  summarySubtitle: {
    color: colors.textSecondary,
  },
  summaryValue: {
    marginTop: spacing.sm,
    color: colors.text,
  },
  list: {
    paddingBottom: spacing.xxl,
  },
  listItem: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  empty: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: spacing.lg,
  },
  addButton: {
    marginTop: spacing.md,
    borderRadius: radius.md,
  },
});
