"use client";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ReactNode } from "react";
import { X } from "lucide-react";

export function Card({ children, className = "", onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return <motion.section whileTap={onClick ? { scale: .99 } : undefined} onClick={onClick} className={`glass-card ${className}`}>{children}</motion.section>;
}
export function Eyebrow({ children }: { children: ReactNode }) { return <p className="eyebrow">{children}</p>; }
export function BigNumber({ children, className = "" }: { children: ReactNode; className?: string }) { return <div className={`big-number ${className}`}>{children}</div>; }
export function Badge({ children, tone = "blue" }: { children: ReactNode; tone?: "blue"|"pink"|"green"|"amber" }) { return <span className={`badge badge-${tone}`}>{children}</span>; }
export function Button3D({ children, onClick, className = "", ariaLabel }: { children: ReactNode; onClick?: () => void; className?: string; ariaLabel?: string }) {
  return <motion.button aria-label={ariaLabel} whileTap={{ y: 3 }} onClick={onClick} className={`button-3d ${className}`}>{children}</motion.button>;
}
export function SegmentedPill<T extends string>({ options, value, onChange }: { options: readonly T[]; value: T; onChange: (v:T)=>void }) {
  return <div className="segmented">{options.map(o => <button key={o} onClick={()=>onChange(o)} className={value===o?"active":""}>{o}</button>)}</div>;
}
export function StatTile({ label, value, tone="blue" }: { label:string; value:string; tone?:string }) { return <div className={`stat-tile tile-${tone}`}><Eyebrow>{label}</Eyebrow><strong>{value}</strong></div>; }
export function TrustTag() { return <div className="trust-tag"><span /> Synthetic demo data</div>; }
export function Heading({ children, accent }: { children: ReactNode; accent: string }) { return <h1 className="display-heading">{children} <em>{accent}</em></h1>; }

export function LineChartWithNodes({ data, lines, height=210 }: { data: Record<string, unknown>[]; lines: { key:string; color:string; dashed?:boolean }[]; height?:number }) {
  return <div style={{height}} aria-label="Balance trend chart" role="img"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{top:14,right:8,left:-26,bottom:0}}>
    <CartesianGrid vertical={false} stroke="rgba(11,58,91,.08)"/><XAxis dataKey="label" tickLine={false} axisLine={false} tick={{fontSize:11,fill:"#557286"}}/><YAxis tickLine={false} axisLine={false} tick={{fontSize:10,fill:"#7690a0"}}/>
    <Tooltip contentStyle={{borderRadius:14,border:"1px solid white",background:"rgba(255,255,255,.92)"}} formatter={(v)=>[Number(v).toLocaleString(),"Estimated"]}/>
    {lines.map(l=><Line key={l.key} type="monotone" dataKey={l.key} stroke={l.color} strokeWidth={3} strokeDasharray={l.dashed?"3 7":undefined} dot={{r:4,fill:"white",stroke:l.color,strokeWidth:3}} activeDot={{r:6}} connectNulls />)}
  </LineChart></ResponsiveContainer></div>;
}
export function BalanceAreaChart({ plans, data }: { plans:{name:string;color:string}[]; data:Record<string,unknown>[] }) {
  return <div className="sim-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{top:10,right:6,left:-25,bottom:0}}><defs>{plans.map((p,i)=><linearGradient key={p.name} id={`g${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={p.color} stopOpacity={.22}/><stop offset="100%" stopColor={p.color} stopOpacity={0}/></linearGradient>)}</defs><XAxis dataKey="label" tickLine={false} axisLine={false} tick={{fontSize:11}}/><YAxis tickLine={false} axisLine={false} tick={{fontSize:10}}/><Tooltip formatter={(v)=>[`$${Number(v).toLocaleString()}`,"Estimated"]}/>{plans.map((p,i)=><Area key={p.name} dataKey={p.name} stroke={p.color} fill={`url(#g${i})`} strokeWidth={3} />)}</AreaChart></ResponsiveContainer></div>;
}
export function ChunkySlider({ label, value, min, max, step=1, suffix="", onChange }: {label:string;value:number;min:number;max:number;step?:number;suffix?:string;onChange:(n:number)=>void}) {
  return <label className="slider"><span>{label}<strong>{value.toLocaleString()}{suffix}</strong></span><input type="range" value={value} min={min} max={max} step={step} onChange={e=>onChange(Number(e.target.value))}/></label>;
}
export function BottomSheet({ open, onClose, title, children }: {open:boolean;onClose:()=>void;title:string;children:ReactNode}) {
  const reduce=useReducedMotion(); return <AnimatePresence>{open&&<><motion.button aria-label="Close sheet" className="scrim" onClick={onClose} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}/><motion.div role="dialog" aria-modal="true" className="bottom-sheet" initial={{y:"105%"}} animate={{y:0}} exit={{y:"105%"}} transition={reduce?{duration:0}:{type:"spring",damping:28,stiffness:280}}><div className="sheet-handle"/><div className="sheet-title"><h2>{title}</h2><button aria-label="Close" onClick={onClose}><X size={20}/></button></div>{children}</motion.div></>}</AnimatePresence>;
}
