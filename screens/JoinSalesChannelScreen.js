import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { dag4 } from '@stardust-collective/dag4';

export default function JoinSalesChannelScreen({ navigation }) {
  const [walletAddress, setWalletAddress] = useState('');
  const [channelId, setChannelId] = useState('');
  const [responseMessage, setResponseMessage] = useState(''); // New state for response messages

  useEffect(() => {
    const loadWalletData = async () => {
      try {
        const privateKey = await AsyncStorage.getItem('walletPrivateKey');
        if (privateKey) {
          dag4.account.loginPrivateKey(privateKey);
          const address = dag4.account.address;
          setWalletAddress(address);
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

  const handleJoinChannel = async () => {
    if (channelId.trim()) {
      try {
        const response = await axios.get(`https://rested-nice-dove.ngrok-free.app/9200/data-application/channels/${channelId}`);
        const channelData = response.data;

        if (channelData.sellers && channelData.sellers.includes(walletAddress)) {
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
          await AsyncStorage.setItem('isOnboarded', 'true');

          setResponseMessage('Successfully joined the sales channel!');
          navigation.navigate('MainScreen');
        } else {
          setResponseMessage('Your wallet address is not registered as a seller in this sales channel.');
        }
      } catch (error) {
        console.error('Error joining sales channel:', error.message);
        setResponseMessage('Failed to join the sales channel. Please try again.');
      }
    } else {
      setResponseMessage('Please enter a valid Sales Channel ID.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label}>Your Wallet Address:</Text>
        <Text style={styles.walletAddress}>{walletAddress}</Text>

        <Text style={styles.instruction}>
          Share this address with the sales channel owner. Once the owner has added your address, enter the Sales Channel ID below.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Sales Channel ID"
          value={channelId}
          onChangeText={setChannelId}
        />

        <TouchableOpacity style={styles.button} onPress={handleJoinChannel}>
          <Text style={styles.buttonText}>Join Channel</Text>
        </TouchableOpacity>

        {responseMessage !== '' && (
          <Text style={styles.responseMessage}>{responseMessage}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
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
  label: {
    fontSize: 18,
    marginBottom: 8,
    color: '#333',
  },
  walletAddress: {
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 5,
    color: '#555',
  },
  instruction: {
    fontSize: 16,
    marginBottom: 16,
    color: '#666',
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
  button: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
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
