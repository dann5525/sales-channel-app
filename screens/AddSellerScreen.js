import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, FlatList, Text, StyleSheet, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dag4 } from '@stardust-collective/dag4';
import dataTransactionService from '../services/DataTransactionService';

export default function AddSellerScreen({ navigation }) {
  const [sellers, setSellers] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const initializeSeller = async () => {
      const walletPrivateKey = await AsyncStorage.getItem('walletPrivateKey');
      const account = dag4.createAccount();
      account.loginPrivateKey(walletPrivateKey);
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
    setErrorMessage('');

    const filteredSellers = sellers.filter(seller => validateAddress(seller));
    setSellers(filteredSellers);

    const goodSellers = [];
    const badSellers = [];

    try {
      const walletPrivateKey = await AsyncStorage.getItem('walletPrivateKey');
      const salesChannel = await AsyncStorage.getItem('salesChannel');
      const { id: channelId } = JSON.parse(salesChannel);

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
          badSellers.push(sellerNew);
        }
      }

      setSellers(badSellers);

      if (badSellers.length > 0) {
        setErrorMessage(`The following addresses had issues: ${badSellers.join(', ')}. Please check and correct them.`);
      } else {
        await AsyncStorage.setItem('sellers', JSON.stringify(goodSellers));
        await AsyncStorage.setItem('isOnboarded', 'true');
        navigation.navigate('MainScreen');
      }
    } catch (error) {
      setErrorMessage('An error occurred while processing the sellers. Please try again.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>Add Sellers</Text>
      <FlatList
        data={sellers}
        renderItem={({ item, index }) => (
          <View key={index} style={styles.productRow}>
            <TextInput
              style={[
                styles.input,
                errorMessage && sellers.includes(item) && styles.invalidInput, 
              ]}
              placeholder="Seller Address"
              value={item}
              onChangeText={(text) => updateSeller(index, text)}
            />
          </View>
        )}
        keyExtractor={(item, index) => index.toString()}
      />
      {errorMessage !== '' && <Text style={styles.errorMessage}>{errorMessage}</Text>}
      <TouchableOpacity style={styles.addButton} onPress={addSeller}>
        <Text style={styles.addButtonText}>Add Seller</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.finishButton} onPress={handleFinish}>
        <Text style={styles.finishButtonText}>Finish</Text>
      </TouchableOpacity>
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
    marginBottom: 16,
  },
  invalidInput: {
    borderColor: 'red',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  finishButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  finishButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorMessage: {
    marginTop: 20,
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
  },
});
