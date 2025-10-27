import { StyleSheet, View } from 'react-native';
import { Card, Text } from 'react-native-paper';

export function ReportCard({ title, value, subtitle, icon }) {
  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.header}>
          {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
          <Text variant="labelMedium" style={styles.title}>
            {title}
          </Text>
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
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    marginRight: 8,
  },
  title: {
    flexShrink: 1,
  },
  value: {
    marginBottom: 4,
  },
});
