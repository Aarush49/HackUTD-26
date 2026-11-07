"use client";
import { CalendarDays, ChartNoAxesCombined, CircleGauge, Flower2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useFinanceStore } from "@/lib/store";
import { Tab } from "@/lib/mock";
const items:{id:Tab;label:string;icon:typeof CalendarDays}[]=[{id:"today",label:"Today",icon:CalendarDays},{id:"picture",label:"Picture",icon:ChartNoAxesCombined},{id:"whatif",label:"What if",icon:Sparkles},{id:"goals",label:"Goals",icon:Flower2},{id:"predict",label:"Predict",icon:CircleGauge}];
export function TabBar(){const {tab,setTab,openSheet}=useFinanceStore();return <nav className="tabbar" aria-label="Main navigation">{items.map(({id,label,icon:Icon},i)=>{const active=tab===id;const center=i===2;return <button key={id} aria-current={active?"page":undefined} className={center?"center-tab":""} onClick={()=>center?openSheet("whatif"):setTab(id)}>{center?<span className="center-orb"><Icon/></span>:<Icon/>}<span>{label}</span>{active&&!center&&<motion.i layoutId="active-dot"/>}</button>})}</nav>}
