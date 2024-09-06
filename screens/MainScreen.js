import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Button } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dag4 } from '@stardust-collective/dag4';
import dataTransactionService from '../services/DataTransactionService'; // Ensure this is correctly imported

export default function MainScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [counts, setCounts] = useState({});
  const [totalPrice, setTotalPrice] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        const storedSalesChannel = await AsyncStorage.getItem('salesChannel');
        if (storedSalesChannel) {
          const parsedChannel = JSON.parse(storedSalesChannel);
          const products = parsedChannel.products || [];
          console.log('Loaded products:', products);

          if (Array.isArray(products)) {
            setProducts(products);

            // Initialize counts
            const initialCounts = {};
            products.forEach(product => {
              initialCounts[product.name] = 0;
            });
            setCounts(initialCounts);
          } else {
            console.error('Products data is not an array or is malformed:', products);
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
          sale: products.map(product => [product.name, counts[product.name]]),
          payment: paymentMethod,
          timestamp: Date.now().toString(),
        }
      };

      // Push the sale transaction to the service
      const transactionObject = {
        message: saleData,
        globalL0Url: 'http://localhost:9000', // Replace with actual URL
        metagraphL1DataUrl: 'http://localhost:9400', // Replace with actual URL
      };

      await dataTransactionService.processTransaction(transactionObject);

      // Reset counts and total price
      const resetCounts = {};
      products.forEach(product => {
        resetCounts[product.name] = 0;
      });
      setCounts(resetCounts);
      setTotalPrice(0);

      // Log the sale data or perform other actions as needed
      console.log('Sale data sent:', saleData);
    } catch (error) {
      console.error('Error processing payment:', error.message);
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
            </TouchableOpacity>
          )}
          keyExtractor={(item, index) => index.toString()}
        />
      </View>
      <View style={styles.rightContainer}>
        <FlatList
          data={products}
          renderItem={({ item }) => (
            <Text style={styles.countText}>
              {item.name}: {counts[item.name]}
            </Text>
          )}
          keyExtractor={(item, index) => index.toString()}
        />
        <Text style={styles.totalText}>Total: ${totalPrice.toFixed(2)}</Text>
        <View style={styles.buttonContainer}>
          <Button title="Card Payment" onPress={() => handlePayment('Card')} />
          <Button title="Cash Payment" onPress={() => handlePayment('Cash')} />
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
  },
  productButton: {
    flex: 1,
    margin: 10,
    padding: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productText: {
    fontSize: 16,
  },
  countText: {
    fontSize: 16,
    marginBottom: 10,
  },
  totalText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
