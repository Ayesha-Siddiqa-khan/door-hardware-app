import { useMemo } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen';
import NewSaleScreen from '../screens/NewSaleScreen';
import ProductsScreen from '../screens/ProductsScreen';
import CustomersScreen from '../screens/CustomersScreen';
import ReportsScreen from '../screens/ReportsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ExpensesScreen from '../screens/ExpensesScreen';
import InvoiceScreen from '../screens/InvoiceScreen';
import CustomerDetailScreen from '../screens/CustomerDetailScreen';
import PaymentScreen from '../screens/PaymentScreen';
import { useTranslation } from '../localization/LocalizationProvider';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabNavigator() {
  const { t } = useTranslation();
  const tabScreens = useMemo(
    () => [
      {
        name: 'Home',
        component: HomeScreen,
        title: t('home'),
        icon: 'view-dashboard',
      },
      {
        name: 'NewSale',
        component: NewSaleScreen,
        title: t('newSale'),
        icon: 'cart-plus',
      },
      {
        name: 'Products',
        component: ProductsScreen,
        title: t('products'),
        icon: 'cube',
      },
      {
        name: 'CustomerList',
        component: CustomersScreen,
        title: t('customers'),
        icon: 'account-group',
      },
      {
        name: 'Reports',
        component: ReportsScreen,
        title: t('reports'),
        icon: 'chart-areaspline',
      },
      {
        name: 'Settings',
        component: SettingsScreen,
        title: t('settings'),
        icon: 'cog',
      },
    ],
    [t]
  );

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          const screen = tabScreens.find((item) => item.name === route.name);
          return <MaterialCommunityIcons name={screen?.icon ?? 'dots-horizontal'} size={size} color={color} />;
        },
      })}
    >
      {tabScreens.map((screen) => (
        <Tab.Screen key={screen.name} name={screen.name} component={screen.component} options={{ title: screen.title }} />
      ))}
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Main"
          component={TabNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Expenses"
          component={ExpensesScreen}
          options={{ title: 'Expenses' }}
        />
        <Stack.Screen
          name="Invoice"
          component={InvoiceScreen}
          options={{ title: 'Invoice' }}
        />
        <Stack.Screen
          name="CustomerDetail"
          component={CustomerDetailScreen}
          options={{ title: 'Customer Details' }}
        />
        <Stack.Screen
          name="Payment"
          component={PaymentScreen}
          options={{ title: 'Record Payment' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
