import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Trash2, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/colors';
import { BUDGET_LABELS, CATEGORIES, PRIORITY_LABELS, SEASON_LABELS } from '@/constants/categories';
import { useWishes } from '@/providers/WishProvider';
import { BudgetRange, WishCategory, WishPriority, WishSeason } from '@/types/wish';

const SEASON_OPTIONS: { key: WishSeason; label: string }[] = [
  { key: 'this_month', label: SEASON_LABELS.this_month },
  { key: 'next_month', label: SEASON_LABELS.next_month },
  { key: 'someday', label: SEASON_LABELS.someday },
];

const PRIORITY_OPTIONS: { key: WishPriority; label: string; color: string }[] = [
  { key: 'high', label: PRIORITY_LABELS.high, color: Colors.priorityColors.high },
  { key: 'mid', label: PRIORITY_LABELS.mid, color: Colors.priorityColors.mid },
  { key: 'low', label: PRIORITY_LABELS.low, color: Colors.priorityColors.low },
];

const BUDGET_OPTIONS: { key: BudgetRange; label: string }[] = Object.entries(BUDGET_LABELS).map(
  ([key, label]) => ({ key: key as BudgetRange, label }),
);

export default function EditWishScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { wishes, updateWish, deleteWish } = useWishes();

  const wish = wishes.find((w) => w.id === id);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<WishCategory | null>(null);
  const [season, setSeason] = useState<WishSeason>('someday');
  const [priority, setPriority] = useState<WishPriority>('mid');
  const [budgetRange, setBudgetRange] = useState<BudgetRange | null>(null);
  const [memo, setMemo] = useState('');

  useEffect(() => {
    if (wish) {
      setTitle(wish.title);
      setCategory(wish.category);
      setSeason(wish.season ?? 'someday');
      setPriority(wish.priority);
      setBudgetRange(wish.budgetRange);
      setMemo(wish.memo ?? '');
    }
  }, [wish]);

  const handleSave = useCallback(() => {
    if (!title.trim()) {
      Alert.alert('入力エラー', 'タイトルを入力してください');
      return;
    }
    if (!category) {
      Alert.alert('入力エラー', 'カテゴリを選択してください');
      return;
    }
    if (!id) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateWish(id, {
      title: title.trim(),
      category,
      season,
      priority,
      budgetRange,
      memo: memo.trim() || null,
    });
    router.back();
  }, [title, category, season, priority, budgetRange, memo, id, updateWish, router]);

  const handleDelete = useCallback(() => {
    if (!id) return;
    Alert.alert('削除確認', 'このやりたいことを削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          deleteWish(id);
          router.back();
        },
      },
    ]);
  }, [id, deleteWish, router]);

  if (!wish) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.closeBtn}>
            <X size={22} color={Colors.textSecondary} />
          </Pressable>
          <Text style={styles.headerTitle}>見つかりません</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>このやりたいことは見つかりませんでした</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn} testID="close-edit-wish">
          <X size={22} color={Colors.textSecondary} />
        </Pressable>
        <Text style={styles.headerTitle}>編集</Text>
        <Pressable onPress={handleSave} style={styles.saveBtn} testID="save-edit-wish">
          <Text style={styles.saveBtnText}>保存</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.field}>
            <Text style={styles.label}>タイトル *</Text>
            <TextInput
              style={styles.input}
              placeholder="例：岡山で桃太郎ぶどうを食べる"
              placeholderTextColor={Colors.textTertiary}
              value={title}
              onChangeText={setTitle}
              testID="edit-wish-title"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>カテゴリ *</Text>
            <View style={styles.optionGrid}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.key}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setCategory(cat.key);
                  }}
                  style={[
                    styles.optionChip,
                    category === cat.key && { backgroundColor: cat.color + '20', borderColor: cat.color },
                  ]}
                >
                  <Text
                    style={[
                      styles.optionChipText,
                      category === cat.key && { color: cat.color },
                    ]}
                  >
                    {cat.emoji} {cat.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>時期</Text>
            <View style={styles.optionRow}>
              {SEASON_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.key}
                  onPress={() => setSeason(opt.key)}
                  style={[
                    styles.optionPill,
                    season === opt.key && styles.optionPillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionPillText,
                      season === opt.key && styles.optionPillTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>優先度</Text>
            <View style={styles.optionRow}>
              {PRIORITY_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.key}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setPriority(opt.key);
                  }}
                  style={[
                    styles.optionPill,
                    priority === opt.key && { backgroundColor: opt.color, borderColor: opt.color },
                  ]}
                >
                  <Text
                    style={[
                      styles.optionPillText,
                      priority === opt.key && { color: '#fff' },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>予算</Text>
            <View style={styles.optionGrid}>
              {BUDGET_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.key}
                  onPress={() => setBudgetRange(budgetRange === opt.key ? null : opt.key)}
                  style={[
                    styles.optionChip,
                    budgetRange === opt.key && { backgroundColor: Colors.secondary + '20', borderColor: Colors.secondary },
                  ]}
                >
                  <Text
                    style={[
                      styles.optionChipText,
                      budgetRange === opt.key && { color: Colors.secondary },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>メモ</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="メモがあれば..."
              placeholderTextColor={Colors.textTertiary}
              value={memo}
              onChangeText={setMemo}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              testID="edit-wish-memo"
            />
          </View>

          <Pressable onPress={handleDelete} style={styles.deleteBtn} testID="delete-wish">
            <Trash2 size={18} color={Colors.error} />
            <Text style={styles.deleteBtnText}>削除する</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.borderLight,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  form: {
    padding: 20,
  },
  field: {
    marginBottom: 22,
  },
  label: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 14,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  optionChipText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionPill: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  optionPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  optionPillText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  optionPillTextActive: {
    color: '#fff',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: Colors.errorLight,
  },
  deleteBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.error,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
});
