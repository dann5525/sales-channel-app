import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Button } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dag4 } from '@stardust-collective/dag4';
import axios from 'axios';
import dataTransactionService from '../services/DataTransactionService'; // Ensure this is correctly imported

export default function MainScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [counts, setCounts] = useState({});
  const [totalPrice, setTotalPrice] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Retrieve stored sales channel from AsyncStorage
        const storedSalesChannel = await AsyncStorage.getItem('salesChannel');
        if (storedSalesChannel) {
          const parsedChannel = JSON.parse(storedSalesChannel);
          const channelId = parsedChannel.id;
          const walletPrivateKey = await AsyncStorage.getItem('walletPrivateKey');
          
          if (!walletPrivateKey || !channelId) {
            throw new Error('Missing walletPrivateKey or channelId');
          }

          // Create the account and login with the private key
          const account = dag4.createAccount();
          account.loginPrivateKey(walletPrivateKey);
          const address = account.address;

          // Fetch the latest on-chain data for this sales channel
          const response = await axios.get(`https://rested-nice-dove.ngrok-free.app/9200/data-application/channels/${channelId}`);
          const latestChannelData = response.data;

          // Check if the address is part of the sales channel (either owner or seller)
          if (latestChannelData.owner === address || latestChannelData.sellers.includes(address)) {
            const sortedProducts = Object.entries(latestChannelData.products || {}).sort((a, b) => a[1] - b[1]);
            const products = sortedProducts.map(([name, price]) => ({
                          name,
                          price: parseFloat(price),
                        }));
            
            console.log('Loaded products:', products); // Debug line

            setProducts(products);

            // Initialize counts
            const initialCounts = {};
            products.forEach(product => {
              initialCounts[product.name] = 0;
            });
            setCounts(initialCounts);

            // Store the latest data in AsyncStorage
            const updatedSalesChannel = {
              ...parsedChannel,
              products,  // Update the products with the latest on-chain data
            };
            await AsyncStorage.setItem('salesChannel', JSON.stringify(updatedSalesChannel));
          } else {
            console.error('Your wallet address is not part of this sales channel.');
          }
        } else {
          console.error('No sales channel data found in AsyncStorage.');
        }
      } catch (error) {
        console.error('Error loading data:', error.message);
      }
    };

    loadData();
  }, []);

  const handleProductClick = (productName, productPrice) => {
    if (typeof productPrice !== 'number' || isNaN(productPrice)) {
      console.error('Invalid product price:', productPrice);
      return;
    }

    const newCounts = { ...counts };
    newCounts[productName] += 1;
    setCounts(newCounts);
    setTotalPrice(prevTotal => prevTotal + productPrice);
  };

  const handlePayment = async (paymentMethod) => {
    try {
      const walletPrivateKey = await AsyncStorage.getItem('walletPrivateKey');
      const salesChannel = await AsyncStorage.getItem('salesChannel');
      const { id: channelId } = JSON.parse(salesChannel); // Extract channelId

      if (!walletPrivateKey || !channelId) {
        throw new Error('Missing required data (walletPrivateKey or channelId).');
      }

      const account = dag4.createAccount();
      account.loginPrivateKey(walletPrivateKey);

      const saleData = {
        Sale: {
          channelId: channelId, // Use the stored channelId
          address: account.address,
          station: "one",
          sale: products.map(product => [product.name, counts[product.name]]),
          payment: paymentMethod,
          timestamp: Date.now().toString(),
        }
      };

      // Push the sale transaction to the service
      const transactionObject = {
        message: saleData,
        globalL0Url: 'https://rested-nice-dove.ngrok-free.app/9000', // Replace with actual URL
        metagraphL1DataUrl: 'https://rested-nice-dove.ngrok-free.app/9400', // Replace with actual URL
      };

      await dataTransactionService.processTransaction(transactionObject);

      // Reset counts and total price
      const resetCounts = {};
      products.forEach(product => {
        resetCounts[product.name] = 0;
      });
      setCounts(resetCounts);
      setTotalPrice(0);

      console.log('Sale data sent:', saleData);
    } catch (error) {
      console.error('Error processing payment:', error.message);
    }
  };

  const handleRemoveProduct = (productName, productPrice) => {
    const newCounts = { ...counts };
    if (newCounts[productName] > 0) {
      newCounts[productName] -= 1;
      setCounts(newCounts);
      setTotalPrice(prevTotal => prevTotal - productPrice);
    }
  };
  

  return (
    <View style={styles.container}>
      <View style={styles.leftContainer}>
        <FlatList
          data={products}
          numColumns={2}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.productButton}
              onPress={() => handleProductClick(item.name, item.price)}
            >
              <Text style={styles.productText}>{item.name}</Text>
              <Text style={styles.productPrice}>${item.price.toFixed(2)}</Text>
            </TouchableOpacity>
          )}
          keyExtractor={(item, index) => index.toString()}
        />
      </View>
  
      <View style={styles.rightContainer}>
        <Text style={styles.cartTitle}>Your Cart</Text>
        <FlatList
          data={products.filter((product) => counts[product.name] > 0)}
          renderItem={({ item }) => (
            <View style={styles.cartItem}>
              <Text style={styles.cartItemName}>{item.name}</Text>
              <View style={styles.cartItemQuantity}>
                <Text style={styles.cartItemCount}>x{counts[item.name]}</Text>
                <Text style={styles.cartItemSubtotal}>
                  ${(counts[item.name] * item.price).toFixed(2)}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleRemoveProduct(item.name, item.price)}>
                <Text style={styles.removeButton}>Remove</Text>
              </TouchableOpacity>
            </View>
          )}
          keyExtractor={(item, index) => index.toString()}
        />
  
        <View style={styles.cartTotalContainer}>
          <Text style={styles.totalText}>Total: ${totalPrice.toFixed(2)}</Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.paymentButton}
              onPress={() => handlePayment('Card')}
            >
              <Text style={styles.paymentButtonText}>Card Payment</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.paymentButton}
              onPress={() => handlePayment('Cash')}
            >
              <Text style={styles.paymentButtonText}>Cash Payment</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  leftContainer: {
    flex: 2,
    padding: 10,
  },
  rightContainer: {
    flex: 1,
    padding: 10,
    justifyContent: 'space-between',
    backgroundColor: '#FAFAFA',
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  productButton: {
    flex: 1,
    margin: 10,
    padding: 20,
    backgroundColor: '#EDEDED',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  productText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  productPrice: {
    fontSize: 14,
    color: '#888',
  },
  cartTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cartItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  cartItemQuantity: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartItemCount: {
    fontSize: 16,
    marginHorizontal: 10,
  },
  cartItemSubtotal: {
    fontSize: 16,
    color: '#555',
  },
  removeButton: {
    fontSize: 14,
    color: '#FF6347',
  },
  cartTotalContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  totalText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#4CAF50',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  paymentButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 15,
    marginHorizontal: 5,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
});