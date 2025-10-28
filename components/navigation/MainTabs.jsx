import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '../screens/Home/HomeScreen';
import MealsScreen from '../screens/Home/MealsScreen';
import HistoryScreen from '../screens/Home/HistoryScreen';
import OrderScreen from '../screens/Home/Meals/OrderScreen'; // make sure this file exists

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size, focused }) => {
          let iconName;
          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Meals':
              iconName = focused ? 'fast-food' : 'fast-food-outline';
              break;
            case 'History':
              iconName = focused ? 'bar-chart' : 'bar-chart-outline';
              break;
            case 'Order':
              iconName = focused ? 'cart' : 'cart-outline';
              break;
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#555555',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#fff',
          height: 60,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Meals" component={MealsScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Order" component={OrderScreen} />
    </Tab.Navigator>
  );
}
