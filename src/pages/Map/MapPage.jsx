import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useTheme } from '../../context/ThemeContext'
import {
  MapContainer, TileLayer, Marker, Circle, Polyline,
  Tooltip, Popup, useMap, ZoomControl, useMapEvents,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import toast from 'react-hot-toast'
import { getLampadaires, getMissingLocation, updateLocation, setDimming as apiSetDimming, getLatestTelemetry, assignLCU as apiAssignLCU } from '../../api/lampadaires'
import { getLCUs, createLCU as apiCreateLCU } from '../../api/lcus'
import { PageLoader } from '../../components/ui/Spinner'
import Button from '../../components/ui/Button'
import {
  Search, X, Zap, Wifi, WifiOff, Wrench, Radio,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Layers, RefreshCw, Power, PowerOff,
  AlertTriangle, Thermometer, Eye, Activity, MapPin,
  LocateFixed, SkipForward, Plus,
} from 'lucide-react'
import { cn } from '../../utils/helpers'

/* ──────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────── */
const STATUS = {
  online:      { hex: '#22c55e', label: 'En ligne',    icon: Wifi,    tw: 'text-green-400' },
  offline:     { hex: '#ef4444', label: 'Hors ligne',  icon: WifiOff, tw: 'text-red-400'   },
  maintenance: { hex: '#f59e0b', label: 'Maintenance', icon: Wrench,  tw: 'text-amber-400' },
}

const TILES = {
  'Dark Pro':  { url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', attr: '© CARTO', maxNativeZoom: 21 },
  'Clair':     { url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', attr: '© CARTO', maxNativeZoom: 21 },
  'Satellite': { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attr: '© Esri', maxNativeZoom: 19 },
}

const LCU_RADIUS = 600  // metres — visual coverage zone

/* ──────────────────────────────────────────────────────────────
   MARKER FACTORIES
───────────────────────────────────────────────────────────── */
function makeLampIcon(etat, isSelected, hasAlert, intensity = 0) {
  const isLit    = intensity > 0
  const etatColor = STATUS[etat]?.hex || '#6b7280'

  // fill = ON/OFF state  (green when lit, dark gray when off)
  const fill  = isLit ? '#22c55e' : '#374151'
  // ring = etat status color (online=green, offline=red, maintenance=amber)
  const ring  = etatColor

  const dim   = isSelected ? 20 : 14
  const outer = dim + 16

  // glow only when lit
  const glow = isLit
    ? isSelected
      ? `0 0 0 3px rgba(255,255,255,0.85), 0 0 20px rgba(34,197,94,0.8), 0 0 40px rgba(34,197,94,0.35)`
      : `0 0 10px rgba(34,197,94,0.7), 0 0 24px rgba(34,197,94,0.3)`
    : isSelected
      ? `0 0 0 3px rgba(255,255,255,0.7), 0 2px 8px rgba(0,0,0,0.5)`
      : `0 2px 6px rgba(0,0,0,0.4)`

  const alertRing = hasAlert
    ? `<div class="marker-alert-ring" style="
        position:absolute;top:50%;left:50%;
        transform:translate(-50%,-50%);
        width:${dim + 14}px;height:${dim + 14}px;
        border-radius:50%;border:2px solid #ef4444;
        pointer-events:none;"></div>`
    : ''

  const intensityArc = isLit ? buildArc(intensity) : ''

  const html = `
    <div style="position:relative;width:${outer}px;height:${outer}px;display:flex;align-items:center;justify-content:center;">
      ${alertRing}
      <svg width="${outer}" height="${outer}" viewBox="0 0 40 40" style="position:absolute;top:0;left:0;">
        <circle cx="20" cy="20" r="18" fill="none" stroke="${ring}" stroke-width="1.5" stroke-opacity="${isLit ? '0.5' : '0.25'}"/>
        ${intensityArc}
      </svg>
      <div style="
        width:${dim}px;height:${dim}px;border-radius:50%;
        background:${fill};
        box-shadow:${glow};
        border:2px solid rgba(255,255,255,${isSelected ? '0.95' : isLit ? '0.75' : '0.25'});
        position:relative;z-index:1;
        display:flex;align-items:center;justify-content:center;
        transition: background 0.3s, box-shadow 0.3s;
      ">
        ${isLit
          ? `<div style="width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,0.95);box-shadow:0 0 4px white;"></div>`
          : `<div style="width:4px;height:4px;border-radius:50%;background:rgba(255,255,255,0.2);"></div>`
        }
      </div>
    </div>`

  return L.divIcon({
    html,
    className: '',
    iconSize:   [outer, outer],
    iconAnchor: [outer / 2, outer / 2],
  })
}

function buildArc(pct) {
  if (!pct || pct <= 0) return ''
  const r = 18, cx = 20, cy = 20
  const startAngle = -90
  const endAngle   = startAngle + (pct / 100) * 360
  const start = polarToCart(cx, cy, r, startAngle)
  const end   = polarToCart(cx, cy, r, endAngle)
  const large = (pct / 100) * 360 > 180 ? 1 : 0
  return `<path d="M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}"
    fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="2.5" stroke-linecap="round"/>`
}
function polarToCart(cx, cy, r, deg) {
  const rad = (deg * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function makeLCUIcon(ref, count, isSelected) {
  const glow = isSelected ? 'box-shadow:0 0 0 3px rgba(255,255,255,0.8),0 0 20px #3b82f688;' : 'box-shadow:0 4px 14px rgba(59,130,246,0.5);'
  const html = `
    <div style="
      background:linear-gradient(135deg,#1e40af,#3b82f6);
      border:2px solid rgba(255,255,255,${isSelected ? '0.9' : '0.35'});
      border-radius:12px;padding:5px 10px;
      color:white;font-size:11px;font-weight:700;
      white-space:nowrap;${glow}
      display:flex;align-items:center;gap:6px;
      font-family:'Inter',sans-serif;letter-spacing:0.02em;
    ">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round">
        <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
        <path d="M1.42 9a16 16 0 0 1 21.16 0"/>
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
        <circle cx="12" cy="20" r="1.5" fill="white"/>
      </svg>
      ${ref}
      <span style="background:rgba(255,255,255,0.2);border-radius:20px;padding:1px 6px;font-size:10px;">${count}</span>
    </div>`
  return L.divIcon({ html, className: '', iconSize: [null, 30], iconAnchor: [0, 30] })
}

/* ──────────────────────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────────────────────── */
function FitBounds({ points }) {
  const map = useMap()
  useEffect(() => {
    if (points.length > 1)
      map.fitBounds(L.latLngBounds(points), { padding: [60, 60], maxZoom: 19 })
    else if (points.length === 1)
      map.setView(points[0], 18)
  }, [])
  return null
}

function MapController({ mapRef }) {
  const map = useMap()
  useEffect(() => { mapRef.current = map }, [map, mapRef])
  return null
}

function MapClickHandler({ onClose, onPlace, placing, addingLCU, onDropLCU }) {
  const map = useMap()
  useEffect(() => {
    map.getContainer().style.cursor = (placing || addingLCU) ? 'crosshair' : ''
    return () => { map.getContainer().style.cursor = '' }
  }, [placing, addingLCU, map])

  useMapEvents({
    click(e) {
      if (placing) {
        onPlace(e.latlng.lat, e.latlng.lng)
      } else if (addingLCU) {
        onDropLCU(e.latlng)
      } else {
        onClose()
      }
    },
  })
  return null
}

/* ──────────────────────────────────────────────────────────────
   LAMP TOGGLE — green pill when ON, dark when OFF
───────────────────────────────────────────────────────────── */
function LampToggle({ lamp, onToggle, disabled, size = 'sm' }) {
  const isOn = (lamp.intensite ?? 0) > 0
  const w = size === 'xs' ? 28 : 34
  const h = size === 'xs' ? 15 : 18
  const knob = h - 4
  const travel = w - knob - 4
  return (
    <button
      onClick={() => onToggle(lamp, !isOn)}
      disabled={disabled}
      title={isOn ? 'Éteindre' : 'Allumer'}
      style={{
        position: 'relative',
        width: w, height: h,
        borderRadius: h,
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: isOn ? '#22c55e' : 'rgba(255,255,255,0.14)',
        boxShadow: isOn ? '0 0 8px rgba(34,197,94,0.55), inset 0 1px 0 rgba(255,255,255,0.2)' : 'inset 0 1px 0 rgba(255,255,255,0.06)',
        transition: 'background 0.22s, box-shadow 0.22s',
        opacity: disabled ? 0.45 : 1,
        flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute',
        top: 2, left: 2,
        width: knob, height: knob,
        borderRadius: '50%',
        background: 'white',
        boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
        transform: isOn ? `translateX(${travel}px)` : 'translateX(0)',
        transition: 'transform 0.22s cubic-bezier(0.4,0,0.2,1)',
        display: 'block',
      }} />
    </button>
  )
}

/* ──────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */
export default function MapPage() {
  const [lamps,       setLamps]       = useState([])
  const [lcus,        setLCUs]        = useState([])
  const [missing,     setMissing]     = useState([])   // lamps without GPS
  const [selected,    setSelected]    = useState(null) // { type:'lamp'|'lcu', data }
  const [loading,     setLoading]     = useState(true)
  const [filters,     setFilters]     = useState({ online:true, offline:true, maintenance:true })
  const [search,      setSearch]      = useState('')
  const { theme } = useTheme()
  const [tile,        setTile]        = useState(theme === 'dark' ? 'Dark Pro' : 'Clair')
  const [sideOpen,    setSideOpen]    = useState(true)
  const [showZones,   setShowZones]   = useState(true)
  const [showLines,   setShowLines]   = useState(true)
  const [placing,     setPlacing]     = useState(null) // { queue:[], idx:0 } or null
  const [savingLoc,   setSavingLoc]   = useState(false)
  const [expandedLCU, setExpandedLCU] = useState(null) // lcu.id expanded in sidebar
  const [togglingLamp, setTogglingLamp] = useState(() => new Set())
  const [togglingLCU,  setTogglingLCU]  = useState(() => new Set())
  // new-LCU creation flow
  const [addingLCU,   setAddingLCU]   = useState(false)   // waiting for map click
  const [newLCUPos,   setNewLCUPos]   = useState(null)    // { lat, lng } from map click
  const [newLCUForm,  setNewLCUForm]  = useState({ reference:'', name:'', ip_address:'', port:'8080', zone:'' })
  const [savingLCU,   setSavingLCU]   = useState(false)
  const mapRef = useRef(null)

  const flyTo = useCallback((lat, lng, zoom = 18) => {
    mapRef.current?.flyTo([lat, lng], zoom, { animate: true, duration: 0.8 })
  }, [])

  const toggleLamp = useCallback(async (lamp, on) => {
    const intensity = on ? 100 : 0
    setTogglingLamp((prev) => new Set(prev).add(lamp.id))
    setLamps((prev) => prev.map((l) => l.id === lamp.id ? { ...l, intensite: intensity } : l))
    // keep selected panel in sync
    setSelected((prev) => prev?.type === 'lamp' && prev.data.id === lamp.id
      ? { ...prev, data: { ...prev.data, intensite: intensity } }
      : prev)
    try {
      await apiSetDimming(lamp.id, { intensity, reason: on ? 'Allumage manuel' : 'Extinction manuelle' })
    } catch (e) {
      setLamps((prev) => prev.map((l) => l.id === lamp.id ? { ...l, intensite: lamp.intensite } : l))
      setSelected((prev) => prev?.type === 'lamp' && prev.data.id === lamp.id
        ? { ...prev, data: { ...prev.data, intensite: lamp.intensite } }
        : prev)
      toast.error(e.message)
    } finally {
      setTogglingLamp((prev) => { const s = new Set(prev); s.delete(lamp.id); return s })
    }
  }, [])

  // Updates a single lamp's intensite in global state + selected panel
  const updateLampIntensity = useCallback((lampId, intensity) => {
    setLamps((prev) => prev.map((l) => l.id === lampId ? { ...l, intensite: intensity } : l))
    setSelected((prev) => prev?.type === 'lamp' && prev.data.id === lampId
      ? { ...prev, data: { ...prev.data, intensite: intensity } }
      : prev)
  }, [])

  const applyGroupIntensity = useCallback(async (lcu, intensity, groupLamps) => {
    if (!groupLamps.length) return
    setTogglingLCU((prev) => new Set(prev).add(lcu.id))
    setLamps((prev) => prev.map((l) => l.lcu_id === lcu.id ? { ...l, intensite: intensity } : l))
    setSelected((prev) => prev?.type === 'lamp' && prev.data.lcu_id === lcu.id
      ? { ...prev, data: { ...prev.data, intensite: intensity } }
      : prev)
    try {
      await Promise.all(groupLamps.map((l) =>
        apiSetDimming(l.id, { intensity, reason: `Groupe ${lcu.reference || lcu.name} - ${intensity}%` })
      ))
      toast.success(`Intensité ${intensity}% appliquée — ${lcu.reference || lcu.name}`)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setTogglingLCU((prev) => { const s = new Set(prev); s.delete(lcu.id); return s })
    }
  }, [])

  const toggleLCUGroup = useCallback(async (lcu, on, groupLamps) => {
    if (!groupLamps.length) { toast('Aucun lampadaire dans ce groupe', { icon: 'ℹ️' }); return }
    const intensity = on ? 100 : 0
    setTogglingLCU((prev) => new Set(prev).add(lcu.id))
    setLamps((prev) => prev.map((l) => l.lcu_id === lcu.id ? { ...l, intensite: intensity } : l))
    // keep selected panel in sync if selected lamp is in this group
    setSelected((prev) => prev?.type === 'lamp' && prev.data.lcu_id === lcu.id
      ? { ...prev, data: { ...prev.data, intensite: intensity } }
      : prev)
    try {
      await Promise.all(groupLamps.map((l) => apiSetDimming(l.id, { intensity, reason: `Groupe ${lcu.reference || lcu.name} - ${on ? 'ON' : 'OFF'}` })))
      toast.success(`${groupLamps.length} lampadaires ${on ? 'allumés' : 'éteints'} — ${lcu.reference || lcu.name}`)
    } catch (e) {
      setLamps((prev) => prev.map((l) => l.lcu_id === lcu.id ? { ...l, intensite: l.intensite } : l))
      setSelected((prev) => prev?.type === 'lamp' && prev.data.lcu_id === lcu.id
        ? { ...prev, data: { ...prev.data, intensite: prev.data.intensite } }
        : prev)
      toast.error(e.message)
    } finally {
      setTogglingLCU((prev) => { const s = new Set(prev); s.delete(lcu.id); return s })
    }
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      getLampadaires().catch(() => []),
      getLCUs().catch(() => []),
      getMissingLocation().catch(() => []),
    ]).then(([ls, lu, ms]) => {
      setLamps(Array.isArray(ls) ? ls : ls?.lampadaires || [])
      setLCUs(Array.isArray(lu) ? lu : lu?.lcus || [])
      setMissing(Array.isArray(ms) ? ms : ms?.lampadaires || [])
    }).finally(() => setLoading(false))
  }, [])

  /* start placement mode for all missing lamps (or a single one) */
  const startPlacing = useCallback((queue) => {
    if (!queue.length) return
    setPlacing({ queue, idx: 0 })
    setSelected(null)
  }, [])

  /* called when user clicks map while in placement mode */
  const handlePlace = useCallback(async (lat, lng) => {
    if (!placing || savingLoc) return
    const lamp = placing.queue[placing.idx]
    setSavingLoc(true)
    try {
      await updateLocation(lamp.id, { latitude: lat, longitude: lng })
      toast.success(`${lamp.reference} localisé`)
      // update missing list
      setMissing((prev) => prev.filter((l) => l.id !== lamp.id))
      // update main lamps list with new coords
      setLamps((prev) => prev.map((l) => l.id === lamp.id ? { ...l, latitude: lat, longitude: lng } : l))
      const nextIdx = placing.idx + 1
      if (nextIdx >= placing.queue.length) {
        setPlacing(null)
        toast.success('Tous les lampadaires ont été localisés !', { icon: '✅' })
      } else {
        setPlacing((p) => ({ ...p, idx: nextIdx }))
      }
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSavingLoc(false)
    }
  }, [placing, savingLoc])

  const skipPlacing = useCallback(() => {
    if (!placing) return
    const nextIdx = placing.idx + 1
    if (nextIdx >= placing.queue.length) setPlacing(null)
    else setPlacing((p) => ({ ...p, idx: nextIdx }))
  }, [placing])

  useEffect(load, [load])

  /* derived */
  const lampsByLCU = useMemo(() => {
    const m = {}
    lamps.forEach((l) => { if (l.lcu_id) { m[l.lcu_id] = m[l.lcu_id] || []; m[l.lcu_id].push(l) } })
    return m
  }, [lamps])

  const filtered = useMemo(() => lamps.filter((l) => {
    if (!filters[l.etat]) return false
    if (!l.latitude || !l.longitude) return false
    if (search) {
      const q = search.toLowerCase()
      return l.reference?.toLowerCase().includes(q) || l.zone?.toLowerCase().includes(q)
    }
    return true
  }), [lamps, filters, search])

  const visibleLCUs = useMemo(() => lcus.filter((l) => l.latitude && l.longitude), [lcus])

  const allPoints = useMemo(() =>
    filtered.map((l) => [l.latitude, l.longitude]), [filtered])

  /* selected LCU lines */
  const connectionLines = useMemo(() => {
    if (!selected || selected.type !== 'lcu' || !showLines) return []
    const lcu = selected.data
    if (!lcu.latitude || !lcu.longitude) return []
    return (lampsByLCU[lcu.id] || [])
      .filter((l) => l.latitude && l.longitude)
      .map((l) => [[lcu.latitude, lcu.longitude], [l.latitude, l.longitude]])
  }, [selected, lampsByLCU, showLines])

  const handleCreateLCU = async () => {
    if (!newLCUPos || !newLCUForm.reference.trim()) return
    setSavingLCU(true)
    try {
      const created = await apiCreateLCU({
        reference:  newLCUForm.reference.trim(),
        name:       newLCUForm.name.trim() || newLCUForm.reference.trim(),
        ip_address: newLCUForm.ip_address.trim(),
        port:       Number(newLCUForm.port) || 8080,
        zone:       newLCUForm.zone.trim(),
        latitude:   newLCUPos.lat,
        longitude:  newLCUPos.lng,
        status:     'unknown',
      })
      setLCUs((prev) => [...prev, created.data ?? created])
      setNewLCUPos(null)
      setAddingLCU(false)
      setNewLCUForm({ reference:'', name:'', ip_address:'', port:'8080', zone:'' })
      toast.success(`LCU ${newLCUForm.reference} créée`)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSavingLCU(false)
    }
  }

  const center = filtered[0]
    ? [filtered[0].latitude, filtered[0].longitude]
    : [36.7372, 3.0865]

  const stats = useMemo(() => ({
    lit:         lamps.filter((l) => (l.intensite ?? 0) > 0).length,
    dark:        lamps.filter((l) => (l.intensite ?? 0) === 0).length,
    online:      lamps.filter((l) => l.etat === 'online').length,
    offline:     lamps.filter((l) => l.etat === 'offline').length,
    maintenance: lamps.filter((l) => l.etat === 'maintenance').length,
    alerts:      lamps.filter((l) => l.has_critical_alert).length,
  }), [lamps])

  if (loading) return <PageLoader />

  return (
    <div className="relative flex h-[calc(100vh-3.5rem-3rem)] -m-4 lg:-m-6 overflow-hidden bg-[var(--bg)]">

      {/* ═══ MAP ═══════════════════════════════════════════════ */}
      <MapContainer center={center} zoom={14} minZoom={3} maxZoom={21}
        style={{ flex:1, height:'100%' }} className="z-0 map-page-container" zoomControl={false}>
        <TileLayer key={tile} url={TILES[tile].url} attribution={TILES[tile].attr}
          maxZoom={21} maxNativeZoom={TILES[tile].maxNativeZoom} />
        <ZoomControl position="bottomright" />
        <MapController mapRef={mapRef} />
        {allPoints.length > 0 && <FitBounds points={allPoints} />}
        <MapClickHandler onClose={() => setSelected(null)} onPlace={handlePlace} placing={!!placing}
          addingLCU={addingLCU} onDropLCU={(latlng) => { setNewLCUPos(latlng); setAddingLCU(false) }} />

        {/* LCU coverage zones */}
        {showZones && visibleLCUs.map((lcu) => (
          <Circle key={`zone-${lcu.id}`}
            center={[lcu.latitude, lcu.longitude]}
            radius={LCU_RADIUS}
            pathOptions={{
              color: '#3b82f6',
              fillColor: '#3b82f6',
              fillOpacity: selected?.data?.id === lcu.id ? 0.10 : 0.04,
              weight: selected?.data?.id === lcu.id ? 1.5 : 0.8,
              dashArray: '6 4',
              opacity: 0.5,
            }}
          />
        ))}

        {/* LCU → lamp connection lines (when LCU selected) */}
        {connectionLines.map((pos, i) => (
          <Polyline key={i} positions={pos}
            pathOptions={{ color: '#3b82f6', weight: 1, opacity: 0.45, dashArray: '4 6' }} />
        ))}

        {/* Lamp markers — key includes intensite so Leaflet remounts on state change */}
        {filtered.map((lamp) => {
          const isSelected = selected?.type === 'lamp' && selected.data.id === lamp.id
          const isLit = (lamp.intensite ?? 0) > 0
          return (
            <Marker
              key={`${lamp.id}-${isLit ? 1 : 0}-${isSelected ? 1 : 0}`}
              position={[lamp.latitude, lamp.longitude]}
              icon={makeLampIcon(lamp.etat, isSelected, lamp.has_critical_alert, lamp.intensite)}
              zIndexOffset={isSelected ? 2000 : lamp.has_critical_alert ? 1000 : 0}
              eventHandlers={{ click: (e) => { e.originalEvent.stopPropagation(); setSelected({ type:'lamp', data:lamp }) } }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={1}
                className="!bg-transparent !border-0 !shadow-none !p-0">
                <div className="map-glass px-2.5 py-1.5 text-[11px] font-medium whitespace-nowrap">
                  <span className="font-mono">{lamp.reference}</span>
                  <span className="mx-1.5 opacity-40">·</span>
                  <span style={{ color: STATUS[lamp.etat]?.hex }}>{STATUS[lamp.etat]?.label}</span>
                  <span className="mx-1.5 opacity-40">·</span>
                  <span className="text-white/70">{lamp.intensite ?? 0}%</span>
                </div>
              </Tooltip>
            </Marker>
          )
        })}

        {/* New-LCU preview marker */}
        {newLCUPos && (
          <Marker position={[newLCUPos.lat, newLCUPos.lng]}
            icon={makeLCUIcon('NOUVEAU', 0, true)} />
        )}

        {/* LCU markers */}
        {visibleLCUs.map((lcu) => {
          const isSelected = selected?.type === 'lcu' && selected.data.id === lcu.id
          const group = lampsByLCU[lcu.id] || []
          const count = group.length
          return (
            <Marker key={`lcu-${lcu.id}`}
              position={[lcu.latitude, lcu.longitude]}
              icon={makeLCUIcon(lcu.reference || lcu.name, count, isSelected)}
              zIndexOffset={isSelected ? 2000 : 500}
              eventHandlers={{ click: (e) => { e.originalEvent.stopPropagation(); setSelected({ type:'lcu', data:lcu }); setExpandedLCU(lcu.id) } }}
            >
              <Tooltip direction="top" offset={[40, -4]} opacity={1}
                className="!bg-transparent !border-0 !shadow-none !p-0">
                <div className="map-glass px-2.5 py-1.5 text-[11px] font-medium whitespace-nowrap">
                  {lcu.name || lcu.reference}
                  <span className="mx-1.5 opacity-40">·</span>
                  <span className="text-blue-400">{count} lampadaires</span>
                  {lcu.status && (
                    <><span className="mx-1.5 opacity-40">·</span>
                    <span style={{ color: STATUS[lcu.status]?.hex || '#94a3b8' }}>{STATUS[lcu.status]?.label || lcu.status}</span></>
                  )}
                </div>
              </Tooltip>
              <Popup className="lcu-popup" maxWidth={340} minWidth={280} closeButton={true} autoPan={true}>
                <LCUMapPopup
                  lcu={lcu}
                  lamps={group}
                  toggleLamp={toggleLamp}
                  toggleLCUGroup={toggleLCUGroup}
                  togglingLamp={togglingLamp}
                  togglingLCU={togglingLCU}
                  onFlyTo={flyTo}
                  onSelect={(l) => setSelected({ type:'lamp', data:l })}
                />
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>

      {/* ═══ TOP STATS BAR ═════════════════════════════════════ */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[500] map-glass flex items-center gap-0.5 px-3 py-1.5 text-[11px]">
        {/* ON / OFF counts */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/15">
          <span className="w-2 h-2 rounded-full bg-green-400" />
          <span className="font-bold text-green-400">{stats.lit}</span>
          <span className="text-white/50">Allumés</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: 'rgba(55,65,81,0.4)' }}>
          <span className="w-2 h-2 rounded-full bg-[#6b7280]" />
          <span className="font-bold text-white/60">{stats.dark}</span>
          <span className="text-white/40">Éteints</span>
        </div>

        <div className="w-px h-4 bg-white/10 mx-1" />

        {/* Connectivity counts */}
        {Object.entries(STATUS).map(([key, s]) => (
          <div key={key} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
            style={{ background: `${s.hex}18` }}>
            <span className="w-2 h-2 rounded-full" style={{ background: s.hex }} />
            <span className="font-bold" style={{ color: s.hex }}>{stats[key]}</span>
            <span className="text-white/45">{s.label}</span>
          </div>
        ))}

        <div className="w-px h-4 bg-white/10 mx-1" />

        {/* Alerts + LCUs */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/15">
          <AlertTriangle size={11} className="text-red-400" />
          <span className="font-bold text-red-400">{stats.alerts}</span>
          <span className="text-white/45">alertes</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/15">
          <Radio size={11} className="text-blue-400" />
          <span className="font-bold text-blue-400">{lcus.length}</span>
          <span className="text-white/45">LCUs</span>
        </div>
      </div>

      {/* ═══ SIDEBAR TOGGLE (always visible) ══════════════════ */}
      <button
        onClick={() => setSideOpen((v) => !v)}
        className={cn(
          'absolute top-1/2 -translate-y-1/2 z-[450] w-5 h-14 map-glass flex items-center justify-center transition-all duration-300 hover:bg-white/15 text-white/50 hover:text-white',
          sideOpen ? 'left-[272px] rounded-r-xl' : 'left-0 rounded-r-xl'
        )}
        title={sideOpen ? 'Fermer le panneau' : 'Ouvrir le panneau'}
      >
        {sideOpen ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}
      </button>

      {/* ═══ LEFT SIDEBAR ══════════════════════════════════════ */}
      <div className={cn(
        'absolute top-0 left-0 h-full z-[400] flex transition-transform duration-300',
        sideOpen ? 'translate-x-0' : '-translate-x-[272px]'
      )}>
        <div className="w-[272px] h-full map-glass rounded-none rounded-r-2xl flex flex-col overflow-hidden">

          {/* Header */}
          <div className="px-4 pt-4 pb-3 border-b border-white/8">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-brand-500/20 flex items-center justify-center">
                  <Layers size={12} className="text-brand-400" />
                </div>
                <span className="text-[13px] font-bold text-white">Télégestion</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => { setAddingLCU((v) => !v); setNewLCUPos(null) }}
                  title="Ajouter une LCU sur la carte"
                  className={cn(
                    'p-1.5 rounded-lg transition-colors text-[11px] font-bold flex items-center gap-1',
                    addingLCU
                      ? 'bg-blue-500/30 text-blue-300 border border-blue-400/40'
                      : 'hover:bg-white/10 text-white/50 hover:text-blue-400'
                  )}>
                  <Plus size={13} />
                  {addingLCU && <span>LCU</span>}
                </button>
                <button onClick={load} className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors">
                  <RefreshCw size={13} />
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher référence, zone…"
                className="w-full bg-white/8 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-[12px] text-white placeholder:text-white/30 focus:outline-none focus:border-brand-500/60 focus:bg-white/12" />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Status filters */}
          <div className="px-4 py-3 border-b border-white/8">
            <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-2">Filtres état</p>
            <div className="space-y-1">
              {Object.entries(STATUS).map(([key, s]) => {
                const count = lamps.filter((l) => l.etat === key).length
                return (
                  <button key={key} onClick={() => setFilters((f) => ({ ...f, [key]: !f[key] }))}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-left',
                      filters[key] ? 'bg-white/8' : 'opacity-40'
                    )}>
                    <div className={cn('w-3 h-3 rounded-full border-2 transition-all',
                      filters[key] ? 'border-transparent' : 'border-white/40 bg-transparent')}
                      style={filters[key] ? { background: s.hex } : {}} />
                    <span className="text-[12px] font-medium text-white/80 flex-1">{s.label}</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: `${s.hex}22`, color: s.hex }}>{count}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Layer toggles */}
          <div className="px-4 py-3 border-b border-white/8">
            <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-2">Couches</p>
            <div className="space-y-1">
              {[
                { label: 'Zones de couverture', key: 'zones', val: showZones, set: setShowZones, color: '#3b82f6' },
                { label: 'Lignes de connexion', key: 'lines', val: showLines, set: setShowLines, color: '#6366f1' },
              ].map((t) => (
                <button key={t.key} onClick={() => t.set((v) => !v)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-left',
                    t.val ? 'bg-white/8' : 'opacity-40'
                  )}>
                  <div className={cn('w-3 h-3 rounded-sm border-2 transition-all shrink-0',
                    t.val ? 'border-transparent' : 'border-white/40 bg-transparent')}
                    style={t.val ? { background: t.color } : {}} />
                  <span className="text-[12px] font-medium text-white/80 flex-1">{t.label}</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full transition-all"
                    style={t.val
                      ? { background: `${t.color}22`, color: t.color }
                      : { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.2)' }}>
                    {t.val ? 'ON' : 'OFF'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Tile selector */}
          <div className="px-4 py-3 border-b border-white/8">
            <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-2">Fond de carte</p>
            <div className="flex gap-1.5">
              {Object.keys(TILES).map((k) => (
                <button key={k} onClick={() => setTile(k)}
                  className={cn(
                    'flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all',
                    tile === k ? 'bg-brand-500 text-white' : 'bg-white/8 text-white/50 hover:bg-white/14'
                  )}>{k}</button>
              ))}
            </div>
          </div>

          {/* Missing location section */}
          {missing.length > 0 && (
            <div className="px-4 py-3 border-b border-white/8">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">Non localisés</p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-400">
                  {missing.length}
                </span>
              </div>
              <button
                onClick={() => startPlacing(missing)}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[12px] font-semibold transition-all"
                style={{ background:'rgba(234,179,8,0.15)', border:'1px solid rgba(234,179,8,0.35)', color:'#fde047' }}>
                <LocateFixed size={13} />
                Localiser tous ({missing.length})
              </button>
              <div className="mt-2 space-y-0.5 max-h-32 overflow-y-auto">
                {missing.map((lamp) => (
                  <div key={lamp.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/6 group">
                    <MapPin size={11} className="text-yellow-400/70 shrink-0" />
                    <span className="text-[11px] font-mono text-white/60 flex-1 truncate">{lamp.reference}</span>
                    <button
                      onClick={() => startPlacing([lamp])}
                      className="opacity-0 group-hover:opacity-100 text-[10px] text-yellow-400 hover:text-yellow-300 transition-all font-medium">
                      Placer
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LCU control section */}
          {visibleLCUs.length > 0 && (
            <div className="px-3 py-2 border-b border-white/8">
              <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest px-1 mb-1.5">
                {visibleLCUs.length} passerelles LCU
              </p>
              {visibleLCUs.map((lcu) => {
                const isSelected = selected?.type === 'lcu' && selected.data.id === lcu.id
                const group = lampsByLCU[lcu.id] || []
                const count = group.length
                const isExpanded = expandedLCU === lcu.id
                const isGroupToggling = togglingLCU.has(lcu.id)
                const allOn  = count > 0 && group.every((l) => (l.intensite ?? 0) > 0)
                const allOff = count > 0 && group.every((l) => (l.intensite ?? 0) === 0)
                return (
                  <div key={`lcu-side-${lcu.id}`} className="mb-0.5">
                    {/* LCU row */}
                    <div className={cn(
                      'group flex items-center gap-1.5 px-2 py-1.5 rounded-xl transition-all',
                      isSelected ? 'bg-blue-500/15' : 'hover:bg-white/6'
                    )}>
                      <Radio size={11} className="text-blue-400 shrink-0" />
                      <button
                        onClick={() => { setSelected({ type:'lcu', data:lcu }) }}
                        className="flex-1 text-left min-w-0">
                        <span className="text-[12px] font-medium text-white/80 truncate block">
                          {lcu.reference || lcu.name}
                        </span>
                      </button>
                      <span className="text-[10px] text-blue-400/50 shrink-0">{count}</span>
                      {/* Eye */}
                      <button onClick={() => { setSelected({ type:'lcu', data:lcu }); flyTo(lcu.latitude, lcu.longitude, 16) }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 text-white/30 hover:text-blue-400 transition-all"
                        title="Centrer"><Eye size={10} /></button>
                      {/* ON */}
                      <button
                        onClick={() => toggleLCUGroup(lcu, true, group)}
                        disabled={isGroupToggling || allOn}
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold transition-all disabled:opacity-30"
                        style={{ background:'rgba(34,197,94,0.15)', border:'1px solid rgba(34,197,94,0.35)', color:'#22c55e' }}
                        title="Allumer tout le groupe">ON</button>
                      {/* OFF */}
                      <button
                        onClick={() => toggleLCUGroup(lcu, false, group)}
                        disabled={isGroupToggling || allOff}
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold transition-all disabled:opacity-30"
                        style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#ef4444' }}
                        title="Éteindre tout le groupe">OFF</button>
                      {/* Expand */}
                      <button
                        onClick={() => setExpandedLCU((v) => v === lcu.id ? null : lcu.id)}
                        className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-white transition-all">
                        {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                      </button>
                    </div>

                    {/* Expanded lamp list */}
                    {isExpanded && (
                      <div className="ml-4 mt-0.5 mb-1 space-y-0.5 max-h-40 overflow-y-auto">
                        {group.length === 0 && (
                          <p className="text-[10px] text-white/30 px-2 py-1">Aucun lampadaire</p>
                        )}
                        {group.map((lamp) => {
                          const hex = STATUS[lamp.etat]?.hex || '#6b7280'
                          const isOn = (lamp.intensite ?? 0) > 0
                          const isToggling = togglingLamp.has(lamp.id)
                          return (
                            <div key={`exp-${lamp.id}`}
                              className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-white/6 group/lamp">
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: hex }} />
                              <button
                                onClick={() => { setSelected({ type:'lamp', data:lamp }); flyTo(lamp.latitude, lamp.longitude) }}
                                className="flex-1 text-left min-w-0">
                                <span className="text-[11px] font-mono text-white/70 truncate block">{lamp.reference}</span>
                              </button>
                              <span className="text-[10px]" style={{ color: hex }}>{lamp.intensite ?? 0}%</span>
                              <LampToggle lamp={lamp} onToggle={toggleLamp} disabled={isToggling} size="xs" />
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Lamp list */}
          <div className="flex-1 overflow-y-auto px-3 py-2">
            <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest px-1 mb-1.5">
              {filtered.length} lampadaires
            </p>
            {filtered.slice(0, 80).map((lamp) => {
              const isSelected = selected?.type === 'lamp' && selected.data.id === lamp.id
              const s = STATUS[lamp.etat]
              const isOn = (lamp.intensite ?? 0) > 0
              const isToggling = togglingLamp.has(lamp.id)
              return (
                <div key={lamp.id}
                  className={cn(
                    'group flex items-center gap-1.5 px-2 py-1.5 rounded-xl mb-0.5 transition-all',
                    isSelected ? 'bg-white/12' : 'hover:bg-white/6'
                  )}>
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s?.hex }} />
                  <button
                    onClick={() => setSelected({ type:'lamp', data:lamp })}
                    className="flex-1 flex items-center gap-1 text-left min-w-0">
                    <span className="text-[11px] font-mono font-medium text-white/80 flex-1 truncate">{lamp.reference}</span>
                    {lamp.has_critical_alert && <AlertTriangle size={10} className="text-red-400 shrink-0" />}
                  </button>
                  <span className="text-[10px] text-white/35 shrink-0">{lamp.intensite ?? 0}%</span>
                  <button onClick={() => { setSelected({ type:'lamp', data:lamp }); flyTo(lamp.latitude, lamp.longitude) }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 text-white/30 hover:text-white transition-all"
                    title="Zoomer"><Eye size={10} /></button>
                  <LampToggle lamp={lamp} onToggle={toggleLamp} disabled={isToggling} size="xs" />
                </div>
              )
            })}
            {filtered.length > 80 && (
              <p className="text-[10px] text-white/30 text-center py-2">+ {filtered.length - 80} autres</p>
            )}
          </div>
        </div>

      </div>

      {/* ═══ LEGEND (bottom-right) ═════════════════════════════ */}
      <div className="absolute bottom-12 right-3 z-[400] map-glass p-3 text-[11px] space-y-2 min-w-[145px]">
        <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Légende</p>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ background:'#22c55e', boxShadow:'0 0 6px rgba(34,197,94,0.7)' }} />
          <span className="text-white/70">Allumé (ON)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full border border-white/20" style={{ background:'#374151' }} />
          <span className="text-white/70">Éteint (OFF)</span>
        </div>
        <div className="border-t border-white/8 pt-1.5 space-y-1.5">
          <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Anneau = état</p>
          {Object.entries(STATUS).map(([key, s]) => (
            <div key={key} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: s.hex, background:'transparent' }} />
              <span className="text-white/60">{s.label}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-white/8 pt-1.5 flex items-center gap-2">
          <div className="w-4 h-3 rounded" style={{ background: 'linear-gradient(135deg,#1e40af,#3b82f6)', border:'1px solid rgba(255,255,255,0.3)' }} />
          <span className="text-white/70">Passerelle LCU</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-0 border-t-2 border-dashed border-blue-400/60" />
          <span className="text-white/70">Zone couverture</span>
        </div>
      </div>

      {/* ═══ ADD-LCU BANNER + FORM ════════════════════════════ */}
      {addingLCU && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[600] pointer-events-none flex flex-col items-center gap-2">
          <div className="map-glass pointer-events-auto flex items-center gap-3 px-5 py-3"
            style={{ border:'1px solid rgba(59,130,246,0.5)', boxShadow:'0 0 24px rgba(59,130,246,0.25)' }}>
            <Radio size={15} className="text-blue-400 animate-pulse shrink-0" />
            <p className="text-[13px] font-semibold text-white">Cliquez sur la carte pour placer la LCU</p>
            <button onClick={() => setAddingLCU(false)}
              className="ml-2 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/18 text-white/60 hover:text-white text-[11px] transition-colors">
              <X size={11} /> Annuler
            </button>
          </div>
        </div>
      )}

      {newLCUPos && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[600]">
          <div className="map-glass p-4 w-72"
            style={{ border:'1px solid rgba(59,130,246,0.4)', boxShadow:'0 0 32px rgba(59,130,246,0.2)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Radio size={14} className="text-blue-400" />
              <p className="text-[13px] font-bold text-white">Nouvelle LCU</p>
              <span className="ml-auto text-[10px] text-blue-400 font-mono">
                {newLCUPos.lat.toFixed(5)}, {newLCUPos.lng.toFixed(5)}
              </span>
              <button onClick={() => setNewLCUPos(null)} className="text-white/30 hover:text-white ml-1">
                <X size={13} />
              </button>
            </div>

            <div className="space-y-2">
              {[
                { key:'reference', label:'Référence *', placeholder:'LCU-001' },
                { key:'name',      label:'Nom',         placeholder:'Passerelle Stade' },
                { key:'ip_address',label:'Adresse IP',  placeholder:'192.168.1.100' },
                { key:'port',      label:'Port',        placeholder:'8080' },
                { key:'zone',      label:'Zone',        placeholder:'Zone A' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-[10px] text-white/40 uppercase tracking-wider">{label}</label>
                  <input
                    value={newLCUForm[key]}
                    onChange={(e) => setNewLCUForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full mt-0.5 bg-white/8 border border-white/10 rounded-lg px-2.5 py-1.5 text-[12px] text-white placeholder:text-white/25 focus:outline-none focus:border-blue-400/60"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-3">
              <button onClick={() => { setNewLCUPos(null); setAddingLCU(true) }}
                className="flex-1 py-1.5 rounded-lg text-[11px] text-white/50 hover:text-white bg-white/8 hover:bg-white/12 transition-colors">
                Repositionner
              </button>
              <button onClick={handleCreateLCU}
                disabled={savingLCU || !newLCUForm.reference.trim()}
                className="flex-1 py-1.5 rounded-lg text-[12px] font-bold transition-all disabled:opacity-40"
                style={{ background:'rgba(59,130,246,0.25)', border:'1px solid rgba(59,130,246,0.5)', color:'#60a5fa' }}>
                {savingLCU ? 'Création…' : 'Créer la LCU'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ PLACEMENT MODE BANNER ════════════════════════════ */}
      {placing && (() => {
        const lamp = placing.queue[placing.idx]
        const total = placing.queue.length
        const done  = placing.idx
        return (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[600] pointer-events-none flex flex-col items-center gap-2">
            {/* pulsing ring behind banner */}
            <div className="map-glass pointer-events-auto flex items-center gap-4 px-5 py-3"
              style={{ border: '1px solid rgba(234,179,8,0.5)', boxShadow: '0 0 24px rgba(234,179,8,0.25)' }}>
              <LocateFixed size={16} className="text-yellow-400 animate-pulse shrink-0" />
              <div>
                <p className="text-[11px] text-yellow-300/70 leading-none mb-1">
                  Cliquez sur la carte pour placer ({done + 1}/{total})
                </p>
                <p className="text-[14px] font-bold font-mono text-white leading-none">{lamp?.reference}</p>
                {lamp?.zone && <p className="text-[10px] text-white/40 mt-0.5">{lamp.zone}</p>}
              </div>
              <div className="w-px self-stretch bg-white/10" />
              <button onClick={skipPlacing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/18 text-white/60 hover:text-white text-[11px] font-medium transition-colors">
                <SkipForward size={12} /> Passer
              </button>
              <button onClick={() => setPlacing(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-[11px] font-medium transition-colors">
                <X size={12} /> Quitter
              </button>
            </div>
            {/* progress bar */}
            <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-yellow-400 rounded-full transition-all"
                style={{ width: `${(done / total) * 100}%` }} />
            </div>
          </div>
        )
      })()}

      {/* ═══ SELECTED ITEM BOTTOM CARD ═════════════════════════ */}
      {selected && (
        <div className="absolute bottom-0 left-0 right-0 z-[500]" onClick={(e) => e.stopPropagation()}>
          <div className="map-glass rounded-b-none rounded-t-2xl">
            {selected.type === 'lamp' && (
              <LampCard
                lamp={selected.data}
                lcu={lcus.find((l) => Number(l.id) === Number(selected.data.lcu_id)) ?? null}
                allLCUs={lcus}
                onClose={() => setSelected(null)}
                flyTo={flyTo}
                onUpdateIntensity={updateLampIntensity}
                onLCUAssigned={(lampId, newLcuId) => {
                  setLamps((prev) => prev.map((l) => l.id === lampId ? { ...l, lcu_id: newLcuId } : l))
                  setSelected((prev) => prev?.type === 'lamp' && prev.data.id === lampId
                    ? { ...prev, data: { ...prev.data, lcu_id: newLcuId } }
                    : prev)
                }}
                onSelectLCU={(lcu) => {
                  setSelected({ type:'lcu', data:lcu })
                  if (lcu.latitude && lcu.longitude) flyTo(lcu.latitude, lcu.longitude, 16)
                }}
              />
            )}
            {selected.type === 'lcu' && (
              <LCUCard lcu={selected.data}
                lamps={lampsByLCU[selected.data.id] || []}
                onClose={() => setSelected(null)}
                onSelect={(l) => { setSelected({ type:'lamp', data:l }); flyTo(l.latitude, l.longitude) }}
                flyTo={flyTo}
                toggleLamp={toggleLamp}
                toggleLCUGroup={toggleLCUGroup}
                applyGroupIntensity={applyGroupIntensity}
                togglingLamp={togglingLamp}
                togglingLCU={togglingLCU} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────
   LCU MAP POPUP (rendered inside Leaflet Popup)
───────────────────────────────────────────────────────────── */
function LCUMapPopup({ lcu, lamps, toggleLamp, toggleLCUGroup, togglingLamp, togglingLCU, onFlyTo, onSelect }) {
  const allOn  = lamps.length > 0 && lamps.every((l) => (l.intensite ?? 0) > 0)
  const allOff = lamps.length > 0 && lamps.every((l) => (l.intensite ?? 0) === 0)
  const isGroupToggling = togglingLCU.has(lcu.id)

  return (
    <div>
      {/* Header */}
      <div style={{ padding:'12px 14px 10px', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ flex:1 }}>
            <p style={{ margin:0, fontSize:13, fontWeight:700, color:'white', fontFamily:'inherit' }}>
              {lcu.reference || lcu.name}
            </p>
            <p style={{ margin:'2px 0 0', fontSize:11, color:'rgba(255,255,255,0.4)' }}>
              {lamps.length} lampadaire{lamps.length !== 1 ? 's' : ''}
              {lcu.zone ? ` · ${lcu.zone}` : ''}
            </p>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={() => toggleLCUGroup(lcu, true, lamps)}
              disabled={isGroupToggling || allOn}
              style={{
                display:'flex', alignItems:'center', gap:4,
                padding:'5px 10px', borderRadius:8, fontSize:11, fontWeight:700,
                background:'rgba(34,197,94,0.15)', border:'1px solid rgba(34,197,94,0.4)',
                color:'#22c55e', cursor:'pointer', opacity: (isGroupToggling || allOn) ? 0.35 : 1,
              }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/>
              </svg>
              ON
            </button>
            <button onClick={() => toggleLCUGroup(lcu, false, lamps)}
              disabled={isGroupToggling || allOff}
              style={{
                display:'flex', alignItems:'center', gap:4,
                padding:'5px 10px', borderRadius:8, fontSize:11, fontWeight:700,
                background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.38)',
                color:'#ef4444', cursor:'pointer', opacity: (isGroupToggling || allOff) ? 0.35 : 1,
              }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><path d="M8 12h8"/>
              </svg>
              OFF
            </button>
          </div>
        </div>
      </div>
      {/* Lamp rows */}
      <div style={{ maxHeight:220, overflowY:'auto', padding:'6px 8px' }}>
        {lamps.length === 0 && (
          <p style={{ fontSize:11, color:'rgba(255,255,255,0.3)', textAlign:'center', padding:'14px 0' }}>
            Aucun lampadaire associé
          </p>
        )}
        {lamps.map((l) => {
          const hex = STATUS[l.etat]?.hex || '#6b7280'
          const isOn = (l.intensite ?? 0) > 0
          const isToggling = togglingLamp.has(l.id)
          return (
            <div key={l.id} style={{
              display:'flex', alignItems:'center', gap:6,
              padding:'5px 6px', borderRadius:8, marginBottom:2,
              background:'rgba(255,255,255,0.035)',
            }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background:hex, flexShrink:0 }} />
              <button onClick={() => { onSelect(l); if (l.latitude && l.longitude) onFlyTo(l.latitude, l.longitude) }}
                style={{ flex:1, textAlign:'left', background:'none', border:'none', cursor:'pointer', padding:0 }}>
                <span style={{ fontSize:11, fontFamily:'monospace', color:'rgba(255,255,255,0.8)' }}>{l.reference}</span>
              </button>
              <span style={{ fontSize:10, color:hex, minWidth:28 }}>{l.intensite ?? 0}%</span>
              <LampToggle lamp={l} onToggle={toggleLamp} disabled={isToggling} size="sm" />
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────
   LAMP CARD (bottom panel)
───────────────────────────────────────────────────────────── */
function LampCard({ lamp, lcu, allLCUs = [], onClose, flyTo, onUpdateIntensity, onSelectLCU, onLCUAssigned }) {
  const [dimVal, setDimVal]         = useState(lamp.intensite ?? 0)
  const [dimming, setDimming]       = useState(false)
  const [telemetry, setTelemetry]   = useState(null)
  const [pickingLCU, setPickingLCU] = useState(false)
  const [assigningLCU, setAssigningLCU] = useState(false)
  const s    = STATUS[lamp.etat]
  // actual ON/OFF always reads from the prop (updated by parent on group toggle)
  const isOn = (lamp.intensite ?? 0) > 0

  // keep slider in sync when parent updates lamp.intensite (e.g. LCU group toggle)
  useEffect(() => {
    setDimVal(lamp.intensite ?? 0)
  }, [lamp.intensite])

  useEffect(() => {
    getLatestTelemetry(lamp.id).then(setTelemetry).catch(() => {})
  }, [lamp.id])

  useEffect(() => {
    if (!pickingLCU) return
    const close = () => setPickingLCU(false)
    document.addEventListener('click', close, { capture: true, once: true })
    return () => document.removeEventListener('click', close, { capture: true })
  }, [pickingLCU])

  const applyIntensity = async (intensity) => {
    setDimVal(intensity)
    setDimming(true)
    try {
      await apiSetDimming(lamp.id, { intensity, reason: 'Manuel via carte' })
      // propagate to parent so map marker colour + selected panel update immediately
      onUpdateIntensity?.(lamp.id, intensity)
      toast.success(`${lamp.reference} → ${intensity}%`)
    } catch (e) {
      // rollback slider to actual value on failure
      setDimVal(lamp.intensite ?? 0)
      toast.error(e.message)
    } finally {
      setDimming(false)
    }
  }

  const handleDim = () => applyIntensity(dimVal)

  const handleAssignLCU = async (newLcuId) => {
    setAssigningLCU(true)
    setPickingLCU(false)
    try {
      await apiAssignLCU(lamp.id, newLcuId)
      onLCUAssigned?.(lamp.id, newLcuId)
      toast.success(newLcuId ? 'LCU assignée' : 'LCU retirée')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setAssigningLCU(false)
    }
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">

      {/* Identity */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${s?.hex}18` }}>
          <MapPin size={14} style={{ color: s?.hex }} />
        </div>
        <div>
          <p className="font-bold text-[13px] text-white font-mono leading-tight">{lamp.reference}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: s?.hex }} />
            <span className="text-[10px]" style={{ color: s?.hex }}>{s?.label}</span>
            {lamp.zone && <span className="text-[10px] text-white/35 ml-1">{lamp.zone}</span>}
          </div>
        </div>
      </div>

      <div className="w-px self-stretch bg-white/10 shrink-0" />

      {/* Telemetry — compact inline badges */}
      <div className="flex items-center gap-4 flex-1">
        {[
          { label:'Intensité',   value:`${lamp.intensite ?? 0}%`,                                                                        color: isOn ? '#22c55e' : '#6b7280' },
          { label:'Luminosité',  value: telemetry?.luminosite  != null ? `${telemetry.luminosite.toFixed(0)}%`   : '—',                 color:'#94a3b8' },
          { label:'Temp.',       value: telemetry?.temperature != null ? `${telemetry.temperature.toFixed(1)}°C` : '—',                 color:'#94a3b8' },
          { label:'Puissance',   value: telemetry?.puissance   != null ? `${telemetry.puissance.toFixed(0)}W`    : lamp.puissance ? `${lamp.puissance}W` : '—', color:'#94a3b8' },
        ].map((m) => (
          <div key={m.label}>
            <p className="text-[14px] font-bold leading-none" style={{ color: m.color }}>{m.value}</p>
            <p className="text-[9px] text-white/30 mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="w-px self-stretch bg-white/10 shrink-0" />

      {/* Power toggle */}
      <LampToggle lamp={lamp} onToggle={(l, on) => applyIntensity(on ? 100 : 0)} disabled={dimming} size="sm" />

      <div className="w-px self-stretch bg-white/10 shrink-0" />

      {/* Dimmer — compact inline */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] text-white/35 shrink-0">Dim</span>
        <input type="range" min={0} max={100} value={dimVal}
          onChange={(e) => setDimVal(Number(e.target.value))}
          className="w-28" style={{ accentColor: '#22c55e' }} />
        <span className="text-[12px] font-bold text-white/70 w-8 shrink-0">{dimVal}%</span>
        <button onClick={handleDim} disabled={dimming}
          className="px-3 py-1.5 rounded-lg text-[11px] font-semibold disabled:opacity-40 transition-colors shrink-0"
          style={{ background:'rgba(34,197,94,0.18)', border:'1px solid rgba(34,197,94,0.4)', color:'#4ade80' }}>
          {dimming ? '…' : 'OK'}
        </button>
      </div>

      <div className="w-px self-stretch bg-white/10 shrink-0" />

      {/* LCU chip */}
      <div className="relative shrink-0">
        <button onClick={() => setPickingLCU((v) => !v)} disabled={assigningLCU}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] transition-colors',
            lcu
              ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/18'
              : 'border border-dashed border-white/15 text-white/30 hover:text-blue-400 hover:border-blue-400/35'
          )}>
          <Radio size={10} />
          <span className={lcu ? 'font-mono font-medium' : 'italic text-[10px]'}>
            {assigningLCU ? '…' : lcu ? (lcu.reference || lcu.name) : '+ LCU'}
          </span>
          <ChevronDown size={9} className="opacity-40" />
        </button>

        {pickingLCU && (
          <div className="absolute left-0 bottom-full mb-2 z-20 w-52 rounded-xl overflow-hidden shadow-2xl"
            style={{ background:'rgba(11,14,24,0.99)', border:'1px solid rgba(255,255,255,0.12)' }}>
            <p className="px-3 py-2 text-[10px] font-bold text-white/25 uppercase tracking-widest border-b border-white/8">LCU</p>
            <div className="max-h-44 overflow-y-auto">
              {allLCUs.map((l) => (
                <button key={l.id} onClick={() => handleAssignLCU(l.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-500/20 transition-colors text-left border-b border-white/4">
                  <Radio size={9} className="text-blue-400 shrink-0" />
                  <span className="text-[11px] font-mono text-white/75 flex-1 truncate">{l.reference || l.name}</span>
                  {Number(l.id) === Number(lamp.lcu_id) && <span className="text-blue-400 text-[9px]">✓</span>}
                </button>
              ))}
              {lcu && (
                <button onClick={() => handleAssignLCU(null)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-500/15 transition-colors text-left">
                  <X size={9} className="text-red-400" />
                  <span className="text-[11px] text-red-400">Retirer</span>
                </button>
              )}
              {allLCUs.length === 0 && (
                <p className="text-[11px] text-white/25 px-3 py-2 text-center">Aucune LCU</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 shrink-0">
        {lcu && (
          <button onClick={() => onSelectLCU?.(lcu)}
            className="p-1.5 rounded-lg hover:bg-white/8 text-white/25 hover:text-blue-400 transition-colors"
            title="Ouvrir la LCU">
            <Radio size={13} />
          </button>
        )}
        {lamp.latitude && lamp.longitude && (
          <button onClick={() => flyTo(lamp.latitude, lamp.longitude)}
            className="p-1.5 rounded-lg hover:bg-white/8 text-white/25 hover:text-blue-400 transition-colors"
            title="Centrer">
            <Eye size={13} />
          </button>
        )}
        <button onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/8 text-white/25 hover:text-white transition-colors">
          <X size={13} />
        </button>
      </div>

    </div>
  )
}

/* ──────────────────────────────────────────────────────────────
   LCU CARD (bottom panel)
───────────────────────────────────────────────────────────── */
function LCUCard({ lcu, lamps, onClose, onSelect, flyTo, toggleLamp, toggleLCUGroup, applyGroupIntensity, togglingLamp, togglingLCU }) {
  const avgIntensity = lamps.length
    ? Math.round(lamps.reduce((s, l) => s + (l.intensite ?? 0), 0) / lamps.length)
    : 0
  const [groupDim, setGroupDim] = useState(avgIntensity)

  // keep slider in sync when lamps intensite changes externally
  useEffect(() => {
    setGroupDim(
      lamps.length
        ? Math.round(lamps.reduce((s, l) => s + (l.intensite ?? 0), 0) / lamps.length)
        : 0
    )
  }, [lamps.map((l) => l.intensite).join(',')])  // eslint-disable-line react-hooks/exhaustive-deps

  const online      = lamps.filter((l) => l.etat === 'online').length
  const offline     = lamps.filter((l) => l.etat === 'offline').length
  const maintenance = lamps.filter((l) => l.etat === 'maintenance').length
  const alerts      = lamps.filter((l) => l.has_critical_alert).length
  const allOn  = lamps.length > 0 && lamps.every((l) => (l.intensite ?? 0) > 0)
  const allOff = lamps.length > 0 && lamps.every((l) => (l.intensite ?? 0) === 0)
  const isGroupToggling = togglingLCU?.has(lcu.id)

  const lit  = lamps.filter((l) => (l.intensite ?? 0) > 0).length
  const dark = lamps.length - lit

  return (
    <div className="px-5 pt-4 pb-3 flex flex-col gap-3">

      {/* ── Row 1: Identity + controls + close ── */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
          <Radio size={16} className="text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[14px] text-white truncate">{lcu.name || lcu.reference}</p>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-blue-400 font-mono">{lcu.ip_address}{lcu.port ? `:${lcu.port}` : ''}</span>
            {lcu.zone && <><span className="text-white/20">·</span><span className="text-[11px] text-white/50">{lcu.zone}</span></>}
          </div>
        </div>
        {/* Group power buttons */}
        <button onClick={() => toggleLCUGroup?.(lcu, true, lamps)}
          disabled={isGroupToggling || allOn}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all disabled:opacity-30"
          style={{ background:'rgba(34,197,94,0.15)', border:'1px solid rgba(34,197,94,0.4)', color:'#22c55e' }}>
          <Power size={11} /> Allumer tout
        </button>
        <button onClick={() => toggleLCUGroup?.(lcu, false, lamps)}
          disabled={isGroupToggling || allOff}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all disabled:opacity-30"
          style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.35)', color:'#ef4444' }}>
          <PowerOff size={11} /> Éteindre tout
        </button>
        {lcu.latitude && lcu.longitude && (
          <button onClick={() => flyTo(lcu.latitude, lcu.longitude, 16)}
            className="p-1.5 rounded-lg hover:bg-blue-500/20 text-white/30 hover:text-blue-400 transition-colors"
            title="Centrer sur la LCU">
            <Eye size={14} />
          </button>
        )}
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white">
          <X size={14} />
        </button>
      </div>

      <div className="h-px bg-white/8" />

      {/* ── Row 2: Stats + intensity slider ── */}
      <div className="flex items-center gap-4">
        {/* Stats chips */}
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          {[
            { label:'Total',       value:lamps.length, color:'#e2e8f0' },
            { label:'Allumés',     value:lit,           color:'#22c55e' },
            { label:'Éteints',     value:dark,          color:'#6b7280' },
            { label:'En ligne',    value:online,        color:'#22c55e' },
            { label:'Hors ligne',  value:offline,       color:'#ef4444' },
            { label:'Maintenance', value:maintenance,   color:'#f59e0b' },
            { label:'Alertes',     value:alerts,        color:'#ef4444' },
          ].map((s) => (
            <div key={s.label} className="text-center min-w-[36px]">
              <p className="text-[16px] font-bold leading-none" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[9px] text-white/35 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="w-px self-stretch bg-white/8 shrink-0" />

        {/* Group intensity slider */}
        <div className="w-44 shrink-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-white/50">Intensité groupe</span>
            <span className="text-[13px] font-bold text-blue-400">{groupDim}%</span>
          </div>
          <input type="range" min={0} max={100} value={groupDim}
            onChange={(e) => setGroupDim(Number(e.target.value))}
            className="w-full mb-1.5" style={{ accentColor: '#3b82f6' }} />
          <button
            onClick={() => applyGroupIntensity?.(lcu, groupDim, lamps)}
            disabled={isGroupToggling || !lamps.length}
            className="w-full py-1.5 rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-40"
            style={{ background:'rgba(59,130,246,0.2)', border:'1px solid rgba(59,130,246,0.45)', color:'#60a5fa' }}>
            {isGroupToggling ? 'Application…' : `Appliquer ${groupDim}%`}
          </button>
        </div>
      </div>

      <div className="h-px bg-white/8" />

      {/* ── Row 3: Lamp chips ── */}
      <div className="flex gap-2 overflow-x-auto pb-0.5">
        {lamps.map((l) => {
          const hex = STATUS[l.etat]?.hex || '#6b7280'
          const isToggling = togglingLamp?.has(l.id)
          return (
            <div key={l.id} className="shrink-0 flex items-center gap-0 rounded-lg overflow-hidden"
              style={{ border: `1px solid ${hex}44`, background: `${hex}0d` }}>
              <button onClick={() => onSelect(l)}
                className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-white/8 transition-colors">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: hex }} />
                <span className="text-[11px] font-mono text-white/80">{l.reference}</span>
                {l.has_critical_alert && <AlertTriangle size={9} className="text-red-400" />}
                <span className="text-[9px]" style={{ color: (l.intensite ?? 0) > 0 ? '#22c55e' : '#6b7280' }}>
                  {l.intensite ?? 0}%
                </span>
              </button>
              <div className="flex border-l" style={{ borderColor: `${hex}33` }}>
                {l.latitude && l.longitude && (
                  <button onClick={() => { onSelect(l); flyTo(l.latitude, l.longitude) }}
                    className="px-1.5 py-1.5 hover:bg-white/10 text-white/25 hover:text-white transition-colors"
                    title="Zoomer"><Eye size={9} /></button>
                )}
                <div style={{ padding:'0 6px', display:'flex', alignItems:'center' }}>
                  <LampToggle lamp={l} onToggle={(lamp, on) => toggleLamp?.(lamp, on)} disabled={isToggling} size="xs" />
                </div>
              </div>
            </div>
          )
        })}
        {lamps.length === 0 && <p className="text-[11px] text-white/30 py-1">Aucun lampadaire associé</p>}
      </div>
    </div>
  )
}
