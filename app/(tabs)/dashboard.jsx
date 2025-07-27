import { FontAwesome5 } from '@expo/vector-icons';
import firestore from '@react-native-firebase/firestore';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { Colors } from '../../assets/Color.js'; // Assuming this is the path to your Colors file

// --- Reusable Components ---

const StatCard = ({ icon, label, value, color, index }) => {
  const theme = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const styles = getStyles(theme);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(index * 100),
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ])
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <Animated.View style={[styles.statCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <FontAwesome5 name={icon} size={22} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Animated.View>
  );
};

const OrderCard = ({ item, theme, onStatusUpdate, onPaymentUpdate }) => {
  const styles = getStyles(theme);
  const [expanded, setExpanded] = useState(false);

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

  const paymentStatusDetails = useMemo(() => {
    return item.payment === 'paid'
      ? { text: 'Paid', color: '#22c55e' }
      : { text: 'Unpaid', color: '#ef4444' };
  }, [item.payment]);

  const statusOptions = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

  return (
    <View style={styles.orderCard}>
      <TouchableOpacity onPress={() => setExpanded(!expanded)} activeOpacity={0.8}>
        <View style={styles.orderCardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.orderProduct}>{item.productName}</Text>
            <Text style={styles.orderUser}>{item.userName || 'N/A'}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <View style={[styles.statusBadge, { backgroundColor: statusDetails.color }]}>
              <Text style={styles.statusText}>{statusDetails.text}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: paymentStatusDetails.color, marginTop: 4 }]}>
              <Text style={styles.statusText}>{paymentStatusDetails.text}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.orderCardBody}>
          <Text style={styles.updateStatusLabel}>Update Order Status:</Text>
          <View style={styles.statusButtonsContainer}>
            {statusOptions.filter(opt => opt !== item.status).map(status => (
              <TouchableOpacity
                key={status}
                style={styles.statusButton}
                onPress={() => onStatusUpdate(item.id, status)}
              >
                <Text style={styles.statusButtonText}>{status}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.divider} />
          <Text style={styles.updateStatusLabel}>Update Payment Status:</Text>
          <TouchableOpacity
            style={[styles.paymentToggleButton, { backgroundColor: item.payment === 'paid' ? '#ef4444' : '#22c55e' }]}
            onPress={() => onPaymentUpdate(item.id, item.payment === 'paid' ? 'unpaid' : 'paid')}
          >
            <FontAwesome5 name={item.payment === 'paid' ? 'times-circle' : 'check-circle'} size={16} color="#fff" />
            <Text style={styles.paymentToggleButtonText}>
              {item.payment === 'paid' ? 'Mark as Unpaid' : 'Mark as Paid'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// --- Main Dashboard Screen Component ---
export default function Dashboard() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const styles = getStyles(theme);
  const router = useRouter();

  const [stats, setStats] = useState({ totalOrders: 0, todaysOrders: 0, todaysDeliveries: 0 });
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('deliveries');

  useEffect(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const statsSubscriber = firestore().collection('orders').onSnapshot(querySnapshot => {
      let todaysOrdersCount = 0;
      let todaysDeliveriesCount = 0;
      querySnapshot.forEach(doc => {
        const order = doc.data();
        if (order.orderedAt && order.orderedAt.toDate() >= todayStart && order.orderedAt.toDate() <= todayEnd) {
          todaysOrdersCount++;
        }
        if (order.deliveryDate && order.deliveryDate.toDate() >= todayStart && order.deliveryDate.toDate() <= todayEnd) {
          todaysDeliveriesCount++;
        }
      });
      setStats({
        totalOrders: querySnapshot.size,
        todaysOrders: todaysOrdersCount,
        todaysDeliveries: todaysDeliveriesCount,
      });
    });

    let query = firestore().collection('orders');
    if (activeTab === 'deliveries') {
      query = query.where('deliveryDate', '>=', todayStart).where('deliveryDate', '<=', todayEnd);
    } else {
      query = query.where('orderedAt', '>=', todayStart).where('orderedAt', '<=', todayEnd);
    }

    const ordersSubscriber = query.onSnapshot(async (querySnapshot) => {
      const ordersDataPromises = querySnapshot.docs.map(async (doc) => {
        const order = { id: doc.id, ...doc.data() };
        const userDoc = await firestore().collection('users').doc(order.userId).get();
        order.userName = userDoc.exists ? userDoc.data().name : 'Unknown User';
        return order;
      });
      const ordersData = await Promise.all(ordersDataPromises);
      setOrders(ordersData);
      setLoading(false);
    }, error => {
      console.error(error);
      setLoading(false);
    });

    return () => {
      statsSubscriber();
      ordersSubscriber();
    };
  }, [activeTab]);

  const handleUpdate = (orderId, field, newValue, type) => {
    Alert.alert(`Confirm ${type} Update`, `Are you sure you want to change the ${type} to "${newValue}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        onPress: async () => {
          try {
            await firestore().collection('orders').doc(orderId).update({ [field]: newValue });
            Alert.alert("Success", `Order ${type} has been updated.`);
          } catch (error) {
            Alert.alert("Error", `Failed to update order ${type}.`);
          }
        },
      },
    ]);
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
        <Text style={styles.headerTitle}>Admin Dashboard</Text>

        <View style={styles.statsContainer}>
          <StatCard icon="archive" label="Total Orders" value={stats.totalOrders} color="#3b82f6" index={0} />
          <StatCard icon="calendar-day" label="Today's Orders" value={stats.todaysOrders} color="#22c55e" index={1} />
          <StatCard icon="truck" label="Today's Deliveries" value={stats.todaysDeliveries} color="#8b5cf6" index={2} />
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/addProduct')}>
            <FontAwesome5 name="plus" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Add Product</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/addOrders')}>
            <FontAwesome5 name="plus" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Add Order</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.listContainer}>
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'deliveries' && styles.activeTab]}
              onPress={() => setActiveTab('deliveries')}
            >
              <Text style={[styles.tabText, activeTab === 'deliveries' && styles.activeTabText]}>Today Deliveries</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'orders' && styles.activeTab]}
              onPress={() => setActiveTab('orders')}
            >
              <Text style={[styles.tabText, activeTab === 'orders' && styles.activeTabText]}>Today Orders</Text>
            </TouchableOpacity>
          </View>

          {orders.length > 0 ? (
            orders.map(item => (
              <OrderCard
                key={item.id}
                item={item}
                theme={theme}
                onStatusUpdate={(id, status) => handleUpdate(id, 'status', status, 'status')}
                onPaymentUpdate={(id, payment) => handleUpdate(id, 'payment', payment, 'payment')}
              />
            ))
          ) : (
            <Text style={styles.emptyListText}>No orders found for this category.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  scrollContainer: { padding: 16 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: theme.text, marginBottom: 24, textAlign: 'center' },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 24, gap: 12 },
  statCard: { flex: 1, backgroundColor: theme.background, padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: theme.background === '#fff' ? '#e5e7eb' : '#374151', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 3 },
  statValue: { fontSize: 28, fontWeight: 'bold', color: theme.text, marginVertical: 8 },
  statLabel: { fontSize: 12, color: theme.icon, fontWeight: '600', textAlign: 'center' },
  actionsContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 24, gap: 12 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.SECONDARY, paddingVertical: 14, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  actionButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  listContainer: { backgroundColor: theme.background, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.background === '#fff' ? '#e5e7eb' : '#374151', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 3 },
  tabContainer: { flexDirection: 'row', backgroundColor: theme.background === '#fff' ? '#e5e7eb' : '#374151', borderRadius: 12, marginBottom: 16, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  activeTab: { backgroundColor: Colors.PRIMARY, shadowColor: Colors.PRIMARY, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
  tabText: { color: theme.text, fontWeight: 'bold' },
  activeTabText: { color: '#fff' },
  orderCard: { backgroundColor: theme.background, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: theme.background === '#fff' ? '#e5e7eb' : '#374151' },
  orderCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
  orderProduct: { fontSize: 16, fontWeight: 'bold', color: theme.text },
  orderUser: { fontSize: 12, color: theme.icon, marginTop: 2 },
  statusBadge: { borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: 'bold', textTransform: 'capitalize' },
  orderCardBody: { padding: 12, borderTopWidth: 1, borderTopColor: theme.background === '#fff' ? '#f3f4f6' : '#374151' },
  updateStatusLabel: { fontSize: 12, color: theme.icon, fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase' },
  statusButtonsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusButton: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#6b7280' },
  statusButtonText: { color: '#fff', fontSize: 12, fontWeight: 'bold', textTransform: 'capitalize' },
  divider: { height: 1, backgroundColor: theme.background === '#fff' ? '#e5e7eb' : '#374151', marginVertical: 12 },
  paymentToggleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8 },
  paymentToggleButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginLeft: 8 },
  emptyListText: { textAlign: 'center', color: theme.icon, paddingVertical: 20 },
});
