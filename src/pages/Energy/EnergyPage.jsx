import { useEffect, useState } from 'react'
import { Zap, TrendingDown, BarChart2 } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { getEnergySummary } from '../../api/dashboard'
import Card, { CardHeader } from '../../components/ui/Card'
import StatCard from '../../components/ui/StatCard'
import { PageLoader } from '../../components/ui/Spinner'

export default function EnergyPage() {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getEnergySummary()
      .then(setSummary)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoader />

  const dailyData = summary?.daily_consumption || generateMockDaily()
  const zoneData = summary?.zone_breakdown || []

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Zap} label="Total cette semaine" value={summary?.weekly_kwh ? `${summary.weekly_kwh.toFixed(1)} kWh` : '—'} iconBg="bg-brand-500/10" iconColor="text-brand-500" />
        <StatCard icon={Zap} label="Aujourd'hui" value={summary?.today_kwh ? `${summary.today_kwh.toFixed(1)} kWh` : '—'} iconBg="bg-blue-500/10" iconColor="text-blue-500" />
        <StatCard icon={TrendingDown} label="Économies estimées" value={summary?.savings ? `${summary.savings.toFixed(0)}%` : '—'} iconBg="bg-green-500/10" iconColor="text-green-500" />
        <StatCard icon={BarChart2} label="Intensité moy." value={summary?.avg_intensity ? `${summary.avg_intensity.toFixed(0)}%` : '—'} iconBg="bg-purple-500/10" iconColor="text-purple-500" />
      </div>

      <Card>
        <CardHeader title="Consommation quotidienne" subtitle="Derniers 30 jours (kWh)" />
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={dailyData}>
            <defs>
              <linearGradient id="colorEnergy" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
            <Tooltip
              contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: 'var(--text)' }}
            />
            <Area type="monotone" dataKey="kwh" stroke="#22c55e" fill="url(#colorEnergy)" strokeWidth={2} name="kWh" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {zoneData.length > 0 && (
        <Card>
          <CardHeader title="Consommation par zone" />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={zoneData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="zone" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
              <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="kwh" fill="#3b82f6" radius={[4, 4, 0, 0]} name="kWh" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  )
}

function generateMockDaily() {
  const days = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push({
      date: d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
      kwh: +(Math.random() * 50 + 30).toFixed(1),
    })
  }
  return days
}
