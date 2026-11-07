"use client";
import { useEffect, useState } from "react";
import { useFinanceStore } from "@/lib/store";
import { AnimatePresence, motion } from "framer-motion";
import { GardenLayer } from "./garden";
import { TabBar } from "./navigation";
import { GoalsScreen, ImpactScreen, PictureScreen, PredictScreen, TodayScreen } from "./screens";
import { BottomSheet, Button3D, Card, Eyebrow } from "./ui";
import { ArrowRight, FileText, Newspaper, Sparkles, Zap } from "lucide-react";

function Skeleton(){return <div className="skeleton-screen"><div/><div/><div/><div/></div>}
export function FinanceApp(){const [loading,setLoading]=useState(true);const {tab,sheet,closeSheet,data,selectedGoal,setTab}=useFinanceStore();useEffect(()=>{const id=setTimeout(()=>setLoading(false),650);return()=>clearTimeout(id)},[]);const goal=data.goals.find(g=>g.id===selectedGoal);
 const screen=tab==="today"?<TodayScreen/>:tab==="picture"?<PictureScreen/>:tab==="goals"?<GoalsScreen/>:tab==="predict"?<PredictScreen/>:<ImpactScreen/>;
 return <div className="page-shell"><div className="phone-frame"><div className="clouds"/><GardenLayer/><div className="app-brand"><span>canopy</span><i/></div><div className="scroll-area">{loading?<Skeleton/>:<AnimatePresence mode="wait"><motion.div key={tab} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} transition={{duration:.22}}>{screen}</motion.div></AnimatePresence>}</div><TabBar/>
 <BottomSheet open={sheet==="whatif"} onClose={closeSheet} title="What would you like to explore?"><div className="sheet-options"><button onClick={()=>{setTab("whatif");closeSheet()}}><span><Newspaper/></span><div><strong>Use a headline</strong><p>Paste or pick news and see your estimated impact.</p></div><ArrowRight/></button><button onClick={()=>{setTab("predict");closeSheet()}}><span><Zap/></span><div><strong>Apply a shock</strong><p>Stress-test a surprise and find a way through.</p></div><ArrowRight/></button></div></BottomSheet>
 <BottomSheet open={sheet==="goal"} onClose={closeSheet} title={goal?`Options for ${goal.title}`:"Goal options"}><div className="option-list"><Card><Eyebrow>STEADIEST</Eyebrow><h3>{data.picture.accounts.find(a=>a.id==="cd")?.name} · {data.picture.accounts.find(a=>a.id==="cd")?.rate}% est.</h3><p><b>Pros:</b> predictable rate, protected principal</p><p><b>Cons:</b> money is locked; early withdrawal fee</p><small>Fits you because the goal horizon matches the account term.</small></Card><Card><Eyebrow>FLEXIBLE</Eyebrow><h3>{data.picture.accounts.find(a=>a.id==="s1")?.name} · {data.picture.accounts.find(a=>a.id==="s1")?.rate}% est.</h3><p><b>Pros:</b> easy access, no card debt</p><p><b>Cons:</b> rate can change</p><small>Fits you because your monthly cash flow varies.</small></Card><div className="wait-options"><button>Wait</button><button>Do nothing</button></div><p className="advice">Informational, not financial advice.</p></div></BottomSheet>
 <BottomSheet open={sheet==="sapling"} onClose={closeSheet} title="Why your garden changed"><div className="sapling-detail"><Sparkles/><div><h3>Your garden is up {data.today.gardenDelta}% this week</h3><p>{data.goals[0].note} Your {data.picture.health.runway} runway stayed steady. A shock temporarily makes each plant droop; fixing it restores the baseline.</p></div></div></BottomSheet>
 </div></div>}
