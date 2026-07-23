import { Alert, Platform } from 'react-native';

// react-native-web's Alert.alert doesn't render anything once a buttons array
// is passed (see SettingsScreen's original confirmAction), so web needs a
// window.confirm/alert fallback. Shared here so every screen gets the same
// working behavior instead of each re-implementing (or forgetting) it.
export function confirmDialog(title, message, confirmLabel, onConfirm, { destructive = false } = {}) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: '취소', style: 'cancel' },
    { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}

export function infoDialog(title, message) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}
