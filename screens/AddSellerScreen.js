import React, { useState, useEffect } from 'react';
import { View, TextInput, Button, FlatList, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dag4 } from '@stardust-collective/dag4';
import dataTransactionService from '../services/DataTransactionService';  // Ensure this is correctly imported

export default function AddSellerScreen({ navigation }) {
  const [sellers, setSellers] = useState([]);
  const [errorMessage, setErrorMessage] = useState(''); // Track error messages

  useEffect(() => {
    const initializeSeller = async () => {
      const walletPrivateKey = await AsyncStorage.getItem('walletPrivateKey');
      const account = dag4.createAccount();
      account.loginPrivateKey(walletPrivateKey);

      // Initialize the first seller as the user's own address
      setSellers([account.address]);
    };

    initializeSeller();
  }, []);

  const addSeller = () => {
    setSellers([...sellers, '']);
  };

  const updateSeller = (index, value) => {
    const newSellers = [...sellers];
    newSellers[index] = value;
    setSellers(newSellers);
  };

  const validateAddress = (address) => {
    return address && address.trim() !== '';
  };

  const handleFinish = async () => {
    setErrorMessage(''); // Clear previous errors

    // Filter out empty sellers
    const filteredSellers = sellers.filter(seller => validateAddress(seller));
    setSellers(filteredSellers);

    const goodSellers = [];
    const badSellers = [];

    try {
      const walletPrivateKey = await AsyncStorage.getItem('walletPrivateKey');
      const salesChannel = await AsyncStorage.getItem('salesChannel');
      const { id: channelId } = JSON.parse(salesChannel);

      if (!walletPrivateKey || !channelId) {
        throw new Error('Missing required data (walletPrivateKey or channelId).');
      }

      const account = dag4.createAccount();
      account.loginPrivateKey(walletPrivateKey);

      for (let sellerNew of filteredSellers) {
        try {
          const sellerTransaction = {
            AddSeller: {
              channelId: channelId,
              address: account.address,
              seller: sellerNew,
            },
          };

          const transactionObject = {
            message: sellerTransaction,
            globalL0Url: 'http://localhost:9000',
            metagraphL1DataUrl: 'http://localhost:9400',
          };

          await dataTransactionService.processTransaction(transactionObject);
          goodSellers.push(sellerNew);
        } catch (error) {
          console.error(`Error processing seller ${sellerNew}:`, error.message);
          badSellers.push(sellerNew);
        }
      }

      // Remove processed (good) sellers from the list
      setSellers(badSellers);

      if (badSellers.length > 0) {
        setErrorMessage(
          `The following addresses had issues: ${badSellers.join(', ')}. Please check and correct them.`
        );
      } else {
        // If all sellers are processed successfully, move to the next screen
        await AsyncStorage.setItem('sellers', JSON.stringify(goodSellers));
        await AsyncStorage.setItem('isOnboarded', 'true');
        navigation.navigate('MainScreen');
      }
    } catch (error) {
      console.error('Error handling seller submission:', error.message);
      setErrorMessage('An error occurred while processing the sellers. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={sellers}
        renderItem={({ item, index }) => (
          <View style={styles.productContainer}>
            <TextInput
              style={[
                styles.input,
                errorMessage && sellers.includes(item) && styles.invalidInput, // Highlight invalid inputs
              ]}
              placeholder="Seller Address"
              value={item}
              onChangeText={(text) => updateSeller(index, text)}
            />
          </View>
        )}
        keyExtractor={(item, index) => index.toString()}
      />
      {errorMessage !== '' && (
        <Text style={styles.errorMessage}>{errorMessage}</Text>
      )}
      <Button title="Add Seller" onPress={addSeller} />
      <Button title="Finish" onPress={handleFinish} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  productContainer: {
    marginBottom: 10,
  },
  invalidInput: {
    borderColor: 'red',
  },
  errorMessage: {
    marginTop: 20,
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
  },
});
