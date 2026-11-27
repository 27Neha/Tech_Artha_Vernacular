import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * A single-choice picker for an investor declaration. It starts with nothing selected
 * and offers no default: every value it captures has to be the investor's own answer
 * (Cybrilla compliance point 11), so `value` is null until they choose.
 */
export const ChoiceChips = <T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
}) => (
  <View style={styles.row}>
    {options.map((option) => {
      const selected = value === option.value;
      return (
        <Pressable
          key={option.value}
          onPress={() => onChange(option.value)}
          style={[styles.chip, selected && styles.chipSelected]}
          accessibilityRole="radio"
          accessibilityState={{ selected }}
        >
          <Text style={selected ? styles.textSelected : styles.text}>{option.label}</Text>
        </Pressable>
      );
    })}
  </View>
);

/** Cybrilla's belongs_to values, for "whose email / mobile number is this?". */
export const BELONGS_TO_OPTIONS = [
  { value: 'self', label: 'Myself' },
  { value: 'spouse', label: 'Spouse' },
  { value: 'dependent_children', label: 'Dependent child' },
  { value: 'dependent_parents', label: 'Dependent parent' },
  { value: 'dependent_siblings', label: 'Dependent sibling' },
  { value: 'guardian', label: 'Guardian' },
] as const;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6E8F6', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14, elevation: 1, shadowColor: '#102A54', shadowOpacity: 0.03, shadowRadius: 4 },
  chipSelected: { backgroundColor: '#36358D', borderColor: '#36358D', elevation: 2, shadowColor: '#36358D', shadowOpacity: 0.2 },
  text: { color: '#4A5568', fontWeight: '700', fontSize: 13 },
  textSelected: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
});
