import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet } from 'react-native';

export default function CreateSalesChannelScreen({ navigation }) {
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

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Channel Name"
        value={channelName}
        onChangeText={setChannelName}
      />
      {products.map((product, index) => (
        <View key={index} style={styles.productContainer}>
          <TextInput
            style={styles.input}
            placeholder="Product Name"
            value={product.name}
            onChangeText={(text) => updateProduct(index, 'name', text)}
          />
          <TextInput
            style={styles.input}
            placeholder="Price"
            value={product.price}
            onChangeText={(text) => updateProduct(index, 'price', text)}
          />
        </View>
      ))}
      <Button title="Add Product" onPress={addProduct} />
      <Button
        title="Next"
        onPress={() => navigation.navigate('PreparationScreen', { channelName, products })}
      />
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
