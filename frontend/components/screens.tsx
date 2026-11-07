"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, ChevronRight, CircleDollarSign, Landmark, Newspaper, ShieldCheck, Sparkles, TrendingUp, WalletCards, Wrench } from "lucide-react";
import { motion } from "framer-motion";
import { api, displayDate, money, number } from "@/lib/api";
import type { Account, HeadlineAnalysis, Risk, Simulation } from "@/lib/api";
import { goalViews, headlineExamples, shockPresets, useFinanceStore } from "@/lib/store";
import { Badge, BalanceAreaChart, BigNumber, Button3D, Card, ChunkySlider, Eyebrow, Heading, LineChartWithNodes, SegmentedPill, StatTile, TrustTag } from "./ui";
import { Sapling } from "./garden";

export function ScreenIntro({ eyebrow, title, accent, sub }: { eyebrow: string; title: string; accent: string; sub?: string }) {
  return <header className="screen-intro"><div className="intro-row"><Eyebrow>{eyebrow}</Eyebrow><TrustTag/></div>
    <Heading accent={accent}>{title}</Heading>{sub && <p className="subhead">{sub}</p>}
  </header>;
}

function runwayLabel(risk: Risk | null): string {
  if (risk?.first_shortfall_month === 0) return "Now";
  if (risk?.first_shortfall_month != null) return `Month ${risk.first_shortfall_month}`;
  return risk?.status === "no_shortfall_within_horizon" ? "None projected" : "Unavailable";
}

function runwayDetail(risk: Risk | null, error?: string | null): string {
  if (error) return error;
  if (!risk) return "Calculating from your Nessie profile…";
  if (risk.first_shortfall_date) {
    const caveat = risk.missing_requirements.length ? " Some inputs are incomplete." : "";
    return `The monthly forecast shows a cash shortfall by ${displayDate(risk.first_shortfall_date)}.${caveat}`;
  }
  if (risk.status === "no_shortfall_within_horizon") {
    return `No cash shortfall over the ${risk.monthly.length - 1}-month projection.`;
  }
  return risk.missing_requirements[0] ?? "The forecast is incomplete.";
}

export function TodayScreen() {
  const { dashboard, baseline, baselineError, setTab } = useFinanceStore();
  if (!dashboard) return null;
  const retrieved = dashboard.data_completeness.retrieved_at;
  const start = retrieved.slice(0, 10);
  const end = new Date(Date.parse(start) + 30 * 86400000).toISOString().slice(0, 10);
  const timeline = dashboard.bills.flatMap(bill => {
    const status = bill.status?.toLowerCase();
    const due = bill.upcoming_payment_date ?? bill.payment_date;
    return (status === "pending" || status === "recurring") && due && start <= due && due <= end
      ? [{ id: bill.id, due, label: bill.payee || bill.nickname || "Bill", amount: number(bill.amount) }] : [];
  }).sort((a, b) => a.due.localeCompare(b.due));
  const todayLabel = displayDate(retrieved, { weekday: "long", month: "long", day: "numeric" });
  return <main className="screen">
    <ScreenIntro eyebrow={todayLabel.toUpperCase()} title="Good morning," accent={`${dashboard.customer.first_name || "there"}.`}/>
    <Card className="hero-card">
      <Eyebrow>YOUR FIRST BREAKING POINT</Eyebrow><BigNumber>{runwayLabel(baseline)}</BigNumber>
      <p className="cause">{runwayDetail(baseline, baselineError)}</p>
      <button className="text-link" onClick={() => setTab("predict")}>See what could change it <ArrowRight size={16}/></button>
    </Card>
    <section>
      <div className="section-title"><div><Eyebrow>NEXT 30 DAYS</Eyebrow><h2>Cash, in motion.</h2></div><Badge tone="blue">Scheduled bills</Badge></div>
      <Card className="timeline">
        {!timeline.length && <p className="cause">Nessie has no dated bills for the next 30 days.</p>}
        {timeline.map((bill, index) => <div className="timeline-row" key={bill.id}>
          <div className="timeline-dot bill"/><div><small>{displayDate(bill.due, { month: "short", day: "numeric" })}</small><strong>{bill.label}</strong></div>
          <b className="negative">{money(bill.amount === null ? null : -bill.amount)}</b>
          {index < timeline.length - 1 && <span className="line"/>}
        </div>)}
      </Card>
    </section>
    <Card className="headline-card" onClick={() => setTab("whatif")}>
      <div className="headline-icon"><Newspaper/></div><div><Eyebrow>EXAMPLE HEADLINE</Eyebrow>
        <h3>Fed signals a slower path for rate cuts</h3><p>Explore the estimated effect on your rates and goals.</p></div><ChevronRight/>
    </Card>
  </main>;
}

export function PictureScreen() {
  const { dashboard, baseline, baselineError, period, setPeriod } = useFinanceStore();
  if (!dashboard) return null;
  const accounts = dashboard.accounts.map(account => {
    const kind = account.type.toLowerCase();
    const balance = number(account.balance);
    return { id: account.id, kind: account.type, name: account.nickname || account.type,
      balance: kind === "credit card" && balance !== null ? -balance : balance };
  });
  for (const debt of dashboard.debts) {
    if (debt.kind.toLowerCase() === "credit card") continue;
    const balance = number(debt.balance);
    accounts.push({ id: debt.id, kind: "Loans", name: debt.kind, balance: balance === null ? null : -balance });
  }
  const groups = [...new Set(accounts.map(account => account.kind))];
  const net = number(dashboard.known_account_net_worth);
  const chart: Record<string, unknown>[] = [{
    label: "Now", value: net, projected: number(baseline?.monthly[0]?.known_account_net_worth),
  }];
  const months = period === "Year" ? 12 : period === "Month" ? 1 : 0;
  for (const row of baseline?.monthly.slice(1, months + 1) ?? []) {
    chart.push({ label: displayDate(row.date, { month: "short", day: "numeric" }), projected: number(row.known_account_net_worth) });
  }
  const interest = baseline?.monthly.slice(1, 13).map(row => number(row.interest_paid));
  const annualInterest = interest?.length === 12 && interest.every(value => value !== null) &&
    !baseline?.missing_requirements.length ? interest.reduce((total, value) => total + value, 0) : null;
  return <main className="screen">
    <ScreenIntro eyebrow="THE WHOLE PICTURE" title="Your money," accent="together." sub="Balances and projections for known Nessie accounts."/>
    <SegmentedPill options={["Week", "Month", "Year"] as const} value={period} onChange={setPeriod}/>
    <Card className="chart-card">
      <Eyebrow>KNOWN NET POSITION</Eyebrow><div className="number-row"><BigNumber>{money(net)}</BigNumber></div>
      {chart.some(point => point.value != null || point.projected != null) &&
        <LineChartWithNodes data={chart} lines={[{key:"value",color:"#0B3A5B"},{key:"projected",color:"#FF2E93",dashed:true}]}/>}
      <div className="chart-legend"><span className="solid"/> Current balance <span className="dotted"/> Projection</div>
      <p className="estimate-note">{period === "Week" ? "Projections are monthly. Nessie supplies the current balance." :
        baselineError ?? baseline?.missing_requirements[0] ?? (baseline ? "Nessie supplies the current balance." : "Loading the monthly projection…")}</p>
    </Card>
    <div className="health-grid">
      <StatTile label="RUNWAY" value={runwayLabel(baseline)}/>
      <StatTile label="CUSHION" value={money(dashboard.liquid_reserves)} tone="green"/>
      <StatTile label="INTEREST DRAG" value={annualInterest === null ? "Unavailable" : `${money(annualInterest)}/yr`} tone="amber"/>
    </div>
    <section>
      <div className="section-title"><div><Eyebrow>ACCOUNTS</Eyebrow><h2>Where it lives.</h2></div></div>
      <Card className="accounts">
        {!groups.length && <p className="cause">No Nessie accounts were returned.</p>}
        {groups.map(group => <div className="account-group" key={group}><h3>{group}</h3>
          {accounts.filter(account => account.kind === group).map(account => <div className="account" key={account.id}>
            <span className="account-icon">{group === "Loans" ? <Landmark/> : group.toLowerCase() === "credit card" ? <WalletCards/> : <CircleDollarSign/>}</span>
            <div><strong>{account.name}</strong></div>
            <b className={account.balance !== null && account.balance < 0 ? "negative" : ""}>{money(account.balance)}</b>
          </div>)}
        </div>)}
      </Card>
    </section>
  </main>;
}

function StressTest({ customerId }: { customerId: string }) {
  const { baseline, baselineError, shock, applyShock, fixed, fixShock } = useFinanceStore();
  const active = shockPresets.find(preset => preset.id === shock);
  const [test, setTest] = useState<{ id: string; result?: Risk; error?: string } | null>(null);
  useEffect(() => {
    if (!active?.input) return;
    const controller = new AbortController();
    void api<Risk>("/risk/predict", { customer_id: customerId, shock: active.input }, controller.signal).then(
      result => { if (!controller.signal.aborted) setTest({ id: active.id, result }); },
      error => { if (!controller.signal.aborted) setTest({ id: active.id, error: error.message }); },
    );
    return () => controller.abort();
  }, [active, customerId]);
  const result = active ? (test?.id === active.id ? test.result ?? null : null) : baseline;
  const error = active ? (test?.id === active.id ? test.error : null) : baselineError;

  return <>
    <Card className={`countdown-card ${fixed ? "success" : ""}`}>
      <div><Eyebrow>{fixed ? "BASELINE RESTORED" : "FIRST BREAKING POINT"}</Eyebrow>
        <BigNumber>{runwayLabel(result)}</BigNumber><p role={error ? "alert" : undefined}>{runwayDetail(result, error)}</p></div>
      <motion.div animate={{rotate: active ? 12 : 0}}><ShieldCheck/></motion.div>
    </Card>
    <section>
      <div className="section-title"><div><Eyebrow>APPLY A SHOCK</Eyebrow><h2>Where does it bend?</h2></div></div>
      <div className="shock-grid">{shockPresets.map(preset => <button key={preset.id}
        disabled={!preset.input} className={shock === preset.id ? "shock active" : "shock"} onClick={() => {
          if (shock !== preset.id) { setTest(null); applyShock(preset.id); }
        }}>
        <Wrench/><strong>{preset.title}</strong><b>{preset.amount === null ? "2 months" : money(preset.amount)}</b>
        <small>{preset.input ? preset.detail : "Monthly rent increase unavailable"}</small>
      </button>)}</div>
    </section>
    {active && <Card className="waterfall">
      <div className="section-title"><div><Eyebrow>FUNDING WATERFALL</Eyebrow><h2>{active.title}</h2></div></div>
      <p className="cause">The risk forecast shows when cash could run short. Funding sources and their costs are unavailable.</p>
    </Card>}
    <Button3D className="fix-button" onClick={fixShock} disabled={!active}>
      {fixed ? <><Sparkles/> Baseline restored</> : <>Reset shock <ArrowRight/></>}
    </Button3D>
  </>;
}

const savingsPlans = [{ name: "Baseline", color: "#94A3B8" }, { name: "Save more", color: "#38BDF8" }];

function SavingsSimulation({ customerId, savings }: { customerId: string; savings: Account | undefined }) {
  const { sim, setSim } = useFinanceStore();
  const savingsId = savings?.id;
  const [run, setRun] = useState<{ key: string; data?: Simulation; error?: string } | null>(null);
  const requestKey = `${customerId}:${savingsId}:${sim.monthly}:${sim.years}:${sim.rate}`;
  useEffect(() => {
    if (!savingsId) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void api<Simulation>("/simulate", {
        customer_id: customerId, horizon_months: sim.years * 12,
        assumptions: { account_rates: { [savingsId]: { apy: (sim.rate / 100).toFixed(4) } } },
        decision: { savings_account_id: savingsId, extra_monthly_savings: sim.monthly },
      }, controller.signal).then(
        data => { if (!controller.signal.aborted) setRun({ key: requestKey, data }); },
        error => { if (!controller.signal.aborted) setRun({ key: requestKey, error: error.message }); },
      );
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [customerId, savingsId, requestKey, sim.monthly, sim.rate, sim.years]);
  const result = run?.key === requestKey ? run : null;
  const chart = result?.data?.baseline_projection.monthly.flatMap((row, index) => {
    if (row.month % 12 !== 0) return [];
    return [{ label: row.month ? `${row.month / 12}y` : "Now", Baseline: number(row.liquid_balance),
      "Save more": number(result.data?.scenario_projection.monthly[index]?.liquid_balance) }];
  }) ?? [];
  const hasForecast = chart.slice(1).some(row => row.Baseline !== null || row["Save more"] !== null);
  const message = !savingsId ? "A Nessie savings account with a known balance is needed for this simulation." :
    result?.error ?? result?.data?.scenario_projection.missing_requirements[0] ??
    (result ? null : "Calculating savings paths…");
  return <>
    <Card className="chart-card">
      <div className="section-title"><div><Eyebrow>LONG-RUN LIQUID BALANCE</Eyebrow><h2>Two paths, one horizon.</h2></div><Badge tone="blue">Estimated</Badge></div>
      {hasForecast && <><BalanceAreaChart data={chart} plans={savingsPlans}/><div className="plan-legend">
        {savingsPlans.map(plan => <span key={plan.name}><i style={{background:plan.color}}/>{plan.name}</span>)}
      </div></>}
      {message && <p className="cause" role={result?.error ? "alert" : undefined}>{message}</p>}
      {savings && <p className="estimate-note">Savings account {savings.nickname || savings.type}. The selected APY applies to both paths.</p>}
    </Card>
    <Card className="sliders">
      <ChunkySlider label="Monthly savings amount" value={sim.monthly} min={100} max={1800} step={50} suffix=" / mo" onChange={value => setSim("monthly", value)}/>
      <ChunkySlider label="Years" value={sim.years} min={2} max={20} suffix=" yr" onChange={value => setSim("years", value)}/>
      <ChunkySlider label="Estimated savings APY" value={sim.rate} min={2} max={12} step={.5} suffix="%" onChange={value => setSim("rate", value)}/>
    </Card>
    <p className="advice">Informational, not financial advice.</p>
  </>;
}

export function PredictScreen() {
  const { dashboard, predictMode, setPredictMode } = useFinanceStore();
  if (!dashboard) return null;
  const savings = dashboard.accounts.find(account => account.type.toLowerCase() === "savings" && number(account.balance) !== null);
  return <main className="screen">
    <ScreenIntro eyebrow="LOOK AHEAD" title="Make uncertainty" accent="useful." sub="Stress test today, or sketch a longer tomorrow."/>
    <SegmentedPill options={["break", "simulate"] as const} value={predictMode} onChange={setPredictMode}/>
    {predictMode === "break" ? <StressTest customerId={dashboard.customer.id}/> :
      <SavingsSimulation customerId={dashboard.customer.id} savings={savings}/>}
  </main>;
}

export function GoalsScreen() {
  const { dashboard, baseline, selectGoal } = useFinanceStore();
  const goals = goalViews(dashboard, baseline);
  return <main className="screen">
    <ScreenIntro eyebrow="GROW WITH INTENTION" title="Goals with" accent="roots." sub="Every contribution helps something take shape."/>
    <div className="goal-list">
      {!goals.length && <Card><p className="cause">No saved goals for this customer.</p></Card>}
      {goals.map(goal => {
        const percent = goal.growth === null ? null : Math.round(goal.growth * 100);
        const progress = Math.max(0, Math.min(100, percent ?? 0));
        return <Card key={goal.id} className="goal-card" onClick={() => selectGoal(goal.id)}>
          <div className="goal-copy"><Eyebrow>ETA · {goal.eta}</Eyebrow><h2>{goal.title}</h2>
            <p>{money(goal.saved)} of {money(goal.target)}</p><div className="progress-bar"><span style={{width:`${progress}%`}}/></div>
            <Badge tone={progress > 60 ? "green" : "blue"}>{percent === null ? "Progress unavailable" : `${percent}% grown`}</Badge>
          </div>
          <div className="goal-visual"><Sapling goal={goal} compact/><div className="progress-ring" style={{"--progress":`${progress * 3.6}deg`} as React.CSSProperties}>
            <span>{percent === null ? "—" : `${percent}%`}</span>
          </div></div>
        </Card>;
      })}
    </div><p className="advice">Informational, not financial advice.</p>
  </main>;
}

function impactRows(result: HeadlineAnalysis, accounts: Account[]) {
  const rows: { label: string; before: string; after: string; detail: string }[] = [];
  const rate = (value: number) => new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 3 }).format(value);
  for (const account of result.affected_accounts) {
    const before = number(account.assumed_baseline_apy ?? account.assumed_baseline_apr);
    const after = number(account.adjusted_apy ?? account.adjusted_apr);
    if (before !== null && after !== null) {
      rows.push({ label: accounts.find(item => item.id === account.account_id)?.nickname || account.account_id,
        before: rate(before), after: rate(after), detail: account.exposure === "variable_savings" ? "Modeled APY" : "Modeled APR" });
    }
  }
  for (const change of result.goal_changes) {
    if (change.baseline.completion_date === change.scenario.completion_date) continue;
    rows.push({ label: change.baseline.name, before: displayDate(change.baseline.completion_date),
      after: displayDate(change.scenario.completion_date), detail: "Estimated completion" });
  }
  const baseline = result.baseline_projection.monthly.at(-1);
  const scenario = result.scenario_projection.monthly.at(-1);
  const before = number(baseline?.liquid_balance);
  const after = number(scenario?.liquid_balance);
  if (before !== null && after !== null && before !== after) {
    rows.push({ label: "Liquid balance", before: money(before), after: money(after), detail: "End of projection" });
  }
  const spendingChange = number(result.financial_impacts.find(item => item.metric === "monthly_spending_exposure")?.change);
  if (spendingChange !== null && spendingChange !== 0) {
    rows.push({ label: "Monthly spending", before: "Baseline", after: `${spendingChange > 0 ? "+" : ""}${money(spendingChange)}`,
      detail: "Modeled change" });
  }
  return rows;
}

export function ImpactScreen() {
  const dashboard = useFinanceStore(state => state.dashboard);
  const [input, setInput] = useState("");
  const [query, setQuery] = useState<{ text: string } | null>(null);
  const [response, setResponse] = useState<{ query: typeof query; data?: HeadlineAnalysis; error?: string } | null>(null);
  const customerId = dashboard?.customer.id;
  useEffect(() => {
    if (!query || !customerId) return;
    const controller = new AbortController();
    void api<HeadlineAnalysis>("/headlines/analyze", { customer_id: customerId, headline: query.text }, controller.signal).then(
      data => { if (!controller.signal.aborted) setResponse({ query, data }); },
      error => { if (!controller.signal.aborted) setResponse({ query, error: error.message }); },
    );
    return () => controller.abort();
  }, [customerId, query]);

  const matching = response?.query === query ? response : null;
  const result = matching?.data;
  const rows = result ? impactRows(result, dashboard?.accounts ?? []) : [];
  const pending = query !== null && matching === null;
  const headlineRequirement = result?.scenario_projection.missing_requirements.find(
    requirement => !result.baseline_projection.missing_requirements.includes(requirement),
  );
  const explanation = headlineRequirement ?? result?.exposure_explanations[0] ??
    result?.event.explanation;
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (text) setQuery({ text });
  }
  return <main className="screen">
    <ScreenIntro eyebrow="HEADLINE IMPACT" title="News, translated to" accent="you." sub="A plain-language estimate of how a headline could affect your finances."/>
    <div className="chip-row">{headlineExamples.map(text => <button key={text} style={{border:0}}
      className={query?.text === text ? "badge badge-pink" : "badge badge-blue"}
      onClick={() => { setInput(text); setQuery({ text }); }}>{text}</button>)}</div>
    <form onSubmit={submit}><Card className="paste-card"><label htmlFor="headline"><Eyebrow>PASTE A HEADLINE</Eyebrow></label>
      <div><input id="headline" placeholder="Paste a headline…" value={input} maxLength={500} onChange={event => setInput(event.target.value)}/>
        <Button3D type="submit" disabled={!input.trim() || pending} ariaLabel="Analyze headline"><Sparkles/></Button3D></div>
    </Card></form>
    <section>
      <div className="section-title"><div><Eyebrow>WHAT THIS MEANS FOR YOU</Eyebrow><h2>Small shifts, shown honestly.</h2></div></div>
      <Card className="impact-list">
        {!rows.length && <p className="cause" role={matching?.error ? "alert" : undefined}>
          {matching?.error ?? (pending ? "Analyzing headline…" : result ? "No account or goal changes could be quantified." : "Enter or select a headline to see its estimated impact.")}
        </p>}
        {rows.map((row, index) => <div className="impact-row" key={`${row.label}-${index}`}>
          <div><strong>{row.label}</strong><small>{row.detail}</small></div><span>{row.before}</span><ArrowRight/><b>{row.after}</b>
        </div>)}
      </Card>
    </section>
    {explanation && <Card className="explainer"><TrendingUp/><div><h3>What the model found</h3><p>{explanation}</p></div></Card>}
    <p className="advice">Informational, not financial advice.</p>
  </main>;
}
