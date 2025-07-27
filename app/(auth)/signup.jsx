import firestore from '@react-native-firebase/firestore';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../assets/Color.js"; // Assuming this is the path to your Colors file

export default function SignUp() {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const router = useRouter();
    const params = useLocalSearchParams(); // Get uid and phoneNumber from previous screen

    // State management
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isLocationLoading, setIsLocationLoading] = useState(false);
    const [error, setError] = useState('');

    /**
     * Fetches the user's current location and reverse geocodes it to an address.
     */
    const handleGetCurrentLocation = async () => {
        setIsLocationLoading(true);
        setError('');
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Permission to access location was denied. Please enter your address manually.');
                return;
            }

            let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            let geocode = await Location.reverseGeocodeAsync(location.coords);

            if (geocode.length > 0) {
                const loc = geocode[0];
                const fullAddress = [loc.name, loc.street, loc.city, loc.postalCode, loc.country]
                    .filter(Boolean) // Remove any null/undefined parts
                    .join(', ');
                setAddress(fullAddress);
            }
        } catch (err) {
            Alert.alert('Location Error', 'Could not fetch your location. Please try again or enter it manually.', err);
        } finally {
            setIsLocationLoading(false);
        }
    };

    /**
     * Creates the user's profile document in Firestore using the native SDK.
     */
    const handleCreateProfile = async () => {
        if (!name.trim() || !address.trim()) {
            setError("Please fill in all fields.");
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const { uid, phoneNumber } = params;
            // Use the native firestore syntax
            await firestore().collection('users').doc(uid).set({
                uid: uid,
                name: name.trim(),
                phone: phoneNumber,
                address: address.trim(),
                role: 'user', // Default role for new users
                createdAt: firestore.FieldValue.serverTimestamp(),
            });
            router.replace('/home'); // Navigate to home screen after profile creation
        } catch (err) {
            setError(`Error: ${err.message}`);
            Alert.alert("Profile Creation Error", err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
            <StatusBar
                barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
                backgroundColor={theme.background}
            />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
                    <View style={{ paddingHorizontal: 24, paddingBottom: 32 }}>
                        <Text style={{ fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: theme.text, marginBottom: 8 }}>
                            One Last Step...
                        </Text>
                        <Text style={{ fontSize: 16, textAlign: 'center', color: theme.icon, marginBottom: 32 }}>
                            Complete your profile to continue.
                        </Text>

                        {error ? <Text style={{ color: 'red', textAlign: 'center', marginBottom: 16 }}>{error}</Text> : null}

                        {/* Phone Number Display */}
                        <View style={{ marginBottom: 20 }}>
                            <Text style={{ color: theme.icon, marginBottom: 8, fontSize: 14 }}>Phone Number</Text>
                            <TextInput
                                style={{ flex: 1, fontSize: 18, color: theme.icon, padding: 16, backgroundColor: theme.background === '#fff' ? '#e5e7eb' : '#374151', borderRadius: 12 }}
                                value={params.phoneNumber}
                                editable={false}
                            />
                        </View>

                        {/* Name Input */}
                        <View style={{ marginBottom: 20 }}>
                            <Text style={{ color: theme.text, marginBottom: 8, fontSize: 14 }}>Full Name</Text>
                            <TextInput
                                style={{ flex: 1, fontSize: 18, color: theme.text, padding: 16, backgroundColor: theme.background === '#fff' ? '#f3f4f6' : '#1f2937', borderRadius: 12 }}
                                placeholder="Enter your full name"
                                placeholderTextColor={theme.icon}
                                value={name}
                                onChangeText={setName}
                                editable={!isLoading}
                            />
                        </View>

                        {/* Address Input */}
                        <View style={{ marginBottom: 12 }}>
                            <Text style={{ color: theme.text, marginBottom: 8, fontSize: 14 }}>Address</Text>
                            <TextInput
                                style={{ flex: 1, fontSize: 18, color: theme.text, padding: 16, backgroundColor: theme.background === '#fff' ? '#f3f4f6' : '#1f2937', borderRadius: 12, minHeight: 80, textAlignVertical: 'top' }}
                                placeholder="Enter your address"
                                placeholderTextColor={theme.icon}
                                value={address}
                                onChangeText={setAddress}
                                editable={!isLoading}
                                multiline
                            />
                        </View>

                        {/* Location Button */}
                        <TouchableOpacity
                            style={{ backgroundColor: Colors.SECONDARY, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', marginBottom: 24 }}
                            activeOpacity={0.8}
                            onPress={handleGetCurrentLocation}
                            disabled={isLocationLoading || isLoading}
                        >
                            {isLocationLoading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Use My Current Location</Text>
                            )}
                        </TouchableOpacity>

                        {/* Save Profile Button */}
                        <TouchableOpacity
                            style={{ backgroundColor: Colors.PRIMARY, paddingVertical: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}
                            activeOpacity={0.8}
                            onPress={handleCreateProfile}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>Save & Continue</Text>
                            )}
                        </TouchableOpacity>

                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
