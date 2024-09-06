import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dag4 } from '@stardust-collective/dag4';

export default function InitialScreen({ navigation }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkWalletAndOnboarding = async () => {
      try {
        const walletPrivateKey = await AsyncStorage.getItem('walletPrivateKey');
        const isOnboarded = await AsyncStorage.getItem('isOnboarded');

        if (!walletPrivateKey) {
          console.log('No wallet found, creating a new one.');
          // No wallet found, create one
          const privateKey = dag4.keyStore.generatePrivateKey();
          dag4.account.loginPrivateKey(privateKey);

          // Debug log: Verify what is being saved
          console.log('Generated Private Key:', privateKey);

          await AsyncStorage.setItem('walletPrivateKey', privateKey);
          console.log('Wallet private key saved to AsyncStorage.');

          navigation.navigate('InitialSetup');
        } else {
          // Wallet exists, log in with the stored private key
          console.log('Wallet found:', walletPrivateKey);
          dag4.account.loginPrivateKey(walletPrivateKey);
          if (isOnboarded === 'true') {
            // User is onboarded, navigate to MainScreen
            navigation.navigate('MainScreen');
          } else {
            // User is not onboarded, start the onboarding process
            navigation.navigate('InitialSetup');
          }
        }
      } catch (error) {
        console.error('Error loading wallet or onboarding status:', error);
        // Handle error appropriately (e.g., show an error message to the user)
      } finally {
        setLoading(false);
      }
    };

    checkWalletAndOnboarding();
  }, [navigation]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading...</Text>
      </View>
    );
  }

  return null; // This will never render since the screen will navigate away
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
