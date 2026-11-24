import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DailyMoneyLesson, MarketQuiz, QuizOption } from '../types/market';

interface DailyMoneyLessonCardProps {
  lesson: DailyMoneyLesson | null;
  quiz: MarketQuiz | null;
  onExploreIndexFunds?: () => void;
}

export const DailyMoneyLessonCard: React.FC<DailyMoneyLessonCardProps> = ({
  lesson,
  quiz,
  onExploreIndexFunds,
}) => {
  const [lessonModalVisible, setLessonModalVisible] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [hasSubmittedQuiz, setHasSubmittedQuiz] = useState(false);

  if (!lesson && !quiz) return null;

  const handleSelectOption = (optionId: string) => {
    setSelectedOptionId(optionId);
    setHasSubmittedQuiz(true);
  };

  return (
    <View style={styles.container}>
      {/* 1. Today's Money Lesson */}
      {lesson && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.badgeRow}>
              <View style={styles.orangeDot} />
              <Text style={styles.eyebrow}>TODAY'S MONEY LESSON</Text>
            </View>

            <View style={styles.timePill}>
              <Ionicons name="time-outline" size={11} color="#64748B" />
              <Text style={styles.timeText}>{lesson.readTimeMinutes} min read</Text>
            </View>
          </View>

          <Text style={styles.lessonTitle}>{lesson.title}</Text>
          <Text style={styles.lessonSummary} numberOfLines={2}>
            {lesson.summary}
          </Text>

          <Pressable
            style={styles.learnBtn}
            onPress={() => setLessonModalVisible(true)}
          >
            <Ionicons name="book-outline" size={15} color="#FFFFFF" />
            <Text style={styles.learnBtnText}>Learn in 2 Minutes</Text>
            <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
          </Pressable>
        </View>
      )}

      {/* 2. Interactive Market Quiz */}
      {quiz && (
        <View style={[styles.card, styles.quizCard]}>
          <View style={styles.quizHeader}>
            <Ionicons name="help-circle" size={18} color="#3C3985" />
            <Text style={styles.quizBadgeText}>DAILY FINANCIAL CHECKPOINT</Text>
          </View>

          <Text style={styles.quizQuestion}>{quiz.question}</Text>

          <View style={styles.optionsList}>
            {quiz.options.map((opt: QuizOption) => {
              const isSelected = selectedOptionId === opt.id;
              let optionStyle: any = styles.optionItem;
              let textStyle: any = styles.optionText;

              if (hasSubmittedQuiz) {
                if (opt.isCorrect) {
                  optionStyle = [styles.optionItem, styles.optionCorrect];
                  textStyle = [styles.optionText, styles.optionTextCorrect];
                } else if (isSelected && !opt.isCorrect) {
                  optionStyle = [styles.optionItem, styles.optionIncorrect];
                  textStyle = [styles.optionText, styles.optionTextIncorrect];
                }
              }

              return (
                <Pressable
                  key={opt.id}
                  style={optionStyle}
                  onPress={() => handleSelectOption(opt.id)}
                  disabled={hasSubmittedQuiz}
                >
                  <View style={styles.optionCircle}>
                    {hasSubmittedQuiz && opt.isCorrect ? (
                      <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                    ) : hasSubmittedQuiz && isSelected && !opt.isCorrect ? (
                      <Ionicons name="close-circle" size={18} color="#EF4444" />
                    ) : (
                      <View style={[styles.innerCircle, isSelected && styles.innerCircleSelected]} />
                    )}
                  </View>
                  <Text style={textStyle}>{opt.text}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Explanation Banner when answered */}
          {hasSubmittedQuiz && (
            <View style={styles.explanationBox}>
              <View style={styles.explanationHeader}>
                <Ionicons name="sparkles" size={14} color="#3C3985" />
                <Text style={styles.explanationTitle}>FINANCIAL EXPLAINER</Text>
              </View>
              <Text style={styles.explanationBody}>{quiz.explanation}</Text>

              <View style={styles.takeawayRow}>
                <Text style={styles.takeawayText}>🎯 {quiz.educationalTakeaway}</Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Lesson Reader Modal */}
      {lesson && (
        <Modal
          visible={lessonModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setLessonModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <View style={styles.modalTopRow}>
                <View style={styles.lessonPill}>
                  <Text style={styles.lessonPillText}>{lesson.topic}</Text>
                </View>
                <Pressable onPress={() => setLessonModalVisible(false)} hitSlop={10}>
                  <Ionicons name="close" size={22} color="#102A54" />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 10 }}>
                <Text style={styles.modalTitle}>{lesson.title}</Text>
                <Text style={styles.modalReadTime}>⏱️ {lesson.readTimeMinutes} min read • Verified Financial Education</Text>

                {lesson.paragraphs.map((p: string, idx: number) => (
                  <Text key={idx} style={styles.modalParagraph}>
                    {p}
                  </Text>
                ))}

                <View style={styles.takeawaysContainer}>
                  <Text style={styles.takeawaysTitle}>📌 KEY TAKEAWAYS</Text>
                  {lesson.keyTakeaways.map((point: string, i: number) => (
                    <View key={i} style={styles.bulletRow}>
                      <Ionicons name="checkmark" size={14} color="#3C3985" />
                      <Text style={styles.bulletText}>{point}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.actionBox}>
                  <Text style={styles.actionTitle}>🚀 NEXT STEP</Text>
                  <Text style={styles.actionBody}>{lesson.actionItem}</Text>
                </View>

                <Text style={styles.modalSource}>Source: {lesson.source}</Text>
              </ScrollView>

              <Pressable
                style={styles.modalDoneBtn}
                onPress={() => {
                  setLessonModalVisible(false);
                  if (onExploreIndexFunds) onExploreIndexFunds();
                }}
              >
                <Text style={styles.modalDoneText}>Explore Relevant Funds</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    gap: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#102A54',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orangeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F7941E',
  },
  eyebrow: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#F7941E',
    letterSpacing: 1,
  },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
  },
  timeText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
  },
  lessonTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#102A54',
    lineHeight: 22,
    marginBottom: 6,
  },
  lessonSummary: {
    fontSize: 12.5,
    color: '#4A5568',
    lineHeight: 18,
    marginBottom: 14,
  },
  learnBtn: {
    backgroundColor: '#3C3985',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  learnBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
    marginLeft: 8,
  },
  quizCard: {
    backgroundColor: '#FAF5FF',
    borderColor: '#E9D5FF',
  },
  quizHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  quizBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7E22CE',
    letterSpacing: 0.8,
  },
  quizQuestion: {
    fontSize: 15,
    fontWeight: '800',
    color: '#102A54',
    lineHeight: 21,
    marginBottom: 14,
  },
  optionsList: {
    gap: 8,
    marginBottom: 12,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  optionCorrect: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  optionIncorrect: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  optionCircle: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#CBD5E0',
  },
  innerCircleSelected: {
    borderColor: '#3C3985',
    backgroundColor: '#3C3985',
  },
  optionText: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
    fontWeight: '600',
  },
  optionTextCorrect: {
    color: '#065F46',
    fontWeight: '700',
  },
  optionTextIncorrect: {
    color: '#991B1B',
  },
  explanationBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D8B4FE',
    marginTop: 4,
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  explanationTitle: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#3C3985',
    letterSpacing: 0.8,
  },
  explanationBody: {
    fontSize: 12.5,
    color: '#334155',
    lineHeight: 18,
    marginBottom: 8,
  },
  takeawayRow: {
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F3E8FF',
  },
  takeawayText: {
    fontSize: 11,
    color: '#7E22CE',
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(16, 42, 84, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxHeight: '85%',
  },
  modalTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  lessonPill: {
    backgroundColor: '#EBEBFA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  lessonPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#3C3985',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#102A54',
    lineHeight: 24,
    marginBottom: 4,
  },
  modalReadTime: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 14,
  },
  modalParagraph: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 21,
    marginBottom: 12,
  },
  takeawaysContainer: {
    backgroundColor: '#F8F9FD',
    borderRadius: 14,
    padding: 14,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  takeawaysTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#3C3985',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  bulletText: {
    flex: 1,
    fontSize: 12.5,
    color: '#334155',
    lineHeight: 18,
    fontWeight: '500',
  },
  actionBox: {
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  actionTitle: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#EA580C',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  actionBody: {
    fontSize: 12,
    color: '#9A3412',
    lineHeight: 17,
    fontWeight: '600',
  },
  modalSource: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 6,
    fontStyle: 'italic',
  },
  modalDoneBtn: {
    backgroundColor: '#3C3985',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  modalDoneText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
});
