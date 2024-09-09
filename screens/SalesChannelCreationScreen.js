import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, FlatList, Text, StyleSheet, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import dataTransactionService from '../services/DataTransactionService';
import { dag4 } from '@stardust-collective/dag4';

export default function SalesChannelCreationScreen({ navigation }) {
  const [channelName, setChannelName] = useState('');
  const [products, setProducts] = useState([{ name: '', price: '' }]);
  const [responseMessage, setResponseMessage] = useState('');

  const addProduct = () => {
    setProducts([...products, { name: '', price: '' }]);
  };

  const updateProduct = (index, key, value) => {
    const newProducts = [...products];
    newProducts[index][key] = value;
    setProducts(newProducts);
  };

  const handleCreateChannel = async () => {
    try {
      const walletPrivateKey = await AsyncStorage.getItem('walletPrivateKey');
      const account = dag4.createAccount();
      account.loginPrivateKey(walletPrivateKey);

      const salesChannelMessage = {
        CreateSalesChannel: {
          name: channelName,
          owner: account.address,
          products: products.map(product => [product.name, parseFloat(product.price)]),
          startSnapshotOrdinal: 1, // Replace with actual snapshot data
          endSnapshotOrdinal: 10000, // Replace with actual snapshot data
        },
      };

      const transaction = {
        message: salesChannelMessage,
        globalL0Url: 'http://localhost:9000', // Replace with actual URL
        metagraphL1DataUrl: 'http://localhost:9400', // Replace with actual URL
      };

      const responseHash = await dataTransactionService.processTransaction(transaction);
      console.log('Transaction completed with hash:', responseHash);

      const salesChannel = {
        id: responseHash,
        name: channelName,
        owner: account.address,
        products: products.map(product => ({
          name: product.name,
          price: parseFloat(product.price),
        })),
      };

      await AsyncStorage.setItem('salesChannel', JSON.stringify(salesChannel));
      console.log('SalesChannel stored in AsyncStorage:', salesChannel);

      setResponseMessage('Sales channel created successfully!');
      navigation.navigate('AddInventory');
    } catch (error) {
      console.error('Error creating sales channel:', error.message);
      setResponseMessage('Failed to create sales channel. Please try again.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        {/* Section for Channel Name */}
        <Text style={styles.sectionTitle}>Channel Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter Channel Name"
          value={channelName}
          onChangeText={setChannelName}
        />

        {/* Section for Products */}
        <Text style={styles.sectionTitle}>Products</Text>

        <FlatList
          data={products}
          renderItem={({ item, index }) => (
            <View key={index} style={styles.productRow}>
              <TextInput
                style={[styles.input, styles.productInput]}
                placeholder="Product Name"
                value={item.name}
                onChangeText={(text) => updateProduct(index, 'name', text)}
              />
              <TextInput
                style={[styles.input, styles.priceInput]}
                placeholder="Price"
                keyboardType="numeric"
                value={item.price}
                onChangeText={(text) => updateProduct(index, 'price', text)}
              />
            </View>
          )}
          keyExtractor={(item, index) => index.toString()}
        />

        {/* Add Product Button */}
        <TouchableOpacity style={styles.addButton} onPress={addProduct}>
          <Text style={styles.addButtonText}>Add Product</Text>
        </TouchableOpacity>

        {/* Create Channel Button */}
        <TouchableOpacity style={styles.createButton} onPress={handleCreateChannel}>
          <Text style={styles.createButtonText}>Create Channel</Text>
        </TouchableOpacity>

        {/* Response Message */}
        {responseMessage !== '' && <Text style={styles.responseMessage}>{responseMessage}</Text>}
      </View>
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
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
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
    marginBottom: 16,
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
  priceInput: {
    flex: 1,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 10,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  createButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 10,
  },
  createButtonText: {
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
