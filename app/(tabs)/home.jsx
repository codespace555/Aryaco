import DateTimePicker from "@react-native-community/datetimepicker";
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { format } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { Colors } from "../../assets/Color.js"; // Assuming this is the path to your Colors file

// -- Animated Product Card Component --
const ProductCard = ({ item, orderData, handlers, theme }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const { handleQuantityChange, updateQuantity, openDateModal, handleOrder, openDescriptionModal } = handlers;
  const styles = getStyles(theme);
  const quantityStr = orderData.quantity || "";
  const quantityNum = parseInt(quantityStr || "0", 10);
  const total = quantityNum * item.price;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const selectedDate = orderData.date || tomorrow;

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <View style={styles.card}>
        <View style={styles.infoContainer}>
          <Image source={{ uri: item.imageUrl || 'https://placehold.co/200x200/f49b33/fff?text=Product' }} style={styles.productImage} />
          <View style={styles.textContainer}>
            <Text style={styles.productName}>{item.name}</Text>
            <Text style={styles.productPrice}>₹{item.price} / {item.unit}</Text>
            <TouchableOpacity onPress={() => openDescriptionModal(item)}>
              <Text style={styles.detailsButton}>View Details</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.controlsContainer}>
          <View style={styles.quantityWrapper}>
            <Text style={styles.controlLabel}>Quantity</Text>
            <View style={styles.quantityInputContainer}>
              <TouchableOpacity onPress={() => updateQuantity(item.id, -1)} style={styles.quantityButton}>
                <Text style={styles.quantityButtonText}>-</Text>
              </TouchableOpacity>
              <TextInput
                keyboardType="numeric" style={styles.quantityInput} value={quantityStr}
                onChangeText={(text) => handleQuantityChange(item.id, text)}
                placeholder="0" placeholderTextColor={theme.icon}
              />
              <TouchableOpacity onPress={() => updateQuantity(item.id, 1)} style={styles.quantityButton}>
                <Text style={styles.quantityButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.dateWrapper}>
            <Text style={styles.controlLabel}>Delivery Date</Text>
            <TouchableOpacity onPress={() => openDateModal(item)} style={styles.datePickerButton}>
              <Text style={styles.datePickerText}>{format(selectedDate, "dd MMM yyyy")}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {quantityNum > 0 && <Text style={styles.totalText}>Order Total: ₹{total.toFixed(2)}</Text>}

        <TouchableOpacity
          style={[styles.orderButton, quantityNum > 0 ? styles.orderButtonActive : styles.orderButtonDisabled]}
          onPress={() => handleOrder(item)} disabled={!quantityNum || quantityNum <= 0}
        >
          <Text style={styles.orderButtonText}>Place Order</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

// -- Main HomeScreen Component --
export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const styles = getStyles(theme);

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [isDescModalVisible, setIsDescModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [isDateModalVisible, setIsDateModalVisible] = useState(false);
  const [editingDateForProduct, setEditingDateForProduct] = useState(null);
  const [tempDate, setTempDate] = useState(new Date());

  const userId = auth().currentUser?.uid;

  useEffect(() => {
    const subscriber = firestore()
      .collection('products')
      .onSnapshot(querySnapshot => {
        const productsData = [];
        querySnapshot.forEach(documentSnapshot => {
          productsData.push({
            id: documentSnapshot.id,
            ...documentSnapshot.data(),
          });
        });
        setProducts(productsData);
        setIsLoading(false);
      }, error => {
        console.error("Error fetching products: ", error);
        Alert.alert("Error", "Failed to load products.");
        setIsLoading(false);
      });

    // Unsubscribe from events when no longer in use
    return () => subscriber();
  }, []);


  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    return products.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [products, searchQuery]);

  const handleQuantityChange = (id, quantity) => {
    if (quantity === "" || /^[0-9]+$/.test(quantity)) {
      setOrders((prev) => ({ ...prev, [id]: { ...prev[id], quantity } }));
    }
  };

  const updateQuantity = (id, amount) => {
    const currentQuantity = parseInt(orders[id]?.quantity || "0", 10);
    const newQuantity = Math.max(0, currentQuantity + amount);
    handleQuantityChange(id, newQuantity.toString());
  };

  const openDateModal = (product) => {
    setEditingDateForProduct(product);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const currentDate = orders[product.id]?.date || tomorrow;
    setTempDate(currentDate);
    setIsDateModalVisible(true);
  };

  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || tempDate;
    // For Android, the picker is dismissed automatically.
    // We check for the 'set' event type to confirm a date was chosen.
    if (Platform.OS === 'android') {
      setIsDateModalVisible(false);
      if (event.type === 'set' && editingDateForProduct) {
        setOrders(prev => ({
          ...prev,
          [editingDateForProduct.id]: { ...prev[editingDateForProduct.id], date: currentDate }
        }));
        setEditingDateForProduct(null);
      }
    } else {
      // For iOS, we just update the temporary date. The user will press "Confirm".
      setTempDate(currentDate);
    }
  };

  const confirmDateSelection = () => {
    if (editingDateForProduct) {
      setOrders(prev => ({
        ...prev,
        [editingDateForProduct.id]: { ...prev[editingDateForProduct.id], date: tempDate }
      }));
    }
    setIsDateModalVisible(false);
    setEditingDateForProduct(null);
  };

  const handleOrder = async (product) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const { quantity, date } = orders[product.id] || {};
    if (!userId) { Alert.alert("Error", "You must be logged in to place an order."); return; }
    if (!quantity || parseInt(quantity, 10) <= 0) { Alert.alert("Error", "Please enter a valid quantity."); return; }
    try {
      await firestore().collection("orders").add({
        userId,
        productId: product.id,
        productName: product.name,
        price: product.price,
        unit: product.unit,
        quantity: parseInt(quantity, 10),
        deliveryDate: firestore.Timestamp.fromDate(date || tomorrow),
        orderedAt: firestore.FieldValue.serverTimestamp(),
        status: "processing",
        payment: "Unpaid",
        totalPrice: parseInt(quantity, 10) * product.price,
      });
      Alert.alert("Success", "Order placed successfully!");
      setOrders((prev) => ({ ...prev, [product.id]: {} }));
    } catch (err) {
      console.error("Error placing order: ", err);
      Alert.alert("Error", "Failed to place order.");
    }
  };

  const openDescriptionModal = (product) => {
    setSelectedProduct(product);
    setIsDescModalVisible(true);
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <Text style={styles.headerTitle}>Our Products</Text>
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput style={styles.searchInput} placeholder="Search for products..." placeholderTextColor={theme.icon} value={searchQuery} onChangeText={setSearchQuery} />
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color={Colors.PRIMARY} style={{ flex: 1 }} />
        ) : (
          <FlatList
            data={filteredProducts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
            renderItem={({ item }) => (
              <ProductCard
                item={item}
                orderData={orders[item.id] || {}}
                handlers={{ handleQuantityChange, updateQuantity, openDateModal, handleOrder, openDescriptionModal }}
                theme={theme}
              />
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>No products found.</Text>}
          />
        )}

        {/* Description Modal */}
        <Modal animationType="fade" transparent={true} visible={isDescModalVisible} onRequestClose={() => setIsDescModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{selectedProduct?.name}</Text>
              <Text style={styles.modalDescription}>{selectedProduct?.description}</Text>
              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setIsDescModalVisible(false)}>
                <Text style={styles.modalCloseButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Date Picker - Platform specific handling */}
        {isDateModalVisible && (
          Platform.OS === 'ios' ? (
            <Modal animationType="slide" transparent={true} visible={isDateModalVisible} onRequestClose={confirmDateSelection}>
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Select Delivery Date</Text>
                  <DateTimePicker
                    value={tempDate}
                    mode="date"
                    display="inline"
                    minimumDate={tomorrow}
                    onChange={onDateChange}
                    textColor={theme.text}
                  />
                  <TouchableOpacity style={styles.confirmButton} onPress={confirmDateSelection}>
                    <Text style={styles.confirmButtonText}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          ) : (
            <DateTimePicker
              value={tempDate}
              mode="date"
              display="default"
              minimumDate={tomorrow}
              onChange={onDateChange}
            />
          )
        )}

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: theme.text, textAlign: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.background === '#fff' ? '#f3f4f6' : '#1f2937' },
  searchContainer: { backgroundColor: theme.background === '#fff' ? '#f3f4f6' : '#1f2937', flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, borderRadius: 12, marginTop: 16, marginBottom: 8, paddingHorizontal: 16, },
  searchIcon: { fontSize: 20, marginRight: 12, color: theme.icon },
  searchInput: { flex: 1, height: 50, color: theme.text, fontSize: 16 },
  card: { backgroundColor: theme.background, borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2, }, shadowOpacity: 0.1, shadowRadius: 3.84, elevation: 5, borderColor: theme.background === '#fff' ? '#e5e7eb' : '#374151', borderWidth: 1, },
  infoContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  productImage: { width: 90, height: 90, borderRadius: 12, marginRight: 16 },
  textContainer: { flex: 1 },
  productName: { fontSize: 20, fontWeight: 'bold', color: theme.text },
  productPrice: { fontSize: 16, color: theme.icon, marginTop: 4 },
  detailsButton: { color: Colors.PRIMARY, marginTop: 8, fontSize: 14, fontWeight: '600' },
  controlsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, gap: 16 },
  controlLabel: { color: theme.icon, fontSize: 14, marginBottom: 8, fontWeight: '500' },
  quantityWrapper: { flex: 1 },
  dateWrapper: { flex: 1 },
  quantityInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.background === '#fff' ? '#f9fafb' : '#374151', borderRadius: 12, height: 52, borderWidth: 1, borderColor: theme.background === '#fff' ? '#e5e7eb' : '#4b5563' },
  quantityButton: { width: 50, height: '100%', alignItems: 'center', justifyContent: 'center', },
  quantityButtonText: { color: theme.text, fontSize: 24, fontWeight: 'bold' },
  quantityInput: { flex: 1, textAlign: 'center', color: theme.text, fontSize: 18, fontWeight: 'bold' },
  datePickerButton: { backgroundColor: Colors.SECONDARY, paddingVertical: 12, borderRadius: 12, height: 52, justifyContent: 'center', alignItems: 'center', },
  datePickerText: { color: '#fff', fontWeight: 'bold' },
  totalText: { color: Colors.PRIMARY, fontSize: 18, fontWeight: 'bold', textAlign: 'right', marginBottom: 16 },
  orderButton: { paddingVertical: 18, borderRadius: 12, alignItems: 'center' },
  orderButtonActive: { backgroundColor: Colors.PRIMARY },
  orderButtonDisabled: { backgroundColor: theme.icon },
  orderButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
  modalContent: { backgroundColor: theme.background, borderRadius: 12, padding: 24, margin: 24, width: '90%', position: 'relative', borderColor: theme.background === '#fff' ? '#e5e7eb' : '#374151', borderWidth: 1, alignItems: 'center' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: theme.text, marginBottom: 16 },
  modalDescription: { fontSize: 16, color: theme.icon, lineHeight: 24, textAlign: 'center' },
  modalCloseButton: { position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: theme.background === '#fff' ? '#f3f4f6' : '#374151', justifyContent: 'center', alignItems: 'center', },
  modalCloseButtonText: { color: theme.text, fontSize: 16 },
  confirmButton: { backgroundColor: Colors.PRIMARY, paddingVertical: 14, paddingHorizontal: 40, borderRadius: 12, marginTop: 16, },
  confirmButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', marginTop: 50, color: theme.icon, fontSize: 16 },
});
