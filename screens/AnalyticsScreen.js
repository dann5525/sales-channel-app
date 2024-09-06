import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Dimensions, Picker, ScrollView } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

function AnalyticsScreen() {
  const [salesData, setSalesData] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeSellers, setActiveSellers] = useState({});
  const [selectedSeller, setSelectedSeller] = useState('All');

  useEffect(() => {
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
        const { sales, sellers } = response.data;

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

        const initialActiveSellers = sellers.reduce((acc, seller) => {
          acc[seller] = true;
          return acc;
        }, {});

        setSalesData(dataBySeller);
        setActiveSellers(initialActiveSellers);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching sales data:', error.message);
        setLoading(false);
      }
    };

    fetchSalesData();

    const intervalId = setInterval(() => {
      fetchSalesData();
    }, 15000);

    return () => clearInterval(intervalId);
  }, []);

  const toggleSellerVisibility = (seller) => {
    setActiveSellers((prevState) => ({
      ...prevState,
      [seller]: !prevState[seller],
    }));
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading Sales Data...</Text>
      </View>
    );
  }

  const datasets = Object.entries(salesData)
    .filter(([seller]) => activeSellers[seller])
    .map(([seller, sales]) => ({
      data: sales,
      color: () => `#${Math.floor(Math.random() * 16777215).toString(16)}`, // Random color for each seller
      strokeWidth: 2,
    }));

  // If no datasets are active, provide an empty dataset
  if (datasets.length === 0) {
    datasets.push({
      data: Array(15).fill(0), // 15 empty data points
      color: () => `rgba(0, 0, 0, 0)`, // Transparent color
      strokeWidth: 2,
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text>Analytics Screen Loaded</Text>

      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={selectedSeller}
          style={styles.picker}
          onValueChange={(itemValue) => toggleSellerVisibility(itemValue)}
        >
          <Picker.Item label="All" value="All" />
          {Object.keys(salesData).map((seller) => (
            <Picker.Item key={seller} label={seller} value={seller} />
          ))}
        </Picker>
      </View>

      <View style={styles.chartContainer}>
        <LineChart
          data={{
            labels: Array.from({ length: 15 }, (_, i) => `${15 - i}m`),
            datasets: datasets,
          }}
          width={Dimensions.get('window').width - 40}
          height={220}
          yAxisLabel=""
          yAxisSuffix=" sales"
          chartConfig={{
            backgroundColor: '#e26a00',
            backgroundGradientFrom: '#fb8c00',
            backgroundGradientTo: '#ffa726',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            style: { borderRadius: 16 },
            propsForDots: { r: '6', strokeWidth: '2', stroke: '#ffa726' },
          }}
          bezier
          style={{ marginVertical: 8, borderRadius: 16 }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  pickerContainer: {
    marginBottom: 20,
  },
  picker: {
    height: 50,
    width: 200,
  },
  chartContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 18,
    marginBottom: 10,
  },
});

export default AnalyticsScreen;
