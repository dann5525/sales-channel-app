import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { dag4 } from '@stardust-collective/dag4';
import dataTransactionService from '../services/DataTransactionService';

export default function SettingsScreen({ navigation }) {
  const [walletAddress, setWalletAddress] = useState('');
  const [channelId, setChannelId] = useState('');
  const [responseMessage, setResponseMessage] = useState('');
  const [mode, setMode] = useState(''); // 'owner' or 'seller'
  const [channelData, setChannelData] = useState(null); 
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [products, setProducts] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [newSellerAddress, setNewSellerAddress] = useState('');

  useEffect(() => {
    const loadWalletData = async () => {
      try {
        const privateKey = await AsyncStorage.getItem('walletPrivateKey');
        if (privateKey) {
          dag4.account.loginPrivateKey(privateKey);
          const address = dag4.account.address;
          setWalletAddress(address);

          const storedSalesChannel = await AsyncStorage.getItem('salesChannel');
          if (storedSalesChannel) {
            const { id: storedChannelId } = JSON.parse(storedSalesChannel);
            setChannelId(storedChannelId);
            await fetchChannelData(storedChannelId, address);
          }
        } else {
          setResponseMessage('No wallet data found. Please set up your wallet first.');
        }
      } catch (error) {
        console.error('Error loading wallet data:', error.message);
        setResponseMessage('Failed to load wallet data. Please try again.');
      }
    };

    loadWalletData();
  }, []);

  const fetchChannelData = async (channelId, address) => {
    try {
      const response = await axios.get(`http://localhost:9200/data-application/channels/${channelId}`);
      const channelData = response.data;
      setChannelData(channelData);

      const owner = channelData.owner || '';
      const sellers = channelData.sellers || [];

      if (owner === address) {
        setMode('owner');
        setProducts(Object.entries(channelData.products || {}).map(([name, price]) => ({ name, price })));
        setSellers(sellers);
      } else if (sellers.includes(address)) {
        setMode('seller');
      } else {
        setResponseMessage('Your wallet address is not part of this sales channel.');
      }
    } catch (error) {
      console.error('Error fetching channel data:', error.message);
      setResponseMessage('Failed to fetch channel data. Please try again.');
    }
  };

  const handleChangeChannel = async () => {
    if (channelId.trim()) {
      try {
        await fetchChannelData(channelId, walletAddress);
  
        if (channelData && channelData.sellers && channelData.sellers.includes(walletAddress)) {
          const salesChannel = {
            id: channelData.id,
            name: channelData.name,
            owner: channelData.owner,
            products: Object.entries(channelData.products).map(([name, price]) => ({
              name,
              price: parseFloat(price),
            })),
          };
  
          await AsyncStorage.setItem('salesChannel', JSON.stringify(salesChannel));
          setResponseMessage('Channel ID updated and sales channel data stored successfully.');
        } else {
          setResponseMessage('Your wallet address is not registered as a seller in this sales channel.');
        }
      } catch (error) {
        setResponseMessage('Failed to update the channel ID. Please try again.');
        console.error('Error updating channel ID:', error.message);
      }
    } else {
      setResponseMessage('Please enter a valid Sales Channel ID.');
    }
  };

  const handleAddProduct = async () => {
    try {
      const newProduct = { name: newProductName, price: parseFloat(newProductPrice) };
      setProducts([...products, newProduct]);

      const transactionObject = {
        message: {
          AddProducts: {
            channelId: channelId,
            address: walletAddress,
            products: [
              [newProduct.name, newProduct.price], 
            ],
          },
        },
        globalL0Url: 'http://localhost:9000',
        metagraphL1DataUrl: 'http://localhost:9400',
      };

      await dataTransactionService.processTransaction(transactionObject);

      setResponseMessage('Product added successfully.');
      setNewProductName('');  
      setNewProductPrice('');
    } catch (error) {
      console.error('Error adding product:', error.message);
      setResponseMessage('Failed to add product. Please try again.');
    }
  };

  const handleAddSeller = async () => {
    try {
      const sellerToAdd = newSellerAddress.trim();
      if (!sellerToAdd) {
        setResponseMessage('Seller address cannot be empty.');
        return;
      }

      setSellers([...sellers, sellerToAdd]);

      const transactionObject = {
        message: {
          AddSeller: {
            channelId: channelId,
            address: walletAddress,
            seller: sellerToAdd,
          }
        },
        globalL0Url: 'http://localhost:9000',
        metagraphL1DataUrl: 'http://localhost:9400',
      };

      await dataTransactionService.processTransaction(transactionObject);

      setResponseMessage('Seller added successfully.');
      setNewSellerAddress(''); 
    } catch (error) {
      console.error('Error adding seller:', error.message);
      setResponseMessage('Failed to add seller. Please try again.');
    }
  };

  const renderSellerMode = () => (
    <View style={styles.card}>
      <Text style={styles.heading}>Seller Settings</Text>
      <Text>Your Wallet Address:</Text>
      <Text style={styles.walletAddress}>{walletAddress}</Text>

      <Text>Current Sales Channel ID:</Text>
      <Text style={styles.walletAddress}>{channelId}</Text>

      <Text style={styles.label}>Enter New Sales Channel ID:</Text>
      <TextInput
        style={styles.input}
        placeholder="Sales Channel ID"
        value={channelId}
        onChangeText={setChannelId}
      />

      <TouchableOpacity style={styles.button} onPress={handleChangeChannel}>
        <Text style={styles.buttonText}>Change Channel</Text>
      </TouchableOpacity>
    </View>
  );

  const renderOwnerMode = () => (
    <ScrollView>
      <View style={styles.card}>
        <Text style={styles.heading}>Owner Settings</Text>
        <Text>Sales Channel ID:</Text>
        <Text style={styles.walletAddress}>{channelId}</Text>

        <Text>Existing Products:</Text>
        {products.map((product, index) => (
          <Text key={index} style={styles.productText}>{product.name}: ${product.price}</Text>
        ))}

        <TextInput
          style={styles.input}
          placeholder="New Product Name"
          value={newProductName}
          onChangeText={setNewProductName}
        />
        <TextInput
          style={styles.input}
          placeholder="New Product Price"
          keyboardType="numeric"
          value={newProductPrice}
          onChangeText={setNewProductPrice}
        />
        <TouchableOpacity style={styles.button} onPress={handleAddProduct}>
          <Text style={styles.buttonText}>Add Product</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text>Current Sellers:</Text>
        {sellers.map((seller, index) => (
          <Text key={index} style={styles.sellerText}>{seller}</Text>
        ))}

        <TextInput
          style={styles.input}
          placeholder="New Seller Address"
          value={newSellerAddress}
          onChangeText={setNewSellerAddress}  
        />
        <TouchableOpacity style={styles.button} onPress={handleAddSeller}>
          <Text style={styles.buttonText}>Add Seller</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {mode === 'seller' && renderSellerMode()}
      {mode === 'owner' && renderOwnerMode()}
      {responseMessage !== '' && (
        <Text style={styles.responseMessage}>{responseMessage}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  card: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    marginVertical: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#4CAF50',
  },
  input: {
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  walletAddress: {
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 5,
  },
  productText: {
    fontSize: 16,
    marginBottom: 5,
  },
  sellerText: {
    fontSize: 16,
    marginBottom: 5,
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 18,
    marginBottom: 8,
    color: '#333',
  },
  responseMessage: {
    marginTop: 20,
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
  },
});
