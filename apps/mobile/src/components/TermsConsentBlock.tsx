import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

interface TermsConsentBlockProps {
  accepted: boolean;
  warning?: string;
  onToggle: () => void;
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
  onLayout?: (y: number) => void;
}

export const TermsConsentBlock: React.FC<TermsConsentBlockProps> = ({
  accepted,
  warning,
  onToggle,
  onOpenTerms,
  onOpenPrivacy,
  onLayout,
}) => {
  const { t } = useTranslation('common');

  return (
    <View
      testID="terms-consent-block"
      onLayout={(event) => onLayout?.(event.nativeEvent.layout.y)}
      style={[blockStyles.wrapper, !!warning && blockStyles.wrapperError]}
    >
      {warning ? (
        <View style={blockStyles.inlineWarningRow} accessibilityRole="alert">
          <Text style={blockStyles.inlineWarningIcon}>⚠️</Text>
          <Text style={blockStyles.inlineWarningText}>{warning}</Text>
        </View>
      ) : null}

      <View style={blockStyles.consentRow}>
        <Pressable
          testID="terms-checkbox"
          onPress={onToggle}
          hitSlop={10}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: accepted }}
          accessibilityLabel={t('signup.termsAccessibility', {
            defaultValue: 'Agree to Terms of Service and Privacy Policy',
          })}
          style={blockStyles.checkboxTouch}
        >
          <View
            style={[
              blockStyles.checkbox,
              accepted && blockStyles.checkboxChecked,
              !!warning && blockStyles.checkboxError,
            ]}
          >
            {accepted ? <Text style={blockStyles.checkMark}>✓</Text> : null}
          </View>
        </Pressable>

        <Text style={blockStyles.consentText}>
          <Text onPress={onToggle}>
            {`${t('signup.termsPrefix', { defaultValue: 'I agree to the' }).trim()} `}
          </Text>
          <Text onPress={onOpenTerms} style={blockStyles.docLink}>
            {t('signup.termsOfService', { defaultValue: 'Terms of Service' })}
          </Text>
          <Text onPress={onToggle}>
            {` ${t('signup.and', { defaultValue: 'and' })} `}
          </Text>
          <Text onPress={onOpenPrivacy} style={blockStyles.docLink}>
            {t('signup.privacyPolicy', { defaultValue: 'Privacy Policy' })}
          </Text>
          <Text> </Text>
          <Text onPress={onOpenTerms} style={blockStyles.learnMoreText}>
            {t('signup.learnMore', { defaultValue: 'Learn more' })}
          </Text>
        </Text>
      </View>
    </View>
  );
};

const blockStyles = StyleSheet.create({
  wrapper: {
    marginTop: 18,
    marginBottom: 4,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  wrapperError: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FEB2B2',
  },
  inlineWarningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inlineWarningIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  inlineWarningText: {
    flex: 1,
    color: '#C53030',
    fontSize: 12.5,
    fontWeight: '700',
    lineHeight: 17,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkboxTouch: {
    paddingRight: 10,
    paddingVertical: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#CBD5E0',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: '#3C3985',
    borderColor: '#3C3985',
  },
  checkboxError: {
    borderColor: '#E53E3E',
  },
  checkMark: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  consentText: {
    color: '#4A5568',
    fontSize: 12.5,
    flex: 1,
    lineHeight: 19,
  },
  docLink: {
    textDecorationLine: 'underline',
    color: '#102A54',
    fontWeight: '700',
  },
  learnMoreText: {
    color: '#2B6CB0',
    fontSize: 12.5,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
