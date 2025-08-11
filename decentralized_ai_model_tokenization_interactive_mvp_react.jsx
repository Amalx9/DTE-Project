import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { Check, Coins, HandCoins, Landmark, LogIn, LogOut, RefreshCw, Rocket, Settings, ShieldCheck, Squirrel, Vote, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
npm install express --save-dev

// NOTE: Removed ToastProvider import and usage to fix runtime error
// "ToastProvider is not defined". We render a lightweight in-app toast below
// using AnimatePresence instead.

// ---------------------------------------------
// Helper utilities
// ---------------------------------------------
const fmt = (n: number, decimals = 2) => n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
const short = (addr: string) => addr.slice(0, 6) + "…" + addr.slice(-4);
const nowISO = () => new Date().toISOString();

// Mock chain constants
const INITIAL_SECURITY_SUPPLY = 1_000_000; // MST (Model Share Token)
const INITIAL_GOV_SUPPLY = 10_000_000; // GOV (Governance Token)

// Colors for charts (kept default-ish; no forced palette beyond library defaults)
const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7f7f", "#8dd1e1", "#a4de6c", "#d0ed57"]; // generic

// Local storage keys
const LS_KEY = "aimodel-tokenization-mvp-v3";

// Types
type Wallet = {
  address: string;
  mst: number; // security token balance
  gov: number; // governance token balance
  usdc: number; // payment token for API & purchases
  claimableUSDC: number; // accrued revenue share (pull model)
  votingPower: number; // derived from staked GOV
  stakedGov: number;
};

type UsageEvent = {
  id: string;
  ts: string; // ISO
  caller: string; // wallet
  feeUSDC: number; // per call
  version: string; // model version
  note?: string;
};

type Proposal = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  endsAt: string; // ISO
  paramChanges: Partial<Params>;
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
  executed: boolean;
};

type Params = {
  apiFeeUSDC: number;
  revenueSharePct: number; // to MST holders
  daoTreasuryPct: number; // to DAO treasury
  buybackPct: number; // buyback MST and burn
  buybackActive: boolean;
  govStakeBoost: number; // x voting power when staked
};

type AppState = {
  wallets: Wallet[];
  connected?: string; // connected address
  totalSupplyMST: number;
  totalSupplyGOV: number;
  circulatingMST: number;
  circulatingGOV: number;
  treasuryUSDC: number; // DAO treasury
  buybackPoolUSDC: number;
  usage: UsageEvent[];
  proposals: Proposal[];
  modelVersion: string;
  params: Params;
};

type TestResult = { name: string; pass: boolean; details?: string };

// ---------------------------------------------
// Seed / persistence
// ---------------------------------------------
const seed = (): AppState => ({
  wallets: [
    { address: "0xDeF1A1C0FFEE000000000000000000000000beef", mst: 100_000, gov: 500_000, usdc: 10_000, claimableUSDC: 0, votingPower: 0, stakedGov: 0 },
    { address: "0xA11CE000000000000000000000000000000c0de", mst: 10_000, gov: 100_000, usdc: 5_000, claimableUSDC: 0, votingPower: 0, stakedGov: 0 },
    { address: "0xB0B0000000000000000000000000000000b0b01", mst: 2_500, gov: 25_000, usdc: 1_000, claimableUSDC: 0, votingPower: 0, stakedGov: 0 },
  ],
  connected: undefined,
  totalSupplyMST: INITIAL_SECURITY_SUPPLY,
  totalSupplyGOV: INITIAL_GOV_SUPPLY,
  circulatingMST: 100_000 + 10_000 + 2_500, // minted to seed wallets
  circulatingGOV: 500_000 + 100_000 + 25_000,
  treasuryUSDC: 0,
  buybackPoolUSDC: 0,
  usage: [],
  proposals: [],
  modelVersion: "v1.0.0",
  params: {
    apiFeeUSDC: 1.0,
    revenueSharePct: 90, // to MST holders
    daoTreasuryPct: 5,
    buybackPct: 5,
    buybackActive: true,
    govStakeBoost: 2,
  },
});

const load = (): AppState => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return seed();
    return JSON.parse(raw);
  } catch {
    return seed();
  }
};

const save = (s: AppState) => localStorage.setItem(LS_KEY, JSON.stringify(s));

// ---------------------------------------------
// Root Component
// ---------------------------------------------
export default function App() {
  const [state, setState] = useState<AppState>(() => load());
  const [toast, setToast] = useState<{ title: string; desc?: string } | null>(null);

  useEffect(() => save(state), [state]);

  // Connected wallet helpers
  const me = useMemo(() => state.wallets.find(w => w.address === state.connected), [state]);
  const mstHolders = useMemo(() => state.wallets.filter(w => w.mst > 0), [state.wallets]);
  const totalMSTHeld = useMemo(() => mstHolders.reduce((a, b) => a + b.mst, 0), [mstHolders]);

  const connect = () => {
    const w = state.wallets[0];
    setState(s => ({ ...s, connected: w.address }));
    setToast({ title: "Wallet connected", desc: `${short(w.address)} is now active.` });
  };
  const disconnect = () => {
    setState(s => ({ ...s, connected: undefined }));
  };

  // -------------------------------------------
  // Actions: simulate IMO purchase of MST
  // -------------------------------------------
  const buyMST = (usdc: number) => {
    if (!me) return;
    if (me.usdc < usdc) return setToast({ title: "Insufficient USDC" });
    const price = 0.5; // demo
    const mst = Math.floor(usdc / price);
    if (mst <= 0) return;
    setState(s => ({
      ...s,
      wallets: s.wallets.map(w =>
        w.address === me.address ? { ...w, usdc: w.usdc - mst * price, mst: w.mst + mst } : w
      ),
      circulatingMST: s.circulatingMST + mst,
    }));
    setToast({ title: "Purchased MST", desc: `You bought ${mst.toLocaleString()} MST` });
  };

  // Airdrop GOV
  const airdropGOV = (amount: number) => {
    if (!me) return;
    setState(s => ({
      ...s,
      wallets: s.wallets.map(w => (w.address === me.address ? { ...w, gov: w.gov + amount } : w)),
      circulatingGOV: s.circulatingGOV + amount,
    }));
    setToast({ title: "Airdrop received", desc: `${fmt(amount, 0)} GOV added` });
  };

  // Stake/Unstake GOV
  const stakeGov = (amount: number) => {
    if (!me) return;
    if (me.gov < amount) return setToast({ title: "Not enough GOV to stake" });
    setState(s => ({
      ...s,
      wallets: s.wallets.map(w =>
        w.address === me.address
          ? { ...w, gov: w.gov - amount, stakedGov: w.stakedGov + amount, votingPower: (w.stakedGov + amount) * s.params.govStakeBoost }
          : w
      ),
    }));
    setToast({ title: "Staked GOV", desc: `Boosted voting power active` });
  };
  const unstakeGov = (amount: number) => {
    if (!me) return;
    if (me.stakedGov < amount) return setToast({ title: "Not enough staked GOV" });
    setState(s => ({
      ...s,
      wallets: s.wallets.map(w =>
        w.address === me.address
          ? { ...w, gov: w.gov + amount, stakedGov: w.stakedGov - amount, votingPower: (w.stakedGov - amount) * s.params.govStakeBoost }
          : w
      ),
    }));
    setToast({ title: "Unstaked GOV" });
  };

  // -------------------------------------------
  // Simulate API usage -> revenue split & buyback
  // -------------------------------------------
  const simulateUsage = (calls: number) => {
    if (!me) return setToast({ title: "Connect a wallet to simulate" });
    const events: UsageEvent[] = [];
    let revenueToHolders = 0;
    let toTreasury = 0;
    let toBuyback = 0;
    for (let i = 0; i < calls; i++) {
      const fee = state.params.apiFeeUSDC;
      revenueToHolders += (fee * state.params.revenueSharePct) / 100;
      toTreasury += (fee * state.params.daoTreasuryPct) / 100;
      toBuyback += (fee * state.params.buybackPct) / 100;
      events.push({ id: crypto.randomUUID(), ts: nowISO(), caller: me.address, feeUSDC: fee, version: state.modelVersion, note: "API call" });
    }

    const updates = state.wallets.map(w => {
      if (w.mst <= 0) return w;
      const share = w.mst / totalMSTHeld;
      const add = revenueToHolders * share;
      return { ...w, claimableUSDC: w.claimableUSDC + add };
    });

    let newCirculatingMST = state.circulatingMST;
    let buybackPoolUSDC = state.buybackPoolUSDC + toBuyback;
    let burnMST = 0;
    if (state.params.buybackActive && totalMSTHeld > 0 && buybackPoolUSDC > 0) {
      const price = 0.5; // demo price; 1 MST = 0.5 USDC
      burnMST = Math.floor(buybackPoolUSDC / price);
      buybackPoolUSDC -= burnMST * price;
      newCirculatingMST = Math.max(0, newCirculatingMST - burnMST);
    }

    setState(s => ({
      ...s,
      wallets: updates,
      usage: [...s.usage, ...events],
      treasuryUSDC: s.treasuryUSDC + toTreasury,
      buybackPoolUSDC,
      circulatingMST: newCirculatingMST,
    }));

    setToast({ title: `Simulated ${calls} API calls`, desc: `Holders +$${fmt(revenueToHolders)} | DAO +$${fmt(toTreasury)}${burnMST > 0 ? ` | Burned ${burnMST.toLocaleString()} MST` : ""}` });
  };

  const claimRevenue = () => {
    if (!me) return;
    if (me.claimableUSDC <= 0) return setToast({ title: "Nothing to claim yet" });
    setState(s => ({
      ...s,
      wallets: s.wallets.map(w => (w.address === me.address ? { ...w, usdc: w.usdc + w.claimableUSDC, claimableUSDC: 0 } : w)),
    }));
    setToast({ title: "Revenue claimed", desc: `USDC transferred to your wallet` });
  };

  // -------------------------------------------
  // Governance: propose + vote + execute
  // -------------------------------------------
  const createProposal = (p: Omit<Proposal, "id" | "createdAt" | "forVotes" | "againstVotes" | "abstainVotes" | "executed">) => {
    const newP: Proposal = { id: crypto.randomUUID(), createdAt: nowISO(), forVotes: 0, againstVotes: 0, abstainVotes: 0, executed: false, ...p };
    setState(s => ({ ...s, proposals: [newP, ...s.proposals] }));
    setToast({ title: "Proposal created", desc: p.title });
  };

  const vote = (id: string, choice: "for" | "against" | "abstain") => {
    if (!me) return;
    const power = me.votingPower || me.gov; // staked boost preferred
    if (power <= 0) return setToast({ title: "No voting power", desc: "Stake GOV to gain votes" });
    setState(s => ({
      ...s,
      proposals: s.proposals.map(p => {
        if (p.id !== id) return p;
        if (new Date(p.endsAt).getTime() < Date.now()) return p; // expired
        if (choice === "for") return { ...p, forVotes: p.forVotes + power };
        if (choice === "against") return { ...p, againstVotes: p.againstVotes + power };
        return { ...p, abstainVotes: p.abstainVotes + power };
      }),
    }));
    setToast({ title: "Vote cast", desc: `${choice.toUpperCase()} with ${fmt(power, 0)} votes` });
  };

  const execute = (id: string) => {
    setState(s => ({
      ...s,
      proposals: s.proposals.map(p => {
        if (p.id !== id || p.executed || new Date(p.endsAt).getTime() > Date.now()) return p;
        const passed = p.forVotes > p.againstVotes;
        if (!passed) return { ...p, executed: true };
        // apply param changes
        const newParams: Params = { ...s.params, ...p.paramChanges };
        return { ...p, executed: true, description: p.description + "\n\n✅ Executed" } as Proposal;
      }),
      params: (() => {
        const prop = s.proposals.find(pp => pp.id === id);
        if (!prop) return s.params;
        if (new Date(prop.endsAt).getTime() > Date.now() || prop.executed === true) return s.params;
        if (prop.forVotes <= prop.againstVotes) return s.params;
        return { ...s.params, ...prop.paramChanges };
      })(),
    }));
    setToast({ title: "Proposal executed" });
  };

  // -------------------------------------------
  // Derived views
  // -------------------------------------------
  const pieData = useMemo(() => (
    [
      { name: "Holders (RevShare)", value: state.params.revenueSharePct },
      { name: "DAO Treasury", value: state.params.daoTreasuryPct },
      { name: "Buyback", value: state.params.buybackPct },
    ]
  ), [state.params]);

  const usageChartData = useMemo(() => {
    const byMinute = new Map<string, number>();
    state.usage.forEach(e => {
      const minute = new Date(e.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      byMinute.set(minute, (byMinute.get(minute) || 0) + 1);
    });
    return Array.from(byMinute.entries()).map(([t, c]) => ({ t, calls: c }));
  }, [state.usage]);

  // -------------------------------------------
  // Lightweight self-tests (added because there were none)
  // -------------------------------------------
  const selfTests: TestResult[] = useMemo(() => {
    const results: TestResult[] = [];
    // 1) Split sums to 100
    const splitSum = state.params.revenueSharePct + state.params.daoTreasuryPct + state.params.buybackPct;
    results.push({ name: "Revenue split sums to 100%", pass: splitSum === 100, details: `sum=${splitSum}` });

    // 2) Pro-rata distribution math stays non-negative
    const fee = state.params.apiFeeUSDC;
    const revShare = (fee * state.params.revenueSharePct) / 100;
    const proRataTotal = mstHolders.reduce((acc, w) => acc + (w.mst / (totalMSTHeld || 1)) * revShare, 0);
    results.push({ name: "Pro-rata distribution ≈ revenue share", pass: Math.abs(proRataTotal - revShare) < 1e-6, details: `calc=${proRataTotal.toFixed(6)} vs ${revShare.toFixed(6)}` });

    // 3) Buyback never burns negative
    const price = 0.5;
    const pool = (fee * state.params.buybackPct) / 100;
    const burn = Math.floor(pool / price);
    results.push({ name: "Buyback burn is safe (>=0)", pass: burn >= 0, details: `burn=${burn}` });

    return results;
  }, [state.params, mstHolders, totalMSTHeld]);

  // -------------------------------------------
  // UI Components
  // -------------------------------------------
  return (
    <>
      <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 to-white text-slate-900">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          <header className="flex items-center justify-between gap-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-2xl bg-slate-900 text-white grid place-items-center shadow">
                <Squirrel className="size-6" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold">Decentralized AI Model Tokenization</h1>
                <p className="text-sm text-slate-500">Interactive MVP • Dual-token model • Usage → Revenue → Payouts • On-chain style simulation</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {state.connected ? (
                <Button variant="secondary" onClick={disconnect}><LogOut className="mr-2 size-4"/>Disconnect {short(state.connected)}</Button>
              ) : (
                <Button onClick={connect}><LogIn className="mr-2 size-4"/>Connect Wallet</Button>
              )}
            </div>
          </header>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid grid-cols-2 md:grid-cols-6 w-full">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="mintsale">IMO / Tokenomics</TabsTrigger>
              <TabsTrigger value="usage">Model Usage</TabsTrigger>
              <TabsTrigger value="revenue">Revenue & Payouts</TabsTrigger>
              <TabsTrigger value="governance">Governance</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview" className="space-y-4 pt-4">
              <div className="grid md:grid-cols-3 gap-4">
                <Card className="col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Rocket className="size-5"/> Live Model</CardTitle>
                    <CardDescription>Version {state.modelVersion} • API fee ${fmt(state.params.apiFeeUSDC)}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="p-4 rounded-2xl bg-slate-50">
                        <p className="text-sm text-slate-500">Circulating MST</p>
                        <p className="text-2xl font-semibold">{state.circulatingMST.toLocaleString()}</p>
                        <p className="text-xs text-slate-500">of {state.totalSupplyMST.toLocaleString()} total</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-50">
                        <p className="text-sm text-slate-500">Circulating GOV</p>
                        <p className="text-2xl font-semibold">{state.circulatingGOV.toLocaleString()}</p>
                        <p className="text-xs text-slate-500">of {state.totalSupplyGOV.toLocaleString()} total</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-50">
                        <p className="text-sm text-slate-500">DAO Treasury</p>
                        <p className="text-2xl font-semibold">${fmt(state.treasuryUSDC)}</p>
                        <p className="text-xs text-slate-500">Buyback pool: ${fmt(state.buybackPoolUSDC)}</p>
                      </div>
                    </div>
                    <Separator className="my-4"/>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={usageChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="t" />
                          <YAxis />
                          <ReTooltip />
                          <Line type="monotone" dataKey="calls" stroke="#8884d8" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                  <CardFooter className="text-sm text-slate-500">Usage is indexed from your local session. Simulate calls in the “Model Usage” tab.</CardFooter>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ShieldCheck className="size-5"/> Revenue Split</CardTitle>
                    <CardDescription>Holders vs DAO vs Buyback</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={80}>
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <ReTooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className="text-sm space-y-1">
                      <li>• {state.params.revenueSharePct}% → MST holders</li>
                      <li>• {state.params.daoTreasuryPct}% → DAO treasury</li>
                      <li>• {state.params.buybackPct}% → Buyback & burn (MST)</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>My Wallet</CardTitle>
                  <CardDescription>Simulated balances (no real blockchain)</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-4 gap-4">
                  <Stat label="USDC" value={`$${fmt(me?.usdc || 0)}`} />
                  <Stat label="MST (security)" value={fmt(me?.mst || 0, 0)} />
                  <Stat label="GOV (governance)" value={fmt(me?.gov || 0, 0)} />
                  <Stat label="Claimable revenue" value={`$${fmt(me?.claimableUSDC || 0)}`} />
                </CardContent>
                <CardFooter className="flex flex-wrap gap-2">
                  <Button onClick={claimRevenue} disabled={!me || (me?.claimableUSDC || 0) <= 0}><HandCoins className="mr-2 size-4"/>Claim</Button>
                  <Button variant="secondary" onClick={() => setState(seed())}><RefreshCw className="mr-2 size-4"/>Reset Demo</Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* IMO / Tokenomics */}
            <TabsContent value="mintsale" className="space-y-4 pt-4">
              <div className="grid md:grid-cols-3 gap-4">
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Landmark className="size-5"/> Initial Model Offering (IMO)</CardTitle>
                    <CardDescription>Buy MST with USDC (demo price 1 MST = 0.5 USDC)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <BuyBox onBuy={buyMST} connected={!!me} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Airdrop GOV</CardTitle>
                    <CardDescription>Bootstrap governance participation</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AirdropBox onAirdrop={(amt) => airdropGOV(amt)} connected={!!me} />
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Token Supplies</CardTitle>
                  <CardDescription>Fixed MST supply • Broad GOV distribution</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-3 gap-4">
                  <ProgressCard label="MST Circulating" value={state.circulatingMST} total={state.totalSupplyMST} />
                  <ProgressCard label="GOV Circulating" value={state.circulatingGOV} total={state.totalSupplyGOV} />
                  <div className="p-4 rounded-2xl border bg-white">
                    <p className="text-sm text-slate-500 mb-2">Buyback Pool</p>
                    <p className="text-2xl font-semibold">${fmt(state.buybackPoolUSDC)}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <Switch checked={state.params.buybackActive} onCheckedChange={(v) => setState(s => ({ ...s, params: { ...s.params, buybackActive: v } }))} />
                      <span className="text-sm">Enable automatic buybacks</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Model Usage */}
            <TabsContent value="usage" className="space-y-4 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Coins className="size-5"/> Simulate API Calls</CardTitle>
                  <CardDescription>Each call pays a fee and updates on-chain-style logs locally</CardDescription>
                </CardHeader>
                <CardContent>
                  <UsageSimulator onUse={simulateUsage} fee={state.params.apiFeeUSDC} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Usage</CardTitle>
                  <CardDescription>Latest 20 events</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-auto max-h-72 rounded-xl border">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="text-left p-2">Time</th>
                          <th className="text-left p-2">Caller</th>
                          <th className="text-left p-2">Version</th>
                          <th className="text-left p-2">Fee (USDC)</th>
                          <th className="text-left p-2">Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {state.usage.slice(-20).reverse().map(u => (
                          <tr key={u.id} className="odd:bg-white even:bg-slate-50/50">
                            <td className="p-2">{new Date(u.ts).toLocaleString()}</td>
                            <td className="p-2 font-mono">{short(u.caller)}</td>
                            <td className="p-2">{u.version}</td>
                            <td className="p-2">{fmt(u.feeUSDC)}</td>
                            <td className="p-2">{u.note || ""}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Revenue */}
            <TabsContent value="revenue" className="space-y-4 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Payouts (Pull Model)</CardTitle>
                  <CardDescription>Revenue accumulates per holder; claim when ready</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    {state.wallets.map(w => (
                      <div key={w.address} className="p-4 rounded-2xl border bg-white">
                        <p className="text-xs text-slate-500">{short(w.address)}</p>
                        <p className="text-sm">MST: {fmt(w.mst, 0)}</p>
                        <p className="text-sm">Claimable: ${fmt(w.claimableUSDC)}</p>
                        {w.address === state.connected && (
                          <Button className="mt-2" size="sm" onClick={claimRevenue} disabled={w.claimableUSDC <= 0}>Claim</Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="text-sm text-slate-500">This demo uses a claimable/"pull" approach similar to many dividend/reward contracts.</CardFooter>
              </Card>
            </TabsContent>

            {/* Governance */}
            <TabsContent value="governance" className="space-y-4 pt-4">
              <div className="grid md:grid-cols-3 gap-4">
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Vote className="size-5"/> Active Proposals</CardTitle>
                    <CardDescription>Create, vote, execute</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ProposalList proposals={state.proposals} onVote={vote} onExecute={execute} now={Date.now()} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>New Proposal</CardTitle>
                    <CardDescription>Adjust protocol parameters</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <NewProposalForm onCreate={createProposal} params={state.params} />
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Stake GOV for Voting Power</CardTitle>
                  <CardDescription>Stake boosts your voting weight ×{state.params.govStakeBoost}</CardDescription>
                </CardHeader>
                <CardContent>
                  <StakeBox me={me} onStake={stakeGov} onUnstake={unstakeGov} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings */}
            <TabsContent value="settings" className="space-y-4 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Settings className="size-5"/> Protocol Parameters</CardTitle>
                  <CardDescription>Admin-ish panel (simulated)</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6">
                  <ParamSlider label="API Fee (USDC)" min={0.1} max={5} step={0.1} value={state.params.apiFeeUSDC} onChange={(v) => setState(s => ({ ...s, params: { ...s.params, apiFeeUSDC: v } }))} />
                  <ParamSlider label="Revenue → Holders %" min={50} max={95} step={1} value={state.params.revenueSharePct} onChange={(v) => setState(s => ({ ...s, params: { ...s.params, revenueSharePct: v, daoTreasuryPct: Math.max(0, 100 - v - s.params.buybackPct) } }))} />
                  <ParamSlider label="Buyback %" min={0} max={20} step={1} value={state.params.buybackPct} onChange={(v) => setState(s => ({ ...s, params: { ...s.params, buybackPct: v, daoTreasuryPct: Math.max(0, 100 - v - s.params.revenueSharePct) } }))} />
                  <ParamSlider label="Gov Stake Boost ×" min={1} max={5} step={0.5} value={state.params.govStakeBoost} onChange={(v) => setState(s => ({ ...s, params: { ...s.params, govStakeBoost: v } }))} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>About this MVP</CardTitle>
                  <CardDescription>What’s real and what’s simulated</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li>Simulates dual-token design: MST (security-like) and GOV (governance).</li>
                    <li>Usage calls stream fees → split to holders / DAO / buyback (with optional MST burn).</li>
                    <li>Pull-based payouts: claim accumulated USDC any time.</li>
                    <li>DAO governance: create proposals, vote with boosted staked GOV, execute parameter changes.</li>
                    <li>Everything is local to your browser; no real blockchain calls are made.</li>
                  </ul>
                </CardContent>
              </Card>

              {/* Self-tests */}
              <Card>
                <CardHeader>
                  <CardTitle>Self-Tests (MVP)</CardTitle>
                  <CardDescription>Quick checks to ensure core invariants hold</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {selfTests.map((t, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        {t.pass ? <Check className="mt-0.5 size-4"/> : <XCircle className="mt-0.5 size-4"/>}
                        <span className={t.pass ? "text-slate-700" : "text-red-600"}>
                          <span className="font-medium">{t.name}:</span> {t.pass ? "PASS" : "FAIL"}{t.details ? ` — ${t.details}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Lightweight toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-4 right-4"
          >
            <Card className="shadow-lg border-slate-200">
              <CardHeader className="py-3">
                <CardTitle className="text-base">{toast.title}</CardTitle>
                {toast.desc && <CardDescription>{toast.desc}</CardDescription>}
              </CardHeader>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ---------------------------------------------
// Small components
// ---------------------------------------------
function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="p-4 rounded-2xl border bg-white">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}

function ProgressCard({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = Math.min(100, Math.round((value / total) * 100));
  return (
    <div className="p-4 rounded-2xl border bg-white">
      <p className="text-sm text-slate-500 mb-1">{label}</p>
      <div className="flex items-end justify-between">
        <p className="text-2xl font-semibold">{value.toLocaleString()}</p>
        <p className="text-sm text-slate-500">{pct}%</p>
      </div>
      <Progress className="mt-2" value={pct} />
    </div>
  );
}

function BuyBox({ onBuy, connected }: { onBuy: (usdc: number) => void; connected: boolean }) {
  const [amt, setAmt] = useState(50);
  return (
    <div className="grid md:grid-cols-3 gap-4 items-end">
      <div className="md:col-span-2">
        <Label className="text-sm">Spend (USDC)</Label>
        <Input type="number" value={amt} onChange={e => setAmt(parseFloat(e.target.value || "0"))} min={1} />
        <p className="text-xs text-slate-500 mt-1">Demo price: 1 MST = 0.5 USDC</p>
      </div>
      <Button disabled={!connected || amt <= 0} onClick={() => onBuy(amt)}>
        <Coins className="mr-2 size-4"/> Buy MST
      </Button>
    </div>
  );
}

function AirdropBox({ onAirdrop, connected }: { onAirdrop: (amt: number) => void; connected: boolean }) {
  const [amt, setAmt] = useState(5_000);
  return (
    <div className="grid md:grid-cols-3 gap-4 items-end">
      <div className="md:col-span-2">
        <Label className="text-sm">Airdrop amount (GOV)</Label>
        <Input type="number" value={amt} onChange={e => setAmt(parseFloat(e.target.value || "0"))} min={100} />
        <p className="text-xs text-slate-500 mt-1">Useful for testing governance voting</p>
      </div>
      <Button disabled={!connected || amt <= 0} onClick={() => onAirdrop(amt)}>
        <Check className="mr-2 size-4"/> Receive GOV
      </Button>
    </div>
  );
}

function UsageSimulator({ onUse, fee }: { onUse: (calls: number) => void; fee: number }) {
  const [calls, setCalls] = useState(10);
  return (
    <div className="grid md:grid-cols-3 gap-4 items-end">
      <div className="md:col-span-2">
        <Label className="text-sm">Number of API calls</Label>
        <Input type="number" value={calls} onChange={e => setCalls(parseInt(e.target.value || "0", 10))} min={1} />
        <p className="text-xs text-slate-500 mt-1">Each call pays a fee of ${fmt(fee)}</p>
      </div>
      <Button onClick={() => onUse(Math.max(1, calls))}><Coins className="mr-2 size-4"/> Run Simulation</Button>
    </div>
  );
}

function ParamSlider({ label, min, max, step, value, onChange }: { label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <div className="p-4 rounded-2xl border bg-white">
      <p className="text-sm text-slate-500 mb-1">{label}: <span className="font-medium">{v}</span></p>
      <Slider defaultValue={[v]} min={min} max={max} step={step} onValueChange={(val) => setV(val[0])} onValueCommit={(val) => onChange(val[0])} />
    </div>
  );
}

function NewProposalForm({ onCreate, params }: { onCreate: (p: Omit<Proposal, "id" | "createdAt" | "forVotes" | "againstVotes" | "abstainVotes" | "executed">) => void; params: Params }) {
  const [title, setTitle] = useState("Reduce API fee by 10% and increase buyback by 2%");
  const [desc, setDesc] = useState("Tweak parameters to encourage usage and long-term value accrual.");
  const [days, setDays] = useState(2);
  const [changes, setChanges] = useState<Partial<Params>>({});

  const create = () => {
    const endsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    onCreate({ title, description: desc, endsAt, paramChanges: changes });
    setTitle(""); setDesc(""); setChanges({});
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-sm">Title</Label>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Proposal title" />
      </div>
      <div>
        <Label className="text-sm">Description</Label>
        <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="What/Why" />
      </div>
      <div>
        <Label className="text-sm">Voting window (days)</Label>
        <Input type="number" value={days} onChange={e => setDays(parseInt(e.target.value || "1", 10))} min={1} />
      </div>
      <Separator />
      <p className="text-sm text-slate-500">Parameter changes</p>
      <div className="grid grid-cols-2 gap-2">
        <MiniNum label="API Fee" value={params.apiFeeUSDC} onChange={(v) => setChanges({ ...changes, apiFeeUSDC: v })} />
        <MiniNum label="Holders %" value={params.revenueSharePct} onChange={(v) => setChanges({ ...changes, revenueSharePct: v })} />
        <MiniNum label="Buyback %" value={params.buybackPct} onChange={(v) => setChanges({ ...changes, buybackPct: v })} />
        <MiniNum label="Gov Boost ×" value={params.govStakeBoost} onChange={(v) => setChanges({ ...changes, govStakeBoost: v })} />
      </div>
      <Button onClick={create}><Vote className="mr-2 size-4"/> Create Proposal</Button>
    </div>
  );
}

function MiniNum({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const [v, setV] = useState<number | string>(value);
  useEffect(() => setV(value), [value]);
  return (
    <div className="p-2 rounded-xl border bg-white">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <Input value={v} onChange={e => setV(e.target.value)} onBlur={() => onChange(parseFloat(String(v)))} />
    </div>
  );
}

function ProposalList({ proposals, onVote, onExecute, now }: { proposals: Proposal[]; onVote: (id: string, c: "for" | "against" | "abstain") => void; onExecute: (id: string) => void; now: number }) {
  if (proposals.length === 0) return <p className="text-sm text-slate-500">No proposals yet.</p>;
  return (
    <div className="space-y-3">
      {proposals.map(p => {
        const ends = new Date(p.endsAt).getTime();
        const remaining = Math.max(0, ends - now);
        const mins = Math.round(remaining / 60000);
        const total = p.forVotes + p.againstVotes + p.abstainVotes;
        const forPct = total ? Math.round((p.forVotes / total) * 100) : 0;
        const againstPct = total ? Math.round((p.againstVotes / total) * 100) : 0;
        const abstainPct = total ? Math.round((p.abstainVotes / total) * 100) : 0;
        const closed = remaining === 0;
        return (
          <div key={p.id} className="p-4 rounded-2xl border bg-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{p.title}</p>
                <p className="text-sm text-slate-500">{p.description}</p>
              </div>
              <div className="text-xs text-slate-500">{closed ? "Closed" : `${mins} min left`}</div>
            </div>
            <div className="grid md:grid-cols-3 gap-2 mt-3">
              <div className="p-3 rounded-xl bg-slate-50">
                <p className="text-xs">FOR</p>
                <Progress value={forPct} className="mt-1" />
                <p className="text-xs mt-1 text-slate-500">{fmt(p.forVotes, 0)} votes</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <p className="text-xs">AGAINST</p>
                <Progress value={againstPct} className="mt-1" />
                <p className="text-xs mt-1 text-slate-500">{fmt(p.againstVotes, 0)} votes</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <p className="text-xs">ABSTAIN</p>
                <Progress value={abstainPct} className="mt-1" />
                <p className="text-xs mt-1 text-slate-500">{fmt(p.abstainVotes, 0)} votes</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button size="sm" variant="secondary" onClick={() => onVote(p.id, "for")} disabled={closed || p.executed}>For</Button>
              <Button size="sm" variant="secondary" onClick={() => onVote(p.id, "against")} disabled={closed || p.executed}>Against</Button>
              <Button size="sm" variant="secondary" onClick={() => onVote(p.id, "abstain")} disabled={closed || p.executed}>Abstain</Button>
              <Button size="sm" onClick={() => onExecute(p.id)} disabled={!closed || p.executed}>Execute</Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StakeBox({ me, onStake, onUnstake }: { me?: Wallet; onStake: (amt: number) => void; onUnstake: (amt: number) => void }) {
  const [amt, setAmt] = useState(1000);
  return (
    <div className="grid md:grid-cols-3 gap-4 items-end">
      <div className="md:col-span-2">
        <p className="text-sm">Your GOV: <span className="font-medium">{fmt(me?.gov || 0, 0)}</span> • Staked: <span className="font-medium">{fmt(me?.stakedGov || 0, 0)}</span> • Voting power: <span className="font-medium">{fmt(me?.votingPower || (me?.gov || 0), 0)}</span></p>
        <Input type="number" value={amt} onChange={e => setAmt(parseFloat(e.target.value || "0"))} min={100} />
      </div>
      <div className="flex gap-2">
        <Button onClick={() => onStake(amt)} disabled={!me || amt <= 0}>Stake</Button>
        <Button variant="secondary" onClick={() => onUnstake(amt)} disabled={!me || amt <= 0}>Unstake</Button>
      </div>
    </div>
  );
}
