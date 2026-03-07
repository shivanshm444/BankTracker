import { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Dimensions, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { useTransactions } from '../context/TransactionContext';
import { PieChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';

const screenWidth = Dimensions.get('window').width;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const CATEGORY_COLORS: { [key: string]: string } = {
  Food: '#FF6B6B',
  Shopping: '#4ECDC4',
  Travel: '#45B7D1',
  Fuel: '#F39C12',
  Entertainment: '#9B59B6',
  Groceries: '#2ECC71',
  Health: '#E74C3C',
  Rent: '#3498DB',
  Education: '#1ABC9C',
  Other: '#95A5A6',
};

// Generate last 12 months for picker
const generateMonthOptions = () => {
  const now = new Date();
  const options = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      month: d.getMonth(),
      year: d.getFullYear(),
      label: MONTHS[d.getMonth()],
      yearLabel: d.getFullYear().toString(),
      start: d.getTime(),
      end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).getTime(),
    });
  }
  return options;
};

const getSpendingPersonality = (categories: { [key: string]: number }) => {
  const sorted = Object.entries(categories).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return { title: 'Mystery Spender 🕵️', desc: 'Categorize transactions to reveal your spending personality!' };
  const top = sorted[0][0];
  if (top === 'Food') return { title: 'Foodie 🍕', desc: 'You love food! Most of your spending goes to eating out.' };
  if (top === 'Shopping') return { title: 'Shopaholic 🛒', desc: 'Retail therapy is your thing! You spend most on shopping.' };
  if (top === 'Entertainment') return { title: 'Entertainment Lover 🎬', desc: 'Movies, music and fun — that is your life!' };
  if (top === 'Fuel') return { title: 'Road Warrior ⛽', desc: 'Always on the move! Fuel is your biggest expense.' };
  if (top === 'Groceries') return { title: 'Home Chef 🏪', desc: 'You prefer cooking at home. Smart spender!' };
  if (top === 'Rent') return { title: 'Homebody 🏠', desc: 'Home is where the heart is — and most of your money!' };
  return { title: 'Balanced Spender 💳', desc: 'You spend wisely across different categories!' };
};

export default function DashboardScreen() {
  const router = useRouter();
  const { transactions } = useTransactions();

  const monthOptions = generateMonthOptions();
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].key);
  const currentMonthData = monthOptions.find(m => m.key === selectedMonth)!;

  // Filter transactions to selected month
  const filteredTransactions = transactions.filter(t => {
    const tDate = parseInt(t.date);
    return !isNaN(tDate) && tDate >= currentMonthData.start && tDate <= currentMonthData.end;
  });

  const totalSpent = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
  const annotated = filteredTransactions.filter(t => t.category).length;
  const avgPerTransaction = filteredTransactions.length > 0 ? totalSpent / filteredTransactions.length : 0;

  // Days in selected month that have passed
  const now = new Date();
  const isCurrentMonth = currentMonthData.month === now.getMonth() && currentMonthData.year === now.getFullYear();
  const daysElapsed = isCurrentMonth ? now.getDate() : new Date(currentMonthData.year, currentMonthData.month + 1, 0).getDate();
  const dailyAvg = daysElapsed > 0 ? totalSpent / daysElapsed : 0;

  const categoryTotals: { [key: string]: number } = {};
  filteredTransactions.forEach(t => {
    if (t.category) {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    }
  });

  const pieData = Object.entries(categoryTotals).map(([name, amount]) => ({
    name,
    amount,
    color: CATEGORY_COLORS[name] || '#95A5A6',
    legendFontColor: '#888',
    legendFontSize: 11,
  }));

  const personality = getSpendingPersonality(categoryTotals);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />

      {/* Header */}
      <LinearGradient colors={['#1a0533', '#0A0A0F']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dashboard</Text>
      </LinearGradient>

      {/* Month Picker */}
      <View style={styles.monthPickerContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthPickerScroll}>
          {monthOptions.map((m) => {
            const isSelected = m.key === selectedMonth;
            return (
              <TouchableOpacity
                key={m.key}
                style={[styles.monthChip, isSelected && styles.monthChipSelected]}
                onPress={() => setSelectedMonth(m.key)}>
                <Text style={[styles.monthChipText, isSelected && styles.monthChipTextSelected]}>
                  {m.label}
                </Text>
                <Text style={[styles.monthChipYear, isSelected && styles.monthChipYearSelected]}>
                  {m.yearLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryEmoji}>💸</Text>
          <Text style={styles.summaryAmount}>₹{totalSpent.toFixed(0)}</Text>
          <Text style={styles.summaryLabel}>Total Spent</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryEmoji}>🏷️</Text>
          <Text style={styles.summaryAmount}>{annotated}/{filteredTransactions.length}</Text>
          <Text style={styles.summaryLabel}>Categorized</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryEmoji}>📅</Text>
          <Text style={styles.summaryAmount}>{MONTHS[currentMonthData.month]}</Text>
          <Text style={styles.summaryLabel}>{currentMonthData.year}</Text>
        </View>
      </View>

      {/* Extra Stats Row */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryEmoji}>📊</Text>
          <Text style={styles.summaryAmount}>₹{avgPerTransaction.toFixed(0)}</Text>
          <Text style={styles.summaryLabel}>Avg / Txn</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryEmoji}>📆</Text>
          <Text style={styles.summaryAmount}>₹{dailyAvg.toFixed(0)}</Text>
          <Text style={styles.summaryLabel}>Daily Avg</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryEmoji}>🔢</Text>
          <Text style={styles.summaryAmount}>{Object.keys(categoryTotals).length}</Text>
          <Text style={styles.summaryLabel}>Categories</Text>
        </View>
      </View>

      {/* Spending Personality */}
      <LinearGradient
        colors={['#7C3AED', '#4F46E5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.personalityCard}>
        <Text style={styles.personalityLabel}>
          {MONTHS[currentMonthData.month]} Spending Personality
        </Text>
        <Text style={styles.personalityTitle}>{personality.title}</Text>
        <Text style={styles.personalityDesc}>{personality.desc}</Text>
      </LinearGradient>


      {/* Pie Chart */}
      {pieData.length > 0 ? (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>
            {MONTHS[currentMonthData.month]} Spending by Category
          </Text>
          <PieChart
            data={pieData}
            width={screenWidth - 40}
            height={200}
            chartConfig={{
              color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              backgroundColor: '#1a1a2e',
            }}
            accessor="amount"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute={false}
          />
        </View>
      ) : (
        <View style={styles.emptyChart}>
          <Text style={styles.emptyChartEmoji}>📊</Text>
          <Text style={styles.emptyChartText}>
            {filteredTransactions.length === 0
              ? `No transactions in ${MONTHS[currentMonthData.month]}`
              : 'Categorize transactions to see chart!'}
          </Text>
        </View>
      )}

      {/* Category Breakdown */}
      <Text style={styles.sectionTitle}>Category Breakdown</Text>
      {Object.entries(categoryTotals).length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No categories yet</Text>
          <Text style={styles.emptySubText}>Go back and categorize your transactions!</Text>
        </View>
      ) : (
        Object.entries(categoryTotals)
          .sort((a, b) => b[1] - a[1])
          .map(([category, amount]) => (
            <View key={category} style={styles.categoryRow}>
              <View style={[styles.categoryDot, { backgroundColor: CATEGORY_COLORS[category] || '#95A5A6' }]} />
              <Text style={styles.categoryName}>{category}</Text>
              <View style={styles.categoryBarContainer}>
                <View style={[styles.categoryBar, {
                  width: `${(amount / totalSpent) * 100}%`,
                  backgroundColor: CATEGORY_COLORS[category] || '#95A5A6'
                }]} />
              </View>
              <Text style={styles.categoryAmount}>₹{amount.toFixed(0)}</Text>
            </View>
          ))
      )}

      {/* Top Merchants */}
      <Text style={styles.sectionTitle}>Top Merchants</Text>
      {filteredTransactions.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No transactions</Text>
          <Text style={styles.emptySubText}>Transactions will appear here after detection</Text>
        </View>
      ) : (
        (() => {
          const merchantTotals: { [key: string]: { amount: number; count: number } } = {};
          filteredTransactions.forEach(t => {
            if (!merchantTotals[t.merchant]) merchantTotals[t.merchant] = { amount: 0, count: 0 };
            merchantTotals[t.merchant].amount += t.amount;
            merchantTotals[t.merchant].count += 1;
          });
          return Object.entries(merchantTotals)
            .sort((a, b) => b[1].amount - a[1].amount)
            .slice(0, 5)
            .map(([merchant, data]) => (
              <View key={merchant} style={styles.merchantRow}>
                <Text style={styles.merchantIcon}>🏪</Text>
                <View style={styles.merchantInfo}>
                  <Text style={styles.merchantName}>{merchant}</Text>
                  <Text style={styles.merchantCount}>{data.count} transaction{data.count > 1 ? 's' : ''}</Text>
                </View>
                <Text style={styles.merchantAmount}>₹{data.amount.toFixed(0)}</Text>
              </View>
            ));
        })()
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

  // Month Picker
  monthPickerContainer: { marginTop: 10, marginBottom: 5 },
  monthPickerScroll: { paddingHorizontal: 16, gap: 8 },
  monthChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#ffffff10',
    alignItems: 'center',
    minWidth: 65,
  },
  monthChipSelected: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  monthChipText: { fontSize: 14, fontWeight: 'bold', color: '#888' },
  monthChipTextSelected: { color: 'white' },
  monthChipYear: { fontSize: 10, color: '#555', marginTop: 1 },
  monthChipYearSelected: { color: 'rgba(255,255,255,0.7)' },

  summaryRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 12,
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    padding: 15,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffffff08',
  },
  summaryEmoji: { fontSize: 24 },
  summaryAmount: { fontSize: 16, fontWeight: 'bold', color: 'white', marginTop: 5 },
  summaryLabel: { fontSize: 11, color: '#555', marginTop: 3 },
  personalityCard: {
    margin: 20,
    padding: 22,
    borderRadius: 24,
    elevation: 10,
  },
  personalityLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  personalityTitle: { fontSize: 26, fontWeight: 'bold', color: 'white', marginTop: 5 },
  personalityDesc: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 8, lineHeight: 20 },
  chartCard: {
    backgroundColor: '#1a1a2e',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ffffff08',
  },
  chartTitle: { fontSize: 16, fontWeight: 'bold', color: 'white', marginBottom: 10 },
  emptyChart: {
    backgroundColor: '#1a1a2e',
    marginHorizontal: 20,
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffffff08',
  },
  emptyChartEmoji: { fontSize: 40, marginBottom: 10 },
  emptyChartText: { color: '#555', fontSize: 14 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 20,
    marginTop: 25,
    marginBottom: 12,
    color: 'white',
  },
  emptyBox: {
    backgroundColor: '#1a1a2e',
    marginHorizontal: 20,
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffffff08',
  },
  emptyText: { color: '#888', fontSize: 16, fontWeight: 'bold' },
  emptySubText: { color: '#555', fontSize: 13, marginTop: 5 },
  categoryRow: {
    backgroundColor: '#1a1a2e',
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 15,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffffff08',
  },
  categoryDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  categoryName: { fontSize: 14, fontWeight: 'bold', color: 'white', width: 100 },
  categoryBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: '#0A0A0F',
    borderRadius: 3,
    marginHorizontal: 10,
  },
  categoryBar: { height: 6, borderRadius: 3 },
  categoryAmount: { fontSize: 13, fontWeight: 'bold', color: '#7C3AED' },

  // Top Merchants
  merchantRow: {
    backgroundColor: '#1a1a2e',
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 15,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffffff08',
  },
  merchantIcon: { fontSize: 20, marginRight: 12 },
  merchantInfo: { flex: 1 },
  merchantName: { fontSize: 14, fontWeight: 'bold', color: 'white' },
  merchantCount: { fontSize: 11, color: '#555', marginTop: 2 },
  merchantAmount: { fontSize: 14, fontWeight: 'bold', color: '#FF6B6B' },

});