import { FontAwesome } from '@expo/vector-icons'; // Make sure you have this package installed
import auth from '@react-native-firebase/auth';
import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';

import { getFirestore } from '@react-native-firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native-web';
import { Colors } from '../../assets/Color';

// Helper component for cleaner icon implementation
function TabBarIcon(props) {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}

const TabLayout = () => {
  // Get the current system theme (e.g., 'light' or 'dark')
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const userId = auth().currentUser?.uid;
    if (!userId) {
      // If no user is logged in, stop loading. The router should handle redirection.
      setLoading(false);
      return;
    }

    // Fetch user data to determine their role
    const subscriber = getFirestore()
      .collection('users')
      .doc(userId)
      .onSnapshot(documentSnapshot => {
        setUserData(documentSnapshot.data());
        setLoading(false);
      }, error => {
        console.error("Error fetching user role:", error);
        setLoading(false);
      });

    return () => subscriber();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: themeColors.background }}>
        <ActivityIndicator size="large" color={Colors.PRIMARY} />
      </View>
    );
  }
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.PRIMARY,
        tabBarInactiveTintColor: themeColors.tabIconDefault,
        tabBarStyle: {
          backgroundColor: themeColors.background,
          borderTopWidth: 0, // Optional: for a cleaner look
        },
      }}
    >

      {/* --- USER TABS --- */}
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
          title: 'My Orders',
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