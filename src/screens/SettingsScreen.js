import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
  HelperText,
  SegmentedButtons,
  Switch,
  Text,
  TextInput,
} from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import { useSettings } from '../hooks/useSettings';
import { useSecurity } from '../hooks/useSecurity';
import { useTranslation } from '../localization/LocalizationProvider';
import { createBackup, restoreBackup } from '../utils/backup';
import { resetDatabase } from '../database/db';
import { useAppState } from '../state/AppStateProvider';
import { colors } from '../constants/colors';
import { radius, spacing } from '../constants/theme';

export default function SettingsScreen() {
  const { settings, updateSetting } = useSettings();
  const security = useSecurity();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const { t } = useTranslation();
  const [messageKey, setMessageKey] = useState(null);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const { refreshAll } = useAppState();

  const handleLanguageChange = (lang) => {
    updateSetting('language', lang);
  };

  const handleBackup = async () => {
    try {
      await createBackup();
      setMessageKey('backupCreated');
    } catch (error) {
      setMessageKey('backupFailed');
    }
  };

  const handleRestore = async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.length) return;
    try {
      await restoreBackup(result.assets[0].uri);
      setMessageKey('backupRestored');
    } catch (error) {
      setMessageKey('backupRestoreFailed');
    }
  };

  const handleEnableLock = async () => {
    if (!pin || pin !== confirmPin) {
      setMessageKey('pinMismatch');
      return;
    }
    await security.enableLock(pin);
    setPin('');
    setConfirmPin('');
    setMessageKey('appLockEnabled');
  };

  const handleDisableLock = async () => {
    await security.disableLock();
    setMessageKey('appLockDisabled');
  };

  const handleLoadDemoData = async () => {
    if (loadingDemo) return;
    setLoadingDemo(true);
    try {
      await resetDatabase();
      refreshAll();
      setMessageKey('demoLoaded');
    } catch (error) {
      setMessageKey('demoLoadFailed');
    } finally {
      setLoadingDemo(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card} mode="contained">
        <Card.Title title={t('appearanceLanguage')} />
        <Card.Content>
          <Text variant="labelMedium" style={styles.label}>
            {t('languageLabel')}
          </Text>
          <SegmentedButtons
            value={settings.language}
            onValueChange={handleLanguageChange}
            buttons={[
              { value: 'en', label: t('languageEnglish') },
              { value: 'ur', label: t('languageUrdu') },
            ]}
          />
          <TextInput
            label={t('currencyLabel')}
            mode="outlined"
            value={settings.currency}
            onChangeText={(value) => updateSetting('currency', value)}
            style={styles.input}
          />
        </Card.Content>
      </Card>

      <Card style={styles.card} mode="contained">
        <Card.Title title={t('security')} />
        <Card.Content>
          <View style={styles.row}>
            <Text>{t('enableAppLock')}</Text>
            <Switch value={security.lockEnabled} onValueChange={(value) => (value ? null : handleDisableLock())} />
          </View>
          {!security.lockEnabled ? (
            <View style={styles.stack}>
              <TextInput
                label={t('createPin')}
                value={pin}
                onChangeText={setPin}
                secureTextEntry
                keyboardType="number-pad"
              />
              <TextInput
                label={t('confirmPin')}
                value={confirmPin}
                onChangeText={setConfirmPin}
                secureTextEntry
                keyboardType="number-pad"
              />
              <Button mode="contained" onPress={handleEnableLock}>
                {t('enableLock')}
              </Button>
            </View>
          ) : (
            <Button mode="outlined" onPress={handleDisableLock} style={styles.input}>
              {t('disableLock')}
            </Button>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.card} mode="contained">
        <Card.Title title={t('dataManagement')} />
        <Card.Content style={styles.stack}>
          <Button icon="content-save" mode="contained" onPress={handleBackup}>
            {t('createBackup')}
          </Button>
          <Button icon="restore" mode="outlined" onPress={handleRestore}>
            {t('restoreBackup')}
          </Button>
          <Button
            icon="database-refresh"
            mode="outlined"
            onPress={handleLoadDemoData}
            loading={loadingDemo}
            disabled={loadingDemo}
          >
            {t('loadDemoData')}
          </Button>
          <HelperText type="info" visible={!!messageKey}>
            {messageKey ? t(messageKey) : ''}
          </HelperText>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  label: {
    marginBottom: spacing.sm,
  },
  input: {
    marginTop: spacing.md,
  },
  stack: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
});
