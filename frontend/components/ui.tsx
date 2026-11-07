import{ReactNode}from"react";import{ActivityIndicator,Pressable,StyleProp,StyleSheet as NativeStyleSheet,Text,View,ViewStyle,useWindowDimensions}from"react-native";import{BlurView}from"expo-blur";import Svg,{Circle,Polyline,Text as SvgText}from"react-native-svg";import{colors,radii}from"@/lib/theme";
const StyleSheet:any=NativeStyleSheet;
export function Card({children,onClick,style}:{children:ReactNode;className?:string;onClick?:()=>void;style?:StyleProp<ViewStyle>}){const body=<BlurView intensity={28} tint="light" style={[s.card,style]}><View style={s.cardOverlay}/><View style={{zIndex:1}}>{children}</View></BlurView>;return onClick?<Pressable onPress={onClick} style={({pressed})=>({transform:[{scale:pressed?.99:1}]})}>{body}</Pressable>:body}
export function Eyebrow({children}:{children:ReactNode}){return <Text style={s.eyebrow}>{children}</Text>};export function BigNumber({children}:{children:ReactNode;className?:string}){return <Text style={s.big}>{children}</Text>};
export function Badge({children,tone="blue"}:{children:ReactNode;tone?:"blue"|"pink"|"green"|"amber"}){const m={blue:["#D9F2FD","#11658C"],pink:["#FFE0EF","#B71561"],green:["#DCF7E8","#14714D"],amber:["#FFF0CE","#98610A"]}[tone];return <View style={[s.badge,{backgroundColor:m[0]}]}><Text style={[s.badgeText,{color:m[1]}]}>{children}</Text></View>}
export function Button3D({children,onClick,disabled=false,loading=false,tone="pink",ariaLabel}:{children:ReactNode;onClick?:()=>void;className?:string;ariaLabel?:string;disabled?:boolean;loading?:boolean;tone?:"pink"|"sky"|"white"}){const bg=tone==="pink"?colors.pink:tone==="sky"?colors.sky:"#FFFFFF",edge=tone==="pink"?"#BD155F":tone==="sky"?"#1488B8":"#C9DCE5";return <Pressable accessibilityRole="button" accessibilityLabel={ariaLabel} disabled={disabled||loading} onPress={onClick} style={({pressed})=>[s.button,{backgroundColor:bg,borderBottomColor:edge,opacity:disabled?.5:1,transform:[{translateY:pressed?3:0}]}]}>{loading?<ActivityIndicator color={tone==="white"?colors.ink:"white"}/>:typeof children==="string"?<Text style={[s.buttonText,{color:tone==="white"?colors.ink:"white"}]}>{children}</Text>:children}</Pressable>}
export function SegmentedPill<T extends string>({options,value,onChange}:{options:readonly T[];value:T;onChange:(v:T)=>void}){return <View style={s.segment}>{options.map(o=><Pressable key={o} onPress={()=>onChange(o)} style={[s.segmentItem,value===o&&s.segmentActive]}><Text style={s.segmentText}>{o}</Text></Pressable>)}</View>}
export function StatTile({label,value,tone="blue"}:{label:string;value:string;tone?:string}){return <View style={[s.stat,{backgroundColor:tone==="green"?"#E2F7EA":tone==="amber"?"#FFF2D8":colors.pale}]}><Eyebrow>{label}</Eyebrow><Text style={s.statValue}>{value}</Text></View>}
export function TrustTag(){return <View style={s.trust}><View style={s.dot}/><Text style={s.trustText}>Nessie sandbox</Text></View>};export function Heading({children,accent}:{children:ReactNode;accent:string}){return <View><Text style={s.heading}>{children}</Text><Text style={s.accent}>{accent}</Text></View>}
type ChartLine = { key: string; color: string; dashed?: boolean };

export function LineChartWithNodes({ data, lines, height=210 }: {
  data: Record<string, unknown>[]; lines: ChartLine[]; height?: number;
}) {
  const { width } = useWindowDimensions();
  const w = Math.max(60, Math.min(width - 68, 330)), pad = 18;
  const values = data.flatMap(row => lines.map(line => row[line.key]))
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (!values.length) return null;
  const min = Math.min(...values), max = Math.max(...values);
  const x = (index: number) => data.length === 1 ? w / 2 : pad + index * (w - pad * 2) / (data.length - 1);
  const y = (value: number) => min === max ? height / 2 : height - pad - (value - min) / (max - min) * (height - pad * 2);
  return <Svg width={w} height={height} accessibilityLabel="Estimated balance trend">
    {lines.map(line => {
      const segments: { index: number; value: number }[][] = [];
      let segment: { index: number; value: number }[] = [];
      data.forEach((row, index) => {
        const value = row[line.key];
        if (typeof value === "number" && Number.isFinite(value)) segment.push({index,value});
        else if (segment.length) { segments.push(segment); segment = []; }
      });
      if (segment.length) segments.push(segment);
      return segments.map(points => points.length === 1 ?
        <Circle key={`${line.key}-${points[0].index}`} cx={x(points[0].index)} cy={y(points[0].value)} r={4} fill={line.color}/> :
        <Polyline key={`${line.key}-${points[0].index}`} points={points.map(point => `${x(point.index)},${y(point.value)}`).join(" ")}
          fill="none" stroke={line.color} strokeWidth={3} strokeDasharray={line.dashed ? "3 7" : undefined}/>);
    })}
    {data.map((row, index) => (index === 0 || index === data.length - 1 || index % Math.ceil(data.length / 6) === 0) &&
      <SvgText key={index} x={x(index)} y={height-2} fill={colors.muted} fontSize={9} textAnchor="middle">{String(row.label)}</SvgText>)}
  </Svg>;
}

export function BalanceAreaChart({ plans, data }: { plans: {name:string;color:string}[]; data: Record<string,unknown>[] }) {
  return <LineChartWithNodes data={data} lines={plans.map(plan => ({key:plan.name,color:plan.color}))} height={230}/>;
}

export function ChunkySlider({label,value,min,max,step=1,suffix="",onChange}:{label:string;value:number;min:number;max:number;step?:number;suffix?:string;onChange:(n:number)=>void}){const pct=(value-min)/(max-min);return <View style={{marginVertical:12}}><View style={s.row}><Text style={s.label}>{label}</Text><Text style={s.strong}>{value.toLocaleString()}{suffix}</Text></View><Pressable onPress={e=>{const x=e.nativeEvent.locationX;onChange(Math.max(min,Math.min(max,Math.round((min+(max-min)*x/330)/step)*step)))}} style={s.track}><View style={[s.fill,{width:`${pct*100}%`}]}><View style={s.thumb}/></View></Pressable></View>}
export function BottomSheet(){return null}
const s=StyleSheet.create({card:{overflow:"hidden",borderRadius:radii.card,borderWidth:1,borderColor:"rgba(255,255,255,.95)",padding:18,backgroundColor:"rgba(255,255,255,.58)",shadowColor:colors.sky,shadowOpacity:.14,shadowRadius:22,shadowOffset:{width:0,height:12},elevation:3},cardOverlay:{...StyleSheet.absoluteFillObject,backgroundColor:"rgba(255,255,255,.35)"},eyebrow:{fontFamily:"Inter_700Bold",fontSize:10,letterSpacing:1.8,color:colors.muted},big:{fontFamily:"Inter_700Bold",fontSize:46,letterSpacing:-2,color:colors.ink,fontVariant:["tabular-nums"]},badge:{paddingHorizontal:9,paddingVertical:7,borderRadius:999},badgeText:{fontFamily:"Inter_700Bold",fontSize:10},button:{minHeight:48,borderRadius:16,borderBottomWidth:5,alignItems:"center",justifyContent:"center",paddingHorizontal:18},buttonText:{fontFamily:"Inter_700Bold",fontSize:14},segment:{flexDirection:"row",padding:5,borderRadius:999,backgroundColor:"rgba(11,58,91,.08)",marginVertical:16},segmentItem:{flex:1,minHeight:38,justifyContent:"center",alignItems:"center",borderRadius:999},segmentActive:{backgroundColor:"white"},segmentText:{fontFamily:"Inter_700Bold",fontSize:12,color:colors.ink,textTransform:"capitalize"},stat:{borderRadius:19,padding:13,borderWidth:1,borderColor:"white",flex:1},statValue:{fontFamily:"Inter_700Bold",fontSize:19,color:colors.ink,marginTop:8},trust:{flexDirection:"row",alignItems:"center",gap:5,paddingHorizontal:8,paddingVertical:6,borderRadius:999,backgroundColor:"rgba(255,255,255,.65)",borderWidth:1,borderColor:"white"},dot:{width:6,height:6,borderRadius:3,backgroundColor:colors.sky},trustText:{fontFamily:"Inter_700Bold",fontSize:9,color:colors.muted},heading:{fontFamily:"Fraunces_600SemiBold",fontSize:40,lineHeight:42,color:colors.ink,letterSpacing:-1},accent:{fontFamily:"Fraunces_600SemiBold_Italic",fontSize:40,lineHeight:42,color:colors.pink},row:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},label:{fontFamily:"Inter_400Regular",fontSize:12,color:colors.ink},strong:{fontFamily:"Inter_700Bold",fontSize:12,color:colors.ink},track:{height:12,borderRadius:999,backgroundColor:"#D9E6EB",marginTop:10},fill:{height:12,borderRadius:999,backgroundColor:colors.sky,alignItems:"flex-end",justifyContent:"center"},thumb:{width:44,height:28,borderRadius:999,backgroundColor:colors.pink,borderWidth:4,borderColor:"white"}});
