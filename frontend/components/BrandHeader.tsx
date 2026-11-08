import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/lib/theme';

export function BrandHeader({ compact = false }: { compact?: boolean }) {
  const size = compact ? 34 : 40;
  return (
    <View
      accessibilityRole="header"
      accessibilityLabel="Canopy"
      style={s.brand}
    >
      <View style={[s.logoFrame, { width: size, height: size }]}>
        <Image
          source={require('../assets/splash-logo.png')}
          resizeMode="contain"
          style={[s.logo, compact ? s.logoCompact : s.logoRegular]}
        />
      </View>
      <Text style={[s.name, compact && s.nameCompact]}>Canopy</Text>
    </View>
  );
}

const s = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  logoFrame: { overflow: 'hidden' },
  logo: { position: 'absolute' },
  logoCompact: { width: 80, height: 80, left: -23, top: -17 },
  logoRegular: { width: 94, height: 94, left: -27, top: -20 },
  name: { fontFamily: 'Fraunces_600SemiBold', fontSize: 21, color: colors.ink },
  nameCompact: { fontSize: 18 },
});
