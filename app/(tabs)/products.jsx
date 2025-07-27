import { FontAwesome5 } from '@expo/vector-icons';
import firestore from '@react-native-firebase/firestore';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { Colors } from '../../assets/Color.js'; // Assuming this is the path to your Colors file

// -- Animated Product Card Component --
const ProductCard = ({ item, theme, onEdit, onDelete }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const styles = getStyles(theme);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <View style={styles.card}>
        <Image
          source={{ uri: item.imageUrl || 'https://placehold.co/200x200/f49b33/fff?text=Product' }}
          style={styles.productImage}
        />
        <View style={styles.cardBody}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productPrice}>₹{item.price} / {item.unit}</Text>
          <Text style={styles.productDescription} numberOfLines={2}>{item.description}</Text>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity style={[styles.actionButton, styles.editButton]} onPress={() => onEdit(item.id)}>
            <FontAwesome5 name="pen" size={14} color="#fff" />
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={() => onDelete(item.id, item.name)}>
            <FontAwesome5 name="trash-alt" size={14} color="#fff" />
            <Text style={styles.actionButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

// -- Main Products Screen Component --
export default function ProductsScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const styles = getStyles(theme);
  const router = useRouter();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const subscriber = firestore()
      .collection('products')
      .orderBy('name')
      .onSnapshot(querySnapshot => {
        const productsData = [];
        querySnapshot.forEach(documentSnapshot => {
          productsData.push({
            id: documentSnapshot.id,
            ...documentSnapshot.data(),
          });
        });
        setProducts(productsData);
        setLoading(false);
      }, error => {
        console.error("Error fetching products:", error);
        Alert.alert("Error", "Could not fetch product data.");
        setLoading(false);
      });

    // Unsubscribe from events when no longer in use
    return () => subscriber();
  }, []);

  const handleEdit = (productId) => {
    // FIX: Navigate to the addProduct screen, which handles both add and edit
    router.push({ pathname: '/addProduct', params: { productId } });
  };

  const handleDelete = (productId, productName) => {
    Alert.alert(
      "Confirm Deletion",
      `Are you sure you want to delete the product "${productName}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await firestore().collection('products').doc(productId).delete();
              Alert.alert("Success", `"${productName}" has been deleted.`);
            } catch (error) {
              Alert.alert("Error", "Failed to delete the product.");
            }
          },
        },
      ]
    );
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
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Manage Products</Text>
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ProductCard item={item} theme={theme} onEdit={handleEdit} onDelete={handleDelete} />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }} // Add padding for FAB
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No products found.</Text>
            <Text style={styles.emptySubText}>Tap the + button to add your first product.</Text>
          </View>
        }
      />

      {/* Floating Action Button to Add Product */}
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/addProduct')}>
        <FontAwesome5 name="plus" size={22} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  headerContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.background === '#fff' ? '#f3f4f6' : '#1f2937',
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: theme.text, textAlign: 'center' },
  card: {
    backgroundColor: theme.background,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderColor: theme.background === '#fff' ? '#e5e7eb' : '#374151',
    borderWidth: 1,
    overflow: 'hidden', // Ensures child elements respect border radius
  },
  productImage: {
    width: '100%',
    height: 150,
  },
  cardBody: {
    padding: 16,
  },
  productName: { fontSize: 18, fontWeight: 'bold', color: theme.text, marginBottom: 4 },
  productPrice: { fontSize: 16, fontWeight: '600', color: Colors.PRIMARY, marginBottom: 8 },
  productDescription: { fontSize: 14, color: theme.icon, lineHeight: 20 },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: theme.background === '#fff' ? '#f3f4f6' : '#1f2937',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  editButton: {
    backgroundColor: '#3b82f6', // Blue
    borderBottomLeftRadius: 16,
  },
  deleteButton: {
    backgroundColor: '#ef4444', // Red
    borderBottomRightRadius: 16,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    marginTop: 100,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.text,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: theme.icon,
    textAlign: 'center',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  }
});
