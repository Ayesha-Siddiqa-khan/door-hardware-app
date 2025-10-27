import 'react-native-gesture-handler';
import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider, MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SQLiteProvider } from 'expo-sqlite';
import AppNavigator from './src/navigation/AppNavigator';
import { SecurityGate } from './src/components/SecurityGate';
import { initializeDatabase } from './src/database/db';
import { AppStateProvider } from './src/state/AppStateProvider';
import { LocalizationProvider } from './src/localization/LocalizationProvider';
import { useSettings } from './src/hooks/useSettings';

export default function App() {
  const { settings, loading, updateSetting } = useSettings();

  const theme = useMemo(() => {
    const baseTheme = settings.theme === 'dark' ? MD3DarkTheme : MD3LightTheme;
    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        primary: '#1F4690',
        secondary: '#FFA500',
      },
    };
  }, [settings.theme]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SQLiteProvider databaseName="door_hardware_shop.db" onInit={initializeDatabase}>
      <AppStateProvider>
        <LocalizationProvider
          language={settings.language}
          setLanguage={(lang) => updateSetting('language', lang)}
        >
          <PaperProvider theme={theme}>
            <SafeAreaProvider>
              <StatusBar style="auto" />
              <SecurityGate>
                <AppNavigator />
              </SecurityGate>
            </SafeAreaProvider>
          </PaperProvider>
        </LocalizationProvider>
      </AppStateProvider>
    </SQLiteProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

