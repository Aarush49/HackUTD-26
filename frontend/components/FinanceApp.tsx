"use client";

import { useEffect } from "react";
import { goalViews, useFinanceStore } from "@/lib/store";
import { money } from "@/lib/api";
import { AnimatePresence, motion } from "framer-motion";
import { GardenLayer } from "./garden";
import { TabBar } from "./navigation";
import { GoalsScreen, ImpactScreen, PictureScreen, PredictScreen, TodayScreen } from "./screens";
import { BottomSheet, Card, Eyebrow } from "./ui";
import { ArrowRight, Newspaper, Sparkles, Zap } from "lucide-react";

function Skeleton() {
  return <div className="skeleton-screen" aria-label="Loading Nessie data"><div/><div/><div/><div/></div>;
}

export function FinanceApp() {
  const { tab, sheet, closeSheet, selectedGoal, setTab, dashboard, baseline, status, error, products, productsError, load } =
    useFinanceStore();
  useEffect(() => { void load(); }, [load]);
  const goal = goalViews(dashboard, baseline).find(item => item.id === selectedGoal);
  const screen = tab === "today" ? <TodayScreen/> : tab === "picture" ? <PictureScreen/> :
    tab === "goals" ? <GoalsScreen/> : tab === "predict" ? <PredictScreen/> : <ImpactScreen/>;
  const goalProducts = products?.filter(item => item.kind === "cd" || item.kind === "hysa");

  return <div className="page-shell"><div className="phone-frame">
    <div className="clouds"/><GardenLayer/><div className="app-brand"><span>canopy</span><i/></div>
    <div className="scroll-area">
      {status === "idle" || status === "loading" ? <Skeleton/> : status === "error" ?
        <main className="screen"><Card><div role="alert"><h2>Financial data unavailable</h2><p className="cause">{error}</p></div></Card></main> :
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} transition={{duration:.22}}>
            {screen}
          </motion.div>
        </AnimatePresence>}
    </div>
    <TabBar/>
    <BottomSheet open={sheet === "whatif"} onClose={closeSheet} title="What would you like to explore?">
      <div className="sheet-options">
        <button onClick={() => { setTab("whatif"); closeSheet(); }}><span><Newspaper/></span>
          <div><strong>Use a headline</strong><p>Paste or pick a headline and see your estimated impact.</p></div><ArrowRight/>
        </button>
        <button onClick={() => { setTab("predict"); closeSheet(); }}><span><Zap/></span>
          <div><strong>Apply a shock</strong><p>Stress-test a surprise and find a way through.</p></div><ArrowRight/>
        </button>
      </div>
    </BottomSheet>
    <BottomSheet open={sheet === "goal"} onClose={closeSheet} title={goal ? `Options for ${goal.title}` : "Goal options"}>
      <div className="option-list">
        {goalProducts?.map(product => <Card key={product.kind}>
          <Eyebrow>ILLUSTRATIVE PRODUCT</Eyebrow><h3>{product.name}</h3>
          <p><b>Pros</b> {product.advantage}</p><p><b>Risks</b> {product.risk}</p>
        </Card>)}
        <p className="cause">{productsError ?? (products ?
          "Comparing these options requires product terms this screen cannot collect." : "Loading product options…")}</p>
        <div className="wait-options"><button disabled>Wait</button><button disabled>Do nothing</button></div>
        <p className="advice">Informational, not financial advice.</p>
      </div>
    </BottomSheet>
    <BottomSheet open={sheet === "sapling"} onClose={closeSheet} title={goal?.title ?? "Garden details"}>
      <div className="sapling-detail"><Sparkles/><div>
        <h3>Goal progress</h3>
        <p>{goal?.saved == null ? "Funding is unavailable." : `${money(goal.saved)} of ${money(goal.target)} funded.`}</p>
      </div></div>
    </BottomSheet>
  </div></div>;
}
