import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CircleDollarSign, Landmark, WalletCards } from 'lucide-react-native';
import { money } from '@/lib/finance/data';
import { useFinanceStore } from '@/lib/store';
import { colors } from '@/lib/theme';
import {
  Badge,
  BigNumber,
  Card,
  Eyebrow,
  LineChartWithNodes,
  SegmentedPill,
  StatTile,
} from './ui';
import { ScreenIntro, ScreenShell, Title } from './screens';

export function PictureScreen() {
  const { data, period, setPeriod } = useFinanceStore();
  const picture = data.picture,
    selected = picture.periods[period];
  const groups = [...new Set(picture.accounts.map((account) => account.kind))];
  return (
    <ScreenShell>
      <ScreenIntro
        eyebrow="THE WHOLE PICTURE"
        title="Your money,"
        accent="together."
        sub="Assets, debts and momentum—without the noise."
      />
      <SegmentedPill
        options={['Week', 'Month', 'Year'] as const}
        value={period}
        onChange={setPeriod}
      />
      <Card>
        <Eyebrow>NET POSITION · ESTIMATED</Eyebrow>
        <View style={s.between}>
          <BigNumber>{money(selected.netPosition)}</BigNumber>
          <Badge tone="green">
            ↗ {selected.change === undefined ? '—' : `${selected.change}%`}
          </Badge>
        </View>
        <LineChartWithNodes
          key={period}
          data={selected.chart}
          lines={[
            { key: 'value', color: colors.ink },
            { key: 'projected', color: colors.pink, dashed: true },
          ]}
        />
        <Text style={s.small}>
          Solid history · dotted projection · {period.toLowerCase()} view
        </Text>
      </Card>
      <View style={s.stats}>
        <StatTile label="RUNWAY" value={picture.health.runway} />
        <StatTile
          label="CUSHION"
          value={money(picture.health.cushion)}
          tone="green"
        />
      </View>
      <StatTile
        label="INTEREST DRAG"
        value={
          picture.health.interestDrag === undefined
            ? '—'
            : `${money(picture.health.interestDrag)}/yr`
        }
        tone="amber"
      />
      <Title eyebrow="ACCOUNTS">Where it lives.</Title>
      <Card>
        {groups.map((group, index) => {
          const isFirst = index === 0;
          const isLast = index === groups.length - 1;
          const accounts = picture.accounts.filter(
            (account) => account.kind === group
          );
          return (
            <View
              key={group}
              style={[
                s.group,
                isFirst && s.firstGroup,
                isLast && s.lastGroup,
              ]}
            >
              <Text style={[s.serif, isFirst && { marginTop: 0 }]}>
                {group}
              </Text>
              {accounts.map((account, accountIndex) => {
                const isLastAccount =
                  isLast && accountIndex === accounts.length - 1;
                return (
                  <View
                    key={account.id}
                    style={[
                      s.account,
                      isLastAccount && { paddingBottom: 0 },
                    ]}
                  >
                    <View style={s.smallIcon}>
                      {group === 'Loans' ? (
                        <Landmark color={colors.ink} size={17} />
                      ) : group === 'Credit' ? (
                        <WalletCards color={colors.ink} size={17} />
                      ) : (
                        <CircleDollarSign color={colors.ink} size={17} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.strong}>{account.name}</Text>
                      {account.rate !== undefined && (
                        <Text style={s.mini}>{account.rate}% estimated rate</Text>
                      )}
                    </View>
                    <Text
                      style={[
                        s.strong,
                        account.balance !== undefined &&
                          account.balance < 0 && { color: colors.danger },
                      ]}
                    >
                      {money(account.balance)}
                    </Text>
                  </View>
                );
              })}
            </View>
          );
        })}
      </Card>
    </ScreenShell>
  );
}

const s = StyleSheet.create({
  between: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  serif: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 21,
    color: colors.ink,
    marginVertical: 5,
  },
  strong: { fontFamily: 'Inter_700Bold', color: colors.ink },
  small: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    lineHeight: 16,
    color: colors.muted,
    marginTop: 6,
  },
  mini: {
    fontFamily: 'Inter_400Regular',
    fontSize: 9,
    color: colors.muted,
    letterSpacing: 0.4,
  },
  stats: { flexDirection: 'row', gap: 9, marginTop: 12, marginBottom: 9 },
  group: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: 'rgba(11,58,91,.09)',
  },
  firstGroup: {
    paddingTop: 0,
  },
  lastGroup: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  account: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  smallIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.pale,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

