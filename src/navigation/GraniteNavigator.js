import React from 'react';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';

import HomeScreen from '../screens/HomeScreen';
import AuthScreen from '../screens/AuthScreen';
import PathScreen from '../screens/PathScreen';
import FeedScreen from '../screens/FeedScreen';
import MakerFeedScreen from '../screens/MakerFeedScreen';
import WriteScreen from '../screens/WriteScreen';
import StoryDetailScreen from '../screens/StoryDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createStackNavigator();

/**
 * 650ms Smooth JS Transition Spec for Web & WebView environments
 */
const customTransitionSpec = {
  open: {
    animation: 'timing',
    config: {
      duration: 650,
    },
  },
  close: {
    animation: 'timing',
    config: {
      duration: 650,
    },
  },
};

const DEFAULT_SCREEN_OPTIONS = {
  headerShown: false,
  animationEnabled: true,
  detachPreviousScreen: false,
  cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
  transitionSpec: customTransitionSpec,
  cardStyle: { backgroundColor: '#120E08', flex: 1, overflow: 'hidden', width: '100%', maxWidth: '100%' },
};

export function GraniteNavigator() {
  return (
    <Stack.Navigator initialRouteName="Home" screenOptions={DEFAULT_SCREEN_OPTIONS}>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{
          cardStyleInterpolator: CardStyleInterpolators.forFadeFromBottomAndroid,
        }}
      />
      <Stack.Screen
        name="Auth"
        component={AuthScreen}
        options={{
          presentation: 'transparentModal',
          cardStyleInterpolator: CardStyleInterpolators.forNoAnimation,
          cardStyle: { backgroundColor: 'transparent' },
        }}
      />
      <Stack.Screen
        name="Path"
        component={PathScreen}
        options={{
          cardStyleInterpolator: CardStyleInterpolators.forFadeFromBottomAndroid,
        }}
      />
      <Stack.Screen
        name="Feed"
        component={FeedScreen}
        options={{
          cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
        }}
      />
      <Stack.Screen
        name="MakerFeed"
        component={MakerFeedScreen}
        options={{
          cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
        }}
      />
      <Stack.Screen
        name="Write"
        component={WriteScreen}
        options={{
          cardStyleInterpolator: CardStyleInterpolators.forModalPresentationIOS,
        }}
      />
      <Stack.Screen
        name="StoryDetail"
        component={StoryDetailScreen}
        options={{
          cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
        }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          cardStyleInterpolator: CardStyleInterpolators.forFadeFromBottomAndroid,
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
        }}
      />
    </Stack.Navigator>
  );
}
