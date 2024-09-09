import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Dimensions, Picker, ScrollView, TouchableOpacity } from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

function AnalyticsScreen() {
  const [salesData, setSalesData] = useState({});
  const [inventoryData, setInventoryData] = useState({});
  const [loading, setLoading] = useState(true);
  const [sellers, setSellers] = useState([]);
  const [selectedSeller, setSelectedSeller] = useState('All');

  const fetchSalesData = async () => {
    try {
      const storedSalesChannel = await AsyncStorage.getItem('salesChannel');
      if (!storedSalesChannel) {
        throw new Error('No sales channel data found in AsyncStorage.');
      }

      const { id: channelId } = JSON.parse(storedSalesChannel);
      if (!channelId) {
        throw new Error('No channelId found in sales channel data.');
      }

      const response = await axios.get(`http://localhost:9200/data-application/channels/${channelId}`);
      const { sales, sellers, inventory } = response.data;

      const currentTime = Date.now();
      const filteredSales = Object.entries(sales)
        .filter(([timestamp]) => currentTime - timestamp <= 15 * 60 * 1000)
        .reduce((acc, [timestamp, saleData]) => {
          acc[timestamp] = saleData;
          return acc;
        }, {});

      const dataBySeller = sellers.reduce((acc, seller) => {
        acc[seller] = Array(15).fill(0);
        return acc;
      }, {});

      Object.entries(filteredSales).forEach(([timestamp, salesPerSeller]) => {
        const minuteIndex = 14 - Math.floor((currentTime - timestamp) / (60 * 1000));
        Object.entries(salesPerSeller).forEach(([seller, productSales]) => {
          if (dataBySeller[seller] && minuteIndex >= 0 && minuteIndex < 15) {
            dataBySeller[seller][minuteIndex] += Object.values(productSales).reduce(
              (sum, count) => sum + count,
              0
            );
          }
        });
      });

      setSalesData(dataBySeller);
      setInventoryData(inventory); // Store raw inventory data
      setSellers(sellers);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching sales data:', error.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesData();

    const intervalId = setInterval(() => {
      fetchSalesData();
    }, 15000);

    return () => clearInterval(intervalId);
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text>Loading Sales Data...</Text>
      </View>
    );
  }

  // Aggregate inventory for "All" or use specific seller's inventory
  const aggregatedInventory = {};
  if (selectedSeller === 'All') {
    Object.entries(inventoryData).forEach(([seller, sellerInventory]) => {
      Object.entries(sellerInventory).forEach(([product, count]) => {
        if (!aggregatedInventory[product]) {
          aggregatedInventory[product] = 0;
        }
        aggregatedInventory[product] += count; // Sum the inventory for each product across all sellers
      });
    });
  } else {
    // Only show the inventory for the selected seller
    Object.entries(inventoryData[selectedSeller] || {}).forEach(([product, count]) => {
      aggregatedInventory[product] = count;
    });
  }

  const productLabels = Object.keys(aggregatedInventory);
  const productInventoryCounts = Object.values(aggregatedInventory);

  const filteredSalesData = selectedSeller === 'All'
    ? Object.values(salesData).reduce((acc, sales) => {
        return sales.map((value, index) => acc[index] + value);
      }, Array(15).fill(0))
    : salesData[selectedSeller] || Array(15).fill(0);

  const salesDataset = [
    {
      data: filteredSalesData,
      color: () => '#4CAF50', // Green color for sales data
      strokeWidth: 2,
    },
  ];

  // Find the minimum value in inventory to adjust the y-axis range
  const minInventory = Math.min(...productInventoryCounts);
  const yAxisMin = minInventory < 0 ? minInventory : 0; // If there are negatives, show the min value

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.chartTitle}>Sales Analytics (Last 15 Minutes)</Text>

      <View style={styles.pickerContainer}>
        <Text style={styles.pickerLabel}>Filter by Seller:</Text>
        <Picker
          selectedValue={selectedSeller}
          style={styles.picker}
          onValueChange={(itemValue) => setSelectedSeller(itemValue)}
        >
          <Picker.Item label="All" value="All" />
          {sellers.map((seller) => (
            <Picker.Item key={seller} label={seller} value={seller} />
          ))}
        </Picker>
      </View>

      {/* Sales Analytics Chart */}
      <View style={styles.chartContainer}>
        <LineChart
          data={{
            labels: Array.from({ length: 15 }, (_, i) => `${15 - i}m`),
            datasets: salesDataset,
          }}
          width={Dimensions.get('window').width - 40}
          height={220}
          yAxisLabel=""
          yAxisSuffix=" sales"
          chartConfig={{
            backgroundColor: '#f0f0f0',
            backgroundGradientFrom: '#4CAF50',
            backgroundGradientTo: '#81C784',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            style: { borderRadius: 16 },
            propsForDots: { r: '6', strokeWidth: '2', stroke: '#81C784' },
          }}
          bezier
          style={{ marginVertical: 8, borderRadius: 16 }}
        />
      </View>

      <Text style={styles.chartTitle}>Current Inventory</Text>

      {/* Inventory Analytics Bar Chart */}
      <View style={styles.chartContainer}>
        <BarChart
          data={{
            labels: productLabels, // Labels will be the product names
            datasets: [{ data: productInventoryCounts }], // Data will be the corresponding inventory counts
          }}
          width={Dimensions.get('window').width - 40}
          height={220}
          yAxisLabel=""
          yAxisSuffix=" items"
          yAxisMin={yAxisMin} // Start the y-axis at the minimum inventory value
          chartConfig={{
            backgroundColor: '#f0f0f0',
            backgroundGradientFrom: '#FF9800',
            backgroundGradientTo: '#FFB74D',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            style: { borderRadius: 16 },
          }}
          style={{ marginVertical: 8, borderRadius: 16 }}
          fromZero={yAxisMin >= 0} // Only use fromZero when yAxisMin is greater than or equal to 0
          segments={5} // Controls the number of y-axis segments
        />
      </View>


      <TouchableOpacity style={styles.refreshButton} onPress={() => fetchSalesData()}>
        <Text style={styles.refreshButtonText}>Refresh Data</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
  },
  pickerContainer: {
    marginBottom: 20,
  },
  picker: {
    height: 50,
    width: 200,
    borderColor: '#4CAF50',
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: '#fff',
    color: '#333',
  },
  pickerLabel: {
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
  },
  chartContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  refreshButton: {
    marginTop: 20,
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 10,
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default AnalyticsScreen;
