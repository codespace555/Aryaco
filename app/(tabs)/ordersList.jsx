import DateTimePicker from "@react-native-community/datetimepicker";
import { FontAwesome5 } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { format } from "date-fns";
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { Colors } from '../../assets/Color.js'; // Assuming this is the path to your Colors file

// -- Reusable Order Card Component --
const OrderCard = ({ item, theme, onStatusUpdate, onPaymentUpdate }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;
    const styles = getStyles(theme);
    const [expanded, setExpanded] = useState(false);

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
    
    const paymentStatusDetails = useMemo(() => {
        return item.payment === 'paid' 
            ? { text: 'Paid', color: '#22c55e' } 
            : { text: 'Unpaid', color: '#ef4444' };
    }, [item.payment]);

    const statusOptions = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

    return (
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <View style={styles.card}>
                <TouchableOpacity onPress={() => setExpanded(!expanded)} activeOpacity={0.8}>
                    <View style={styles.cardHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.productName}>{item.productName}</Text>
                            <Text style={styles.userName}>{item.userName || 'N/A'}</Text>
                        </View>
                        <View style={{alignItems: 'flex-end'}}>
                            <View style={[styles.statusBadge, { backgroundColor: statusDetails.color }]}>
                                <Text style={styles.statusText}>{statusDetails.text}</Text>
                            </View>
                            <View style={[styles.statusBadge, { backgroundColor: paymentStatusDetails.color, marginTop: 4 }]}>
                                <Text style={styles.statusText}>{paymentStatusDetails.text}</Text>
                            </View>
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
                            <Text style={styles.detailLabel}>Delivery Date:</Text>
                            <Text style={styles.detailValue}>
                                {item.deliveryDate ? format(item.deliveryDate.toDate(), 'dd MMM yyyy') : 'N/A'}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>

                {expanded && (
                    <View style={styles.cardFooter}>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Customer Phone:</Text>
                            <Text style={styles.detailValue}>{item.userPhone || 'N/A'}</Text>
                        </View>
                         <View style={[styles.detailRow, {borderBottomWidth: 0, paddingBottom: 12}]}>
                            <Text style={styles.detailLabel}>Order Placed:</Text>
                            <Text style={styles.detailValue}>{item.orderedAt ? format(item.orderedAt.toDate(), 'dd MMM yyyy, hh:mm a') : 'N/A'}</Text>
                        </View>
                        <View style={styles.divider} />
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
                            style={[styles.paymentToggleButton, {backgroundColor: item.payment === 'paid' ? '#ef4444' : '#22c55e'}]}
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
        </Animated.View>
    );
};

// --- Main OrdersList Screen Component ---
export default function OrdersList() {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const styles = getStyles(theme);

    const [orders, setOrders] = useState([]);
    const [userMap, setUserMap] = useState(new Map());
    const [loading, setLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);
    
    // Filter states
    const [dateFilter, setDateFilter] = useState(null);
    const [paymentFilter, setPaymentFilter] = useState(null);
    const [userSearch, setUserSearch] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);

    useEffect(() => {
        const fetchUsers = async () => {
            const usersSnapshot = await firestore().collection('users').get();
            const users = new Map();
            usersSnapshot.forEach(doc => users.set(doc.id, doc.data()));
            setUserMap(users);
        };
        fetchUsers();
    }, []);

    useEffect(() => {
        setLoading(true);
        let query = firestore().collection('orders');

        if (dateFilter) {
            const startOfDay = new Date(dateFilter);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(dateFilter);
            endOfDay.setHours(23, 59, 59, 999);
            query = query.where('deliveryDate', '>=', startOfDay).where('deliveryDate', '<=', endOfDay);
        }
        if (paymentFilter) {
            query = query.where('payment', '==', paymentFilter);
        }

        if (!dateFilter) {
            query = query.orderBy('orderedAt', 'desc');
        }

        const subscriber = query.onSnapshot(querySnapshot => {
            let ordersData = querySnapshot.docs.map(doc => {
                const order = { id: doc.id, ...doc.data() };
                const user = userMap.get(order.userId);
                order.userName = user ? user.name : 'Unknown User';
                order.userPhone = user ? user.phone : 'N/A';
                return order;
            });

            if (userSearch) {
                ordersData = ordersData.filter(order => 
                    order.userName.toLowerCase().includes(userSearch.toLowerCase())
                );
            }

            setOrders(ordersData);
            setLoading(false);
        }, error => {
            console.error("Error fetching orders:", error);
            setLoading(false);
        });

        return () => subscriber();
    }, [dateFilter, paymentFilter, userSearch, userMap]);

    const onDateChange = (event, selectedDate) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (event.type === 'set' && selectedDate) {
            setDateFilter(selectedDate);
        } else if (event.type !== 'set') {
            setShowDatePicker(false);
        }
    };
    
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

    const clearFilters = () => {
        setDateFilter(null);
        setPaymentFilter(null);
        setUserSearch('');
    };

    const generateReportHtml = () => {
        const reportDate = format(new Date(), 'dd MMM yyyy');
        const grandTotal = orders.reduce((sum, order) => sum + (order.totalPrice || 0), 0).toFixed(2);

        const itemsHtml = orders.map(order => `
            <tr>
                <td>${order.userName || 'N/A'}</td>
                <td>${order.userPhone || 'N/A'}</td>
                <td>${order.productName || 'N/A'}</td>
                <td>${order.quantity || 0} ${order.unit || ''}</td>
                <td>₹${(order.totalPrice || 0).toFixed(2)}</td>
                <td>${order.status || 'N/A'}</td>
                <td>${order.payment || 'N/A'}</td>
            </tr>
        `).join('');

        return `
            <html><head><style>
                body { font-family: sans-serif; margin: 30px; }
                h1 { color: ${Colors.PRIMARY}; } .header { border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid #ccc; padding: 10px; text-align: left; }
                th { background-color: #f2f2f2; } .total { text-align: right; font-weight: bold; margin-top: 20px; }
            </style></head><body>
                <h1>Arya & Co</h1>
                <div class="header">
                    <p><strong>Report Date:</strong> ${reportDate}</p>
                    ${dateFilter ? `<p><strong>Orders for Delivery on:</strong> ${format(dateFilter, 'dd MMM yyyy')}</p>` : ''}
                </div>
                <h3>Order Details:</h3>
                <table><thead><tr>
                    <th>Customer</th><th>Phone</th><th>Product</th><th>Quantity</th><th>Total</th><th>Status</th><th>Payment</th>
                </tr></thead><tbody>${itemsHtml}</tbody></table>
                <p class="total">Grand Total: ₹${grandTotal}</p>
            </body></html>
        `;
    };

    const downloadReport = async () => {
        if (orders.length === 0) {
            Alert.alert("No Data", "There are no orders matching the current filters to download.");
            return;
        }
        setIsDownloading(true);
        try {
            const html = generateReportHtml();
            const { uri } = await Print.printToFileAsync({ html });
            const filename = `Orders_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
            const newUri = `${FileSystem.cacheDirectory}${filename}`;
            await FileSystem.moveAsync({ from: uri, to: newUri });
            await Sharing.shareAsync(newUri, { mimeType: 'application/pdf', dialogTitle: 'Download Order List' });
        } catch (error) {
            Alert.alert("Error", "Could not generate the PDF report.");
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerContainer}>
                <Text style={styles.headerTitle}>All Orders</Text>
            </View>
            
            <View style={styles.filterContainer}>
                <TextInput 
                    style={styles.searchInput}
                    placeholder="Search by Customer Name..."
                    placeholderTextColor={theme.icon}
                    value={userSearch}
                    onChangeText={setUserSearch}
                />
                <View style={styles.filterRow}>
                    <TouchableOpacity style={styles.dateFilterButton} onPress={() => setShowDatePicker(true)}>
                        <Text style={styles.dateFilterText}>{dateFilter ? format(dateFilter, 'dd MMM yyyy') : 'By Date'}</Text>
                    </TouchableOpacity>
                    <View style={styles.paymentFilterContainer}>
                        <TouchableOpacity style={[styles.paymentOption, !paymentFilter && styles.activePaymentOption]} onPress={() => setPaymentFilter(null)}>
                            <Text style={[styles.paymentText, !paymentFilter && styles.activePaymentText]}>All</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.paymentOption, paymentFilter === 'paid' && styles.activePaymentOption]} onPress={() => setPaymentFilter('paid')}>
                            <Text style={[styles.paymentText, paymentFilter === 'paid' && styles.activePaymentText]}>Paid</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.paymentOption, paymentFilter === 'unpaid' && styles.activePaymentOption]} onPress={() => setPaymentFilter('unpaid')}>
                            <Text style={[styles.paymentText, paymentFilter === 'unpaid' && styles.activePaymentText]}>Unpaid</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                 <View style={styles.filterActions}>
                    <TouchableOpacity style={styles.downloadButton} onPress={downloadReport} disabled={isDownloading}>
                        {isDownloading ? <ActivityIndicator size="small" color={Colors.PRIMARY} /> : <Text style={styles.downloadButtonText}>Download PDF</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={clearFilters}>
                        <Text style={styles.clearFilterText}>Clear Filters</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {showDatePicker && <DateTimePicker value={dateFilter || new Date()} mode="date" display="default" onChange={onDateChange} />}

            {loading ? (
                <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                    <ActivityIndicator size="large" color={Colors.PRIMARY} />
                </View>
            ) : (
                <FlatList
                    data={orders}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <OrderCard item={item} theme={theme} onStatusUpdate={(id, status) => handleUpdate(id, 'status', status, 'status')} onPaymentUpdate={(id, payment) => handleUpdate(id, 'payment', payment, 'payment')} />}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8 }}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No orders match your filters.</Text>
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
    filterContainer: { padding: 16, borderBottomWidth: 1, borderBottomColor: theme.background === '#fff' ? '#f3f4f6' : '#1f2937' },
    searchInput: { backgroundColor: theme.background === '#fff' ? '#f3f4f6' : '#1f2937', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, color: theme.text, marginBottom: 12, borderWidth: 1, borderColor: theme.background === '#fff' ? '#e5e7eb' : '#374151' },
    filterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    dateFilterButton: { backgroundColor: theme.background === '#fff' ? '#f3f4f6' : '#1f2937', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: theme.background === '#fff' ? '#e5e7eb' : '#374151' },
    dateFilterText: { color: theme.text, fontWeight: '600' },
    paymentFilterContainer: { flexDirection: 'row', backgroundColor: theme.background === '#fff' ? '#f3f4f6' : '#1f2937', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: theme.background === '#fff' ? '#e5e7eb' : '#374151' },
    paymentOption: { paddingHorizontal: 12, paddingVertical: 10 },
    activePaymentOption: { backgroundColor: Colors.PRIMARY },
    paymentText: { color: theme.text, fontWeight: '600' },
    activePaymentText: { color: '#fff' },
    filterActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    downloadButton: { backgroundColor: theme.background, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: Colors.PRIMARY },
    downloadButtonText: { color: Colors.PRIMARY, fontWeight: 'bold' },
    clearFilterText: { color: theme.icon, fontWeight: 'bold' },
    card: { backgroundColor: theme.background, borderRadius: 16, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 5, elevation: 4, borderColor: theme.background === '#fff' ? '#e5e7eb' : '#374151', borderWidth: 1 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16 },
    productName: { fontSize: 18, fontWeight: 'bold', color: theme.text, marginBottom: 4 },
    userName: { fontSize: 14, color: theme.icon },
    statusBadge: { borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 },
    statusText: { color: '#fff', fontSize: 12, fontWeight: 'bold', textTransform: 'capitalize' },
    cardBody: { paddingHorizontal: 16, paddingBottom: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.background === '#fff' ? '#f3f4f6' : '#1f2937' },
    cardFooter: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.background === '#fff' ? '#f3f4f6' : '#1f2937' },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
    detailLabel: { fontSize: 14, color: theme.icon },
    detailValue: { fontSize: 14, fontWeight: '600', color: theme.text },
    updateStatusLabel: { fontSize: 12, color: theme.icon, fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase' },
    statusButtonsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    statusButton: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#6b7280' },
    statusButtonText: { color: '#fff', fontSize: 12, fontWeight: 'bold', textTransform: 'capitalize' },
    divider: { height: 1, backgroundColor: theme.background === '#fff' ? '#e5e7eb' : '#374151', marginVertical: 12 },
    paymentToggleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8 },
    paymentToggleButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginLeft: 8 },
    emptyContainer: { flex: 1, paddingTop: 80, alignItems: 'center', justifyContent: 'center' },
    emptyText: { fontSize: 18, fontWeight: 'bold', color: theme.text },
});
