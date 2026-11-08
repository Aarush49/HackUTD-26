import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ImpactScreen } from "@/components/screens";
import { colors } from "@/lib/theme";

export default function ImpactRoute() {
  const { top } = useSafeAreaInsets();

  function dismiss() {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  }

  const swipeDown = Gesture.Pan()
    .activeOffsetY(8)
    .failOffsetX([-24, 24])
    .runOnJS(true)
    .onEnd(({ translationY, velocityY }) => {
      if (translationY >= 64 || (translationY >= 24 && velocityY >= 700)) {
        requestAnimationFrame(dismiss);
      }
    });

  return <ImpactScreen header={
    <View style={{paddingTop: top}}>
      <GestureDetector gesture={swipeDown} touchAction="none">
        <Pressable accessibilityRole="button" accessibilityLabel="Close news"
          accessibilityHint="Swipe down or activate to close" onPress={dismiss} style={styles.handleArea}>
          <View style={styles.handle}/>
        </Pressable>
      </GestureDetector>
    </View>
  }/>;
}

const styles = StyleSheet.create({
  handleArea: { height: 48, alignItems: "center", justifyContent: "center" },
  handle: { width: 42, height: 5, borderRadius: 3, backgroundColor: colors.muted },
});
