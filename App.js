import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createStackNavigator } from '@react-navigation/stack';
import InitialScreen from './screens/InitialScreen';
import InitialSetupScreen from './screens/InitialSetupScreen';
import SalesChannelCreationScreen from './screens/SalesChannelCreationScreen';
import AddInventoryScreen from './screens/AddInventoryScreen';
import AddSellerScreen from './screens/AddSellerScreen';
import JoinSalesChannelScreen from './screens/JoinSalesChannelScreen';
import MainScreen from './screens/MainScreen';
import SettingsScreen from './screens/SettingsScreen';
import AnalyticsScreen from './screens/AnalyticsScreen';  // Ensure this import is correct
import ManageInventoryScreen from './screens/ManageInventoryScreen';

const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

function MainStack() {
  return (
    <Stack.Navigator initialRouteName="InitialScreen">
      <Stack.Screen name="InitialScreen" component={InitialScreen} options={{ headerShown: false }} />
      <Stack.Screen name="InitialSetup" component={InitialSetupScreen} />
      <Stack.Screen name="SalesChannelCreation" component={SalesChannelCreationScreen} />
      <Stack.Screen name="AddInventory" component={AddInventoryScreen} />
      <Stack.Screen name="AddSeller" component={AddSellerScreen} />
      <Stack.Screen name="JoinSalesChannel" component={JoinSalesChannelScreen} />
      <Stack.Screen name="MainScreen" component={MainScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Drawer.Navigator initialRouteName="Main">
        <Drawer.Screen name="Main" component={MainStack} />
        <Drawer.Screen name="Analytics" component={AnalyticsScreen} />
        <Drawer.Screen name="Settings" component={SettingsScreen} />
        <Drawer.Screen name="Inventory" component={ManageInventoryScreen} />
      </Drawer.Navigator>
    </NavigationContainer>
  );
}
