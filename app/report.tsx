import { useState, useEffect } from 'react';
import {
    StyleSheet, Text, View, ScrollView, TouchableOpacity,
    ActivityIndicator, StatusBar, Alert, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTransactions } from '../context/TransactionContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { StorageAccessFramework, readAsStringAsync, writeAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import { ANTHROPIC_API_KEY } from '../config';

// ── Helpers ───────────────────────────────────────────────

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function getCurrentMonthLabel() {
    const d = new Date();
    return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// ── Claude API call ───────────────────────────────────────

async function generateReport(userDataPrompt: string): Promise<string> {
    const systemPrompt = `You are a financial spending analyst. Analyze the user's monthly transaction data and generate a clear spending report. Generate a report with these sections:
1. Monthly Summary - Total spent and most expensive category
2. Top Spending Categories - Top 3 categories with percentages
3. Budget Status - Categories exceeded or close to limit
4. Spending Behavior Insight - Patterns like frequent food orders
5. Simple Advice - 2-3 practical suggestions
Keep it short, clear and helpful. Do not repeat raw data. Use plain text with section headers marked with "##". Do not use markdown bold (**) or bullet symbols — use simple dashes for lists.`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            system: systemPrompt,
            messages: [{ role: 'user', content: userDataPrompt }],
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`API ${res.status}: ${err}`);
    }

    const data = await res.json();
    return data?.content?.[0]?.text ?? 'No report generated.';
}

// ── Parse AI response into sections ───────────────────────

interface Section { title: string; body: string }

function parseSections(raw: string): Section[] {
    // Split on lines starting with "## "
    const parts = raw.split(/\n(?=## )/);
    const sections: Section[] = [];

    for (const part of parts) {
        const lines = part.trim().split('\n');
        if (lines.length === 0) continue;
        const first = lines[0].replace(/^#{1,3}\s*/, '').trim();
        const body = lines.slice(1).join('\n').trim();
        if (first) sections.push({ title: first, body });
    }

    if (sections.length === 0) {
        sections.push({ title: 'Spending Report', body: raw.trim() });
    }
    return sections;
}

// ── Build PDF HTML ────────────────────────────────────────

function buildPdfHtml(sections: Section[], monthLabel: string): string {
    const sectionHtml = sections.map(s => `
    <div class="section">
      <h2>${s.title}</h2>
      <p>${s.body.replace(/\n/g, '<br/>')}</p>
    </div>
  `).join('');

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; color: #1a1a2e; padding: 40px; background: #fff; }
  .header { text-align: center; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 3px solid #7C3AED; }
  .logo { font-size: 28px; font-weight: 700; color: #7C3AED; }
  .subtitle { font-size: 14px; color: #666; margin-top: 4px; }
  .month-badge { display: inline-block; background: #7C3AED; color: #fff; padding: 6px 18px; border-radius: 20px; font-size: 13px; font-weight: 600; margin-top: 12px; }
  .section { margin-bottom: 24px; padding: 20px; background: #f8f7ff; border-radius: 12px; border-left: 4px solid #7C3AED; }
  .section h2 { font-size: 16px; color: #7C3AED; margin-bottom: 10px; font-weight: 700; }
  .section p { font-size: 13px; line-height: 1.7; color: #333; }
  .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #eee; font-size: 11px; color: #999; }
  .footer span { color: #7C3AED; font-weight: 600; }
</style>
</head>
<body>
  <div class="header">
    <div class="logo">💰 Spendly</div>
    <div class="subtitle">AI-Powered Spending Report</div>
    <div class="month-badge">${monthLabel}</div>
  </div>
  ${sectionHtml}
  <div class="footer">
    Generated on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} &bull; Powered by <span>Spendly</span>
  </div>
</body>
</html>`;
}

// ── Screen Component ──────────────────────────────────────

export default function ReportScreen() {
    const router = useRouter();
    const { transactions, budgets } = useTransactions();

    const [loading, setLoading] = useState(true);
    const [reportText, setReportText] = useState('');
    const [sections, setSections] = useState<Section[]>([]);
    const [pdfBusy, setPdfBusy] = useState(false);

    const monthLabel = getCurrentMonthLabel();

    // ── Build data summary for Claude ──
    const buildUserPrompt = () => {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

        const monthly = transactions.filter(t => {
            const d = parseInt(t.date);
            return !isNaN(d) && d >= monthStart && d <= monthEnd;
        });

        const total = monthly.reduce((s, t) => s + t.amount, 0);

        const catTotals: Record<string, number> = {};
        monthly.forEach(t => {
            if (t.category) catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
        });

        const merchantTotals: Record<string, { amount: number; count: number }> = {};
        monthly.forEach(t => {
            if (!merchantTotals[t.merchant]) merchantTotals[t.merchant] = { amount: 0, count: 0 };
            merchantTotals[t.merchant].amount += t.amount;
            merchantTotals[t.merchant].count += 1;
        });
        const topMerchants = Object.entries(merchantTotals).sort((a, b) => b[1].amount - a[1].amount).slice(0, 5);

        const budgetLines = Object.entries(budgets)
            .filter(([, v]) => parseFloat(v) > 0)
            .map(([cat, v]) => {
                const spent = catTotals[cat] || 0;
                return `${cat}: budget ₹${v}, spent ₹${spent.toFixed(0)}`;
            });

        return `Month: ${monthLabel}
Total transactions: ${monthly.length}
Total spent: ₹${total.toFixed(0)}

Category totals:
${Object.entries(catTotals).sort((a, b) => b[1] - a[1]).map(([c, a]) => `- ${c}: ₹${a.toFixed(0)} (${((a / total) * 100).toFixed(1)}%)`).join('\n')}

Top merchants:
${topMerchants.map(([m, d]) => `- ${m}: ₹${d.amount.toFixed(0)} (${d.count} txn)`).join('\n')}

Budgets:
${budgetLines.length > 0 ? budgetLines.join('\n') : 'No budgets set'}`;
    };

    useEffect(() => {
        (async () => {
            try {
                const prompt = buildUserPrompt();
                const raw = await generateReport(prompt);
                setReportText(raw);
                setSections(parseSections(raw));
            } catch (e: any) {
                console.log('Report generation error:', e);
                Alert.alert('Error', e.message || 'Failed to generate report');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // ── PDF Export (save directly to Downloads) ──
    const handleDownloadPdf = async () => {
        if (!reportText) return;
        setPdfBusy(true);
        try {
            const html = buildPdfHtml(sections, monthLabel);
            const { uri } = await Print.printToFileAsync({ html, base64: false });

            if (Platform.OS === 'android') {
                // Request access to a directory via SAF
                const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
                if (!permissions.granted) {
                    Alert.alert('Permission Denied', 'Storage access is needed to save the PDF.');
                    return;
                }

                // Read the generated PDF as base64
                const pdfBase64 = await readAsStringAsync(uri, {
                    encoding: EncodingType.Base64,
                });

                const fileName = `Spendly_Report_${monthLabel.replace(/\s/g, '_')}.pdf`;

                // Create file in the user-selected directory
                const newFileUri = await StorageAccessFramework.createFileAsync(
                    permissions.directoryUri,
                    fileName,
                    'application/pdf'
                );

                // Write PDF content
                await writeAsStringAsync(newFileUri, pdfBase64, {
                    encoding: EncodingType.Base64,
                });

                Alert.alert('✅ Saved!', `Report saved as ${fileName}`);
            } else {
                // iOS fallback: use share sheet
                await Sharing.shareAsync(uri, {
                    mimeType: 'application/pdf',
                    dialogTitle: 'Save or Share your Spendly Report',
                    UTI: 'com.adobe.pdf',
                });
            }
        } catch (e: any) {
            Alert.alert('PDF Error', e.message || 'Could not generate PDF');
        } finally {
            setPdfBusy(false);
        }
    };

    const handleShare = async () => {
        if (!reportText) return;
        setPdfBusy(true);
        try {
            const html = buildPdfHtml(sections, monthLabel);
            const { uri } = await Print.printToFileAsync({ html, base64: false });
            await Sharing.shareAsync(uri, {
                mimeType: 'application/pdf',
                dialogTitle: 'Share Spendly Report',
                UTI: 'com.adobe.pdf',
            });
        } catch (e: any) {
            Alert.alert('Share Error', e.message || 'Could not share report');
        } finally {
            setPdfBusy(false);
        }
    };

    // ── Section card emojis based on title keywords ──
    const sectionEmoji = (title: string) => {
        const t = title.toLowerCase();
        if (t.includes('summary')) return '📋';
        if (t.includes('categor')) return '📊';
        if (t.includes('budget')) return '🎯';
        if (t.includes('behavior') || t.includes('insight') || t.includes('pattern')) return '🔍';
        if (t.includes('advice') || t.includes('suggestion') || t.includes('tip')) return '💡';
        return '📄';
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />

            {/* Header */}
            <LinearGradient colors={['#1a0533', '#0A0A0F']} style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>📊 AI Spending Report</Text>
            </LinearGradient>

            {/* Month badge */}
            <View style={styles.monthBadge}>
                <LinearGradient colors={['#7C3AED', '#4F46E5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.monthGradient}>
                    <Text style={styles.monthText}>📅 {monthLabel}</Text>
                </LinearGradient>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#7C3AED" />
                    <Text style={styles.loadingText}>🤖 Analyzing your spending...</Text>
                    <Text style={styles.loadingSubText}>Claude AI is generating your report</Text>
                </View>
            ) : sections.length > 0 ? (
                <>
                    {sections.map((s, i) => (
                        <View key={i} style={styles.sectionCard}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionEmoji}>{sectionEmoji(s.title)}</Text>
                                <Text style={styles.sectionTitle}>{s.title}</Text>
                            </View>
                            <Text style={styles.sectionBody}>{s.body}</Text>
                        </View>
                    ))}
                </>
            ) : (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyEmoji}>📭</Text>
                    <Text style={styles.emptyText}>No report generated</Text>
                    <Text style={styles.emptySubText}>Make sure you have transactions this month</Text>
                </View>
            )}

            {/* Action Buttons — always visible after loading */}
            {!loading && (
                <View style={styles.actionsRow}>
                    <TouchableOpacity style={styles.actionBtnContainer} onPress={handleDownloadPdf} disabled={pdfBusy}>
                        <LinearGradient colors={['#7C3AED', '#4F46E5']} style={styles.actionBtn}>
                            {pdfBusy ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <Text style={styles.actionBtnText}>📄 Download PDF</Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionBtnContainer} onPress={handleShare} disabled={pdfBusy}>
                        <LinearGradient colors={['#4F46E5', '#3B82F6']} style={styles.actionBtn}>
                            <Text style={styles.actionBtnText}>📤 Share</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            )}

            <View style={{ height: 60 }} />
        </ScrollView>
    );
}

// ── Styles ────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A0A0F' },

    header: { padding: 20, paddingTop: 55, flexDirection: 'row', alignItems: 'center' },
    backButton: { marginRight: 15 },
    backText: { color: '#7C3AED', fontSize: 16, fontWeight: 'bold' },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: 'white' },

    monthBadge: { marginHorizontal: 20, marginTop: 10, marginBottom: 10, borderRadius: 20, overflow: 'hidden', alignSelf: 'flex-start' },
    monthGradient: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
    monthText: { color: 'white', fontSize: 14, fontWeight: '600' },

    // Loading
    loadingContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
    loadingText: { color: 'white', fontSize: 18, fontWeight: 'bold', marginTop: 20 },
    loadingSubText: { color: '#666', fontSize: 13, marginTop: 6 },

    // Section cards
    sectionCard: {
        backgroundColor: '#1a1a2e',
        marginHorizontal: 20,
        marginBottom: 14,
        padding: 20,
        borderRadius: 18,
        borderLeftWidth: 4,
        borderLeftColor: '#7C3AED',
        borderWidth: 1,
        borderColor: '#ffffff08',
    },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    sectionEmoji: { fontSize: 22, marginRight: 10 },
    sectionTitle: { fontSize: 17, fontWeight: 'bold', color: '#7C3AED', flex: 1 },
    sectionBody: { fontSize: 14, lineHeight: 22, color: '#ccc' },

    // Action buttons
    actionsRow: { flexDirection: 'row', marginHorizontal: 20, marginTop: 10, gap: 12 },
    actionBtnContainer: { flex: 1, borderRadius: 14, overflow: 'hidden' },
    actionBtn: { padding: 16, alignItems: 'center', borderRadius: 14 },
    actionBtnText: { color: 'white', fontSize: 15, fontWeight: 'bold' },

    // Empty state
    emptyContainer: { alignItems: 'center', paddingVertical: 60 },
    emptyEmoji: { fontSize: 50 },
    emptyText: { color: '#888', fontSize: 18, fontWeight: 'bold', marginTop: 12 },
    emptySubText: { color: '#555', fontSize: 13, marginTop: 6 },
});
