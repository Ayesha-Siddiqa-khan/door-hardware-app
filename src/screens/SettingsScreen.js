import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
  HelperText,
  List,
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

export default function SettingsScreen() {
  const { settings, updateSetting } = useSettings();
  const security = useSecurity();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const { t } = useTranslation();
  const [messageKey, setMessageKey] = useState(null);

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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Card.Title title={t('appearanceLanguage')} />
        <Card.Content>
          <Text variant="labelMedium">{t('languageLabel')}</Text>
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

      <Card style={styles.card}>
        <Card.Title title={t('security')} />
        <Card.Content>
          <View style={styles.row}>
            <Text>{t('enableAppLock')}</Text>
            <Switch value={security.lockEnabled} onValueChange={(value) => (value ? null : handleDisableLock())} />
          </View>
          {!security.lockEnabled ? (
            <View>
              <TextInput
                label={t('createPin')}
                value={pin}
                onChangeText={setPin}
                secureTextEntry
                keyboardType="number-pad"
                style={styles.input}
              />
              <TextInput
                label={t('confirmPin')}
                value={confirmPin}
                onChangeText={setConfirmPin}
                secureTextEntry
                keyboardType="number-pad"
                style={styles.input}
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

      <Card style={styles.card}>
        <Card.Title title={t('dataManagement')} />
        <Card.Content>
          <Button icon="content-save" mode="contained" onPress={handleBackup} style={styles.input}>
            {t('createBackup')}
          </Button>
          <Button icon="restore" mode="outlined" onPress={handleRestore}>
            {t('restoreBackup')}
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
    backgroundColor: '#F7F9FC',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  card: {
    borderRadius: 16,
  },
  input: {
    marginTop: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
});




