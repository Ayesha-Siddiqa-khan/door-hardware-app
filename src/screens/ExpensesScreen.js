import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import {
  Button,
  Dialog,
  HelperText,
  Menu,
  Portal,
  Text,
  TextInput,
  List,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { fetchExpenses, createExpense, deleteExpense, getExpenseCategories } from '../services/expenseService';
import { formatCurrency } from '../utils/formatters';
import { useAppState } from '../state/AppStateProvider';

export default function ExpensesScreen() {
  const { refreshToken, refreshAll } = useAppState();
  const [expenses, setExpenses] = useState([]);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [categoryMenu, setCategoryMenu] = useState(false);
  const [form, setForm] = useState({ category: getExpenseCategories()[0], amount: '', description: '' });
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
      <FlatList
        data={expenses}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <List.Item
            title={`${item.category} • ${formatCurrency(item.amount)}`}
            description={item.description}
            right={() => (
              <Button onPress={() => handleDelete(item)} mode="text">
                Delete
              </Button>
            )}
          />
        )}
        ListEmptyComponent={<Text style={styles.empty}>No expenses recorded</Text>}
      />

      <Button icon="plus" mode="contained" style={styles.addButton} onPress={() => setDialogVisible(true)}>
        Add Expense
      </Button>

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Add Expense</Dialog.Title>
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
    backgroundColor: '#F7F9FC',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 48,
  },
  empty: {
    textAlign: 'center',
    marginTop: 32,
    color: '#6B778D',
  },
  addButton: {
    margin: 16,
  },
});
