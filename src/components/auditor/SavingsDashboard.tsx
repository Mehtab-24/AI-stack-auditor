import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from "recharts";
import { CountUp } from "./CountUp";
import { AgentTracePanel } from "./AgentTracePanel";
import {
  totalMonthlySavings,
  totalAnnualSavings,
  totalToolsFlagged,
  totalToolsDiscovered,
  spendByCategory,
} from "@/lib/mockData";

const stats = [
  { label: "Annual savings", value: totalAnnualSavings, prefix: "$" },
  { label: "Tools flagged", value: totalToolsFlagged },
  { label: "AI tools discovered", value: totalToolsDiscovered },
];

export function SavingsDashboard() {
  return (
    <div className="mx-auto max-w-6xl space-y-10 px-6 py-10">
      <section className="text-center">
        <div className="text-xs uppercase tracking-widest text-white/50">
          Estimated monthly savings
        </div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mt-2 text-6xl font-semibold tracking-tight text-accent sm:text-8xl"
        >
          <CountUp to={totalMonthlySavings} prefix="$" suffix="/mo" />
        </motion.div>
        <p className="mx-auto mt-4 max-w-lg text-sm text-white/60">
          Across your AI subscriptions. Review the findings and approve actions to lock in
          savings — nothing is cancelled automatically.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.08, duration: 0.4 }}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
          >
            <div className="text-xs uppercase tracking-wider text-white/40">{s.label}</div>
            <div className="mt-2 text-3xl font-semibold text-white">
              <CountUp to={s.value} prefix={s.prefix ?? ""} />
            </div>
          </motion.div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 lg:col-span-2">
          <div className="mb-4 flex items-baseline justify-between">
            <div>
              <div className="text-sm font-medium text-white">Spend by category</div>
              <div className="text-xs text-white/50">Monthly, in USD</div>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spendByCategory} margin={{ left: -20 }}>
                <XAxis
                  dataKey="category"
                  stroke="rgba(255,255,255,0.4)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.4)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  contentStyle={{
                    background: "#111",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="spend" radius={[6, 6, 0, 0]}>
                  {spendByCategory.map((_, i) => (
                    <Cell key={i} fill="#22D97A" fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <AgentTracePanel compact />
      </section>
    </div>
  );
}
