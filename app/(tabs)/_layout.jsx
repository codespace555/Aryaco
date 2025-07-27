import { FontAwesome } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore'; // Correct import
import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, useColorScheme, View } from 'react-native';

import { Colors } from '../../assets/Color';

// Helper component for cleaner icon implementation
function TabBarIcon(props) {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}

const TabLayout = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = auth().currentUser?.uid;
    if (!userId) {
      setLoading(false);
      return;
    }

    // Fetch user data to determine their role
    const subscriber = firestore() // Correct usage
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
          borderTopWidth: 0,
        },
      }}
    >
      {/* --- ADMIN TABS (Conditionally rendered) --- */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <TabBarIcon name="tachometer" color={color} />,
          href: userData?.role === 'admin' ? '/dashboard' : null,
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Products',
          tabBarIcon: ({ color }) => <TabBarIcon name="shopping-basket" color={color} />,
          href: userData?.role === 'admin' ? '/products' : null,
        }}
      />
      <Tabs.Screen
        name="ordersList"
        options={{
          title: 'All Orders',
          tabBarIcon: ({ color }) => <TabBarIcon name="file-text" color={color} />,
          href: userData?.role === 'admin' ? '/ordersList' : null,
        }}
      />
      <Tabs.Screen
        name="addProduct"
        options={{
          title: 'Add Products',
          tabBarIcon: ({ color }) => <TabBarIcon name="tachometer" color={color} />,
          href: null
        }}
      />
       <Tabs.Screen
        name="addOrders"
        options={{
          title: 'Add Orders',
          tabBarIcon: ({ color }) => <TabBarIcon name="tachometer" color={color} />,
          href: null
        }}
      />
      {/* --- USER TABS (Conditionally rendered) --- */}
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
          href: userData?.role !== 'admin' ? '/home' : null,
        }}
      />
      <Tabs.Screen
        name="myOrder"
        options={{
          title: 'My Orders',
          tabBarIcon: ({ color }) => <TabBarIcon name="list-alt" color={color} />,
          href: userData?.role !== 'admin' ? '/myOrder' : null,
        }}
      />

      {/* --- SHARED TAB (Always visible) --- */}
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
