import React, { useState } from 'react';
import { SafeAreaView, View, Text, Pressable, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { styles } from '../theme/styles';
import { Screen } from '../types';
import { authStore } from '../store/auth';

import { useNavigation } from '@react-navigation/native';

const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'हिंदी', native: 'Hindi' },
  { code: 'mr', label: 'मराठी', native: 'Marathi' },
];

export const LanguageScreen = () => {
  const navigation = useNavigation<any>();
  const [selected, setSelected] = useState<string | null>(null);

  const handleContinue = () => {
    if (selected) {
      authStore.language = selected;
      navigation.navigate('Welcome');
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: '#F8F9FB' }]}>
      <StatusBar style="dark" />
      <View style={langStyles.container}>
        <Text style={langStyles.title}>आपली गुंतवणूक, आपल्या भाषेत</Text>
        <Text style={langStyles.subtitle}>Choose your preferred language</Text>
        
        <View style={langStyles.optionsContainer}>
          {LANGUAGES.map((lang) => (
            <Pressable 
              key={lang.code}
              style={[
                langStyles.card,
                selected === lang.code && langStyles.cardSelected
              ]}
              onPress={() => setSelected(lang.code)}
            >
              <Text style={langStyles.icon}>🇮🇳</Text>
              <View style={langStyles.textContainer}>
                <Text style={[langStyles.label, selected === lang.code && langStyles.textSelected]}>{lang.label}</Text>
                <Text style={langStyles.native}>{lang.native}</Text>
              </View>
              {selected === lang.code && <View style={langStyles.radioSelected} />}
            </Pressable>
          ))}
        </View>

        <Pressable 
          style={[styles.primaryButton, !selected && styles.primaryDisabled]} 
          onPress={handleContinue} 
          disabled={!selected}
        >
          <Text style={styles.primaryText}>Continue / पुढे जा</Text>
          <Text style={styles.primaryText}>→</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const langStyles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#102A54',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#4A5568',
    marginBottom: 40,
    textAlign: 'center',
  },
  optionsContainer: {
    gap: 16,
    marginBottom: 40,
  },
  card: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardSelected: {
    borderColor: '#1653B0',
    backgroundColor: '#F0F5FF',
  },
  icon: {
    fontSize: 28,
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 20,
    fontWeight: '700',
    color: '#102A54',
  },
  native: {
    fontSize: 14,
    color: '#718096',
    marginTop: 2,
  },
  textSelected: {
    color: '#1653B0',
  },
  radioSelected: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1653B0',
    borderWidth: 6,
    borderColor: '#D4E2F9',
  }
});
