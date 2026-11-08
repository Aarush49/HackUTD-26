import { MockData } from "./types";

export const mockData: MockData = {
  profile: { name: "Jordan", demoTag: "Synthetic demo data", todayLabel: "SATURDAY · NOVEMBER 7" },
  today: {
    days: 112, range: [98, 126], cause: "A tight stretch after your spring insurance bill.", gardenDelta: 8,
    timeline: [
      { day: "NOV 08", label: "Payday", amount: 2850, kind: "good" },
      { day: "NOV 14", label: "Rent + bills", amount: -2140, kind: "bill" },
      { day: "NOV 22", label: "Cash low point", amount: 680, kind: "low" },
      { day: "DEC 01", label: "Payday", amount: 2850, kind: "good" }
    ],
    headline: "Fed signals a slower path for rate cuts"
  },
  picture: {
    netPosition: 48240, change: 4.8,
    chart: [
      { label: "Jun", value: 40100 }, { label: "Jul", value: 41800 }, { label: "Aug", value: 43500 }, { label: "Sep", value: 44900 },
      { label: "Oct", value: 46600, projected: 46600 }, { label: "Now", value: 48240, projected: 48240 }, { label: "Dec", projected: 50100 }, { label: "Jan", projected: 51600 }
    ],
    periods: {
      Week: {
        netPosition: 48240, change: 0.7,
        chart: [
          { label: "Mon", value: 47890 }, { label: "Tue", value: 47940 }, { label: "Wed", value: 48010 }, { label: "Thu", value: 47970 },
          { label: "Fri", value: 48120, projected: 48120 }, { label: "Sat", value: 48240, projected: 48240 }, { label: "Sun", projected: 48310 }
        ]
      },
      Month: {
        netPosition: 48240, change: 2.6,
        chart: [
          { label: "Oct 5", value: 47020 }, { label: "Oct 12", value: 47380 }, { label: "Oct 19", value: 47610 },
          { label: "Oct 26", value: 47900, projected: 47900 }, { label: "Now", value: 48240, projected: 48240 }, { label: "Nov 14", projected: 48620 }
        ]
      },
      Year: {
        netPosition: 48240, change: 18.4,
        chart: [
          { label: "Dec", value: 40740 }, { label: "Feb", value: 41980 }, { label: "Apr", value: 43220 }, { label: "Jun", value: 44760 },
          { label: "Aug", value: 46210 }, { label: "Oct", value: 47600, projected: 47600 }, { label: "Now", value: 48240, projected: 48240 }, { label: "Feb", projected: 50780 }
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
  shocks: [
    { id: "repair", title: "Car repair", amount: 2400, detail: "One surprise, due today", daysLost: 26 },
    { id: "income", title: "Lose income", amount: 5700, detail: "60 days without pay", daysLost: 61 },
    { id: "rent", title: "Rent rises", amount: 2400, detail: "$200 more for 12 months", daysLost: 35 }
  ],
  waterfall: [
    { name: "Checking", amount: 680, cost: "$0 cost", color: "#38BDF8" },
    { name: "Savings", amount: 1420, cost: "$62 lost interest", color: "#7DD3FC" },
    { name: "Credit", amount: 300, cost: "$71 interest", color: "#FBBF24" }
  ],
  simulate: { monthly: 650, years: 8, rate: 6.5, plans: [
    { name: "Keep cash", color: "#94A3B8", points: [{label:"Now",value:15000},{label:"2y",value:31000},{label:"4y",value:47000},{label:"6y",value:63000},{label:"8y",value:79000}] },
    { name: "Balanced", color: "#38BDF8", points: [{label:"Now",value:15000},{label:"2y",value:32500},{label:"4y",value:54000},{label:"6y",value:81000},{label:"8y",value:116000}] },
    { name: "Growth", color: "#FF2E93", points: [{label:"Now",value:15000},{label:"2y",value:34000},{label:"4y",value:59000},{label:"6y",value:93000},{label:"8y",value:139000}] }
  ] },
  impact: {
    headlines: ["Fed holds rates", "Inflation cools", "Oil prices climb"], active: "Fed holds rates",
    rows: [
      { label: "Savings APY", before: "4.35% est.", after: "4.10% est.", range: "3.90–4.30% estimated" },
      { label: "Card APR", before: "22.4% est.", after: "22.1% est.", range: "21.8–22.4% estimated" },
      { label: "Japan goal", before: "Apr 18 est.", after: "Apr 27 est.", range: "+6–12 days estimated" }
    ]
  }
};
