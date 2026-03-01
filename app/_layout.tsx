import { useEffect, useRef } from 'react';
import { Stack, useRouter } from 'expo-router';
import { TransactionProvider, useTransactions } from '../context/TransactionContext';
import { PermissionsAndroid, Platform, Alert, AppState, NativeModules, Linking } from 'react-native';

const { SmsTransactionModule } = NativeModules;

function PermissionAndTransactionHandler() {
  const router = useRouter();
  const { setPendingTransaction } = useTransactions();
  const appState = useRef(AppState.currentState);

  // Request all permissions on app launch (before login)
  useEffect(() => {
    const requestAllPermissions = async () => {
      if (Platform.OS !== 'android') return;
      try {
        console.log('Requesting SMS permissions...');
        const smsRead = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_SMS,
          {
            title: 'SMS Permission Required',
            message: 'BankTracker needs to read your SMS messages to automatically detect bank transactions and track your spending.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Deny',
            buttonPositive: 'Allow',
          }
        );

        const smsReceive = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
          {
            title: 'Receive SMS Permission',
            message: 'BankTracker needs to receive SMS notifications to auto-detect new transactions in real-time.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Deny',
            buttonPositive: 'Allow',
          }
        );

        // Request notification permission (Android 13+)
        if (Number(Platform.Version) >= 33) {
          await PermissionsAndroid.request(
            'android.permission.POST_NOTIFICATIONS' as any,
            {
              title: 'Notification Permission',
              message: 'BankTracker needs notification permission to alert you about new transactions.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Deny',
              buttonPositive: 'Allow',
            }
          );
        }

        const smsAllowed =
          smsRead === PermissionsAndroid.RESULTS.GRANTED &&
          smsReceive === PermissionsAndroid.RESULTS.GRANTED;

        console.log('SMS permissions result:', { smsRead, smsReceive, smsAllowed });

        if (!smsAllowed) {
          Alert.alert(
            'Permissions Required',
            'BankTracker needs SMS permissions to work properly. Please grant SMS access in your device Settings > Apps > BankTracker > Permissions.',
            [{ text: 'OK' }]
          );
        }

        // Request battery optimization exemption (shows system dialog)
        try {
          const packageName = 'com.banktracker.app';
          await Linking.sendIntent(
            'android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
            [{ key: 'package', value: `package:${packageName}` }]
          ).catch((err: any) => {
            console.log('Battery optimization dialog not available:', err);
          });
        } catch (e) {
          console.log('Battery optimization request not supported:', e);
        }
      } catch (err) {
        console.warn('Permission request error:', err);
      }
    };

    requestAllPermissions();
  }, []);

  // Check for pending transactions from native module (notification tap or background SMS)
  useEffect(() => {
    const checkPendingTransaction = async () => {
      if (Platform.OS !== 'android' || !SmsTransactionModule) return;
      try {
        const pending = await SmsTransactionModule.getPendingTransaction();
        if (pending) {
          console.log('Pending transaction from native:', pending);
          setPendingTransaction({
            amount: parseFloat(pending.amount) || 0,
            merchant: pending.merchant || 'Unknown',
            date: pending.date || String(Date.now()),
            message: pending.message || '',
            category: '',
            notes: '',
          });
          // Navigate to annotation screen
          setTimeout(() => {
            router.push('/annotation');
          }, 500);
        }
      } catch (e) {
        console.warn('Error checking pending transaction:', e);
      }
    };

    // Check on mount
    checkPendingTransaction();

    // Also check when app comes to foreground (user tapped notification)
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        checkPendingTransaction();
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [setPendingTransaction, router]);

  return null;
}

export default function RootLayout() {
  return (
    <TransactionProvider>
      <PermissionAndTransactionHandler />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="annotation" options={{ headerShown: false, presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="budget" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
      </Stack>
    </TransactionProvider>
  );
}