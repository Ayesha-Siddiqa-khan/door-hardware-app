import { StyleSheet, View } from 'react-native';
import { Card, Text } from 'react-native-paper';

export function ReportCard({ title, value, subtitle, icon }) {
  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.header}>
          {icon ? <Text variant="headlineSmall">{icon}</Text> : null}
          <Text variant="labelMedium">{title}</Text>
        </View>
        <Text variant="headlineMedium" style={styles.value}>
          {value}
        </Text>
        {subtitle ? <Text variant="bodySmall">{subtitle}</Text> : null}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 6,
    borderRadius: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  value: {
    marginBottom: 4,
  },
});
