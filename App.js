import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { useFonts } from 'expo-font';
import { Platform, BackHandler } from 'react-native';
import { fontAssets, colors } from './src/theme';
import { useHydrated } from './src/data';
import HomeScreen from './src/screens/HomeScreen';
import PathScreen from './src/screens/PathScreen';
import FeedScreen from './src/screens/FeedScreen';
import MakerFeedScreen from './src/screens/MakerFeedScreen';
import WriteScreen from './src/screens/WriteScreen';
import StoryDetailScreen from './src/screens/StoryDetailScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Stack = createNativeStackNavigator();

SplashScreen.preventAutoHideAsync().catch(() => {});
SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {});

export default function App() {
  const [fontsLoaded] = useFonts(fontAssets);
  const storeHydrated = useHydrated();
  const ready = fontsLoaded && storeHydrated;

  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setStyle('light');
    }
  }, []);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Path" component={PathScreen} options={{ animation: 'fade' }} />
          <Stack.Screen name="Feed" component={FeedScreen} options={{ animation: 'fade' }} />
          <Stack.Screen name="MakerFeed" component={MakerFeedScreen} options={{ animation: 'fade' }} />
          <Stack.Screen
            name="Write"
            component={WriteScreen}
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="StoryDetail"
            component={StoryDetailScreen}
            options={{ animation: 'fade_from_bottom' }}
          />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
