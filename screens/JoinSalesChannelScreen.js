import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
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
        console.log('Attempting to load wallet data...');
        const privateKey = await AsyncStorage.getItem('walletPrivateKey');
        if (privateKey) {
          console.log('Wallet private key found. Logging in...');
          dag4.account.loginPrivateKey(privateKey);
          const address = dag4.account.address;
          console.log('Wallet address:', address);
          setWalletAddress(address);
        } else {
          console.log('No wallet private key found.');
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
    console.log('handleJoinChannel triggered');
    if (channelId.trim()) {
      try {
        console.log('Fetching sales channel data for channel ID:', channelId);
        const response = await axios.get(`http://localhost:9200/data-application/channels/${channelId}`);
        const channelData = response.data;

        console.log('Sales channel data received:', channelData);

        // Check if the user's wallet address is in the sellers list
        if (channelData.sellers && channelData.sellers.includes(walletAddress)) {
          console.log('Wallet address is a registered seller.');
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
          console.log('SalesChannel stored in AsyncStorage:', salesChannel);
          await AsyncStorage.setItem('isOnboarded', 'true');

          setResponseMessage('Successfully joined the sales channel!');
          // Navigate to the MainScreen
          navigation.navigate('MainScreen');
        } else {
          console.log('Wallet address is not a registered seller.');
          setResponseMessage('Your wallet address is not registered as a seller in this sales channel.');
        }
      } catch (error) {
        console.error('Error joining sales channel:', error.message);
        setResponseMessage('Failed to join the sales channel. Please try again.');
      }
    } else {
      console.log('No valid Sales Channel ID entered.');
      setResponseMessage('Please enter a valid Sales Channel ID.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Your Wallet Address:</Text>
      <Text style={styles.walletAddress}>{walletAddress}</Text>

      <Text style={styles.instruction}>
        Share this address with the sales channel owner. Once the owner has added your address, enter the Sales Channel ID below.
      </Text>

      <Text style={styles.label}>Enter Sales Channel ID:</Text>
      <TextInput
        style={styles.input}
        placeholder="Sales Channel ID"
        value={channelId}
        onChangeText={setChannelId}
      />

      <Button
        title="Join Channel"
        onPress={handleJoinChannel}
      />

      {/* Display the response message to the user */}
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
    justifyContent: 'center',
  },
  label: {
    fontSize: 18,
    marginBottom: 8,
  },
  walletAddress: {
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 5,
  },
  instruction: {
    fontSize: 16,
    marginBottom: 16,
    color: '#666',
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 16,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  responseMessage: {
    marginTop: 20,
    fontSize: 16,
    color: 'red', // You can change this to green for success messages
    textAlign: 'center',
  },
});
