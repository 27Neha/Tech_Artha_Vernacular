import React, { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, ScrollView, Image } from 'react-native';
import { styles } from '../theme/styles';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface HeaderProps {
  title?: string;
  back?: string;
  onBack?: () => void;
}

const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिंदी' },
  { code: 'mr', label: 'Marathi', native: 'मराठी' },
  { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം' },
  { code: 'pa', label: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'as', label: 'Assamese', native: 'অসমীয়া' },
];

export const Header = ({ title, back, onBack }: HeaderProps) => {
  const { i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  
  const currentLangCode = i18n.language || 'en';
  const currentLangObj = LANGUAGES.find(l => l.code === currentLangCode) || LANGUAGES[0];

  const handleLanguageSelect = async (code: string) => {
    setModalVisible(false);
    try {
      await i18n.changeLanguage(code);
      await AsyncStorage.setItem('language', code);
    } catch (e) {
      console.log('AsyncStorage error', e);
    }
  };

  return (
    <View style={[styles.header, { paddingTop: Math.max(insets.top, 16), height: 62 + Math.max(insets.top, 16), backgroundColor: 'transparent', borderBottomWidth: 0 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={10} style={{ marginRight: 8, paddingHorizontal: 4 }}>
            <Text style={{ fontSize: 32, color: '#102A54', fontWeight: '300', marginTop: -4 }}>‹</Text>
          </Pressable>
        ) : null}
        <Image source={require('../../assets/logo.png')} style={{ height: 28, width: 120 }} resizeMode="contain" />
      </View>
      
      <View style={{ flex: 1, justifyContent: 'center' }} />

      <Pressable onPress={() => setModalVisible(true)} hitSlop={10} style={{ padding: 4 }}>
        <Text style={styles.language}>{currentLangObj.label}</Text>
      </Pressable>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={localStyles.overlay} onPress={() => setModalVisible(false)}>
          <View style={localStyles.modalContent}>
            <Text style={localStyles.modalTitle}>Select Language</Text>
            <ScrollView style={localStyles.scrollView}>
              {LANGUAGES.map((lang) => {
                 const isSelected = currentLangCode === lang.code;
                 return (
                   <Pressable 
                     key={lang.code}
                     style={[localStyles.langRow, isSelected && localStyles.langRowSelected]}
                     onPress={() => handleLanguageSelect(lang.code)}
                   >
                     <View style={localStyles.radioContainer}>
                       <View style={[localStyles.radio, isSelected && localStyles.radioSelected]} />
                     </View>
                     <View style={localStyles.langTextContainer}>
                       <Text style={[localStyles.nativeText, isSelected && localStyles.textSelected]}>{lang.native}</Text>
                       <Text style={[localStyles.labelText, isSelected && localStyles.textSelected]}>{lang.label}</Text>
                     </View>
                   </Pressable>
                 );
               })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const localStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', maxHeight: '80%', backgroundColor: '#fff', borderRadius: 16, padding: 20, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#102A54', marginBottom: 16, textAlign: 'center' },
  scrollView: { width: '100%' },
  langRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 8, backgroundColor: '#F8F9FB' },
  langRowSelected: { backgroundColor: '#EBEBFA', borderWidth: 1, borderColor: '#3C3985' },
  radioContainer: { marginRight: 16 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#CBD5E0' },
  radioSelected: { borderColor: '#3C3985', backgroundColor: '#3C3985' },
  langTextContainer: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  nativeText: { fontSize: 16, fontWeight: '700', color: '#102A54', width: 110 },
  labelText: { fontSize: 14, color: '#718096' },
  textSelected: { color: '#3C3985' }
});
