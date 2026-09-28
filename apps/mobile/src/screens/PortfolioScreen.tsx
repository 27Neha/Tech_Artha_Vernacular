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

/**
 * GET /buckets/investments - the orders and SIP plans placed through Cybrilla.
 *
 * Separate from /portfolio, which only holds allotted units. An order sits here from
 * placement until allotment, so without this the screen showed nothing at all between
 * investing and the units landing. The web dashboard reads this; mobile did not.
 */
type Investments = {
  plans: InvestmentRow[];
  orders: InvestmentRow[];
};

type InvestmentRow = {
  id: string;
  bucketId?: string;
  fundName?: string;
  schemeIsin?: string;
  amount: number;
  status: string;
  statusLabel?: string;
  frequency?: string;
  createdAt?: string;
};

const money = (value: number | undefined) =>
  `₹${Number(value ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export const PortfolioScreen = () => {
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
  const [investments, setInvestments] = useState<Investments | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      // Both, in parallel: /portfolio holds allotted units, /buckets/investments holds
      // orders and SIP plans that have not been allotted yet. Neither alone is the
      // whole picture, which is why an order used to leave the screen looking empty.
      const [portfolioResult, investmentsResult] = await Promise.allSettled([
        api.get<PortfolioResponse>('/portfolio'),
        api.get<Investments>('/buckets/investments'),
      ]);

      if (portfolioResult.status === 'fulfilled') setPortfolio(portfolioResult.value);
      else setError(portfolioResult.reason?.message ?? 'Could not load your portfolio.');

      // An investor with no Cybrilla profile yet gets an error here; that is a normal
      // pre-investment state, not a failure worth showing.
      setInvestments(investmentsResult.status === 'fulfilled' ? investmentsResult.value : null);
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
  const orders = investments?.orders ?? [];
  const plans = investments?.plans ?? [];

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

      {orders.length > 0 || plans.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Orders and SIPs</Text>
          {[...plans, ...orders].map((row) => (
            <View key={row.id} style={styles.learningCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{row.fundName ?? row.schemeIsin ?? 'Investment'}</Text>
                <Text style={styles.cardSub}>
                  {row.statusLabel ?? row.status}
                  {row.frequency ? ` \u00b7 ${row.frequency}` : ''}
                </Text>
              </View>
              <Text style={styles.cardTitle}>{money(row.amount)}</Text>
            </View>
          ))}
        </>
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
