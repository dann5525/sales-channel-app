import React, { useState, useEffect } from 'react';
import { View, Text, Picker, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import axios from 'axios';
import { dag4 } from '@stardust-collective/dag4';
import dataTransactionService from '../services/DataTransactionService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ManageInventoryScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedSeller, setSelectedSeller] = useState('');
  const [responseMessage, setResponseMessage] = useState('');

  useEffect(() => {
    const fetchSalesChannelData = async () => {
      try {
        // Get channel ID from storage (assuming still needed for identification)
        const salesChannel = await AsyncStorage.getItem('salesChannel');
        const { id: channelId } = JSON.parse(salesChannel);

        // Fetch latest sales channel data from the backend
        const response = await axios.get(`http://localhost:9200/data-application/channels/${channelId}`);
        const { products, sellers, owner } = response.data;

        // Format products as an array for easy mapping
        const productsArray = Object.entries(products || {}).map(([name, price]) => ({
          name,
          price,
        }));

        setProducts(productsArray);
        setSellers(sellers.filter(seller => seller !== owner));  // Exclude the owner from sellers
      } catch (error) {
        console.error('Error fetching data from chain:', error.message);
      }
    };

    fetchSalesChannelData();
  }, []);

  const handleAddInventory = async () => {
    try {
      const walletPrivateKey = await AsyncStorage.getItem('walletPrivateKey');
      const salesChannel = await AsyncStorage.getItem('salesChannel');
      const { id: channelId } = JSON.parse(salesChannel);

      if (!walletPrivateKey || !channelId || !selectedProduct || !amount) {
        throw new Error('Missing required data.');
      }

      const account = dag4.createAccount();
      account.loginPrivateKey(walletPrivateKey);

      const inventoryTransaction = {
        AddInventory: {
          channelId: channelId,
          address: account.address,
          product: selectedProduct,
          amount: parseFloat(amount),
          timestamp: Date.now().toString(),
        },
      };

      const transactionObject = {
        message: inventoryTransaction,
        globalL0Url: 'http://localhost:9000',
        metagraphL1DataUrl: 'http://localhost:9400',
      };

      await dataTransactionService.processTransaction(transactionObject);
      setResponseMessage('Inventory added successfully!');
    } catch (error) {
      console.error('Error adding inventory:', error.message);
      setResponseMessage('Failed to add inventory. Please try again.');
    }
  };

  const handleMoveInventory = async () => {
    try {
      const walletPrivateKey = await AsyncStorage.getItem('walletPrivateKey');
      const salesChannel = await AsyncStorage.getItem('salesChannel');
      const { id: channelId } = JSON.parse(salesChannel);

      if (!walletPrivateKey || !channelId || !selectedProduct || !amount || !selectedSeller) {
        throw new Error('Missing required data.');
      }

      const account = dag4.createAccount();
      account.loginPrivateKey(walletPrivateKey);

      const moveInventoryTransaction = {
        MoveInventory: {
          channelId: channelId,
          address: account.address,
          toAddress: selectedSeller,
          product: selectedProduct,
          amount: parseFloat(amount),
          timestamp: Date.now().toString(),
        },
      };

      const transactionObject = {
        message: moveInventoryTransaction,
        globalL0Url: 'http://localhost:9000',
        metagraphL1DataUrl: 'http://localhost:9400',
      };

      await dataTransactionService.processTransaction(transactionObject);
      setResponseMessage('Inventory moved successfully!');
    } catch (error) {
      console.error('Error moving inventory:', error.message);
      setResponseMessage('Failed to move inventory. Please try again.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>Manage Inventory</Text>

      {/* Add Inventory Section */}
      <View>
        <Text style={styles.subSectionTitle}>Add Inventory</Text>
        <View style={styles.row}>
          <Picker
            selectedValue={selectedProduct}
            style={styles.input}
            onValueChange={(itemValue) => setSelectedProduct(itemValue)}
          >
            <Picker.Item label="Select Product" value="" />
            {products.map(product => (
              <Picker.Item key={product.name} label={product.name} value={product.name} />
            ))}
          </Picker>
          <TextInput
            style={styles.input}
            placeholder="Amount"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handleAddInventory}>
          <Text style={styles.addButtonText}>Add Inventory</Text>
        </TouchableOpacity>
      </View>

      {/* Move Inventory Section */}
      <View>
        <Text style={styles.subSectionTitle}>Move Inventory</Text>
        <View style={styles.row}>
          <Picker
            selectedValue={selectedProduct}
            style={styles.input}
            onValueChange={(itemValue) => setSelectedProduct(itemValue)}
          >
            <Picker.Item label="Select Product" value="" />
            {products.map(product => (
              <Picker.Item key={product.name} label={product.name} value={product.name} />
            ))}
          </Picker>
          <TextInput
            style={styles.input}
            placeholder="Amount"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
          <Picker
            selectedValue={selectedSeller}
            style={styles.input}
            onValueChange={(itemValue) => setSelectedSeller(itemValue)}
          >
            <Picker.Item label="Select Seller" value="" />
            {sellers.map(seller => (
              <Picker.Item key={seller} label={seller} value={seller} />
            ))}
          </Picker>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handleMoveInventory}>
          <Text style={styles.addButtonText}>Move Inventory</Text>
        </TouchableOpacity>
      </View>

      {/* Response Message */}
      {responseMessage !== '' && <Text style={styles.responseMessage}>{responseMessage}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#f8f8f8',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  subSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  input: {
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    paddingHorizontal: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
    flex: 1,
    marginHorizontal: 5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  addButtonText: {
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
