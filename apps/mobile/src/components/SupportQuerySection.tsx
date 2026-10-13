import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supportApi, SupportQueryResponse } from '../services/api/support';

interface SupportQuerySectionProps {
  userEmail?: string | null;
}

export const EXACT_ACKNOWLEDGEMENT_MESSAGE =
  "We've received your query! Our team is looking into it, and we'll update you as soon as we have more information.";

const QUICK_SUBJECTS = [
  'KYC & Verification',
  'Mutual Funds & SIP',
  'Account & Profile',
  'Payment / Mandate',
  'General Inquiry',
];

export const SupportQuerySection: React.FC<SupportQuerySectionProps> = ({ userEmail }) => {
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(userEmail || '');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Submission acknowledgement state
  const [lastSubmitted, setLastSubmitted] = useState<SupportQueryResponse | null>(null);

  // Query history and tracking state
  const [queries, setQueries] = useState<SupportQueryResponse[]>([]);
  const [loadingQueries, setLoadingQueries] = useState(false);
  const [expandedQueryId, setExpandedQueryId] = useState<string | null>(null);

  const loadQueries = useCallback(async () => {
    try {
      setLoadingQueries(true);
      const list = await supportApi.getQueries();
      if (Array.isArray(list)) {
        setQueries(list);
      }
    } catch {
      // Non-blocking: fails silently if unauthenticated or offline
    } finally {
      setLoadingQueries(false);
    }
  }, []);

  useEffect(() => {
    loadQueries();
  }, [loadQueries]);

  useEffect(() => {
    if (userEmail && !email) {
      setEmail(userEmail);
    }
  }, [userEmail, email]);

  const handleSubmit = async () => {
    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();
    const trimmedEmail = email.trim();

    if (!trimmedSubject || trimmedSubject.length < 3) {
      setErrorMessage('Please enter a subject with at least 3 characters.');
      return;
    }
    if (!trimmedMessage || trimmedMessage.length < 5) {
      setErrorMessage('Please describe your query in at least 5 characters.');
      return;
    }
    if (trimmedEmail && !trimmedEmail.includes('@')) {
      setErrorMessage('Please provide a valid email address for notifications.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await supportApi.submitQuery({
        subject: trimmedSubject,
        message: trimmedMessage,
        email: trimmedEmail || undefined,
      });

      // Display immediate acknowledgement
      setLastSubmitted(response);
      setShowForm(false);
      setSubject('');
      setMessage('');

      // Refresh query tracking list
      await loadQueries();
    } catch (err: any) {
      const msg = err?.message || 'Failed to submit query. Please try again.';
      setErrorMessage(msg);
      Alert.alert('Query Submission Failed', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'received':
        return { bg: '#EEF0FB', text: '#36358D', label: 'Received' };
      case 'under review':
        return { bg: '#FEF3C7', text: '#B45309', label: 'Under Review' };
      case 'in progress':
        return { bg: '#EDE9FE', text: '#6D28D9', label: 'In Progress' };
      case 'resolved':
        return { bg: '#DCFCE7', text: '#15803D', label: 'Resolved' };
      case 'closed':
        return { bg: '#F1F5F9', text: '#475569', label: 'Closed' };
      default:
        return { bg: '#EEF0FB', text: '#36358D', label: status || 'Received' };
    }
  };

  return (
    <View style={styles.container}>
      {/* Option 3 Card Button: Submit Support Query */}
      {!showForm && !lastSubmitted && (
        <Pressable
          style={({ pressed }) => [
            styles.contactOption,
            pressed && styles.contactOptionPressed,
          ]}
          onPress={() => {
            setShowForm(true);
            setErrorMessage(null);
          }}
          accessibilityRole="button"
          accessibilityLabel="Submit a Support Query"
          accessibilityHint="Open form to submit an official support query to TechArtha desk"
        >
          <View style={[styles.contactIconWrap, { backgroundColor: '#F0EBF8', borderColor: '#D8CEEF' }]}>
            <Ionicons name="document-text-outline" size={22} color="#36358D" />
          </View>
          <View style={styles.contactDetails}>
            <View style={styles.contactTitleRow}>
              <Text style={styles.contactOptionTitle}>Submit a Query</Text>
              <View style={[styles.fastPill, { backgroundColor: '#EEF0FB' }]}>
                <Text style={[styles.fastPillText, { color: '#36358D' }]}>Official Ticket</Text>
              </View>
            </View>
            <Text style={styles.contactOptionSub}>
              Log an inquiry and receive automatic status updates
            </Text>
            <Text style={styles.contactOptionMeta}>Email & In-App Tracking</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </Pressable>
      )}

      {/* Immediate Acknowledgement View upon submission */}
      {lastSubmitted && (
        <View style={styles.ackCard} testID="acknowledgement-card">
          <View style={styles.ackHeader}>
            <View style={styles.ackIconWrap}>
              <Ionicons name="checkmark-circle" size={28} color="#16A34A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.ackTitle}>Query Logged Successfully</Text>
              <Text style={styles.ackMessageText}>
                {EXACT_ACKNOWLEDGEMENT_MESSAGE}
              </Text>
            </View>
          </View>

          <View style={styles.ackDetailsBox}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Reference ID</Text>
              <View style={styles.refPill}>
                <Text style={styles.refPillText}>{lastSubmitted.referenceId}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status</Text>
              {(() => {
                const badge = getStatusBadgeStyle(lastSubmitted.status);
                return (
                  <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: badge.text }]}>
                      {badge.label}
                    </Text>
                  </View>
                );
              })()}
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Subject</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {lastSubmitted.subject}
              </Text>
            </View>

            {lastSubmitted.recipientEmail ? (
              <View style={styles.emailAckRow}>
                <Ionicons name="mail" size={14} color="#36358D" />
                <Text style={styles.emailAckText}>
                  {lastSubmitted.emailSent
                    ? `Acknowledgement email sent to ${lastSubmitted.recipientEmail}`
                    : `Notification queued for ${lastSubmitted.recipientEmail}`}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.ackActionsRow}>
            <Pressable
              style={styles.ackDismissBtn}
              onPress={() => setLastSubmitted(null)}
              accessibilityRole="button"
              accessibilityLabel="Dismiss query acknowledgement"
            >
              <Text style={styles.ackDismissText}>Done</Text>
            </Pressable>

            <Pressable
              style={styles.ackNewBtn}
              onPress={() => {
                setLastSubmitted(null);
                setShowForm(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Submit another query"
            >
              <Text style={styles.ackNewText}>Submit Another Query</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Query Submission Form */}
      {showForm && (
        <View style={styles.formCard} testID="support-query-form">
          <View style={styles.formHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.formTitle}>Submit a Support Query</Text>
              <Text style={styles.formSubtitle}>
                Our team responds to all queries systematically
              </Text>
            </View>
            <Pressable
              onPress={() => {
                setShowForm(false);
                setErrorMessage(null);
              }}
              style={styles.formCloseBtn}
              accessibilityRole="button"
              accessibilityLabel="Close support query form"
            >
              <Ionicons name="close" size={20} color="#718096" />
            </Pressable>
          </View>

          {errorMessage && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color="#DC2626" />
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          )}

          {/* Quick topic tags */}
          <Text style={styles.inputLabel}>Select Topic</Text>
          <View style={styles.quickTagsContainer}>
            {QUICK_SUBJECTS.map((tag) => (
              <Pressable
                key={tag}
                style={[
                  styles.quickTag,
                  subject === tag && styles.quickTagActive,
                ]}
                onPress={() => setSubject(tag)}
              >
                <Text
                  style={[
                    styles.quickTagText,
                    subject === tag && styles.quickTagTextActive,
                  ]}
                >
                  {tag}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Subject Field */}
          <Text style={styles.inputLabel}>Subject *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="E.g. KYC Verification Query"
            placeholderTextColor="#A0AEC0"
            value={subject}
            onChangeText={(text) => {
              setSubject(text);
              if (errorMessage) setErrorMessage(null);
            }}
            maxLength={150}
          />

          {/* Email Notification Field */}
          <Text style={styles.inputLabel}>Your Email (for Acknowledgement) *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="investor@example.com"
            placeholderTextColor="#A0AEC0"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errorMessage) setErrorMessage(null);
            }}
          />

          {/* Message Field */}
          <Text style={styles.inputLabel}>Query Details *</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder="Describe your issue or question in detail..."
            placeholderTextColor="#A0AEC0"
            value={message}
            onChangeText={(text) => {
              setMessage(text);
              if (errorMessage) setErrorMessage(null);
            }}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {/* Form Actions */}
          <View style={styles.formButtonRow}>
            <Pressable
              style={styles.cancelButton}
              onPress={() => {
                setShowForm(false);
                setErrorMessage(null);
              }}
              disabled={submitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>

            <Pressable
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel="Submit query"
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Query</Text>
              )}
            </Pressable>
          </View>
        </View>
      )}

      {/* Query Tracking / History Section */}
      {queries.length > 0 && (
        <View style={styles.historyContainer}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Your Submitted Queries</Text>
            <Pressable
              style={styles.refreshBtn}
              onPress={loadQueries}
              disabled={loadingQueries}
              accessibilityRole="button"
              accessibilityLabel="Refresh query statuses"
            >
              {loadingQueries ? (
                <ActivityIndicator size="small" color="#36358D" />
              ) : (
                <View style={styles.refreshInner}>
                  <Ionicons name="refresh" size={13} color="#36358D" />
                  <Text style={styles.refreshText}>Refresh</Text>
                </View>
              )}
            </Pressable>
          </View>

          {queries.map((q) => {
            const isExpanded = expandedQueryId === q.id;
            const badge = getStatusBadgeStyle(q.status);
            const formattedDate = q.createdAt
              ? new Date(q.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : '';

            return (
              <Pressable
                key={q.id}
                style={[
                  styles.historyCard,
                  isExpanded && styles.historyCardExpanded,
                ]}
                onPress={() =>
                  setExpandedQueryId(isExpanded ? null : q.id)
                }
                accessibilityRole="button"
                accessibilityLabel={`Query ${q.referenceId}, status: ${q.status}`}
              >
                <View style={styles.historyCardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.historyRefRow}>
                      <Text style={styles.historyRefText}>{q.referenceId}</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: badge.bg },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            { color: badge.text },
                          ]}
                        >
                          {badge.label}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.historySubject} numberOfLines={1}>
                      {q.subject}
                    </Text>
                  </View>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color="#94A3B8"
                  />
                </View>

                {isExpanded && (
                  <View style={styles.historyExpandedContent}>
                    <Text style={styles.historyMessageLabel}>Details:</Text>
                    <Text style={styles.historyMessageText}>{q.message}</Text>
                    <View style={styles.historyFooter}>
                      <Text style={styles.historyDateText}>
                        Logged on {formattedDate}
                      </Text>
                      {q.emailSent && (
                        <View style={styles.emailTag}>
                          <Ionicons name="mail" size={12} color="#16A34A" />
                          <Text style={styles.emailTagText}>Email Ack Sent</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  contactOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EDF2F7',
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  contactOptionPressed: {
    backgroundColor: '#F8F9FE',
    borderColor: '#D6D6F5',
  },
  contactIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactDetails: {
    flex: 1,
  },
  contactTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  contactOptionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#102A54',
  },
  fastPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  fastPillText: {
    fontSize: 9.5,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  contactOptionSub: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 2,
  },
  contactOptionMeta: {
    fontSize: 12,
    fontWeight: '700',
    color: '#36358D',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#36358D',
    padding: 16,
    marginTop: 4,
    shadowColor: '#102A54',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#102A54',
  },
  formSubtitle: {
    fontSize: 11.5,
    color: '#718096',
    marginTop: 2,
  },
  formCloseBtn: {
    padding: 4,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  errorBannerText: {
    fontSize: 12,
    color: '#B91C1C',
    flex: 1,
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#4A5568',
    marginBottom: 4,
    marginTop: 8,
  },
  quickTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  quickTag: {
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickTagActive: {
    backgroundColor: '#EEF0FB',
    borderColor: '#36358D',
  },
  quickTagText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  quickTagTextActive: {
    color: '#36358D',
    fontWeight: '800',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13.5,
    color: '#102A54',
  },
  textArea: {
    minHeight: 80,
    paddingTop: 10,
  },
  formButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  submitButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#36358D',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  ackCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#16A34A',
    padding: 16,
    marginTop: 4,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  ackHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  ackIconWrap: {
    marginTop: 2,
  },
  ackTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#166534',
    marginBottom: 4,
  },
  ackMessageText: {
    fontSize: 13,
    color: '#1E293B',
    lineHeight: 18,
    fontWeight: '500',
  },
  ackDetailsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 12.5,
    color: '#102A54',
    fontWeight: '700',
    maxWidth: '65%',
  },
  refPill: {
    backgroundColor: '#102A54',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  refPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  emailAckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  emailAckText: {
    fontSize: 11.5,
    color: '#36358D',
    fontWeight: '600',
    flex: 1,
  },
  ackActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
  },
  ackDismissBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  ackDismissText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
  },
  ackNewBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#36358D',
  },
  ackNewText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  historyContainer: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EDF2F7',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#718096',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  refreshBtn: {
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  refreshInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  refreshText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#36358D',
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginBottom: 8,
  },
  historyCardExpanded: {
    borderColor: '#36358D',
  },
  historyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyRefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  historyRefText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#102A54',
    fontFamily: 'monospace',
  },
  historySubject: {
    fontSize: 13,
    fontWeight: '700',
    color: '#102A54',
  },
  historyExpandedContent: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  historyMessageLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
  },
  historyMessageText: {
    fontSize: 12.5,
    color: '#334155',
    lineHeight: 17,
  },
  historyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  historyDateText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  emailTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  emailTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
});
