import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator, StatusBar } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTransactions, Split } from '../context/TransactionContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';

import { GEMINI_API_KEY } from '../config';

const CATEGORY_NAMES = ['Food', 'Shopping', 'Travel', 'Fuel', 'Entertainment', 'Groceries', 'Health', 'Rent', 'Education', 'Other'];

const getGeminiSuggestion = async (merchant: string, smsBody: string): Promise<{ category: string; subCategory: string } | null> => {
  if (!GEMINI_API_KEY) return null;
  try {
    const prompt = `You are a bank transaction categorizer for an Indian user. Given this bank SMS, classify it into exactly one category and one subcategory.

Categories and their subcategories:
- Food: Breakfast, Lunch, Dinner, Snacks, Coffee/Tea
- Shopping: Clothing, Electronics, Accessories, Online
- Travel: Cab/Auto, Bus/Train, Flight, Hotel
- Fuel: Petrol, Diesel, CNG
- Entertainment: Movies, Streaming, Gaming, Events
- Groceries: Vegetables, Dairy, Snacks, Household
- Health: Medicine, Doctor, Gym
- Rent: Rent, Maintenance, Electricity
- Education: Books, Course, Fees
- Other: (use only if nothing else fits)

Merchant: ${merchant}
Full SMS: ${smsBody || 'not available'}

Respond with ONLY a JSON object like {"category":"Food","subCategory":"Lunch"} — no other text.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 50 },
        }),
      }
    );

    if (!response.ok) return null;
    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) return null;

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[^}]+\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.category && CATEGORY_NAMES.includes(parsed.category)) {
      return { category: parsed.category, subCategory: parsed.subCategory || '' };
    }
    return null;
  } catch (e) {
    console.log('Gemini API error, falling back to keyword matching:', e);
    return null;
  }
};

const CATEGORIES = [
  { name: 'Food', emoji: '🍕', color: '#FF6B6B', subs: ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Coffee/Tea', 'Other'] },
  { name: 'Shopping', emoji: '🛒', color: '#4ECDC4', subs: ['Clothing', 'Electronics', 'Accessories', 'Online', 'Other'] },
  { name: 'Travel', emoji: '✈️', color: '#45B7D1', subs: ['Cab/Auto', 'Bus/Train', 'Flight', 'Hotel', 'Other'] },
  { name: 'Fuel', emoji: '⛽', color: '#F39C12', subs: ['Petrol', 'Diesel', 'CNG', 'Other'] },
  { name: 'Entertainment', emoji: '🎬', color: '#9B59B6', subs: ['Movies', 'Streaming', 'Gaming', 'Events', 'Other'] },
  { name: 'Groceries', emoji: '🏪', color: '#2ECC71', subs: ['Vegetables', 'Dairy', 'Snacks', 'Household', 'Other'] },
  { name: 'Health', emoji: '💊', color: '#E74C3C', subs: ['Medicine', 'Doctor', 'Gym', 'Other'] },
  { name: 'Rent', emoji: '🏠', color: '#3498DB', subs: ['Rent', 'Maintenance', 'Electricity', 'Other'] },
  { name: 'Education', emoji: '📚', color: '#1ABC9C', subs: ['Books', 'Course', 'Fees', 'Other'] },
  { name: 'Other', emoji: '💳', color: '#95A5A6', subs: [] },
];

const getAISuggestion = (merchant: string, smsBody: string = ''): { category: string; subCategory: string } => {
  // Search both merchant name AND full SMS body for better matching
  const m = (merchant + ' ' + smsBody).toLowerCase();

  // 🍕 Food & Dining
  if (m.includes('swiggy') || m.includes('zomato') || m.includes('dominos') || m.includes('mcdonalds') ||
    m.includes('kfc') || m.includes('pizza') || m.includes('burger') || m.includes('cafe') ||
    m.includes('restaurant') || m.includes('food') || m.includes('biryani') || m.includes('chai') ||
    m.includes('starbucks') || m.includes('dunkin') || m.includes('barbeque') || m.includes('haldiram') ||
    m.includes('behrouz') || m.includes('faasos') || m.includes('box8') || m.includes('eatfit') ||
    m.includes('freshmen') || m.includes('subway') || m.includes('dineout') || m.includes('eatsure'))
    return { category: 'Food', subCategory: 'Lunch' };

  // 🛒 Shopping
  if (m.includes('amazon') || m.includes('flipkart') || m.includes('myntra') || m.includes('ajio') ||
    m.includes('meesho') || m.includes('snapdeal') || m.includes('nykaa') || m.includes('tatacliq') ||
    m.includes('shoppers stop') || m.includes('lifestyle') || m.includes('reliance digital') ||
    m.includes('croma') || m.includes('decathlon') || m.includes('westside') || m.includes('zara') ||
    m.includes('h&m') || m.includes('pantaloons') || m.includes('max fashion') || m.includes('lenskart') ||
    m.includes('pepperfry') || m.includes('urban ladder') || m.includes('firstcry'))
    return { category: 'Shopping', subCategory: 'Online' };

  // ⛽ Fuel
  if (m.includes('petrol') || m.includes('fuel') || m.includes('bpcl') || m.includes('hpcl') ||
    m.includes('iocl') || m.includes('indian oil') || m.includes('bharat petroleum') ||
    m.includes('hp petro') || m.includes('reliance petro') || m.includes('shell') ||
    m.includes('filling station') || m.includes('cng') || m.includes('gas station') ||
    m.includes('essar') || m.includes('diesel') || m.includes('nayara'))
    return { category: 'Fuel', subCategory: 'Petrol' };

  // ✈️ Travel & Transport
  if (m.includes('uber') || m.includes('ola') || m.includes('rapido') || m.includes('flight') ||
    m.includes('irctc') || m.includes('makemytrip') || m.includes('goibibo') || m.includes('cleartrip') ||
    m.includes('yatra') || m.includes('redbus') || m.includes('indigo') || m.includes('spicejet') ||
    m.includes('air india') || m.includes('vistara') || m.includes('akasa') || m.includes('metro') ||
    m.includes('railway') || m.includes('oyo') || m.includes('airbnb') || m.includes('booking.com') ||
    m.includes('easemytrip') || m.includes('ixigo') || m.includes('abhibus') || m.includes('cab') ||
    m.includes('auto') || m.includes('taxi') || m.includes('toll') || m.includes('fastag') ||
    m.includes('nhai') || m.includes('parking'))
    return { category: 'Travel', subCategory: m.includes('flight') || m.includes('indigo') || m.includes('spicejet') || m.includes('air india') ? 'Flight' : m.includes('oyo') || m.includes('airbnb') || m.includes('hotel') ? 'Hotel' : m.includes('irctc') || m.includes('railway') || m.includes('redbus') || m.includes('metro') ? 'Bus/Train' : 'Cab/Auto' };

  // 🎬 Entertainment
  if (m.includes('netflix') || m.includes('spotify') || m.includes('prime') || m.includes('hotstar') ||
    m.includes('disney') || m.includes('jiocinema') || m.includes('youtube') || m.includes('zee5') ||
    m.includes('sonyliv') || m.includes('bookmyshow') || m.includes('pvr') || m.includes('inox') ||
    m.includes('cinepolis') || m.includes('gaming') || m.includes('steam') || m.includes('playstation') ||
    m.includes('xbox') || m.includes('movie') || m.includes('multiplex') || m.includes('apple music') ||
    m.includes('gaana') || m.includes('wynk') || m.includes('cinema'))
    return { category: 'Entertainment', subCategory: m.includes('netflix') || m.includes('spotify') || m.includes('prime') || m.includes('hotstar') || m.includes('disney') || m.includes('youtube') || m.includes('zee5') || m.includes('sonyliv') || m.includes('jiocinema') ? 'Streaming' : m.includes('pvr') || m.includes('inox') || m.includes('bookmyshow') || m.includes('movie') || m.includes('cinema') ? 'Movies' : m.includes('steam') || m.includes('gaming') ? 'Gaming' : 'Events' };

  // 🏪 Groceries
  if (m.includes('bigbasket') || m.includes('blinkit') || m.includes('zepto') || m.includes('instamart') ||
    m.includes('jiomart') || m.includes('dmart') || m.includes('reliance fresh') || m.includes('more') ||
    m.includes('grofers') || m.includes('bazaar') || m.includes('mart') || m.includes('grocer') ||
    m.includes('supermarket') || m.includes('kirana') || m.includes('nature basket') ||
    m.includes('spencer') || m.includes('star bazaar') || m.includes('big bazaar') ||
    m.includes('vegetables') || m.includes('fruits') || m.includes('milk') || m.includes('dairy'))
    return { category: 'Groceries', subCategory: 'Vegetables' };

  // 💊 Health
  if (m.includes('hospital') || m.includes('pharmacy') || m.includes('medical') || m.includes('apollo') ||
    m.includes('medplus') || m.includes('netmeds') || m.includes('pharmeasy') || m.includes('1mg') ||
    m.includes('tata 1mg') || m.includes('doctor') || m.includes('clinic') || m.includes('diagnostic') ||
    m.includes('pathology') || m.includes('lab') || m.includes('gym') || m.includes('cult.fit') ||
    m.includes('cultfit') || m.includes('healthify') || m.includes('practo') || m.includes('dental') ||
    m.includes('eye care') || m.includes('optical') || m.includes('wellness'))
    return { category: 'Health', subCategory: m.includes('gym') || m.includes('cult') || m.includes('healthify') ? 'Gym' : m.includes('doctor') || m.includes('clinic') || m.includes('practo') ? 'Doctor' : 'Medicine' };

  // 🏠 Rent & Utilities
  if (m.includes('rent') || m.includes('house') || m.includes('electricity') || m.includes('electric') ||
    m.includes('water bill') || m.includes('maintenance') || m.includes('society') ||
    m.includes('gas bill') || m.includes('broadband') || m.includes('wifi') || m.includes('jio fiber') ||
    m.includes('airtel xstream') || m.includes('act fibernet') || m.includes('piped gas') ||
    m.includes('municipal') || m.includes('property'))
    return { category: 'Rent', subCategory: m.includes('electric') ? 'Electricity' : m.includes('maintenance') || m.includes('society') ? 'Maintenance' : 'Rent' };

  // 📚 Education
  if (m.includes('school') || m.includes('college') || m.includes('university') || m.includes('course') ||
    m.includes('udemy') || m.includes('coursera') || m.includes('unacademy') || m.includes('byju') ||
    m.includes('vedantu') || m.includes('upgrad') || m.includes('simplilearn') || m.includes('tuition') ||
    m.includes('coaching') || m.includes('exam') || m.includes('books') || m.includes('stationery') ||
    m.includes('education') || m.includes('skill') || m.includes('linkedin learning'))
    return { category: 'Education', subCategory: m.includes('book') || m.includes('stationery') ? 'Books' : m.includes('udemy') || m.includes('coursera') || m.includes('unacademy') || m.includes('course') ? 'Course' : 'Fees' };

  // 📱 Recharge / Bills (map to Rent since no separate category)
  if (m.includes('recharge') || m.includes('jio') || m.includes('airtel') || m.includes('vi ') ||
    m.includes('vodafone') || m.includes('bsnl') || m.includes('postpaid') || m.includes('prepaid') ||
    m.includes('mobile bill') || m.includes('dth') || m.includes('tata sky') || m.includes('dish tv'))
    return { category: 'Rent', subCategory: 'Other' };

  return { category: 'Other', subCategory: '' };
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
  const suggestion = getAISuggestion(merchant, '');
  return [
    { amount: Math.round(amount / 2), description: 'Item 1', category: suggestion.category },
    { amount: amount - Math.round(amount / 2), description: 'Item 2', category: suggestion.category },
  ];
};

export default function AnnotationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { updateTransaction, addTransaction, pendingTransaction, setPendingTransaction, transactions, budgets } = useTransactions();

  const isFromPending = !!pendingTransaction && !params.merchant;
  const merchant = isFromPending ? pendingTransaction!.merchant : String(params.merchant || 'Unknown');
  const amount = isFromPending ? String(pendingTransaction!.amount) : String(params.amount || '0');
  const date = isFromPending ? pendingTransaction!.date : String(params.date || '');
  const message = isFromPending ? pendingTransaction!.message : '';
  const index = isFromPending ? -1 : parseInt(String(params.index || '0'));

  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSub, setSelectedSub] = useState('');
  const [notes, setNotes] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [splits, setSplits] = useState<Split[]>([]);
  const [activeSplitIndex, setActiveSplitIndex] = useState<number | null>(null);

  const totalAmount = parseFloat(amount);
  const splitsTotal = splits.reduce((sum, s) => sum + s.amount, 0);
  const remaining = totalAmount - splitsTotal;

  const currentCat = CATEGORIES.find(c => c.name === selectedCategory);
  const showSubCategories = selectedCategory && currentCat && currentCat.subs.length > 0;
  const showNotesBox = selectedSub === 'Other' || selectedCategory === 'Other';

  useEffect(() => {
    setAiLoading(true);
    const classify = async () => {
      // Try Gemini AI first
      const geminiResult = await getGeminiSuggestion(merchant, message);
      if (geminiResult) {
        setSelectedCategory(geminiResult.category);
        setSelectedSub(geminiResult.subCategory);
        setAiLoading(false);
        return;
      }
      // Fallback to keyword matching
      const suggestion = getAISuggestion(merchant, message);
      setSelectedCategory(suggestion.category);
      setSelectedSub(suggestion.subCategory);
      setAiLoading(false);
    };
    classify();
  }, []);

  const handleCategorySelect = (catName: string) => {
    setSelectedCategory(catName);
    setSelectedSub('');
    setNotes('');
  };

  const handleSubSelect = (sub: string) => {
    setSelectedSub(sub);
    if (sub !== 'Other') setNotes('');
  };

  const handleEnableSplit = () => {
    setSplitEnabled(true);
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
    setSplits(splits.filter((_, i) => i !== idx));
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
      if (splits.length < 2) { Alert.alert('Add at least 2 split items!'); return; }
      if (splits.find(s => !s.description.trim())) { Alert.alert('All split items need a description!'); return; }
      if (Math.abs(splitsTotal - totalAmount) > 1) {
        Alert.alert('Split Error', `Split amounts (₹${splitsTotal}) must equal total (₹${totalAmount})`);
        return;
      }
    }

    const finalSplits = splitEnabled ? splits : undefined;
    const finalCategory = splitEnabled ? 'Split' : selectedCategory;
    const finalSubCategory = splitEnabled ? '' : (selectedSub && selectedSub !== 'Other' ? selectedSub : '');
    const subLabel = finalSubCategory;
    const finalNotes = splitEnabled
      ? splits.map(s => `₹${s.amount} - ${s.description} (${s.category})`).join(' | ')
      : subLabel ? (notes ? `${subLabel} — ${notes}` : subLabel) : notes;

    if (isFromPending) {
      addTransaction({ amount: totalAmount, merchant, date, message, category: finalCategory, subCategory: finalSubCategory, notes: finalNotes, splits: finalSplits });
      setPendingTransaction(null);
    } else {
      updateTransaction(index, finalCategory, finalNotes, finalSplits, finalSubCategory);
    }

    const checkBudgetAlert = async (category: string, txnAmount: number) => {
      if (category === 'Split' || !category) return false;
      const budget = parseFloat(budgets[category] || '0');
      if (budget <= 0) return false;
      const categorySpent = transactions.filter(t => t.category === category).reduce((sum, t) => sum + t.amount, 0) + txnAmount;
      const percent = (categorySpent / budget) * 100;
      if (percent >= 100) {
        Alert.alert('🚨 Budget Exceeded!', `${category}: Spent ₹${categorySpent.toFixed(0)} of ₹${budget.toFixed(0)}`, [{ text: 'OK', onPress: () => router.back() }]);
        await Notifications.scheduleNotificationAsync({ content: { title: '🚨 Budget Exceeded!', body: `${category}: ₹${categorySpent.toFixed(0)} of ₹${budget.toFixed(0)}`, sound: true }, trigger: null });
        return true;
      } else if (percent >= 80) {
        Alert.alert('⚠️ 80% Budget Used!', `${category} is at ${percent.toFixed(0)}%!\nRemaining: ₹${(budget - categorySpent).toFixed(0)}`, [{ text: 'OK', onPress: () => router.back() }]);
        await Notifications.scheduleNotificationAsync({ content: { title: '⚠️ Budget Warning!', body: `${category}: ${percent.toFixed(0)}% used`, sound: true }, trigger: null });
        return true;
      }
      return false;
    };

    if (splitEnabled && splits.length > 0) {
      for (const s of splits) {
        const alerted = await checkBudgetAlert(s.category, s.amount);
        if (alerted) return;
      }
    } else {
      const alerted = await checkBudgetAlert(finalCategory, totalAmount);
      if (alerted) return;
    }

    Alert.alert('✅ Saved!', splitEnabled ? `Split into ${splits.length} items` : `Tagged as ${finalCategory}${subLabel ? ` › ${subLabel}` : ''}`, [{ text: 'OK', onPress: () => router.back() }]);
  };

  const handleDismiss = () => {
    if (isFromPending) {
      addTransaction({ amount: totalAmount, merchant, date, message, category: '', notes: '' });
      setPendingTransaction(null);
    }
    router.back();
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />

      <LinearGradient colors={['#1a0533', '#0A0A0F']} style={styles.header}>
        <TouchableOpacity onPress={handleDismiss} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isFromPending ? '🔔 New Transaction!' : 'Categorize'}</Text>
      </LinearGradient>

      {isFromPending && (
        <View style={styles.autoBadge}>
          <Text style={styles.autoBadgeText}>📲 Auto-detected from SMS</Text>
        </View>
      )}

      <LinearGradient colors={['#7C3AED', '#4F46E5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.transactionCard}>
        <Text style={styles.merchantName}>{merchant}</Text>
        <Text style={styles.amount}>₹{totalAmount.toFixed(2)}</Text>
        <Text style={styles.date}>{date ? new Date(parseInt(date)).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}</Text>
        {aiLoading ? (
          <View style={styles.aiLoading}>
            <ActivityIndicator size="small" color="white" />
            <Text style={styles.aiLoadingText}>🤖 AI is analyzing...</Text>
          </View>
        ) : selectedCategory ? (
          <View style={styles.aiSuggestion}>
            <Text style={styles.aiSuggestionText}>
              🤖 AI suggested: {selectedCategory}{selectedSub ? ` › ${selectedSub}` : ''}
            </Text>
          </View>
        ) : null}
      </LinearGradient>

      {/* Split Toggle */}
      <View style={styles.splitToggleContainer}>
        <TouchableOpacity style={[styles.splitToggle, splitEnabled && styles.splitToggleActive]} onPress={splitEnabled ? handleDisableSplit : handleEnableSplit}>
          <Text style={styles.splitToggleIcon}>✂️</Text>
          <View style={styles.splitToggleTextContainer}>
            <Text style={[styles.splitToggleText, splitEnabled && styles.splitToggleTextActive]}>Split Transaction</Text>
            <Text style={styles.splitToggleSubtext}>{splitEnabled ? 'Tap to disable' : 'Break into multiple items'}</Text>
          </View>
          <View style={[styles.splitToggleSwitch, splitEnabled && styles.splitToggleSwitchActive]}>
            <View style={[styles.splitToggleDot, splitEnabled && styles.splitToggleDotActive]} />
          </View>
        </TouchableOpacity>
      </View>

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
                <TextInput style={styles.splitAmountInput} value={String(split.amount)} onChangeText={(v) => updateSplitAmount(idx, v)} keyboardType="numeric" placeholderTextColor="#444" />
              </View>
              <View style={styles.splitRow}>
                <Text style={styles.splitLabel}>What for?</Text>
                <TextInput style={styles.splitDescInput} value={split.description} onChangeText={(v) => updateSplitDescription(idx, v)} placeholder="e.g. Cold drink..." placeholderTextColor="#444" />
              </View>
              <TouchableOpacity onPress={() => setActiveSplitIndex(activeSplitIndex === idx ? null : idx)} style={styles.splitCategoryToggle}>
                <Text style={styles.splitCategoryToggleText}>🏷️ {split.category || 'Pick category'} {activeSplitIndex === idx ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {activeSplitIndex === idx && (
                <View style={styles.splitCategoryGrid}>
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity key={cat.name} style={[styles.splitCategoryItem, split.category === cat.name && { borderColor: cat.color, borderWidth: 2, backgroundColor: cat.color + '20' }]}
                      onPress={() => { updateSplitCategory(idx, cat.name); setActiveSplitIndex(null); }}>
                      <Text style={styles.splitCategoryEmoji}>{cat.emoji}</Text>
                      <Text style={[styles.splitCategoryName, split.category === cat.name && { color: cat.color, fontWeight: 'bold' }]}>{cat.name}</Text>
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
          {/* Category Grid */}
          <Text style={styles.sectionTitle}>Where did you spend?</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity key={cat.name}
                style={[styles.categoryItem, selectedCategory === cat.name && { borderColor: cat.color, borderWidth: 2, backgroundColor: cat.color + '20' }]}
                onPress={() => handleCategorySelect(cat.name)}>
                <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                <Text style={[styles.categoryName, selectedCategory === cat.name && { color: cat.color, fontWeight: 'bold' }]}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Sub Categories */}
          {showSubCategories && (
            <View style={styles.subCatContainer}>
              <Text style={styles.subCatTitle}>
                {currentCat!.emoji} What type of {selectedCategory.toLowerCase()}?
              </Text>
              <View style={styles.subCatGrid}>
                {currentCat!.subs.map((sub) => (
                  <TouchableOpacity key={sub}
                    style={[styles.subCatItem, selectedSub === sub && { backgroundColor: currentCat!.color, borderColor: currentCat!.color }]}
                    onPress={() => handleSubSelect(sub)}>
                    <Text style={[styles.subCatText, selectedSub === sub && { color: 'white', fontWeight: 'bold' }]}>{sub}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Notes - always visible when a category is selected */}
          {selectedCategory && (
            <>
              <Text style={styles.sectionTitle}>
                {showNotesBox ? '📝 Please describe' : '📝 Add a note (optional)'}
              </Text>
              <TextInput
                style={styles.notesInput}
                placeholder={showNotesBox ? 'e.g. Maggi, Chips, Movie ticket...' : 'e.g. Lunch with friends...'}
                placeholderTextColor="#444"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
              />
            </>
          )}
        </>
      )}

      <TouchableOpacity style={styles.saveButtonContainer} onPress={handleSave}>
        <LinearGradient colors={['#7C3AED', '#4F46E5']} style={styles.saveButton}>
          <Text style={styles.saveButtonText}>
            {splitEnabled ? `✂️ Save ${splits.length} Split Items` : '💾 Save Transaction'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>

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
  header: { padding: 20, paddingTop: 55, flexDirection: 'row', alignItems: 'center' },
  backButton: { marginRight: 15 },
  backText: { color: '#7C3AED', fontSize: 16, fontWeight: 'bold' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: 'white' },
  autoBadge: { backgroundColor: '#7C3AED20', marginHorizontal: 20, padding: 10, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#7C3AED50', alignItems: 'center' },
  autoBadgeText: { color: '#7C3AED', fontSize: 13, fontWeight: 'bold' },
  transactionCard: { marginHorizontal: 20, padding: 25, borderRadius: 24, alignItems: 'center', elevation: 10, marginBottom: 10 },
  merchantName: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  amount: { fontSize: 40, fontWeight: 'bold', color: 'white', marginTop: 8 },
  date: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 5 },
  aiLoading: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 },
  aiLoadingText: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  aiSuggestion: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginTop: 12 },
  aiSuggestionText: { color: 'white', fontSize: 13 },
  splitToggleContainer: { marginHorizontal: 20, marginTop: 10, marginBottom: 5 },
  splitToggle: { backgroundColor: '#1a1a2e', padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ffffff08' },
  splitToggleActive: { borderColor: '#7C3AED', backgroundColor: '#7C3AED15' },
  splitToggleIcon: { fontSize: 24, marginRight: 12 },
  splitToggleTextContainer: { flex: 1 },
  splitToggleText: { color: '#999', fontSize: 15, fontWeight: 'bold' },
  splitToggleTextActive: { color: '#7C3AED' },
  splitToggleSubtext: { color: '#555', fontSize: 11, marginTop: 2 },
  splitToggleSwitch: { width: 44, height: 24, borderRadius: 12, backgroundColor: '#333', justifyContent: 'center', paddingHorizontal: 3 },
  splitToggleSwitchActive: { backgroundColor: '#7C3AED' },
  splitToggleDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#666' },
  splitToggleDotActive: { backgroundColor: 'white', alignSelf: 'flex-end' },
  splitSummary: { backgroundColor: '#1a1a2e', marginHorizontal: 20, padding: 12, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#ffffff08' },
  splitSummaryText: { color: '#aaa', fontSize: 13, textAlign: 'center' },
  splitCard: { backgroundColor: '#1a1a2e', marginHorizontal: 20, marginBottom: 10, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#ffffff08' },
  splitCardActive: { borderColor: '#7C3AED50' },
  splitCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  splitCardNumber: { color: '#7C3AED', fontSize: 14, fontWeight: 'bold' },
  removeSplitBtn: { backgroundColor: '#FF6B6B20', width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  removeSplitText: { color: '#FF6B6B', fontSize: 14, fontWeight: 'bold' },
  splitRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
  splitLabel: { color: '#666', fontSize: 13, width: 80 },
  splitAmountInput: { flex: 1, backgroundColor: '#0A0A0F', padding: 10, borderRadius: 10, color: 'white', fontSize: 16, fontWeight: 'bold', borderWidth: 1, borderColor: '#ffffff10' },
  splitDescInput: { flex: 1, backgroundColor: '#0A0A0F', padding: 10, borderRadius: 10, color: 'white', fontSize: 14, borderWidth: 1, borderColor: '#ffffff10' },
  splitCategoryToggle: { backgroundColor: '#0A0A0F', padding: 10, borderRadius: 10, marginTop: 4 },
  splitCategoryToggleText: { color: '#aaa', fontSize: 13 },
  splitCategoryGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 6 },
  splitCategoryItem: { backgroundColor: '#0A0A0F', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ffffff08', gap: 4 },
  splitCategoryEmoji: { fontSize: 14 },
  splitCategoryName: { fontSize: 11, color: '#888' },
  addSplitBtn: { marginHorizontal: 20, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#7C3AED50', borderStyle: 'dashed', alignItems: 'center', marginBottom: 10 },
  addSplitText: { color: '#7C3AED', fontSize: 14, fontWeight: 'bold' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginHorizontal: 20, marginTop: 20, marginBottom: 12, color: 'white' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 15 },
  categoryItem: { backgroundColor: '#1a1a2e', width: '28%', padding: 12, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: '#ffffff08', margin: 4 },
  categoryEmoji: { fontSize: 24 },
  categoryName: { fontSize: 11, color: '#888', marginTop: 5, textAlign: 'center' },

  // Sub Categories
  subCatContainer: { marginHorizontal: 20, marginTop: 5, backgroundColor: '#111118', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#ffffff08' },
  subCatTitle: { fontSize: 13, color: '#888', marginBottom: 12, fontWeight: 'bold' },
  subCatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  subCatItem: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#ffffff10' },
  subCatText: { fontSize: 13, color: '#888' },

  notesInput: { backgroundColor: '#1a1a2e', marginHorizontal: 20, padding: 15, borderRadius: 14, fontSize: 15, color: 'white', borderWidth: 1, borderColor: '#ffffff08', textAlignVertical: 'top', minHeight: 80 },
  saveButtonContainer: { marginHorizontal: 20, marginTop: 25, borderRadius: 14, overflow: 'hidden' },
  saveButton: { padding: 16, alignItems: 'center' },
  saveButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  skipButton: { marginHorizontal: 20, marginTop: 12, padding: 14, borderRadius: 14, alignItems: 'center' },
  skipButtonText: { color: '#666', fontSize: 14 },
});