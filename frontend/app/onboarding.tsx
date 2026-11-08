import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SkyBackground } from '@/components/Background';
import { MotionReveal } from '@/components/MotionReveal';
import { Button3D, Card, Eyebrow, Heading } from '@/components/ui';
import { Sapling } from '@/components/garden';
import { useAuthStore } from '@/lib/auth/store';
import { colors } from '@/lib/theme';
import { NewsSetup } from '@/components/PersonalNews';

const choices = ['Trip', 'Home', 'Car', 'Emergency fund'];

export default function Onboarding() {
  const [newsStep, setNewsStep] = React.useState(false);
  const [selected, setSelected] = React.useState(0);
  const complete = useAuthStore((state) => state.completeOnboarding);
  const insets = useSafeAreaInsets();
  return (
    <SkyBackground>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={[
          s.page,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 },
        ]}
      >
        <MotionReveal>
          <View style={s.top}>
            <Eyebrow>ONE SMALL START</Eyebrow>
          </View>
          <Heading accent="first.">Plant one goal</Heading>
        </MotionReveal>
        <MotionReveal beat="second" style={s.plant}>
          <Sapling
            ambient
            goal={{ title: choices[selected], growth: 0.2 + selected * 0.18 }}
            onPress={() => {}}
          />
        </MotionReveal>
        <MotionReveal key={newsStep ? 'news' : 'goal'} beat="third">
          {newsStep ? (
            <NewsSetup
              onSaved={() => {
                complete();
                router.replace('/(tabs)');
              }}
            />
          ) : (
            <Card>
              <Text style={s.copy}>Preview a goal theme for your garden.</Text>
              <View style={s.choices}>
                {choices.map((choice, index) => (
                  <Pressable
                    key={choice}
                    onPress={() => setSelected(index)}
                    style={[s.choice, selected === index && s.active]}
                  >
                    <Text
                      style={[
                        s.choiceText,
                        selected === index && { color: colors.pink },
                      ]}
                    >
                      {choice}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Button3D
                onClick={() => {
                  setNewsStep(true);
                }}
              >
                Continue to news setup
              </Button3D>
            </Card>
          )}
          {newsStep && (
            <Button3D
              tone="white"
              onClick={() => {
                complete();
                router.replace('/(tabs)');
              }}
            >
              Skip news setup for now
            </Button3D>
          )}
        </MotionReveal>
      </ScrollView>
    </SkyBackground>
  );
}

const s = StyleSheet.create({
  page: { flexGrow: 1, paddingHorizontal: 18 },
  top: { flexDirection: 'row', justifyContent: 'space-between' },
  plant: { height: 190, alignItems: 'center', justifyContent: 'center' },
  copy: {
    fontFamily: 'Inter_400Regular',
    color: colors.muted,
    marginBottom: 14,
  },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  choice: {
    minHeight: 44,
    paddingHorizontal: 15,
    borderRadius: 999,
    justifyContent: 'center',
    backgroundColor: colors.pale,
    borderWidth: 1,
    borderColor: 'white',
  },
  active: { backgroundColor: '#FFE0EF', borderColor: colors.pink },
  choiceText: { fontFamily: 'Inter_700Bold', color: colors.ink },
});
