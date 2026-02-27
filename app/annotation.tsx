import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator, StatusBar } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTransactions } from '../context/TransactionContext';
import { LinearGradient } from 'expo-linear-gradient';

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

export default function AnnotationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { updateTransaction } = useTransactions();

  const merchant = String(params.merchant || 'Unknown');
  const amount = String(params.amount || '0');
  const date = String(params.date || '');
  const index = parseInt(String(params.index || '0'));

  const [selectedCategory, setSelectedCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    setAiLoading(true);
    setTimeout(() => {
      const suggestion = getAISuggestion(merchant);
      setSelectedCategory(suggestion);
      setAiLoading(false);
    }, 1000);
  }, []);

  const handleSave = () => {
    if (!selectedCategory) {
      Alert.alert('Please select a category!');
      return;
    }
    updateTransaction(index, selectedCategory, notes);
    Alert.alert('✅ Saved!', `${merchant} tagged as ${selectedCategory}`, [
      { text: 'OK', onPress: () => router.back() }
    ]);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />

      {/* Header */}
      <LinearGradient colors={['#1a0533', '#0A0A0F']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Categorize</Text>
      </LinearGradient>

      {/* Transaction Card */}
      <LinearGradient
        colors={['#7C3AED', '#4F46E5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.transactionCard}>
        <Text style={styles.merchantName}>{merchant}</Text>
        <Text style={styles.amount}>₹{parseFloat(amount).toFixed(2)}</Text>
        <Text style={styles.date}>
          {date ? new Date(parseInt(date)).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'long', year: 'numeric'
          }) : ''}
        </Text>
        {aiLoading ? (
          <View style={styles.aiLoading}>
            <ActivityIndicator size="small" color="white" />
            <Text style={styles.aiLoadingText}>🤖 AI is categorizing...</Text>
          </View>
        ) : selectedCategory ? (
          <View style={styles.aiSuggestion}>
            <Text style={styles.aiSuggestionText}>🤖 AI suggested: {selectedCategory}</Text>
          </View>
        ) : null}
      </LinearGradient>

      {/* Category Picker */}
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
                backgroundColor: cat.color + '20'
              }
            ]}
            onPress={() => setSelectedCategory(cat.name)}>
            <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
            <Text style={[
              styles.categoryName,
              selectedCategory === cat.name && { color: cat.color, fontWeight: 'bold' }
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

      {/* Save Button */}
      <TouchableOpacity style={styles.saveButtonContainer} onPress={handleSave}>
        <LinearGradient colors={['#7C3AED', '#4F46E5']} style={styles.saveButton}>
          <Text style={styles.saveButtonText}>💾 Save Transaction</Text>
        </LinearGradient>
      </TouchableOpacity>

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
});