import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import MapScreen from "./src/screens/MapScreen";
import TimelineScreen from "./src/screens/TimelineScreen";
import NewMemoryScreen from "./src/screens/NewMemoryScreen";
import StatsScreen from "./src/screens/StatsScreen";

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: "#185FA5",
          tabBarInactiveTintColor: "#888780",
          tabBarIcon: ({ color, size }) => {
            const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
              "Bản đồ": "map-outline",
              "Timeline": "time-outline",
              "Ghi mới": "add-circle-outline",
              "Thống kê": "bar-chart-outline",
            };
            return <Ionicons name={icons[route.name]} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Bản đồ" component={MapScreen} />
        <Tab.Screen name="Timeline" component={TimelineScreen} />
        <Tab.Screen name="Ghi mới" component={NewMemoryScreen} />
        <Tab.Screen name="Thống kê" component={StatsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
