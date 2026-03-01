import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator, StatusBar } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTransactions, Split } from '../context/TransactionContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';

const CATEGORIES = [
  { name: 'Food', emoji: '🍕', color: '#FF6B6B' },
  { name: 'Shopping', emoji: '🛒', color: '#4ECDC4' },
  { name: 'Travel', emoji: '✈️', color: '#45B7D1' },
  { name: 'Fuel', emoji: '⛽', color: '#F39C12' },
  { name: 'Entertainment', emoji: '🎬', color: '#9B59B6' },
  { name: 'Groceries', emoji: '🏪', color: '#2ECC71' },
  { name: 'Health', emoji: '💊', color: '#E74C3C' },
  { name: 'Rent', emoji: '🏠', color: '#3498DB' },
  { name: 'Education', emoji: '📚', color: '#1ABC9C' },
  { name: 'Other', emoji: '💳', color: '#95A5A6' },
];

const getAISuggestion = (merchant: string) => {
  const m = merchant.toLowerCase();
  if (m.includes('swiggy') || m.includes('zomato') || m.includes('cafe') || m.includes('restaurant') || m.includes('food')) return 'Food';
  if (m.includes('amazon') || m.includes('flipkart') || m.includes('myntra')) return 'Shopping';
  if (m.includes('petrol') || m.includes('fuel') || m.includes('reliance petrol')) return 'Fuel';
  if (m.includes('netflix') || m.includes('spotify') || m.includes('prime')) return 'Entertainment';
  if (m.includes('bazaar') || m.includes('mart') || m.includes('grocer')) return 'Groceries';
  if (m.includes('hospital') || m.includes('pharmacy') || m.includes('medical')) return 'Health';
  if (m.includes('rent') || m.includes('house')) return 'Rent';
  if (m.includes('school') || m.includes('college') || m.includes('course')) return 'Education';
  if (m.includes('uber') || m.includes('ola') || m.includes('flight')) return 'Travel';
  return 'Other';
};

const getAISplitSuggestions = (merchant: string, amount: number): Split[] => {
  const m = merchant.toLowerCase();
  if (m.includes('swiggy') || m.includes('zomato')) {
    return [
      { amount: Math.round(amount * 0.7), description: 'Main course', category: 'Food' },
      { amount: Math.round(amount * 0.3), description: 'Drinks / Dessert', category: 'Food' },
    ];
  }
  if (m.includes('amazon') || m.includes('flipkart')) {
    return [
      { amount: Math.round(amount * 0.5), description: 'Item 1', category: 'Shopping' },
      { amount: amount - Math.round(amount * 0.5), description: 'Item 2', category: 'Shopping' },
    ];
  }
  if (m.includes('mart') || m.includes('bazaar') || m.includes('grocer')) {
    return [
      { amount: Math.round(amount * 0.4), description: 'Vegetables & Fruits', category: 'Groceries' },
      { amount: Math.round(amount * 0.3), description: 'Snacks & Drinks', category: 'Food' },
      { amount: amount - Math.round(amount * 0.4) - Math.round(amount * 0.3), description: 'Household items', category: 'Shopping' },
    ];
  }
  // Generic suggestion
  return [
    { amount: Math.round(amount / 2), description: 'Item 1', category: getAISuggestion(merchant) },
    { amount: amount - Math.round(amount / 2), description: 'Item 2', category: getAISuggestion(merchant) },
  ];
};

export default function AnnotationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { updateTransaction, addTransaction, pendingTransaction, setPendingTransaction, transactions, budgets } = useTransactions();

  // Determine source: from pending (auto-detect) or from params (manual tap)
  const isFromPending = !!pendingTransaction && !params.merchant;
  const merchant = isFromPending ? pendingTransaction!.merchant : String(params.merchant || 'Unknown');
  const amount = isFromPending ? String(pendingTransaction!.amount) : String(params.amount || '0');
  const date = isFromPending ? pendingTransaction!.date : String(params.date || '');
  const message = isFromPending ? pendingTransaction!.message : '';
  const index = isFromPending ? -1 : parseInt(String(params.index || '0'));

  const [selectedCategory, setSelectedCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [splits, setSplits] = useState<Split[]>([]);
  const [activeSplitIndex, setActiveSplitIndex] = useState<number | null>(null);

  const totalAmount = parseFloat(amount);
  const splitsTotal = splits.reduce((sum, s) => sum + s.amount, 0);
  const remaining = totalAmount - splitsTotal;

  useEffect(() => {
    setAiLoading(true);
    setTimeout(() => {
      const suggestion = getAISuggestion(merchant);
      setSelectedCategory(suggestion);
      setAiLoading(false);
    }, 800);
  }, []);

  const handleEnableSplit = () => {
    setSplitEnabled(true);
    // Generate AI suggestions for splits
    const suggestions = getAISplitSuggestions(merchant, totalAmount);
    setSplits(suggestions);
    setActiveSplitIndex(null);
  };

  const handleDisableSplit = () => {
    setSplitEnabled(false);
    setSplits([]);
    setActiveSplitIndex(null);
  };

  const addSplitItem = () => {
    const newAmount = remaining > 0 ? remaining : 0;
    setSplits([...splits, { amount: newAmount, description: '', category: selectedCategory || 'Other' }]);
    setActiveSplitIndex(splits.length);
  };

  const removeSplitItem = (idx: number) => {
    const updated = splits.filter((_, i) => i !== idx);
    setSplits(updated);
    if (activeSplitIndex === idx) setActiveSplitIndex(null);
  };

  const updateSplitAmount = (idx: number, value: string) => {
    const updated = [...splits];
    updated[idx] = { ...updated[idx], amount: parseFloat(value) || 0 };
    setSplits(updated);
  };

  const updateSplitDescription = (idx: number, value: string) => {
    const updated = [...splits];
    updated[idx] = { ...updated[idx], description: value };
    setSplits(updated);
  };

  const updateSplitCategory = (idx: number, category: string) => {
    const updated = [...splits];
    updated[idx] = { ...updated[idx], category };
    setSplits(updated);
  };

  const handleSave = async () => {
    if (!splitEnabled && !selectedCategory) {
      Alert.alert('Please select a category!');
      return;
    }

    if (splitEnabled) {
      if (splits.length < 2) {
        Alert.alert('Add at least 2 split items!');
        return;
      }
      const emptyDesc = splits.find(s => !s.description.trim());
      if (emptyDesc) {
        Alert.alert('All split items need a description!');
        return;
      }
      if (Math.abs(splitsTotal - totalAmount) > 1) {
        Alert.alert('Split Error', `Split amounts (₹${splitsTotal}) must equal total (₹${totalAmount}). Difference: ₹${Math.abs(remaining).toFixed(0)}`);
        return;
      }
    }

    const finalSplits = splitEnabled ? splits : undefined;
    const finalCategory = splitEnabled ? 'Split' : selectedCategory;
    const finalNotes = splitEnabled
      ? splits.map(s => `₹${s.amount} - ${s.description} (${s.category})`).join(' | ')
      : notes;

    if (isFromPending) {
      // Auto-detected transaction: add as new
      addTransaction({
        amount: totalAmount,
        merchant,
        date,
        message,
        category: finalCategory,
        notes: finalNotes,
        splits: finalSplits,
      });
      setPendingTransaction(null);
    } else {
      // Manual tap: update existing
      updateTransaction(index, finalCategory, finalNotes, finalSplits);
    }

    // Check budget thresholds after categorizing
    const checkBudgetAlert = async (category: string, txnAmount: number) => {
      if (category === 'Split' || !category) return;
      const budget = parseFloat(budgets[category] || '0');
      if (budget <= 0) return;

      // Calculate total spent in this category (including the just-saved transaction)
      const categorySpent = transactions
        .filter(t => t.category === category)
        .reduce((sum, t) => sum + t.amount, 0) + txnAmount;

      const percent = (categorySpent / budget) * 100;

      if (percent >= 100) {
        Alert.alert(
          '🚨 Budget Exceeded!',
          `You've exceeded your ${category} budget!\n\nSpent: ₹${categorySpent.toFixed(0)}\nBudget: ₹${budget.toFixed(0)}\nOver by: ₹${(categorySpent - budget).toFixed(0)}`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🚨 Budget Exceeded!',
            body: `${category}: Spent ₹${categorySpent.toFixed(0)} of ₹${budget.toFixed(0)} budget!`,
            sound: true,
          },
          trigger: null,
        });
        return true;
      } else if (percent >= 90) {
        Alert.alert(
          '⚠️ 90% Budget Used!',
          `${category} is at ${percent.toFixed(0)}%!\n\nSpent: ₹${categorySpent.toFixed(0)}\nBudget: ₹${budget.toFixed(0)}\nRemaining: ₹${(budget - categorySpent).toFixed(0)}`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '⚠️ 90% Budget Warning!',
            body: `${category}: ₹${categorySpent.toFixed(0)} of ₹${budget.toFixed(0)} used (${percent.toFixed(0)}%)`,
            sound: true,
          },
          trigger: null,
        });
        return true;
      }
      return false;
    };

    // If split, check each split category
    if (splitEnabled && splits.length > 0) {
      for (const s of splits) {
        const alerted = await checkBudgetAlert(s.category, s.amount);
        if (alerted) return; // Show one alert at a time
      }
    } else {
      const alerted = await checkBudgetAlert(finalCategory, totalAmount);
      if (alerted) return;
    }

    Alert.alert('✅ Saved!', splitEnabled
      ? `Transaction split into ${splits.length} items`
      : `${merchant} tagged as ${finalCategory}`,
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  const handleDismiss = () => {
    if (isFromPending) {
      // Still add the transaction but uncategorized
      addTransaction({
        amount: totalAmount,
        merchant,
        date,
        message,
        category: '',
        notes: '',
      });
      setPendingTransaction(null);
    }
    router.back();
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />

      {/* Header */}
      <LinearGradient colors={['#1a0533', '#0A0A0F']} style={styles.header}>
        <TouchableOpacity onPress={handleDismiss} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isFromPending ? '🔔 New Transaction!' : 'Categorize'}
        </Text>
      </LinearGradient>

      {/* Auto-detect badge */}
      {isFromPending && (
        <View style={styles.autoBadge}>
          <Text style={styles.autoBadgeText}>📲 Auto-detected from SMS</Text>
        </View>
      )}

      {/* Transaction Card */}
      <LinearGradient
        colors={['#7C3AED', '#4F46E5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.transactionCard}>
        <Text style={styles.merchantName}>{merchant}</Text>
        <Text style={styles.amount}>₹{totalAmount.toFixed(2)}</Text>
        <Text style={styles.date}>
          {date ? new Date(parseInt(date)).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'long', year: 'numeric'
          }) : ''}
        </Text>
        {aiLoading ? (
          <View style={styles.aiLoading}>
            <ActivityIndicator size="small" color="white" />
            <Text style={styles.aiLoadingText}>🤖 AI is analyzing...</Text>
          </View>
        ) : selectedCategory ? (
          <View style={styles.aiSuggestion}>
            <Text style={styles.aiSuggestionText}>🤖 AI suggested: {selectedCategory}</Text>
          </View>
        ) : null}
      </LinearGradient>

      {/* Split Toggle */}
      <View style={styles.splitToggleContainer}>
        <TouchableOpacity
          style={[styles.splitToggle, splitEnabled && styles.splitToggleActive]}
          onPress={splitEnabled ? handleDisableSplit : handleEnableSplit}>
          <Text style={styles.splitToggleIcon}>✂️</Text>
          <View style={styles.splitToggleTextContainer}>
            <Text style={[styles.splitToggleText, splitEnabled && styles.splitToggleTextActive]}>
              Split Transaction
            </Text>
            <Text style={styles.splitToggleSubtext}>
              {splitEnabled ? 'Tap to disable splitting' : 'Break into multiple items'}
            </Text>
          </View>
          <View style={[styles.splitToggleSwitch, splitEnabled && styles.splitToggleSwitchActive]}>
            <View style={[styles.splitToggleDot, splitEnabled && styles.splitToggleDotActive]} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Split Section */}
      {splitEnabled ? (
        <View>
          <Text style={styles.sectionTitle}>Split Items</Text>
          <View style={styles.splitSummary}>
            <Text style={styles.splitSummaryText}>
              Total: ₹{totalAmount.toFixed(0)} | Split: ₹{splitsTotal.toFixed(0)} |{' '}
              <Text style={{ color: Math.abs(remaining) < 1 ? '#2ECC71' : '#FF6B6B' }}>
                {Math.abs(remaining) < 1 ? '✅ Balanced' : `₹${remaining.toFixed(0)} remaining`}
              </Text>
            </Text>
          </View>

          {splits.map((split, idx) => (
            <View key={idx} style={[styles.splitCard, activeSplitIndex === idx && styles.splitCardActive]}>
              <View style={styles.splitCardHeader}>
                <Text style={styles.splitCardNumber}>#{idx + 1}</Text>
                <TouchableOpacity onPress={() => removeSplitItem(idx)} style={styles.removeSplitBtn}>
                  <Text style={styles.removeSplitText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.splitRow}>
                <Text style={styles.splitLabel}>Amount ₹</Text>
                <TextInput
                  style={styles.splitAmountInput}
                  value={String(split.amount)}
                  onChangeText={(v) => updateSplitAmount(idx, v)}
                  keyboardType="numeric"
                  placeholderTextColor="#444"
                />
              </View>

              <View style={styles.splitRow}>
                <Text style={styles.splitLabel}>What for?</Text>
                <TextInput
                  style={styles.splitDescInput}
                  value={split.description}
                  onChangeText={(v) => updateSplitDescription(idx, v)}
                  placeholder="e.g. Cold drink, Chips..."
                  placeholderTextColor="#444"
                />
              </View>

              <TouchableOpacity
                onPress={() => setActiveSplitIndex(activeSplitIndex === idx ? null : idx)}
                style={styles.splitCategoryToggle}>
                <Text style={styles.splitCategoryToggleText}>
                  🏷️ {split.category || 'Pick category'} {activeSplitIndex === idx ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>

              {activeSplitIndex === idx && (
                <View style={styles.splitCategoryGrid}>
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat.name}
                      style={[
                        styles.splitCategoryItem,
                        split.category === cat.name && {
                          borderColor: cat.color,
                          borderWidth: 2,
                          backgroundColor: cat.color + '20',
                        },
                      ]}
                      onPress={() => {
                        updateSplitCategory(idx, cat.name);
                        setActiveSplitIndex(null);
                      }}>
                      <Text style={styles.splitCategoryEmoji}>{cat.emoji}</Text>
                      <Text style={[
                        styles.splitCategoryName,
                        split.category === cat.name && { color: cat.color, fontWeight: 'bold' },
                      ]}>{cat.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ))}

          <TouchableOpacity style={styles.addSplitBtn} onPress={addSplitItem}>
            <Text style={styles.addSplitText}>+ Add another item</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Category Picker (non-split mode) */}
          <Text style={styles.sectionTitle}>Where did you spend?</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.name}
                style={[
                  styles.categoryItem,
                  selectedCategory === cat.name && {
                    borderColor: cat.color,
                    borderWidth: 2,
                    backgroundColor: cat.color + '20',
                  },
                ]}
                onPress={() => setSelectedCategory(cat.name)}>
                <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                <Text style={[
                  styles.categoryName,
                  selectedCategory === cat.name && { color: cat.color, fontWeight: 'bold' },
                ]}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Notes */}
          <Text style={styles.sectionTitle}>Add a note (optional)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="e.g. Lunch with friends..."
            placeholderTextColor="#444"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </>
      )}

      {/* Save Button */}
      <TouchableOpacity style={styles.saveButtonContainer} onPress={handleSave}>
        <LinearGradient colors={['#7C3AED', '#4F46E5']} style={styles.saveButton}>
          <Text style={styles.saveButtonText}>
            {splitEnabled ? `✂️ Save ${splits.length} Split Items` : '💾 Save Transaction'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Skip button for auto-detected */}
      {isFromPending && (
        <TouchableOpacity style={styles.skipButton} onPress={handleDismiss}>
          <Text style={styles.skipButtonText}>Skip for now →</Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  header: {
    padding: 20,
    paddingTop: 55,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: { marginRight: 15 },
  backText: { color: '#7C3AED', fontSize: 16, fontWeight: 'bold' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: 'white' },
  autoBadge: {
    backgroundColor: '#7C3AED20',
    marginHorizontal: 20,
    padding: 10,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#7C3AED50',
    alignItems: 'center',
  },
  autoBadgeText: { color: '#7C3AED', fontSize: 13, fontWeight: 'bold' },
  transactionCard: {
    marginHorizontal: 20,
    padding: 25,
    borderRadius: 24,
    alignItems: 'center',
    elevation: 10,
    marginBottom: 10,
  },
  merchantName: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  amount: { fontSize: 40, fontWeight: 'bold', color: 'white', marginTop: 8 },
  date: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 5 },
  aiLoading: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 },
  aiLoadingText: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  aiSuggestion: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
  },
  aiSuggestionText: { color: 'white', fontSize: 13 },

  // Split Toggle
  splitToggleContainer: { marginHorizontal: 20, marginTop: 10, marginBottom: 5 },
  splitToggle: {
    backgroundColor: '#1a1a2e',
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffffff08',
  },
  splitToggleActive: {
    borderColor: '#7C3AED',
    backgroundColor: '#7C3AED15',
  },
  splitToggleIcon: { fontSize: 24, marginRight: 12 },
  splitToggleTextContainer: { flex: 1 },
  splitToggleText: { color: '#999', fontSize: 15, fontWeight: 'bold' },
  splitToggleTextActive: { color: '#7C3AED' },
  splitToggleSubtext: { color: '#555', fontSize: 11, marginTop: 2 },
  splitToggleSwitch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#333',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  splitToggleSwitchActive: { backgroundColor: '#7C3AED' },
  splitToggleDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#666',
  },
  splitToggleDotActive: {
    backgroundColor: 'white',
    alignSelf: 'flex-end',
  },

  // Split section
  splitSummary: {
    backgroundColor: '#1a1a2e',
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ffffff08',
  },
  splitSummaryText: { color: '#aaa', fontSize: 13, textAlign: 'center' },
  splitCard: {
    backgroundColor: '#1a1a2e',
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ffffff08',
  },
  splitCardActive: { borderColor: '#7C3AED50' },
  splitCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  splitCardNumber: { color: '#7C3AED', fontSize: 14, fontWeight: 'bold' },
  removeSplitBtn: {
    backgroundColor: '#FF6B6B20',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeSplitText: { color: '#FF6B6B', fontSize: 14, fontWeight: 'bold' },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  splitLabel: { color: '#666', fontSize: 13, width: 80 },
  splitAmountInput: {
    flex: 1,
    backgroundColor: '#0A0A0F',
    padding: 10,
    borderRadius: 10,
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    borderWidth: 1,
    borderColor: '#ffffff10',
  },
  splitDescInput: {
    flex: 1,
    backgroundColor: '#0A0A0F',
    padding: 10,
    borderRadius: 10,
    color: 'white',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#ffffff10',
  },
  splitCategoryToggle: {
    backgroundColor: '#0A0A0F',
    padding: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  splitCategoryToggleText: { color: '#aaa', fontSize: 13 },
  splitCategoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 6,
  },
  splitCategoryItem: {
    backgroundColor: '#0A0A0F',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffffff08',
    gap: 4,
  },
  splitCategoryEmoji: { fontSize: 14 },
  splitCategoryName: { fontSize: 11, color: '#888' },
  addSplitBtn: {
    marginHorizontal: 20,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#7C3AED50',
    borderStyle: 'dashed',
    alignItems: 'center',
    marginBottom: 10,
  },
  addSplitText: { color: '#7C3AED', fontSize: 14, fontWeight: 'bold' },

  // Category grid (non-split)
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 12,
    color: 'white',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 15,
  },
  categoryItem: {
    backgroundColor: '#1a1a2e',
    width: '28%',
    padding: 12,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffffff08',
    margin: 4,
  },
  categoryEmoji: { fontSize: 24 },
  categoryName: { fontSize: 11, color: '#888', marginTop: 5, textAlign: 'center' },
  notesInput: {
    backgroundColor: '#1a1a2e',
    marginHorizontal: 20,
    padding: 15,
    borderRadius: 14,
    fontSize: 15,
    color: 'white',
    borderWidth: 1,
    borderColor: '#ffffff08',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  saveButtonContainer: {
    marginHorizontal: 20,
    marginTop: 25,
    borderRadius: 14,
    overflow: 'hidden',
  },
  saveButton: { padding: 16, alignItems: 'center' },
  saveButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  skipButton: {
    marginHorizontal: 20,
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  skipButtonText: { color: '#666', fontSize: 14 },
});