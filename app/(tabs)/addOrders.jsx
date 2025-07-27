import { FontAwesome5 } from '@expo/vector-icons';
import DateTimePicker from "@react-native-community/datetimepicker";
import firestore from '@react-native-firebase/firestore';
import { useRouter } from 'expo-router';
import { format } from "date-fns";
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
  Modal,
  FlatList,
} from 'react-native';
import { Colors } from '../../assets/Color.js'; // Assuming this is the path to your Colors file

// --- Reusable Custom Selector Component (No new packages needed) ---
const CustomSelector = ({ isVisible, onClose, data, onSelect, title, searchPlaceholder }) => {
    const theme = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
    const styles = getStyles(theme);
    const [search, setSearch] = useState('');

    const filteredData = data.filter(item => 
        item.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={isVisible}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <Text style={styles.modalTitle}>{title}</Text>
                    <TextInput
                        style={styles.dropdownSearchInput}
                        placeholder={searchPlaceholder}
                        placeholderTextColor={theme.icon}
                        value={search}
                        onChangeText={setSearch}
                    />
                    <FlatList
                        data={filteredData}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.dropdownItem}
                                onPress={() => {
                                    onSelect(item);
                                    onClose();
                                }}
                            >
                                <Text style={styles.dropdownItemText}>{item.name} {item.price ? `(₹${item.price}/${item.unit})` : ''}</Text>
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={<Text style={styles.emptyListText}>No results found.</Text>}
                    />
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Text style={styles.closeButtonText}>Close</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};


export default function AddOrders() {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const styles = getStyles(theme);
    const router = useRouter();

    // Data from Firestore
    const [users, setUsers] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [quantity, setQuantity] = useState('');
    const [deliveryDate, setDeliveryDate] = useState(new Date());
    const [paymentStatus, setPaymentStatus] = useState('unpaid');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Modal visibility state
    const [isUserModalVisible, setUserModalVisible] = useState(false);
    const [isProductModalVisible, setProductModalVisible] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const usersSnapshot = await firestore().collection('users').get();
                const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setUsers(usersData);

                const productsSnapshot = await firestore().collection('products').get();
                const productsData = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setProducts(productsData);
            } catch (error) {
                Alert.alert("Error", "Failed to fetch necessary data.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const totalPrice = selectedProduct && quantity ? (parseFloat(selectedProduct.price) * parseInt(quantity, 10)).toFixed(2) : '0.00';

    const handleCreateOrder = async () => {
        if (!selectedUser || !selectedProduct || !quantity.trim()) {
            Alert.alert("Validation Error", "Please select a user, a product, and enter a quantity.");
            return;
        }
        setIsSubmitting(true);
        try {
            await firestore().collection('orders').add({
                userId: selectedUser.id,
                productId: selectedProduct.id,
                productName: selectedProduct.name,
                price: selectedProduct.price,
                unit: selectedProduct.unit,
                quantity: parseInt(quantity, 10),
                totalPrice: parseFloat(totalPrice),
                deliveryDate: firestore.Timestamp.fromDate(deliveryDate),
                orderedAt: firestore.FieldValue.serverTimestamp(),
                status: 'processing',
                payment: paymentStatus,
            });
            Alert.alert("Success", "Order has been created successfully!", [
                { text: "OK", onPress: () => router.back() }
            ]);
        } catch (error) {
            console.error("Error creating order:", error);
            Alert.alert("Error", "Failed to create the order.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return <View style={[styles.container, { justifyContent: 'center' }]}><ActivityIndicator size="large" color={Colors.PRIMARY} /></View>;
    }

    return (
        <SafeAreaView style={styles.container}>
            <CustomSelector 
                isVisible={isUserModalVisible}
                onClose={() => setUserModalVisible(false)}
                data={users}
                onSelect={setSelectedUser}
                title="Select a Customer"
                searchPlaceholder="Search for a customer..."
            />
            <CustomSelector 
                isVisible={isProductModalVisible}
                onClose={() => setProductModalVisible(false)}
                data={products}
                onSelect={setSelectedProduct}
                title="Select a Product"
                searchPlaceholder="Search for a product..."
            />

            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContainer}>
                    <View style={styles.headerContainer}>
                        <Text style={styles.headerTitle}>Create New Order</Text>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Select Customer</Text>
                            <TouchableOpacity style={styles.dropdownButton} onPress={() => setUserModalVisible(true)}>
                                <Text style={styles.dropdownButtonText}>{selectedUser ? selectedUser.name : 'Select a customer'}</Text>
                                <FontAwesome5 name={'chevron-down'} color={theme.icon} size={14} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Select Product</Text>
                            <TouchableOpacity style={styles.dropdownButton} onPress={() => setProductModalVisible(true)}>
                                <Text style={styles.dropdownButtonText}>{selectedProduct ? selectedProduct.name : 'Select a product'}</Text>
                                <FontAwesome5 name={'chevron-down'} color={theme.icon} size={14} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.label}>Quantity</Text>
                                <TextInput style={styles.input} value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                                <Text style={styles.label}>Delivery Date</Text>
                                <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
                                    <Text style={{color: theme.text}}>{format(deliveryDate, 'dd MMM yyyy')}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Payment Status</Text>
                            <View style={styles.unitSelectorContainer}>
                                <TouchableOpacity 
                                    style={[styles.unitOption, paymentStatus === 'unpaid' && styles.selectedUnitOption]}
                                    onPress={() => setPaymentStatus('unpaid')}
                                >
                                    <Text style={[styles.unitText, paymentStatus === 'unpaid' && styles.selectedUnitText]}>Unpaid</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.unitOption, paymentStatus === 'paid' && styles.selectedUnitOption]}
                                    onPress={() => setPaymentStatus('paid')}
                                >
                                    <Text style={[styles.unitText, paymentStatus === 'paid' && styles.selectedUnitText]}>Paid</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.summaryContainer}>
                            <Text style={styles.summaryLabel}>Total Price:</Text>
                            <Text style={styles.summaryValue}>₹{totalPrice}</Text>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.saveButton} onPress={handleCreateOrder} disabled={isSubmitting}>
                        {isSubmitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <FontAwesome5 name="plus-circle" size={18} color="#fff" />
                                <Text style={styles.saveButtonText}>Create Order</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
            {showDatePicker && <DateTimePicker value={deliveryDate} mode="date" display="default" onChange={(e, d) => {setShowDatePicker(false); if(d) setDeliveryDate(d);}} />}
        </SafeAreaView>
    );
}

const getStyles = (theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    scrollContainer: { padding: 16, paddingBottom: 40 },
    headerContainer: { paddingBottom: 24 },
    headerTitle: { fontSize: 28, fontWeight: 'bold', color: theme.text, textAlign: 'center' },
    form: { backgroundColor: theme.background, borderRadius: 16, padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, borderColor: theme.background === '#fff' ? '#e5e7eb' : '#374151', borderWidth: 1 },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 14, fontWeight: '600', color: theme.icon, marginBottom: 8 },
    input: { backgroundColor: theme.background === '#fff' ? '#f9fafb' : '#1f2937', borderWidth: 1, borderColor: theme.background === '#fff' ? '#e5e7eb' : '#4b5563', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: theme.text, justifyContent: 'center' },
    row: { flexDirection: 'row' },
    unitSelectorContainer: { flexDirection: 'row', backgroundColor: theme.background === '#fff' ? '#f3f4f6' : '#1f2937', borderRadius: 12, borderWidth: 1, borderColor: theme.background === '#fff' ? '#e5e7eb' : '#4b5563', overflow: 'hidden' },
    unitOption: { flex: 1, paddingVertical: 14, alignItems: 'center' },
    selectedUnitOption: { backgroundColor: Colors.PRIMARY },
    unitText: { fontSize: 16, fontWeight: 'bold', color: theme.text },
    selectedUnitText: { color: '#fff' },
    summaryContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.background === '#fff' ? '#f3f4f6' : '#1f2937' },
    summaryLabel: { fontSize: 18, fontWeight: '600', color: theme.icon },
    summaryValue: { fontSize: 22, fontWeight: 'bold', color: Colors.PRIMARY },
    saveButton: { backgroundColor: '#22c55e', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, borderRadius: 12, marginTop: 24, shadowColor: '#22c55e', shadowOffset: { width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8 },
    saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
    // Custom Modal Styles
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContainer: { height: '60%', backgroundColor: theme.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: theme.text, marginBottom: 16, textAlign: 'center' },
    dropdownSearchInput: { backgroundColor: theme.background === '#fff' ? '#f3f4f6' : '#1f2937', borderWidth: 1, borderColor: theme.background === '#fff' ? '#e5e7eb' : '#4b5563', borderRadius: 8, padding: 12, marginBottom: 10, color: theme.text },
    dropdownItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: theme.background === '#fff' ? '#f3f4f6' : '#1f2937' },
    dropdownItemText: { fontSize: 16, color: theme.text },
    emptyListText: { textAlign: 'center', color: theme.icon, padding: 20 },
    closeButton: { backgroundColor: Colors.SECONDARY, padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 },
    closeButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    // Dropdown Button Styles
    dropdownButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.background === '#fff' ? '#f9fafb' : '#1f2937', borderWidth: 1, borderColor: theme.background === '#fff' ? '#e5e7eb' : '#4b5563', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14 },
    dropdownButtonText: { fontSize: 16, color: theme.text },
});
