import { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, StatusBar, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTransactions } from '../context/TransactionContext';

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

export default function BudgetScreen() {
  const router = useRouter();
  const { transactions } = useTransactions();
  const [budgets, setBudgets] = useState<{ [key: string]: string }>({});
  const [editing, setEditing] = useState<string | null>(null);

  const getCategorySpent = (category: string) => {
    return transactions
      .filter(t => t.category === category)
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const getProgressColor = (spent: number, budget: number) => {
    const percent = (spent / budget) * 100;
    if (percent >= 100) return '#FF6B6B';
    if (percent >= 80) return '#F39C12';
    return '#2ECC71';
  };

  const getProgressPercent = (spent: number, budget: number) => {
    return Math.min((spent / budget) * 100, 100);
  };

  const handleSaveBudget = (category: string) => {
    const budget = parseFloat(budgets[category] || '0');
    const spent = getCategorySpent(category);
    if (spent >= budget * 0.8 && spent < budget) {
      Alert.alert('⚠️ Warning!', `You have used 80% of your ${category} budget!`);
    } else if (spent >= budget) {
      Alert.alert('🚨 Over Budget!', `You have exceeded your ${category} budget!`);
    } else {
      Alert.alert('✅ Budget Set!', `${category} budget set to ₹${budget}`);
    }
    setEditing(null);
  };

  const totalBudget = Object.values(budgets).reduce((sum, b) => sum + (parseFloat(b) || 0), 0);
  const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />

      {/* Header */}
      <LinearGradient colors={['#1a0533', '#0A0A0F']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Budget Alerts 🎯</Text>
      </LinearGradient>

      {/* Total Budget Card */}
      <LinearGradient
        colors={['#7C3AED', '#4F46E5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.totalCard}>
        <View style={styles.totalRow}>
          <View>
            <Text style={styles.totalLabel}>Total Budget</Text>
            <Text style={styles.totalAmount}>₹{totalBudget.toFixed(0)}</Text>
          </View>
          <View style={styles.divider} />
          <View>
            <Text style={styles.totalLabel}>Total Spent</Text>
            <Text style={styles.totalAmount}>₹{totalSpent.toFixed(0)}</Text>
          </View>
          <View style={styles.divider} />
          <View>
            <Text style={styles.totalLabel}>Remaining</Text>
            <Text style={[styles.totalAmount, { color: totalBudget - totalSpent < 0 ? '#FF6B6B' : '#2ECC71' }]}>
              ₹{(totalBudget - totalSpent).toFixed(0)}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <Text style={styles.sectionTitle}>Set Category Budgets</Text>

      {CATEGORIES.map((cat) => {
        const spent = getCategorySpent(cat.name);
        const budget = parseFloat(budgets[cat.name] || '0');
        const hasbudget = budget > 0;
        const progressPercent = hasbudget ? getProgressPercent(spent, budget) : 0;
        const progressColor = hasbudget ? getProgressColor(spent, budget) : '#333';

        return (
          <View key={cat.name} style={styles.budgetCard}>
            <View style={styles.budgetHeader}>
              <View style={styles.budgetLeft}>
                <View style={[styles.categoryDot, { backgroundColor: cat.color + '30' }]}>
                  <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                </View>
                <View>
                  <Text style={styles.categoryName}>{cat.name}</Text>
                  <Text style={styles.spentText}>Spent: ₹{spent.toFixed(0)}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setEditing(editing === cat.name ? null : cat.name)}>
                <Text style={styles.editButtonText}>{editing === cat.name ? 'Cancel' : 'Set'}</Text>
              </TouchableOpacity>
            </View>

            {editing === cat.name && (
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.budgetInput}
                  placeholder="Enter budget amount"
                  placeholderTextColor="#444"
                  keyboardType="numeric"
                  value={budgets[cat.name] || ''}
                  onChangeText={(val) => setBudgets({ ...budgets, [cat.name]: val })}
                />
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={() => handleSaveBudget(cat.name)}>
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            )}

            {hasbudget && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, {
                    width: `${progressPercent}%`,
                    backgroundColor: progressColor
                  }]} />
                </View>
                <View style={styles.progressLabels}>
                  <Text style={styles.progressText}>{progressPercent.toFixed(0)}% used</Text>
                  <Text style={styles.budgetText}>Budget: ₹{budget.toFixed(0)}</Text>
                </View>
                {progressPercent >= 80 && (
                  <View style={styles.alertBadge}>
                    <Text style={styles.alertText}>
                      {progressPercent >= 100 ? '🚨 Over Budget!' : '⚠️ Almost at limit!'}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        );
      })}

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
  totalCard: {
    marginHorizontal: 20,
    padding: 22,
    borderRadius: 24,
    elevation: 10,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  totalAmount: { fontSize: 18, fontWeight: 'bold', color: 'white', textAlign: 'center', marginTop: 4 },
  divider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.2)' },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 20,
    marginTop: 25,
    marginBottom: 12,
    color: 'white',
  },
  budgetCard: {
    backgroundColor: '#1a1a2e',
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ffffff08',
  },
  budgetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  budgetLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  categoryDot: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryEmoji: { fontSize: 22 },
  categoryName: { fontSize: 15, fontWeight: 'bold', color: 'white' },
  spentText: { fontSize: 12, color: '#555', marginTop: 2 },
  editButton: {
    backgroundColor: '#7C3AED20',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#7C3AED50',
  },
  editButtonText: { color: '#7C3AED', fontSize: 13, fontWeight: 'bold' },
  inputRow: { flexDirection: 'row', marginTop: 12, gap: 10 },
  budgetInput: {
    flex: 1,
    backgroundColor: '#0A0A0F',
    color: 'white',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#7C3AED50',
    fontSize: 15,
  },
  saveBtn: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 18,
    borderRadius: 10,
    justifyContent: 'center',
  },
  saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  progressContainer: { marginTop: 12 },
  progressBar: {
    height: 6,
    backgroundColor: '#0A0A0F',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: 6, borderRadius: 3 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  progressText: { fontSize: 11, color: '#555' },
  budgetText: { fontSize: 11, color: '#555' },
  alertBadge: {
    backgroundColor: '#FF6B6B20',
    padding: 6,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF6B6B30',
  },
  alertText: { color: '#FF6B6B', fontSize: 12, fontWeight: 'bold' },
});