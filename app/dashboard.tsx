import { StyleSheet, Text, View, ScrollView, Dimensions, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { useTransactions } from '../context/TransactionContext';
import { PieChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';

const screenWidth = Dimensions.get('window').width;

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

  const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
  const annotated = transactions.filter(t => t.category).length;

  const categoryTotals: { [key: string]: number } = {};
  transactions.forEach(t => {
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

      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryEmoji}>💸</Text>
          <Text style={styles.summaryAmount}>₹{totalSpent.toFixed(0)}</Text>
          <Text style={styles.summaryLabel}>Total Spent</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryEmoji}>🏷️</Text>
          <Text style={styles.summaryAmount}>{annotated}/{transactions.length}</Text>
          <Text style={styles.summaryLabel}>Categorized</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryEmoji}>📅</Text>
          <Text style={styles.summaryAmount}>{new Date().toLocaleString('en-IN', { month: 'short' })}</Text>
          <Text style={styles.summaryLabel}>This Month</Text>
        </View>
      </View>

      {/* Spending Personality */}
      <LinearGradient
        colors={['#7C3AED', '#4F46E5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.personalityCard}>
        <Text style={styles.personalityLabel}>Your Spending Personality</Text>
        <Text style={styles.personalityTitle}>{personality.title}</Text>
        <Text style={styles.personalityDesc}>{personality.desc}</Text>
      </LinearGradient>

      {/* Pie Chart */}
      {pieData.length > 0 ? (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Spending by Category</Text>
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
          <Text style={styles.emptyChartText}>Categorize transactions to see chart!</Text>
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
  summaryRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 20,
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
});