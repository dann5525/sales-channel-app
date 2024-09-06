import { dag4 } from '@stardust-collective/dag4';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';

class DataTransactionService {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
  }

  // Add a transaction to the queue
  enqueueTransaction(transaction) {
    console.log('Enqueuing transaction:', transaction);
    this.queue.push(transaction);
    this.processQueue(); // Start processing if not already running
  }

  // Process the queue
  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      console.log('Processing is already in progress or the queue is empty.');
      return;
    }

    console.log('Starting to process the transaction queue...');
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const transaction = this.queue.shift();
      console.log('Processing transaction:', transaction);
      await this.processTransaction(transaction);
    }

    console.log('Finished processing the transaction queue.');
    this.isProcessing = false;
  }

  // Process a single transaction
  async processTransaction(transaction) {
    try {
      console.log('Fetching wallet private key from AsyncStorage...');
      const walletPrivateKey = await AsyncStorage.getItem('walletPrivateKey');
      if (!walletPrivateKey) throw new Error('No wallet private key found in storage.');

      console.log('Creating account and logging in with the private key...');
      const account = dag4.createAccount();
      account.loginPrivateKey(walletPrivateKey);

      console.log('Connecting to the network...');
      account.connect({
        networkVersion: '2.0',
        l0Url: transaction.globalL0Url,
        testnet: true,
      });

      console.log('Generating proof for the transaction...');
      const proof = await this.generateProof(transaction.message, walletPrivateKey, account);
      const body = {
        value: {
          ...transaction.message,
        },
        proofs: [proof],
      };

      console.log(`Transaction body: ${JSON.stringify(body)}`);
      console.log('Sending transaction data to the metagraph L1...');
      const response = await axios.post(`${transaction.metagraphL1DataUrl}/data`, body);
      
      // Assuming the response hash is returned under a key like `hash`
      const responseHash = response.data.hash;
      console.log(`Received response hash: ${responseHash}`);

      // Return the response hash to the caller
      return responseHash;

    } catch (error) {
      console.error('Error processing transaction:', error.message);
      console.error('Error stack:', error.stack);
      throw error; // Rethrow the error to be handled by the caller
    }
  }

  // Generate proof for the transaction
  async generateProof(message, walletPrivateKey, account) {
    try {
      console.log('Encoding message and generating signature...');
      const encodedMessage = Buffer.from(JSON.stringify(message)).toString('base64');
      const signature = await dag4.keyStore.dataSign(walletPrivateKey, encodedMessage);

      const publicKey = account.publicKey;
      const uncompressedPublicKey = publicKey.length === 128 ? '04' + publicKey : publicKey;

      console.log('Generated proof:', {
        id: uncompressedPublicKey.substring(2),
        signature,
      });

      return {
        id: uncompressedPublicKey.substring(2),
        signature,
      };
    } catch (error) {
      console.error('Error generating proof:', error.message);
      throw error; // Rethrow the error to be caught in the calling function
    }
  }
}

// Create a singleton instance
const dataTransactionService = new DataTransactionService();
export default dataTransactionService;
