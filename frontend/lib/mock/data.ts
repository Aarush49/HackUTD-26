import { MockData } from "./types";

export const mockData: MockData = {
  profile: { name: "Jordan", demoTag: "Synthetic demo data", todayLabel: "SATURDAY · NOVEMBER 7" },
  today: {
    headline: "Fed signals a slower path for rate cuts"
  },
  picture: {
    periods: {
      Week: {
        netPosition: 48240, change: 0.7,
        chart: [
          { label: "Mon", value: 47890 }, { label: "Tue", value: 47940 }, { label: "Wed", value: 48010 }, { label: "Thu", value: 47970 },
          { label: "Fri", value: 48120, projected: 48120 }, { label: "Sat", value: 48240, projected: 48240 }, { label: "Sun", projected: 48310 }
        ]
      },
      Month: {
        netPosition: 47900, change: 2.6,
        chart: [
          { label: "Oct 5", value: 47020 }, { label: "Oct 12", value: 47380 }, { label: "Oct 19", value: 47610 },
          { label: "Oct 26", value: 47740, projected: 47740 }, { label: "Now", value: 47900, projected: 47900 }, { label: "Nov 14", projected: 48620 }
        ]
      },
      Year: {
        netPosition: 47600, change: 18.4,
        chart: [
          { label: "Dec", value: 40740 }, { label: "Feb", value: 41980 }, { label: "Apr", value: 43220 }, { label: "Jun", value: 44760 },
          { label: "Aug", value: 46210 }, { label: "Oct", value: 47080, projected: 47080 }, { label: "Now", value: 47600, projected: 47600 }, { label: "Feb", projected: 50780 }
        ]
      }
    },
    accounts: [
      { id: "c1", name: "Everyday checking", kind: "Cash", balance: 3240 }, { id: "s1", name: "High-yield savings", kind: "Savings", balance: 12800, rate: 4.35 },
      { id: "cd", name: "12-month CD", kind: "Savings", balance: 6500, rate: 4.65 }, { id: "ira", name: "IRA + 401(k)", kind: "Investments", balance: 68400 },
      { id: "cc", name: "Travel card", kind: "Credit", balance: -1840, rate: 22.4 }, { id: "auto", name: "Auto loan", kind: "Loans", balance: -11260, rate: 6.1 },
      { id: "mort", name: "Mortgage", kind: "Loans", balance: -29600, rate: 4.0 }
    ],
    health: { runway: "5.2 mo", cushion: 3480, interestDrag: 2130 }
  },
  goals: [
    { id: "japan", title: "Japan in spring", saved: 4200, target: 6500, eta: "Apr 18, 2027", growth: .65, note: "Up 6% because your travel transfer landed." },
    { id: "home", title: "Home cushion", saved: 12800, target: 18000, eta: "Aug 04, 2027", growth: .72, note: "Steady—your runway is holding above five months." },
    { id: "car", title: "Next car", saved: 3600, target: 14000, eta: "Nov 20, 2028", growth: .29, note: "Down 3% after a higher repair estimate." }
  ],
  losses: [
    { id: "card-interest", title: "Card interest", minimum: 420, maximum: 610, reason: "Your travel card balance is carrying a high estimated rate.", action: "Pay the highest-rate balance first." },
    { id: "idle-cash", title: "Idle cash", minimum: 180, maximum: 290, reason: "Part of your cash may earn less than the estimated inflation rate.", action: "Compare insured higher-yield cash options." },
    { id: "fees", title: "Account fees", minimum: 96, maximum: 144, reason: "Recurring account and service fees reduce the balance over time.", action: "Review and cancel avoidable fees." },
    { id: "headline-income", title: "Income pressure", minimum: 300, maximum: 650, reason: "The selected headline may soften near-term income growth.", action: "Keep more of the monthly contribution liquid." }
  ],
  simulate: { monthly: 650, years: 8, rate: 6.5, plans: [
    { name: "Keep cash", color: "#94A3B8", points: [{label:"Now",value:15000},{label:"2y",value:31000},{label:"4y",value:47000},{label:"6y",value:63000},{label:"8y",value:79000}] },
    { name: "Balanced", color: "#38BDF8", points: [{label:"Now",value:15000},{label:"2y",value:32500},{label:"4y",value:54000},{label:"6y",value:81000},{label:"8y",value:116000}] },
    { name: "Growth", color: "#FF2E93", points: [{label:"Now",value:15000},{label:"2y",value:34000},{label:"4y",value:59000},{label:"6y",value:93000},{label:"8y",value:139000}] }
  ] },
  impact: {
    headlines: ["Fed holds rates", "Inflation cools", "Oil prices climb"], active: "Fed holds rates",
    rows: [
      { label: "Income", before: "$5,700 est.", after: "$5,520 est.", range: "-$120–$260 estimated" },
      { label: "Savings APY", before: "4.35% est.", after: "4.10% est.", range: "3.90–4.30% estimated" },
      { label: "Card APR", before: "22.4% est.", after: "22.1% est.", range: "21.8–22.4% estimated" },
      { label: "Japan goal", before: "Apr 18 est.", after: "Apr 27 est.", range: "+6–12 days estimated" }
    ]
  }
};
