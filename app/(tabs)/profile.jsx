import { FontAwesome5 } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { Colors } from "../../assets/Color.js"; // Assuming this is the path to your Colors file

// -- Today's Delivery Card Component --
const DeliveryCard = ({ item, theme }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const styles = getStyles(theme);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const statusDetails = useMemo(() => {
    switch (item.status) {
      case 'pending': return { text: 'Pending', color: Colors.PRIMARY };
      case 'processing': return { text: 'Processing', color: '#3b82f6' };
      case 'shipped': return { text: 'Shipped', color: '#8b5cf6' };
      case 'delivered': return { text: 'Delivered', color: '#22c55e' };
      case 'cancelled': return { text: 'Cancelled', color: '#ef4444' };
      default: return { text: 'Unknown', color: theme.icon };
    }
  }, [item.status]);

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <View style={styles.deliveryCard}>
        <View>
          <Text style={styles.deliveryProduct}>{item.productName}</Text>
          <Text style={styles.deliveryQuantity}>{item.quantity} {item.unit}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusDetails.color }]}>
          <Text style={styles.statusText}>{statusDetails.text}</Text>
        </View>
      </View>
    </Animated.View>
  );
};


// -- Main Profile Screen Component --
export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const styles = getStyles(theme);
  const router = useRouter();

  const [userData, setUserData] = useState(null);
  const [todaysDeliveries, setTodaysDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const userId = auth().currentUser?.uid;

  useEffect(() => {
    if (!userId) {
      Alert.alert("Error", "No user found.");
      setLoading(false);
      return;
    }

    // --- Fetch User Profile ---
    const userSubscriber = firestore()
      .collection('users')
      .doc(userId)
      .onSnapshot(documentSnapshot => {
        setUserData(documentSnapshot.data());
      });

    // --- Fetch Today's Deliveries ---
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const deliverySubscriber = firestore()
      .collection('orders')
      .where('userId', '==', userId)
      .where('deliveryDate', '>=', todayStart)
      .where('deliveryDate', '<=', todayEnd)
      .onSnapshot(querySnapshot => {
        const deliveries = [];
        querySnapshot.forEach(doc => {
          deliveries.push({ id: doc.id, ...doc.data() });
        });
        setTodaysDeliveries(deliveries);
        setLoading(false);
      }, error => {
        console.error(error);
        setLoading(false);
      });

    // Unsubscribe from listeners on unmount
    return () => {
      userSubscriber();
      deliverySubscriber();
    };
  }, [userId]);

  const handleLogout = async () => {
    try {
      await auth().signOut();
      router.replace('/'); // Navigate to your login/index screen
    } catch (error) {
      Alert.alert("Logout Error", "Failed to log out. Please try again.",error);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.PRIMARY} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.headerContainer}>
          {/* <FontAwesome5 name="user" size={80} color={Colors.PRIMARY} /> */}
          <Text style={styles.headerTitle}>{userData?.name || 'User Profile'}</Text>
          <Text style={styles.headerSubtitle}>{userData?.phone}</Text>
        </View>

        {/* --- User Details Card --- */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>My Details</Text>
          <View style={styles.detailRow}>
            <FontAwesome5 name="user" size={16} color={theme.icon} style={styles.icon} />
            <Text style={styles.detailText}>{userData?.name || 'N/A'}</Text>
          </View>
          <View style={styles.detailRow}>
            <FontAwesome5 name="phone" size={16} color={theme.icon} style={styles.icon} />
            <Text style={styles.detailText}>{userData?.phone || 'N/A'}</Text>
          </View>
          <View style={styles.detailRow}>
            <FontAwesome5 name="map-marker-alt" size={16} color={theme.icon} style={styles.icon} />
            <Text style={styles.detailText}>{userData?.address || 'N/A'}</Text>
          </View>
        </View>

        {/* --- Today's Deliveries Card --- */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Today Deliveries</Text>
          {todaysDeliveries.length > 0 ? (
            <FlatList
              data={todaysDeliveries}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <DeliveryCard item={item} theme={theme} />}
              scrollEnabled={false} // Disable scroll for FlatList inside ScrollView
            />
          ) : (
            <Text style={styles.noDeliveriesText}>No deliveries scheduled for today.</Text>
          )}
        </View>

        {/* --- Logout Button --- */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
          <FontAwesome5 name="sign-out-alt" size={18} color="#fff" style={{ marginLeft: 10 }} />
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  scrollContainer: { paddingVertical: 24, paddingHorizontal: 16 },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.text,
    marginTop: 12,
  },
  headerSubtitle: {
    fontSize: 16,
    color: theme.icon,
    marginTop: 4,
  },
  card: {
    backgroundColor: theme.background,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    borderColor: theme.background === '#fff' ? '#e5e7eb' : '#374151',
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.background === '#fff' ? '#f3f4f6' : '#1f2937',
    paddingBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    width: 20,
    marginRight: 12,
  },
  detailText: {
    fontSize: 16,
    color: theme.text,
    flex: 1,
  },
  deliveryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.background === '#fff' ? '#f3f4f6' : '#1f2937',
  },
  deliveryProduct: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
  },
  deliveryQuantity: {
    fontSize: 14,
    color: theme.icon,
    marginTop: 2,
  },
  statusBadge: {
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  noDeliveriesText: {
    fontSize: 16,
    color: theme.icon,
    textAlign: 'center',
    paddingVertical: 20,
  },
  logoutButton: {
    backgroundColor: '#ef4444', // Red
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 10,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  }
});
