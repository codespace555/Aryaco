import { getAuth, onAuthStateChanged, signInWithPhoneNumber } from '@react-native-firebase/auth';
import { doc, getDoc, getFirestore } from '@react-native-firebase/firestore';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { Colors } from "../assets/Color.js"; // Assuming this is the path to your Colors file

const logo = require('../assets/images/aryaco.png'); // Make sure this path is correct

export default function Index() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const router = useRouter();


  const [phoneNumber, setPhoneNumber] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false); // New state for the listener
  const auth = getAuth();
  const firestore = getFirestore();


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(firestore, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            if (userData.role === 'admin') {
              router.replace('/dashboard');
            } else {
              router.replace('/home');
            }
          } else {
            router.replace({
              pathname: '/signup',
              params: {
                uid: user.uid,
                phoneNumber: user.phoneNumber,
              },
            });
          }
        } catch (err) {
          Alert.alert('Error', 'User verification failed. Try again.', err);
        }
      }

      setIsVerifying(false);
    });

    return unsubscribe;
  }, []); // The empty dependency array ensures this runs only once on mount

  /**
   * Sends a verification code to the user's phone number.
   */
  const sendVerification = async () => {
    if (phoneNumber.length !== 10) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const fullPhoneNumber = `+91${phoneNumber}`;
      const confirmationResult = await signInWithPhoneNumber(auth, fullPhoneNumber);
      setConfirmation(confirmationResult);
    } catch (err) {
      setError(`Error: ${err.message}`);
      Alert.alert("Verification Error", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Confirms the OTP code. Navigation is now handled by the onAuthStateChanged listener.
   */
  const confirmCode = async () => {
    if (otpCode.length !== 6) {
      setError("Please enter a valid 6-digit OTP.");
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      // This will trigger the onAuthStateChanged listener upon success.
      await confirmation.confirm(otpCode);
    } catch (err) {
      setError(`Error: ${err.message}`);
      Alert.alert("Confirmation Error", "The code you entered was incorrect. Please try again.");
      setIsLoading(false); // Only stop loading if there's an error here
    }
  };

  // Show a full-screen loader while the auth state is being checked.
  if (isVerifying) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.PRIMARY} />
        <Text style={{ color: theme.text, marginTop: 10 }}>Verifying...</Text>
      </SafeAreaView>
    );
  }

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
            <Image
              source={logo}
              style={{ width: 256, height: 256, alignSelf: 'center', marginBottom: 32, backgroundColor: theme.logo, borderRadius: 128 }}
              resizeMode="contain"
            />
            <Text style={{ fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: theme.text, marginBottom: 8 }}>
              {confirmation ? "Verify OTP" : "Welcome Back!"}
            </Text>
            <Text style={{ fontSize: 16, textAlign: 'center', color: theme.icon, marginBottom: 32 }}>
              {confirmation ? `Enter the code sent to +91${phoneNumber}` : "Log in to continue your journey"}
            </Text>

            {error ? <Text style={{ color: 'red', textAlign: 'center', marginBottom: 16 }}>{error}</Text> : null}

            {!confirmation ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.background === '#fff' ? '#f3f4f6' : '#1f2937', borderRadius: 12, paddingHorizontal: 16, height: 56, marginBottom: 20 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.text, marginRight: 8 }}>+91</Text>
                <TextInput
                  style={{ flex: 1, fontSize: 18, color: theme.text }}
                  placeholder="Your Phone Number"
                  placeholderTextColor={theme.icon}
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  editable={!isLoading}
                />
              </View>
            ) : (
              <View style={{ alignItems: 'center', backgroundColor: theme.background === '#fff' ? '#f3f4f6' : '#1f2937', borderRadius: 12, paddingHorizontal: 16, height: 56, marginBottom: 20 }}>
                <TextInput
                  style={{ width: '100%', height: '100%', textAlign: 'center', fontSize: 18, color: theme.text, letterSpacing: 10 }}
                  placeholder="------"
                  placeholderTextColor={theme.icon}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otpCode}
                  onChangeText={setOtpCode}
                  editable={!isLoading}
                />
              </View>
            )}

            <TouchableOpacity
              style={{ backgroundColor: Colors.PRIMARY, paddingVertical: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}
              activeOpacity={0.8}
              onPress={confirmation ? confirmCode : sendVerification}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
                  {confirmation ? "Verify & Continue" : "Send OTP"}
                </Text>
              )}
            </TouchableOpacity>

            <Text style={{ textAlign: 'center', color: theme.icon, fontSize: 12, marginTop: 32 }}>
              By continuing, you agree to our{' '}
              <Text style={{ color: Colors.PRIMARY, fontWeight: 'bold' }}>Terms of Service</Text> and{' '}
              <Text style={{ color: Colors.PRIMARY, fontWeight: 'bold' }}>Privacy Policy</Text>.
            </Text>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
