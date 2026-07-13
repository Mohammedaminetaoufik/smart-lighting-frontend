import { useQuery } from '@tanstack/react-query'
import { Sunrise, Sunset, Moon, Sun } from 'lucide-react'
import { getSunTimes } from '../../api/astronomy'

function fmtTime(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return '—'
  }
}

export default function SunScheduleCard() {
  const { data } = useQuery({
    queryKey: ['sun-times'],
    queryFn: () => getSunTimes(),
    staleTime: 30 * 60_000, // 30 min
  })

  const isNight = data?.is_night
  const daylight = data?.daylight_hours

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[14px] font-semibold text-[var(--text)]">Calendrier astronomique</p>
          <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
            Allumage crépusculaire automatique (coucher → lever du soleil)
          </p>
        </div>
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
            isNight
              ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30'
              : 'text-amber-500 bg-amber-500/10 border-amber-500/30'
          }`}
        >
          {isNight ? <Moon size={11} /> : <Sun size={11} />}
          {isNight ? 'Nuit — éclairage actif' : 'Jour — éclairage éteint'}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center mb-2">
            <Sunrise size={15} className="text-amber-500" />
          </div>
          <p className="text-[18px] font-bold text-[var(--text)]">{fmtTime(data?.sunrise)}</p>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Lever · extinction</p>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center mb-2">
            <Sunset size={15} className="text-indigo-400" />
          </div>
          <p className="text-[18px] font-bold text-[var(--text)]">{fmtTime(data?.sunset)}</p>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Coucher · allumage</p>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center mb-2">
            <Sun size={15} className="text-blue-500" />
          </div>
          <p className="text-[18px] font-bold text-[var(--text)]">
            {daylight != null ? `${daylight.toFixed(1)} h` : '—'}
          </p>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Durée du jour</p>
        </div>
      </div>
    </div>
  )
}
