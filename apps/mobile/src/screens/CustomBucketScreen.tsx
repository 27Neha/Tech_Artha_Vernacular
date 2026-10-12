import React, { useState } from 'react';
import { SafeAreaView, View, Text, TextInput, Pressable, StyleSheet, Alert, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { styles } from '../theme/styles';
import { api } from '../services/api/client';

export const CustomBucketScreen = () => {
  const navigation = useNavigation<any>();
  const [funds, setFunds] = useState([{ schemeCode: 120503, allocation: 50 }, { schemeCode: 119598, allocation: 50 }]);

  const totalAllocation = funds.reduce((acc, curr) => acc + curr.allocation, 0);

  const handleSave = async () => {
    if (totalAllocation !== 100) {
      Alert.alert('Invalid Allocation', 'Total allocation must be exactly 100%.');
      return;
    }
    try {
      await api.post('/buckets/custom', { funds });
      Alert.alert('Success', 'Custom bucket saved successfully!');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', 'Failed to save custom bucket.');
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: '#F8F9FB' }]}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 40 }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: '#102A54', marginBottom: 16 }}>
          Custom Bucket Builder
        </Text>
        <Text style={{ fontSize: 16, color: '#4A5568', marginBottom: 24 }}>
          Allocate your investment across specific funds.
        </Text>

        {funds.map((f, i) => (
          <View key={i} style={localStyles.card}>
            <Text style={{ fontWeight: '700', marginBottom: 8 }}>Scheme Code: {f.schemeCode}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text>Allocation %: </Text>
              <TextInput 
                style={localStyles.input} 
                keyboardType="numeric" 
                value={String(f.allocation)} 
                onChangeText={(val) => {
                  const num = Number(val);
                  const newFunds = [...funds];
                  newFunds[i].allocation = num;
                  setFunds(newFunds);
                }} 
              />
            </View>
          </View>
        ))}

        <Text style={{ fontWeight: 'bold', fontSize: 18, marginVertical: 16, color: totalAllocation === 100 ? 'green' : 'red' }}>
          Total Allocation: {totalAllocation}%
        </Text>

        <Pressable 
          style={[styles.primaryButton, totalAllocation !== 100 && styles.primaryDisabled]} 
          onPress={handleSave}
          disabled={totalAllocation !== 100}
        >
          <Text style={styles.primaryText}>Save Bucket</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const localStyles = StyleSheet.create({
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, width: 80, marginLeft: 8 }
});
