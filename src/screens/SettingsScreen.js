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
import { LocalizationProvider, useTranslation } from '../localization/LocalizationProvider';
import { createBackup, restoreBackup } from '../utils/backup';

export default function SettingsScreen() {
  const { settings, updateSetting } = useSettings();
  const security = useSecurity();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const { t } = useTranslation();
  const [message, setMessage] = useState('');

  const handleLanguageChange = (lang) => {
    updateSetting('language', lang);
  };

  const handleBackup = async () => {
    try {
      await createBackup();
      setMessage('Backup created and ready to share.');
    } catch (error) {
      setMessage('Failed to create backup.');
    }
  };

  const handleRestore = async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.length) return;
    try {
      await restoreBackup(result.assets[0].uri);
      setMessage('Backup restored successfully.');
    } catch (error) {
      setMessage('Failed to restore backup.');
    }
  };

  const handleEnableLock = async () => {
    if (!pin || pin !== confirmPin) {
      setMessage('PINs do not match.');
      return;
    }
    await security.enableLock(pin);
    setPin('');
    setConfirmPin('');
    setMessage('App lock enabled.');
  };

  const handleDisableLock = async () => {
    await security.disableLock();
    setMessage('App lock disabled.');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Card.Title title="Appearance & Language" />
        <Card.Content>
          <Text variant="labelMedium">Language</Text>
          <SegmentedButtons
            value={settings.language}
            onValueChange={handleLanguageChange}
            buttons={[
              { value: 'en', label: 'English' },
              { value: 'ur', label: 'Urdu' },
            ]}
          />
          <TextInput
            label="Currency"
            mode="outlined"
            value={settings.currency}
            onChangeText={(value) => updateSetting('currency', value)}
            style={styles.input}
          />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Security" />
        <Card.Content>
          <View style={styles.row}>
            <Text>Enable App Lock</Text>
            <Switch value={security.lockEnabled} onValueChange={(value) => (value ? null : handleDisableLock())} />
          </View>
          {!security.lockEnabled ? (
            <View>
              <TextInput
                label="Create PIN"
                value={pin}
                onChangeText={setPin}
                secureTextEntry
                keyboardType="number-pad"
                style={styles.input}
              />
              <TextInput
                label="Confirm PIN"
                value={confirmPin}
                onChangeText={setConfirmPin}
                secureTextEntry
                keyboardType="number-pad"
                style={styles.input}
              />
              <Button mode="contained" onPress={handleEnableLock}>
                Enable Lock
              </Button>
            </View>
          ) : (
            <Button mode="outlined" onPress={handleDisableLock} style={styles.input}>
              Disable Lock
            </Button>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Data Management" />
        <Card.Content>
          <Button icon="content-save" mode="contained" onPress={handleBackup} style={styles.input}>
            Create Backup
          </Button>
          <Button icon="restore" mode="outlined" onPress={handleRestore}>
            Restore Backup
          </Button>
          <HelperText type="info" visible={!!message}>
            {message}
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




