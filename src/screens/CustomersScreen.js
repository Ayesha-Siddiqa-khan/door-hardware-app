import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import {
  Button,
  Card,
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
import { formatCurrency } from "../utils/formatters";
import { CustomerCard } from "../components/CustomerCard";
import { validateCustomer } from "../utils/validators";
import { useAppState } from "../state/AppStateProvider";
import { colors } from "../constants/colors";
import { radius, spacing } from "../constants/theme";
import { useTranslation } from "../localization/LocalizationProvider";

export default function CustomersScreen() {
  const navigation = useNavigation();
  const { refreshToken, refreshAll } = useAppState();
  const db = useSQLiteContext();
  const { t } = useTranslation();
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
    const baseList =
      viewMode === "credit" ? customers.filter((item) => (item.balance ?? 0) > 0) : customers;
    if (!search) return baseList;
    const query = search.toLowerCase();
    return baseList.filter(
      (customer) =>
        customer.name.toLowerCase().includes(query) ||
        customer.phone?.toLowerCase().includes(query)
    );
  }, [customers, search, viewMode]);

  const outstandingSummary = useMemo(() => {
    const totalDue = filteredCustomers.reduce(
      (sum, customer) => sum + (customer.balance ?? 0),
      0
    );
    return {
      count: filteredCustomers.length,
      due: totalDue,
    };
  }, [filteredCustomers]);

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
        placeholder={t('customers')}
        value={search}
        onChangeText={setSearch}
        style={styles.search}
      />

      <SegmentedButtons
        value={viewMode}
        onValueChange={setViewMode}
        style={styles.segmented}
        buttons={[
          { value: "all", label: t('all') },
          { value: "credit", label: t('creditOutstanding') },
        ]}
      />

      <Card style={styles.summaryCard} mode="contained">
        <Card.Content style={styles.summaryContent}>
          <View>
            <Text variant="titleMedium" style={styles.summaryLabel}>
              {viewMode === "credit" ? t('outstandingCustomersLabel') : t('customers')}
            </Text>
            <Text variant="bodySmall" style={styles.summarySubtext}>
              {outstandingSummary.count} {t('customers').toLowerCase()}
            </Text>
          </View>
          <Text variant="titleMedium" style={styles.summaryValue}>
            {formatCurrency(outstandingSummary.due)}
          </Text>
        </Card.Content>
      </Card>

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
        ListEmptyComponent={<Text style={styles.empty}>{t('noData')}</Text>}
      />

      <Button icon="account-plus" mode="contained" style={styles.addButton} onPress={() => openDialog()}>
        {t('addCustomer')}
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
    backgroundColor: colors.background,
  },
  search: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: radius.lg,
  },
  segmented: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  summaryContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    color: colors.text,
  },
  summarySubtext: {
    color: colors.textSecondary,
  },
  summaryValue: {
    color: colors.text,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  empty: {
    textAlign: "center",
    marginTop: spacing.lg,
    color: colors.textSecondary,
  },
  addButton: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: radius.md,
  },
});
