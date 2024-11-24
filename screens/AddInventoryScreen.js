import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, FlatList, Text, StyleSheet, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dag4 } from '@stardust-collective/dag4';
import dataTransactionService from '../services/DataTransactionService';

export default function AddInventoryScreen({ navigation }) {
  const [inventory, setInventory] = useState([]);
  const [responseMessage, setResponseMessage] = useState('');

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
      const { id: channelId } = JSON.parse(salesChannel);

      if (!walletPrivateKey || !channelId) {
        throw new Error('Missing required data (walletPrivateKey or channelId).');
      }

      const account = dag4.createAccount();
      account.loginPrivateKey(walletPrivateKey);

      const storedInventory = inventory.map(item => ({
        AddInventory: {
          channelId: channelId,
          address: account.address,
          station: "one",
          product: item.name,
          amount: parseFloat(item.amount),
          timestamp: Date.now().toString(),
        },
      }));

      for (let transaction of storedInventory) {
        const transactionObject = {
          message: transaction,
          globalL0Url: 'https://rested-nice-dove.ngrok-free.app/9000',
          metagraphL1DataUrl: 'https://rested-nice-dove.ngrok-free.app/9400',
        };

        await dataTransactionService.processTransaction(transactionObject);
      }

      await AsyncStorage.setItem('inventory', JSON.stringify(storedInventory));
      setResponseMessage('Inventory updated successfully!');
      navigation.navigate('AddSeller');
    } catch (error) {
      console.error('Error handling inventory submission:', error.message);
      setResponseMessage('Failed to update inventory. Please try again.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>Update Inventory</Text>
      <FlatList
        data={inventory}
        renderItem={({ item, index }) => (
          <View key={index} style={styles.productRow}>
            <TextInput
              style={[styles.input, styles.productInput]}
              placeholder={`${item.name}`}
              editable={false}
              value={item.name}
            />
            <TextInput
              style={[styles.input, styles.amountInput]}
              placeholder="Inventory Amount"
              keyboardType="numeric"
              value={item.amount}
              onChangeText={(text) => updateInventory(index, text)}
            />
          </View>
        )}
        keyExtractor={(item, index) => index.toString()}
      />
      <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
        <Text style={styles.nextButtonText}>Next</Text>
      </TouchableOpacity>
      {responseMessage !== '' && <Text style={styles.responseMessage}>{responseMessage}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f8f8f8',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  input: {
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    paddingHorizontal: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  productInput: {
    flex: 2,
    marginRight: 10,
  },
  amountInput: {
    flex: 1,
  },
  nextButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  responseMessage: {
    marginTop: 20,
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
  },
});
