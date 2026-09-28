import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import { api } from '../services/api/client';
import { styles } from '../theme/styles';

/**
 * GET /portfolio. The service deliberately returns a NOT_CONNECTED envelope with zeroed
 * totals when no verified holdings exist, rather than inventing them - so the empty
 * state here shows that message instead of pretending the portfolio is worth nothing.
 */
type Holding = {
  id?: string;
  schemeName?: string;
  units?: number;
  nav?: string | number;
  navDate?: string;
  currentValue?: number;
  investedValue?: number;
};

type PortfolioResponse = {
  data: {
    totalInvested: number;
    currentValue: number;
    totalReturns?: number;
    holdings: Holding[];
  };
  source: string;
  status: string;
  message?: string;
};

const money = (value: number | undefined) =>
  `₹${Number(value ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export const PortfolioScreen = () => {
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setPortfolio(await api.get<PortfolioResponse>('/portfolio'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your portfolio.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.page}>
        <ActivityIndicator />
      </View>
    );
  }

  const data = portfolio?.data;
  const holdings = data?.holdings ?? [];
  const notConnected = portfolio?.source === 'NOT_CONNECTED';

  return (
    <ScrollView
      contentContainerStyle={styles.page}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void load();
          }}
        />
      }
    >
      <Text style={styles.title}>Portfolio</Text>

      {error ? <Text style={styles.description}>{error}</Text> : null}

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>CURRENT VALUE</Text>
        <Text style={styles.balance}>{money(data?.currentValue)}</Text>
        <Text style={styles.balanceSub}>Invested {money(data?.totalInvested)}</Text>
      </View>

      {notConnected ? (
        <Text style={styles.description}>
          {portfolio?.message ?? 'No verified portfolio data is available yet.'}
        </Text>
      ) : null}

      {holdings.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Holdings</Text>
          {holdings.map((holding, index) => (
            <View key={holding.id ?? index} style={styles.learningCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{holding.schemeName ?? 'Fund'}</Text>
                <Text style={styles.cardSub}>
                  {holding.units ?? 0} units
                  {holding.navDate ? ` · NAV ${holding.nav} on ${holding.navDate}` : ''}
                </Text>
              </View>
              <Text style={styles.cardTitle}>{money(holding.currentValue)}</Text>
            </View>
          ))}
        </>
      ) : (
        !notConnected && !error && (
          <Text style={styles.description}>
            You have no holdings yet. Your investments will appear here once an order is allotted.
          </Text>
        )
      )}
    </ScrollView>
  );
};
