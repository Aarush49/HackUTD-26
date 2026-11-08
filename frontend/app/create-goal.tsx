import { useEffect, useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { router, useNavigation } from 'expo-router';
import { GoalEditor } from '@/components/GoalEditor';
import { MotionReveal } from '@/components/MotionReveal';
import { ScreenIntro, ScreenShell } from '@/components/screens';
import { Button3D, Card } from '@/components/ui';
import { resolveCustomerId } from '@/lib/api';
import { useFinanceStore } from '@/lib/store';
import { colors } from '@/lib/theme';

function returnToGoals() {
  if (router.canGoBack()) router.back();
  else router.replace('/(tabs)/goals');
}

export default function CreateGoal() {
  const navigation = useNavigation();
  const snapshot = useFinanceStore((state) => state.snapshot);
  const addGoal = useFinanceStore((state) => state.addGoal);
  const [customerId, setCustomerId] = useState<string>();
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setError('');
    void resolveCustomerId(controller.signal)
      .then((id) => {
        if (!controller.signal.aborted) setCustomerId(id);
      })
      .catch((failure) => {
        if (!controller.signal.aborted) setError(failure.message);
      });
    return () => controller.abort();
  }, [retry]);

  return (
    <ScreenShell>
      <ScreenIntro
        title="Create a goal"
        sub="Choose what you’re saving for and how much you want to set aside."
      />
      <MotionReveal key={customerId ? 'editor' : 'status'} beat="second">
        {customerId ? (
          <GoalEditor
            customerId={customerId}
            accounts={snapshot?.accounts ?? []}
            onSaved={(goal) => {
              if (navigation.isFocused()) {
                addGoal(goal);
                returnToGoals();
              }
            }}
            onCancel={returnToGoals}
          />
        ) : (
          <Card>
            {error ? (
              <>
                <Text accessibilityRole="alert">{error}</Text>
                <Button3D
                  tone="white"
                  onClick={() => setRetry((count) => count + 1)}
                >
                  Retry
                </Button3D>
              </>
            ) : (
              <ActivityIndicator color={colors.ink} />
            )}
          </Card>
        )}
      </MotionReveal>
    </ScreenShell>
  );
}
