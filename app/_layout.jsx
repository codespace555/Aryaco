import { Stack } from "expo-router";

export default function RootLayout() {
  <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      
    </Stack>
}
