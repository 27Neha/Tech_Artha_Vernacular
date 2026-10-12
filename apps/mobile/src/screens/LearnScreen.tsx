import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { api } from '../services/api/client';
import { useTranslation } from '../i18n/TranslationContext';
import { styles } from '../theme/styles';

/**
 * GET /learning?locale=xx, POST /learning/:lessonKey/complete.
 * Locale follows the language chosen on the first screen, which is the whole point of
 * a vernacular product - the API already serves localised lesson content.
 */
type Lesson = {
  key: string;
  title: string;
  summary?: string;
  durationMinutes?: number;
  completed?: boolean;
};

type LearningResponse = { lessons?: Lesson[]; locale?: string } | Lesson[];

export const LearnScreen = () => {
  const { lang } = useTranslation();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const response = await api.get<LearningResponse>(`/learning?locale=${lang}`);
      // The endpoint has returned both a bare array and a wrapped object across versions.
      setLessons(Array.isArray(response) ? response : (response.lessons ?? []));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load lessons.');
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    void load();
  }, [load]);

  const complete = async (lesson: Lesson) => {
    try {
      await api.post(`/learning/${encodeURIComponent(lesson.key)}/complete`, {});
      setLessons((current) => current.map((l) => (l.key === lesson.key ? { ...l, completed: true } : l)));
    } catch (e) {
      Alert.alert('Could not save progress', e instanceof Error ? e.message : 'Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={styles.page}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.title}>Learn</Text>
      <Text style={styles.description}>Short lessons in simple language, before you invest.</Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {lessons.length === 0 && !error ? (
        <Text style={styles.description}>No lessons are available yet.</Text>
      ) : null}

      {lessons.map((lesson) => (
        <Pressable key={lesson.key} style={styles.learningCard} onPress={() => void complete(lesson)}>
          <Text style={styles.cardIcon}>{lesson.completed ? '✅' : '📘'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{lesson.title}</Text>
            {lesson.summary ? <Text style={styles.cardSub}>{lesson.summary}</Text> : null}
            {lesson.durationMinutes ? (
              <Text style={styles.cardSub}>{lesson.durationMinutes} min read</Text>
            ) : null}
          </View>
          <Text style={styles.arrow}>›</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
};
