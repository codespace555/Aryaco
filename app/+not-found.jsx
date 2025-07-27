import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { Colors } from '../assets/Color'; // Adjust the path to your Colors file

export default function NotFoundScreen() {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];

    return (
        <>
            <Stack.Screen options={{ title: 'Oops!', headerShown: false }} />
            <View style={[styles.container, { backgroundColor: theme.background }]}>
                <Text style={[styles.title, { color: theme.text }]}>Page Not Found</Text>
                <Text style={[styles.subtitle, { color: theme.icon }]}>
                    We can not seem to find the page you are looking for.
                </Text>
                <Link href="/" asChild>
                    <TouchableOpacity style={styles.link}>
                        <Text style={styles.linkText}>Go to Home Screen</Text>
                    </TouchableOpacity>
                </Link>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        marginBottom: 20,
    },
    link: {
        marginTop: 15,
        paddingVertical: 15,
        paddingHorizontal: 30,
        backgroundColor: Colors.PRIMARY,
        borderRadius: 12,
    },
    linkText: {
        fontSize: 16,
        color: '#fff',
        fontWeight: 'bold',
    },
});