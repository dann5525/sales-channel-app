import React, { useState, useEffect } from 'react';
import { View, TextInput, Button, FlatList, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dag4 } from '@stardust-collective/dag4';
import dataTransactionService from '../services/DataTransactionService';

export default function AddInventoryScreen({ navigation }) {
  const [inventory, setInventory] = useState([]);

  useEffect(() => {
    const loadProducts = async () => {
      const salesChannel = await AsyncStorage.getItem('salesChannel');
      const { products } = JSON.parse(salesChannel);
      setInventory(products.map(product => ({ name: product.name, amount: '' })));
    };
    loadProducts();
  }, []);

  const updateInventory = (index, value) => {
    const newInventory = [...inventory];
    newInventory[index].amount = value;
    setInventory(newInventory);
  };

  const handleNext = async () => {
    try {
      const walletPrivateKey = await AsyncStorage.getItem('walletPrivateKey');
      const salesChannel = await AsyncStorage.getItem('salesChannel');
      const { id: channelId } = JSON.parse(salesChannel); // Extract channelId

      if (!walletPrivateKey || !channelId) {
        throw new Error('Missing required data (walletPrivateKey or channelId).');
      }

      const account = dag4.createAccount();
      account.loginPrivateKey(walletPrivateKey);

      const storedInventory = inventory.map(item => ({
        AddInventory: {
          channelId: channelId, // Use the stored channelId
          address: account.address,
          product: item.name,
          amount: parseFloat(item.amount),
          timestamp: Date.now().toString()
        }
      }));

      // Push each inventory transaction to the service
      for (let transaction of storedInventory) {
        const transactionObject = {
          message: transaction,
          globalL0Url: 'http://localhost:9000', // Replace with actual URL
          metagraphL1DataUrl: 'http://localhost:9400', // Replace with actual URL
        };

        await dataTransactionService.processTransaction(transactionObject);
      }

      // Store the inventory in AsyncStorage in the correct structure
      await AsyncStorage.setItem('inventory', JSON.stringify(storedInventory));

      // Proceed to the next screen
      navigation.navigate('AddSeller');
    } catch (error) {
      console.error('Error handling inventory submission:', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={inventory}
        renderItem={({ item, index }) => (
          <View style={styles.productContainer}>
            <TextInput
              style={styles.input}
              placeholder={`${item.name} Inventory`}
              keyboardType="numeric"
              value={item.amount}
              onChangeText={(text) => updateInventory(index, text)}
            />
          </View>
        )}
        keyExtractor={(item, index) => index.toString()}
      />
      <Button title="Next" onPress={handleNext} />
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
});
