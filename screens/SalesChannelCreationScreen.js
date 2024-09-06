import React, { useState } from 'react';
import { View, TextInput, Button, FlatList, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import dataTransactionService from '../services/DataTransactionService';
import { dag4 } from '@stardust-collective/dag4';

export default function SalesChannelCreationScreen({ navigation }) {
  const [channelName, setChannelName] = useState('');
  const [products, setProducts] = useState([{ name: '', price: '' }]);

  const addProduct = () => {
    setProducts([...products, { name: '', price: '' }]);
  };

  const updateProduct = (index, key, value) => {
    const newProducts = [...products];
    newProducts[index][key] = value;
    setProducts(newProducts);
  };

  const handleCreateChannel = async () => {
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

    // Prepare the transaction
    const transaction = {
      message: salesChannelMessage,
      globalL0Url: 'http://localhost:9000', // Replace with actual URL
      metagraphL1DataUrl: 'http://localhost:9400', // Replace with actual URL
    };

    // Push the transaction to the service
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
  
      // Store the simplified sales channel object in AsyncStorage
      await AsyncStorage.setItem('salesChannel', JSON.stringify(salesChannel));
      console.log('SalesChannel stored in AsyncStorage:', salesChannel);


    // Navigate to the next screen
    navigation.navigate('AddInventory');
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Channel Name"
        value={channelName}
        onChangeText={setChannelName}
      />
      <FlatList
        data={products}
        renderItem={({ item, index }) => (
          <View key={index} style={styles.productContainer}>
            <TextInput
              style={styles.input}
              placeholder="Product Name"
              value={item.name}
              onChangeText={(text) => updateProduct(index, 'name', text)}
            />
            <TextInput
              style={styles.input}
              placeholder="Price"
              keyboardType="numeric"
              value={item.price}
              onChangeText={(text) => updateProduct(index, 'price', text)}
            />
          </View>
        )}
        keyExtractor={(item, index) => index.toString()}
      />
      <Button title="Add Product" onPress={addProduct} />
      <Button title="Create Channel" onPress={handleCreateChannel} />
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
