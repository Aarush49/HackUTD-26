"use client";
import { motion, useReducedMotion } from "framer-motion";
import { goalViews, useFinanceStore } from "@/lib/store";
import type { Goal } from "@/lib/store";

export function Sapling({ goal, ambient=false, compact=false }: {goal:Goal;ambient?:boolean;compact?:boolean}) {
  const reduce=useReducedMotion(); const inspectGoal=useFinanceStore(s=>s.inspectGoal);
  const growth=Math.max(.08, Math.min(1, goal.growth ?? 0)); const stage=Math.min(4,Math.floor(growth*5));
  const h=compact?70:ambient?155:112; const crown=15+stage*5; const droop=0;
  return <motion.button aria-label={`Open ${goal.title} growth details`} className="sapling" onClick={event=>{event.stopPropagation();inspectGoal(goal.id)}} animate={{scale:.78+growth*.22,rotate:droop}} transition={reduce?{duration:0}:{type:"spring",stiffness:120,damping:12}} style={{width:h*.72,height:h}}>
    <svg viewBox="0 0 100 150" width="100%" height="100%" aria-hidden="true">
      <ellipse cx="50" cy="138" rx="28" ry="6" fill="#38BDF8" opacity=".14"/>
      {stage===0?<><ellipse cx="50" cy="132" rx="9" ry="5" fill="#9A6B4F"/><path d="M50 128v-8" stroke="#3D8B64" strokeWidth="4"/></>:<>
        <motion.path d={`M50 136 C${48+droop} 112 ${53+droop} 77 ${50+droop} ${42-stage*3}`} fill="none" stroke="#337A5D" strokeWidth={5+stage} strokeLinecap="round"/>
        {[0,1,2,3,4].slice(0,stage+1).map((_,i)=>{const y=112-i*18, side=i%2?1:-1;return <g key={i} transform={`rotate(${droop} 50 ${y})`}><path d={`M50 ${y} Q${50+side*15} ${y-10} ${50+side*26} ${y-9}`} fill="none" stroke="#337A5D" strokeWidth="4"/><ellipse cx={50+side*27} cy={y-11} rx={crown*.62} ry={crown*.36} fill={i%2?"#7DD3A7":"#55B98A"} transform={`rotate(${side*18} ${50+side*27} ${y-11})`}/></g>})}
        {stage>=3&&<circle cx="50" cy={38} r={crown} fill="#77CFA2" opacity=".9"/>}
        {stage===4&&[[39,31],[57,25],[64,43],[47,47]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="5" fill="#FF2E93" opacity=".9"/>)}
      </>}
    </svg>
  </motion.button>;
}
export function GardenLayer(){
  const dashboard=useFinanceStore(s=>s.dashboard);
  const baseline=useFinanceStore(s=>s.baseline);
  const goals=goalViews(dashboard, baseline).filter(goal=>goal.growth!==null).slice(0,3);
  return <div className="garden-layer"><div className="garden-soil"/>{goals.map((goal,index)=><Sapling key={goal.id} goal={goal} ambient={index===1}/>)}</div>;
}
