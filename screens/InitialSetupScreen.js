import React from 'react';
import { View, Button, StyleSheet } from 'react-native';

export default function InitialSetupScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Button
        title="Create Sales Channel"
        onPress={() => navigation.navigate('SalesChannelCreation')}
      />
      <Button
        title="Join Sales Channel"
        onPress={() => navigation.navigate('JoinSalesChannel')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
