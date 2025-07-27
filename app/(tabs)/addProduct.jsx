import { FontAwesome5 } from '@expo/vector-icons';
import firestore from '@react-native-firebase/firestore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
} from 'react-native';
import { Colors } from '../../assets/Color.js'; // Assuming this is the path to your Colors file

export default function AddEditProductScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const styles = getStyles(theme);
  const router = useRouter();
  const params = useLocalSearchParams();
  const { productId } = params;
  const isEditMode = !!productId;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('kg'); // Default to 'kg'
  const [imageUrl, setImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(isEditMode);

  useEffect(() => {
    if (isEditMode) {
      const fetchProduct = async () => {
        try {
          const doc = await firestore().collection('products').doc(productId).get();
          if (doc.exists) {
            const product = doc.data();
            setName(product.name);
            setDescription(product.description);
            setPrice(String(product.price));
            setQuantity(String(product.quantity || ''));
            setUnit(product.unit || 'kg');
            setImageUrl(product.imageUrl || '');
          } else {
            Alert.alert("Error", "Product not found.", [{ text: "OK", onPress: () => router.back() }]);
          }
        } catch (error) {
          Alert.alert("Error", "Failed to fetch product details.");
        } finally {
          setIsFetching(false);
        }
      };
      fetchProduct();
    }
  }, [productId]);

  const clearForm = () => {
    setName('');
    setDescription('');
    setPrice('');
    setQuantity('');
    setUnit('kg');
    setImageUrl('');
  };

  const handleSaveProduct = async () => {
    if (!name.trim() || !price.trim() || !unit.trim() || !quantity.trim()) {
      Alert.alert("Validation Error", "Please fill in all required fields.");
      return;
    }
    setIsLoading(true);
    try {
      const productData = {
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price),
        quantity: parseInt(quantity, 10),
        unit: unit,
        imageUrl: imageUrl.trim(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      if (isEditMode) {
        await firestore().collection('products').doc(productId).update(productData);
        Alert.alert("Success", "Product has been updated successfully!", [{ text: "OK", onPress: () => router.back() }]);
      } else {
        await firestore().collection('products').add({
          ...productData,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
        Alert.alert("Success", "Product has been added successfully!");
        clearForm(); // Clear the form for the next entry
      }
    } catch (error) {
      console.error("Error saving product:", error);
      Alert.alert("Error", "Failed to save the product. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return <View style={[styles.container, { justifyContent: 'center' }]}><ActivityIndicator size="large" color={Colors.PRIMARY} /></View>
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.headerContainer}>
            <Text style={styles.headerTitle}>{isEditMode ? 'Edit Product' : 'Add New Product'}</Text>
          </View>

          <View style={styles.form}>
            <Image
              source={{ uri: imageUrl || 'https://placehold.co/400x400/e5e7eb/9ca3af?text=Image+Preview' }}
              style={styles.imagePreview}
            />

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Product Name</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} multiline />
            </View>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Price (₹)</Text>
                <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="numeric" />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                <Text style={styles.label}>Stock Quantity</Text>
                <TextInput style={styles.input} value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Unit</Text>
              <View style={styles.unitSelectorContainer}>
                <TouchableOpacity
                  style={[styles.unitOption, unit === 'kg' && styles.selectedUnitOption]}
                  onPress={() => setUnit('kg')}
                >
                  <Text style={[styles.unitText, unit === 'kg' && styles.selectedUnitText]}>kg</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.unitOption, unit === 'pcs' && styles.selectedUnitOption]}
                  onPress={() => setUnit('pcs')}
                >
                  <Text style={[styles.unitText, unit === 'pcs' && styles.selectedUnitText]}>pcs</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Image URL</Text>
              <TextInput
                style={styles.input}
                value={imageUrl}
                onChangeText={setImageUrl}
                placeholder="https://example.com/image.png"
                placeholderTextColor={theme.icon}
                autoCapitalize="none"
              />
            </View>
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleSaveProduct} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <FontAwesome5 name="save" size={18} color="#fff" />
                <Text style={styles.saveButtonText}>{isEditMode ? 'Update Product' : 'Save Product'}</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  scrollContainer: { padding: 16, paddingBottom: 40 },
  headerContainer: { paddingBottom: 24 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: theme.text, textAlign: 'center' },
  form: { backgroundColor: theme.background, borderRadius: 16, padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, borderColor: theme.background === '#fff' ? '#e5e7eb' : '#374151', borderWidth: 1 },
  imagePreview: { width: '100%', height: 180, borderRadius: 12, alignSelf: 'center', marginBottom: 20, backgroundColor: theme.background === '#fff' ? '#f3f4f6' : '#1f2937' },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: theme.icon, marginBottom: 8 },
  input: { backgroundColor: theme.background === '#fff' ? '#f9fafb' : '#1f2937', borderWidth: 1, borderColor: theme.background === '#fff' ? '#e5e7eb' : '#4b5563', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: theme.text },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  row: { flexDirection: 'row' },
  unitSelectorContainer: {
    flexDirection: 'row',
    backgroundColor: theme.background === '#fff' ? '#f3f4f6' : '#1f2937',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.background === '#fff' ? '#e5e7eb' : '#4b5563',
    overflow: 'hidden'
  },
  unitOption: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  selectedUnitOption: {
    backgroundColor: Colors.PRIMARY,
  },
  unitText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.text,
  },
  selectedUnitText: {
    color: '#fff',
  },
  saveButton: { backgroundColor: Colors.PRIMARY, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, borderRadius: 12, marginTop: 24, shadowColor: Colors.PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8 },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginLeft: 10 }
});
