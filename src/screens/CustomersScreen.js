import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import {
  Button,
  Dialog,
  HelperText,
  Portal,
  Searchbar,
  SegmentedButtons,
  Text,
  TextInput,
} from "react-native-paper";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSQLiteContext } from "expo-sqlite";

import {
  createCustomer,
  fetchCustomers,
  fetchOutstandingCustomers,
  updateCustomer,
} from "../services/customerService";
import { CustomerCard } from "../components/CustomerCard";
import { validateCustomer } from "../utils/validators";
import { useAppState } from "../state/AppStateProvider";

export default function CustomersScreen() {
  const navigation = useNavigation();
  const { refreshToken, refreshAll } = useAppState();
  const db = useSQLiteContext();
  const [customers, setCustomers] = useState([]);
  const [viewMode, setViewMode] = useState("all");
  const [search, setSearch] = useState("");
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "", address: "", city: "" });
  const [errors, setErrors] = useState({});

  const loadCustomers = useCallback(async () => {
    if (viewMode === "credit") {
      const credit = await fetchOutstandingCustomers(db);
      setCustomers(credit);
    } else {
      const list = await fetchCustomers(db);
      setCustomers(list);
    }
  }, [viewMode, db]);

  useFocusEffect(
    useCallback(() => {
      loadCustomers();
    }, [loadCustomers, refreshToken])
  );

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const filteredCustomers = useMemo(() => {
    if (!search) return customers;
    const query = search.toLowerCase();
    return customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(query) ||
        customer.phone?.toLowerCase().includes(query)
    );
  }, [customers, search]);

  const openDialog = (customer = null) => {
    if (customer) {
      setEditingCustomer(customer);
      setForm({
        name: customer.name,
        phone: customer.phone ?? "",
        address: customer.address ?? "",
        city: customer.city ?? "",
      });
    } else {
      setEditingCustomer(null);
      setForm({ name: "", phone: "", address: "", city: "" });
    }
    setErrors({});
    setDialogVisible(true);
  };

  const handleSave = useCallback(async () => {
    const validation = validateCustomer(form);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    if (editingCustomer) {
      await updateCustomer(editingCustomer.id, form, db);
    } else {
      await createCustomer(form, db);
    }

    setDialogVisible(false);
    refreshAll();
    await loadCustomers();
  }, [db, editingCustomer, form, loadCustomers, refreshAll]);

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search customers"
        value={search}
        onChangeText={setSearch}
        style={styles.search}
      />

      <SegmentedButtons
        value={viewMode}
        onValueChange={setViewMode}
        style={styles.segmented}
        buttons={[
          { value: "all", label: "All" },
          { value: "credit", label: "Credit Due" },
        ]}
      />

      <FlatList
        data={filteredCustomers}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <CustomerCard
            customer={item}
            onPress={() => navigation.navigate("CustomerDetail", { customerId: item.id })}
            onCollect={() => navigation.navigate("Payment", { customerId: item.id })}
          />
        )}
        ListEmptyComponent={<Text style={styles.empty}>No customers found</Text>}
      />

      <Button icon="account-plus" mode="contained" style={styles.addButton} onPress={() => openDialog()}>
        Add Customer
      </Button>

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>{editingCustomer ? "Edit Customer" : "Add Customer"}</Dialog.Title>
          <Dialog.Content>
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
            <TextInput
              label="Phone"
              mode="outlined"
              value={form.phone}
              onChangeText={(value) => setForm((prev) => ({ ...prev, phone: value }))}
              keyboardType="phone-pad"
              error={!!errors.phone}
            />
            <HelperText type="error" visible={!!errors.phone}>
              {errors.phone}
            </HelperText>
            <TextInput
              label="Address"
              mode="outlined"
              value={form.address}
              onChangeText={(value) => setForm((prev) => ({ ...prev, address: value }))}
            />
            <TextInput
              label="City"
              mode="outlined"
              value={form.city}
              onChangeText={(value) => setForm((prev) => ({ ...prev, city: value }))}
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
    backgroundColor: "#F7F9FC",
  },
  search: {
    margin: 16,
    borderRadius: 16,
  },
  segmented: {
    marginHorizontal: 16,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 48,
  },
  empty: {
    textAlign: "center",
    marginTop: 32,
    color: "#6B778D",
  },
  addButton: {
    margin: 16,
  },
});
