import DateTimePicker from "@react-native-community/datetimepicker";
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { format } from "date-fns";
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { Colors } from "../../assets/Color.js"; // Assuming this is the path to your Colors file

// -- Memoized and Animated OrderCard Component for Performance --
const OrderCard = ({ item, theme }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const styles = getStyles(theme);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

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
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.productName}>{item.productName}</Text>


            <Text style={styles.orderDate}>
              Ordered: {item.orderedAt ? format(item.orderedAt.toDate(), 'dd MMM yyyy, hh:mm a') : 'N/A'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusDetails.color }]}>
            <Text style={styles.statusText}>{statusDetails.text}</Text>
          </View>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Quantity:</Text>
            <Text style={styles.detailValue}>{item.quantity} {item.unit}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total Price:</Text>
            <Text style={[styles.detailValue, { color: Colors.PRIMARY, fontWeight: 'bold' }]}>

              ₹{(item.totalPrice || 0).toFixed(2)}
            </Text>
          </View>
          <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.detailLabel}>Est. Delivery:</Text>

            <Text style={styles.detailValue}>
              {item.deliveryDate ? format(item.deliveryDate.toDate(), 'dd MMM yyyy') : 'N/A'}
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

// -- Main MyOrdersScreen Component --
export default function MyOrdersScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const styles = getStyles(theme);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [dateFilter, setDateFilter] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [userData, setUserData] = useState(null);
  const userId = auth().currentUser?.uid;

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchUserData = async () => {
      const userDoc = await firestore().collection('users').doc(userId).get();
      if (userDoc.exists) setUserData(userDoc.data());
    };
    fetchUserData();

    let query = firestore().collection('orders').where('userId', '==', userId);

    if (dateFilter) {
      const startOfDay = new Date(dateFilter);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dateFilter);
      endOfDay.setHours(23, 59, 59, 999);
      query = query.where('deliveryDate', '>=', startOfDay).where('deliveryDate', '<=', endOfDay);
    } else {
      query = query.orderBy('orderedAt', 'desc');
    }

    const subscriber = query.onSnapshot(querySnapshot => {
      const ordersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(ordersData);
      setLoading(false);
    }, error => {
      console.error("Error fetching orders:", error);
      if (error.code === 'firestore/failed-precondition') {
        Alert.alert('Action Required', 'A database index is needed to filter by date. Please click the link in your terminal to create it.');
      } else {
        Alert.alert('Error', 'Failed to load your orders.');
      }
      setLoading(false);
    });

    return () => subscriber();
  }, [userId, dateFilter]);

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (event.type === 'set' && selectedDate) {
      setDateFilter(selectedDate);
    } else if (event.type !== 'set') { // Handle cancel/dismiss
      setShowDatePicker(false);
    }
  };

  const generateInvoiceHtml = () => {
    const invoiceDate = format(new Date(), 'dd MMM yyyy');
    const deliveryDate = format(dateFilter, 'dd MMM yyyy');

    const grandTotal = orders.reduce((sum, order) => sum + (order.totalPrice || 0), 0).toFixed(2);

    const itemsHtml = orders.map(order => `
      <tr>
        <td>${order.productName || 'N/A'}</td>
        <td>${order.quantity || 0} ${order.unit || ''}</td>
       
        <td>₹${order.price}</td>
        <td>₹${(order.totalPrice || 0).toFixed(2)}</td>
      </tr>
    `).join('');

    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
            h1 { color: ${Colors.PRIMARY}; text-align: center; }
            .header, .customer-details, .summary { margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
            .header p, .customer-details p { margin: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .total { text-align: right; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Arya & Co</h1>
          <div class="header">
            <p><strong>Invoice Date:</strong> ${invoiceDate}</p>
            <p><strong>Delivery Date:</strong> ${deliveryDate}</p>
          </div>
          <div class="customer-details">
            <h3>Customer Details:</h3>
            <p><strong>Name:</strong> ${userData?.name || 'N/A'}</p>
            <p><strong>Phone:</strong> ${userData?.phone || 'N/A'}</p>
            <p><strong>Address:</strong> ${userData?.address || 'N/A'}</p>
          </div>
          <div class="summary">
            <h3>Order Summary:</h3>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            <p class="total">Grand Total: ₹${grandTotal}</p>
          </div>
        </body>
      </html>
    `;
  };

  const downloadInvoice = async () => {
    if (orders.length === 0) {
      Alert.alert("No Orders", "There are no orders for the selected date to include in the invoice.");
      return;
    }
    setIsDownloading(true);
    try {
      const html = generateInvoiceHtml();
      const { uri } = await Print.printToFileAsync({ html });
      const filename = `Invoice_${format(dateFilter, 'yyyy-MM-dd')}.pdf`;
      const newUri = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.moveAsync({ from: uri, to: newUri });

      await Sharing.shareAsync(newUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Download Invoice',
      });
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      Alert.alert("Error", "Could not generate the invoice PDF.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>My Orders</Text>
      </View>
      <View style={styles.filterBar}>
        <TouchableOpacity style={styles.dateFilterButton} onPress={() => setShowDatePicker(true)}>
          <Text style={styles.dateFilterText}>{dateFilter ? format(dateFilter, 'dd MMM yyyy') : 'Filter by Date'}</Text>
        </TouchableOpacity>
        {dateFilter && (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity style={styles.downloadButton} onPress={downloadInvoice} disabled={isDownloading}>
              {isDownloading ? <ActivityIndicator size="small" color={Colors.PRIMARY} /> : <Text style={styles.downloadButtonText}>PDF</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.clearFilterButton} onPress={() => setDateFilter(null)}>
              <Text style={styles.clearFilterText}>Clear</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {showDatePicker && <DateTimePicker value={dateFilter || new Date()} mode="date" display="default" onChange={onDateChange} />}

      {loading ? (
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={Colors.PRIMARY} />
          <Text style={styles.loadingText}>Loading Orders...</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <OrderCard item={item} theme={theme} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Image source={{ uri: 'https://placehold.co/400x400/ffffff/cccccc?text=No+Orders' }} style={styles.emptyImage} />
              <Text style={styles.emptyText}>{dateFilter ? "No orders found for this date." : "You haven't placed any orders yet."}</Text>
              <Text style={styles.emptySubText}>{dateFilter ? "Try selecting another date." : "Products you order will appear here."}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  headerContainer: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.background === '#fff' ? '#f3f4f6' : '#1f2937' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: theme.text, textAlign: 'center' },
  loadingText: { marginTop: 10, color: theme.icon, fontSize: 16 },
  filterBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.background === '#fff' ? '#f3f4f6' : '#1f2937' },
  dateFilterButton: { backgroundColor: theme.background === '#fff' ? '#f3f4f6' : '#1f2937', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  dateFilterText: { color: theme.text, fontWeight: '600' },
  downloadButton: { backgroundColor: theme.background, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: Colors.PRIMARY, marginRight: 10 },
  downloadButtonText: { color: Colors.PRIMARY, fontWeight: 'bold' },
  clearFilterButton: { paddingHorizontal: 12, paddingVertical: 10 },
  clearFilterText: { color: theme.icon, fontWeight: 'bold' },
  card: { backgroundColor: theme.background, borderRadius: 16, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 5, elevation: 4, borderColor: theme.background === '#fff' ? '#e5e7eb' : '#374151', borderWidth: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.background === '#fff' ? '#f3f4f6' : '#1f2937' },
  productName: { fontSize: 18, fontWeight: 'bold', color: theme.text, marginBottom: 4 },
  orderDate: { fontSize: 12, color: theme.icon },
  statusBadge: { borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: 'bold', textTransform: 'capitalize' },
  cardBody: { paddingHorizontal: 16, paddingVertical: 8 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  detailLabel: { fontSize: 14, color: theme.icon },
  detailValue: { fontSize: 14, fontWeight: '600', color: theme.text },
  emptyContainer: { flex: 1, paddingTop: 80, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  emptyImage: { width: 150, height: 150, marginBottom: 24, opacity: 0.6 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: theme.text, textAlign: 'center' },
  emptySubText: { fontSize: 14, color: theme.icon, textAlign: 'center', marginTop: 8 }
});
