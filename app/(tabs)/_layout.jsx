import { FontAwesome } from '@expo/vector-icons'; // Make sure you have this package installed
import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';

import { Colors } from '../../assets/Color';

// Helper component for cleaner icon implementation
function TabBarIcon(props) {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}

const TabLayout = () => {
  // Get the current system theme (e.g., 'light' or 'dark')
  const colorScheme = useColorScheme();
  
  // Select the correct color palette based on the theme
  const themeColors = Colors[colorScheme ?? 'light'];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Active tab color remains your PRIMARY color as you intended
        tabBarActiveTintColor: Colors.PRIMARY, 
        // Inactive tab and background colors are now dynamic ✨
        tabBarInactiveTintColor: themeColors.tabIconDefault,
        tabBarStyle: {
          backgroundColor: themeColors.background,
          borderTopWidth: 0, // Optional: for a cleaner look
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="myOrder"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color }) => <TabBarIcon name="list-alt" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
        }}
      />
    </Tabs>
  );
};

export default TabLayout;