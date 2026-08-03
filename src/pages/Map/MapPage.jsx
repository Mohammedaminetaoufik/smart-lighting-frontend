import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'
import {
  default as MapboxMap, Marker, Popup, Source, Layer,
  NavigationControl, ScaleControl, FullscreenControl, GeolocateControl,
} from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import toast from 'react-hot-toast'
import { getLampadaires, getMissingLocation, updateLocation, setDimming as apiSetDimming, getLatestTelemetry, assignLCU as apiAssignLCU } from '../../api/lampadaires'
import { getLCUs, createLCU as apiCreateLCU, bulkDimLCU as apiBulkDimLCU } from '../../api/lcus'
import { PageLoader } from '../../components/ui/Spinner'
import {
  Search, X, Zap, Wifi, WifiOff, Wrench, Radio,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Layers, RefreshCw, Power, PowerOff,
  AlertTriangle, Eye, MapPin,
  LocateFixed, SkipForward, Plus, Workflow, Sparkles, Maximize, Navigation,
} from 'lucide-react'
import { cn } from '../../utils/helpers'
import AIEntityInsightPanel from '../../components/ai/AIEntityInsightPanel'
import RoutePanel from '../../components/map/RoutePanel'
import MapWorldStartup from '../../components/map/MapWorldStartup'
import { useMapboxDirections } from '../../hooks/useMapboxDirections'
import { MAP_STARTUP_STORAGE_KEY } from '../../utils/mapStartup'
import { readMapMode, readMapViewState, saveMapMode, saveMapViewState } from '../../utils/mapViewState'

/* ──────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────── */
const STATUS = {
  online:      { hex: '#22c55e', label: 'En ligne',    icon: Wifi,    tw: 'text-green-400' },
  offline:     { hex: '#ef4444', label: 'Hors ligne',  icon: WifiOff, tw: 'text-red-400'   },
  maintenance: { hex: '#f59e0b', label: 'Maintenance', icon: Wrench,  tw: 'text-amber-400' },
}

/* Four map modes, all built on the Mapbox Standard basemap.
   `config` values are applied on the `basemap` import via setConfigProperty
   after every style load; `camera` sets pitch/bearing on mode change. */
const MAP_MODES = {
  'Plan clair': {
    style: 'mapbox://styles/mapbox/standard',
    config: { lightPreset: 'day', show3dObjects: false, showPlaceLabels: true, showRoadLabels: true, showPointOfInterestLabels: true, showTransitLabels: true },
    camera: { pitch: 0, bearing: 0 },
  },
  'Satellite': {
    style: 'mapbox://styles/mapbox/standard-satellite',
    config: { lightPreset: 'day', showPlaceLabels: true, showRoadLabels: true, showPointOfInterestLabels: false, showTransitLabels: false },
    camera: { pitch: 0, bearing: 0 },
  },
  '3D jour': {
    style: 'mapbox://styles/mapbox/standard',
    config: { lightPreset: 'day', show3dObjects: true, showPlaceLabels: true, showRoadLabels: true, showPointOfInterestLabels: true, showTransitLabels: true },
    camera: { pitch: 60, bearing: -20 },
  },
  '3D nuit': {
    style: 'mapbox://styles/mapbox/standard',
    config: { lightPreset: 'night', show3dObjects: true, showPlaceLabels: true, showRoadLabels: true, showPointOfInterestLabels: false, showTransitLabels: false },
    camera: { pitch: 60, bearing: -20 },
  },
}

/* Push a mode's Standard-basemap config to the live map. No-ops safely if
   the style isn't fully loaded yet (the style.load handler re-applies it). */
function applyMapboxConfig(map, modeKey) {
  const cfg = MAP_MODES[modeKey]?.config
  if (!map || !cfg) return
  Object.entries(cfg).forEach(([key, value]) => {
    try { map.setConfigProperty('basemap', key, value) } catch { /* style not ready */ }
  })
}

const LCU_RADIUS = 600  // metres — visual coverage zone
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN

/* ──────────────────────────────────────────────────────────────
   MARKER FACTORIES
───────────────────────────────────────────────────────────── */
function LampMarkerVisual({ lamp, selected = false }) {
  const isLit = (lamp.intensite ?? 0) > 0
  const size = selected ? 22 : 16
  const ring = STATUS[lamp.etat]?.hex || '#64748b'
  return (
    <div className="relative flex cursor-pointer items-center justify-center" style={{ width: size + 18, height: size + 18 }}>
      {lamp.has_critical_alert && <span className="marker-alert-ring absolute inset-0 rounded-full border-2 border-red-500" />}
      <span className="absolute rounded-full border" style={{
        width: size + 12, height: size + 12, borderColor: ring,
        opacity: isLit ? 0.65 : 0.35,
        background: isLit ? `conic-gradient(rgba(255,255,255,.5) ${(lamp.intensite ?? 0) * 3.6}deg, transparent 0)` : 'transparent',
      }} />
      <span className="relative z-10 flex items-center justify-center rounded-full border-2" style={{
        width: size, height: size,
        background: isLit ? '#22c55e' : '#374151',
        borderColor: selected ? '#fff' : 'rgba(255,255,255,.65)',
        boxShadow: selected ? `0 0 0 3px rgba(255,255,255,.75), 0 0 24px ${ring}` : isLit ? '0 0 16px rgba(34,197,94,.65)' : '0 2px 7px rgba(0,0,0,.5)',
      }}>
        <span className="h-1 w-1 rounded-full bg-white/80" />
      </span>
    </div>
  )
}

function LCUMarkerVisual({ lcu, count, selected }) {
  return (
    <div className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border-2 px-2.5 py-1.5 text-[11px] font-bold text-white"
      style={{
        background: 'linear-gradient(135deg,#0369a1,#0ea5e9)',
        borderColor: selected ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.35)',
        boxShadow: selected ? '0 0 0 3px rgba(255,255,255,.65),0 0 22px rgba(14,165,233,.65)' : '0 4px 14px rgba(14,165,233,.45)',
      }}>
      <Radio size={11} />
      {lcu.reference || lcu.name}
      <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[9px]">{count}</span>
    </div>
  )
}

function circleFeature(latitude, longitude, radiusMetres, properties = {}) {
  const points = []
  const latRadius = radiusMetres / 111320
  const lngRadius = radiusMetres / (111320 * Math.cos(latitude * Math.PI / 180))
  for (let i = 0; i <= 64; i += 1) {
    const angle = (i / 64) * Math.PI * 2
    points.push([longitude + Math.cos(angle) * lngRadius, latitude + Math.sin(angle) * latRadius])
  }
  return { type: 'Feature', properties, geometry: { type: 'Polygon', coordinates: [points] } }
}

/* ──────────────────────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────────────────────── */
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
  const [showMapStartup, setShowMapStartup] = useState(() =>
    import.meta.env.MODE !== 'test' &&
    sessionStorage.getItem(MAP_STARTUP_STORAGE_KEY) !== 'shown'
  )
  const finishMapStartup = useCallback(() => setShowMapStartup(false), [])

  useEffect(() => {
    if (showMapStartup) sessionStorage.setItem(MAP_STARTUP_STORAGE_KEY, 'shown')
  }, [showMapStartup])

  return (
    <div className="relative isolate min-h-[calc(100vh-7rem)]">
      <MapPageContent />
      {showMapStartup && <MapWorldStartup onComplete={finishMapStartup} />}
    </div>
  )
}

function MapPageContent() {
  const savedMapViewRef = useRef(readMapViewState())
  const [lamps,       setLamps]       = useState([])
  const [lcus,        setLCUs]        = useState([])
  const [missing,     setMissing]     = useState([])   // lamps without GPS
  const [selected,    setSelected]    = useState(null) // { type:'lamp'|'lcu', data }
  const [loading,     setLoading]     = useState(true)
  const [filters,     setFilters]     = useState({ online:true, offline:true, maintenance:true })
  const [search,      setSearch]      = useState('')
  const { theme } = useTheme()
  const [mapMode,     setMapMode]     = useState(() => readMapMode(theme === 'dark' ? '3D nuit' : 'Plan clair'))
  const mapModeRef = useRef(mapMode)   // read by the persistent style.load handler
  const skipInitialModeCameraRef = useRef(Boolean(savedMapViewRef.current))
  const [sideOpen,    setSideOpen]    = useState(true)
  const [showZones,   setShowZones]   = useState(true)
  const [showLines,   setShowLines]   = useState(true)
  const [placing,     setPlacing]     = useState(null) // { queue:[], idx:0 } or null
  const [savingLoc,   setSavingLoc]   = useState(false)
  const [repositioning, setRepositioning] = useState(null) // selected LP + draft/original GPS coordinates
  const [savingReposition, setSavingReposition] = useState(false)
  const [expandedLCU, setExpandedLCU] = useState(null) // lcu.id expanded in sidebar
  const [togglingLamp, setTogglingLamp] = useState(() => new Set())
  const [togglingLCU,  setTogglingLCU]  = useState(() => new Set())
  // new-LCU creation flow
  const [addingLCU,   setAddingLCU]   = useState(false)   // waiting for map click
  const [newLCUPos,   setNewLCUPos]   = useState(null)    // { lat, lng } from map click
  const [newLCUForm,  setNewLCUForm]  = useState({ reference:'', name:'', ip_address:'', port:'8080', zone:'' })
  const [savingLCU,   setSavingLCU]   = useState(false)
  const mapRef = useRef(null)
  const initialFitDone = useRef(Boolean(savedMapViewRef.current))
  const [mapLoaded, setMapLoaded] = useState(false)
  const [hoveredLamp, setHoveredLamp] = useState(null)
  const [activeTab, setActiveTab] = useState('network')
  const [aiPanel, setAiPanel] = useState(null) // { entityType, entityId }
  const [searchParams, setSearchParams] = useSearchParams()

  // Driving-directions state + actions (logic lives in the dedicated hook)
  const { route, status: routeStatus, error: routeError, calculateDrivingRoute, clearRoute } = useMapboxDirections()

  // Route line colour comes from the theme (--brand), never hardcoded
  const routeColor = useMemo(() => {
    if (typeof window === 'undefined') return '#0eaee8'
    const v = getComputedStyle(document.documentElement).getPropertyValue('--brand').trim()
    return v || '#0eaee8'
    // theme is a trigger: --brand changes value when the theme toggles
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme])

  const routeGeoJSON = useMemo(
    () => (route?.geometry ? { type: 'Feature', properties: {}, geometry: route.geometry } : null),
    [route],
  )

  /* Build the destination descriptor from a selected LCU/lamp and request a
     route. Only ever invoked from the "Itinéraire" button — never on load. */
  const handleDirections = useCallback((type, entity) => {
    calculateDrivingRoute({
      destination: {
        id: entity.id,
        type,
        label: entity.reference || entity.name || (type === 'lcu' ? 'LCU' : 'Lampadaire'),
        longitude: entity.longitude,
        latitude: entity.latitude,
      },
    })
  }, [calculateDrivingRoute])

  const flyTo = useCallback((lat, lng, zoom = 18) => {
    mapRef.current?.flyTo({ center: [Number(lng), Number(lat)], zoom, duration: 800 })
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
      await apiBulkDimLCU(lcu.id, { intensity, reason: `Groupe ${lcu.reference || lcu.name} - ${intensity}%` })
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
      await apiBulkDimLCU(lcu.id, { intensity, reason: `Groupe ${lcu.reference || lcu.name} - ${on ? 'ON' : 'OFF'}` })
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

  const startReposition = useCallback((lamp) => {
    if (lamp?.latitude == null || lamp?.longitude == null) {
      toast.error('Ce lampadaire doit d’abord être localisé.')
      return
    }
    const latitude = Number(lamp.latitude)
    const longitude = Number(lamp.longitude)
    setPlacing(null)
    setAddingLCU(false)
    setNewLCUPos(null)
    setRepositioning({
      lampId: lamp.id,
      reference: lamp.reference,
      originalLatitude: latitude,
      originalLongitude: longitude,
      latitude,
      longitude,
    })
    flyTo(latitude, longitude, 19)
  }, [flyTo])

  const updateRepositionDraft = useCallback((latitude, longitude) => {
    setRepositioning((current) => current ? {
      ...current,
      latitude: Number(latitude),
      longitude: Number(longitude),
    } : current)
  }, [])

  const cancelReposition = useCallback(() => {
    if (savingReposition) return
    setRepositioning(null)
  }, [savingReposition])

  const saveReposition = useCallback(async () => {
    if (!repositioning || savingReposition) return
    setSavingReposition(true)
    try {
      const { lampId, latitude, longitude, reference } = repositioning
      await updateLocation(lampId, { latitude, longitude })
      const updateLampPosition = (lamp) => lamp.id === lampId ? {
        ...lamp,
        latitude,
        longitude,
        location_status: 'confirmed',
        commissioning_status: lamp.commissioning_status === 'discovered' ? 'located' : lamp.commissioning_status,
      } : lamp
      setLamps((current) => current.map(updateLampPosition))
      setMissing((current) => current.filter((lamp) => lamp.id !== lampId))
      setSelected((current) => current?.type === 'lamp' && current.data.id === lampId
        ? { ...current, data: updateLampPosition(current.data) }
        : current)
      setRepositioning(null)
      toast.success(`Position de ${reference} mise à jour`)
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message)
    } finally {
      setSavingReposition(false)
    }
  }, [repositioning, savingReposition])

  useEffect(load, [load])

  // Changing the selected entity cancels an unfinished move without mutating data.
  useEffect(() => {
    if (repositioning && (selected?.type !== 'lamp' || selected.data.id !== repositioning.lampId)) {
      setRepositioning(null)
    }
  }, [selected, repositioning])

  /* silent auto-refresh every 30s — keeps the map live without the loading spinner */
  useEffect(() => {
    const id = setInterval(() => {
      if (placing || addingLCU || repositioning) return // don't disturb active placement flows
      Promise.all([
        getLampadaires().catch(() => null),
        getLCUs().catch(() => null),
      ]).then(([ls, lu]) => {
        if (ls) setLamps(Array.isArray(ls) ? ls : ls?.lampadaires || [])
        if (lu) setLCUs(Array.isArray(lu) ? lu : lu?.lcus || [])
      })
    }, 30_000)
    return () => clearInterval(id)
  }, [placing, addingLCU, repositioning])

  /* highlight entity from URL params (e.g. navigated from AlertsPage) */
  useEffect(() => {
    if (loading) return
    const lampId = searchParams.get('lampId')
    const lcuId  = searchParams.get('lcuId')
    if (!lampId && !lcuId) return

    if (lampId) {
      const lamp = lamps.find((l) => String(l.id) === lampId)
      if (lamp) {
        setSelected({ type: 'lamp', data: lamp })
        if (lamp.latitude && lamp.longitude) {
          setTimeout(() => flyTo(lamp.latitude, lamp.longitude, 18), 300)
        }
      }
    } else if (lcuId) {
      const lcu = lcus.find((l) => String(l.id) === lcuId)
      if (lcu) {
        setSelected({ type: 'lcu', data: lcu })
        if (lcu.latitude && lcu.longitude) {
          setTimeout(() => flyTo(lcu.latitude, lcu.longitude, 16), 300)
        }
      }
    }
    // clear params so back navigation doesn't re-trigger
    setSearchParams({}, { replace: true })
  }, [loading, lamps, lcus, searchParams, setSearchParams, flyTo])

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

  const visibleLCUs = useMemo(() => lcus.filter((l) => l.latitude != null && l.longitude != null), [lcus])

  const allPoints = useMemo(() =>
    filtered.map((l) => [Number(l.longitude), Number(l.latitude)]), [filtered])

  const lampGeoJSON = useMemo(() => ({
    type: 'FeatureCollection',
    features: filtered
      .filter((lamp) => !(selected?.type === 'lamp' && selected.data.id === lamp.id))
      .map((lamp) => ({
        type: 'Feature',
        id: lamp.id,
        properties: {
          id: lamp.id,
          reference: lamp.reference || '',
          etat: lamp.etat || 'unknown',
          intensity: Number(lamp.intensite ?? 0),
          hasAlert: Boolean(lamp.has_critical_alert),
          zone: lamp.zone || '',
        },
        geometry: { type: 'Point', coordinates: [Number(lamp.longitude), Number(lamp.latitude)] },
      })),
  }), [filtered, selected])

  const coverageGeoJSON = useMemo(() => ({
    type: 'FeatureCollection',
    features: showZones ? visibleLCUs.map((lcu) => circleFeature(
      Number(lcu.latitude), Number(lcu.longitude), LCU_RADIUS,
      { id: lcu.id, selected: selected?.type === 'lcu' && selected.data.id === lcu.id }
    )) : [],
  }), [showZones, visibleLCUs, selected])

  /* selected LCU lines */
  const connectionLines = useMemo(() => {
    if (!selected || selected.type !== 'lcu' || !showLines) return []
    const lcu = selected.data
    if (!lcu.latitude || !lcu.longitude) return []
    return (lampsByLCU[lcu.id] || [])
      .filter((l) => l.latitude && l.longitude)
      .map((l) => [[Number(lcu.longitude), Number(lcu.latitude)], [Number(l.longitude), Number(l.latitude)]])
  }, [selected, lampsByLCU, showLines])

  const connectionGeoJSON = useMemo(() => ({
    type: 'FeatureCollection',
    features: connectionLines.map((coordinates, index) => ({
      type: 'Feature', id: index, properties: {}, geometry: { type: 'LineString', coordinates },
    })),
  }), [connectionLines])

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
    ? { latitude: Number(filtered[0].latitude), longitude: Number(filtered[0].longitude) }
    : { latitude: 36.7372, longitude: 3.0865 }

  const handleMapClick = useCallback((event) => {
    const map = mapRef.current?.getMap?.()
    const queryLayers = ['lamp-clusters', 'lamp-points'].filter((id) => map?.getLayer(id))
    const feature = queryLayers.length ? map.queryRenderedFeatures(event.point, { layers: queryLayers })[0] : null

    if (feature?.layer?.id === 'lamp-clusters') {
      const source = map.getSource('lamps')
      source?.getClusterExpansionZoom(feature.properties.cluster_id, (error, zoom) => {
        if (!error) map.easeTo({ center: feature.geometry.coordinates, zoom })
      })
      return
    }

    if (feature?.layer?.id === 'lamp-points') {
      const lamp = lamps.find((item) => Number(item.id) === Number(feature.properties.id))
      if (lamp) {
        setSelected({ type: 'lamp', data: lamp })
        setHoveredLamp(null)
      }
      return
    }

    const { lat, lng } = event.lngLat
    if (placing) handlePlace(lat, lng)
    else if (addingLCU) { setNewLCUPos({ lat, lng }); setAddingLCU(false) }
    else if (repositioning) updateRepositionDraft(lat, lng)
    else setSelected(null)
  }, [lamps, placing, handlePlace, addingLCU, repositioning, updateRepositionDraft])

  const handleMapMouseMove = useCallback((event) => {
    const map = mapRef.current?.getMap?.()
    if (!map) return
    const queryLayers = ['lamp-clusters', 'lamp-points'].filter((id) => map.getLayer(id))
    const feature = queryLayers.length ? map.queryRenderedFeatures(event.point, { layers: queryLayers })[0] : null
    map.getCanvas().style.cursor = placing || addingLCU || repositioning ? 'crosshair' : feature ? 'pointer' : ''
    if (feature?.layer?.id === 'lamp-points') {
      const lamp = lamps.find((item) => Number(item.id) === Number(feature.properties.id))
      setHoveredLamp((current) => current?.id === lamp?.id ? current : lamp || null)
    } else {
      setHoveredLamp((current) => current ? null : current)
    }
  }, [lamps, placing, addingLCU, repositioning])

  useEffect(() => {
    if (!mapLoaded || initialFitDone.current || allPoints.length === 0) return
    initialFitDone.current = true
    if (allPoints.length === 1) {
      mapRef.current?.flyTo({ center: allPoints[0], zoom: 18, duration: 0 })
      return
    }
    const lngs = allPoints.map((point) => point[0])
    const lats = allPoints.map((point) => point[1])
    mapRef.current?.fitBounds(
      [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
      { padding: 60, maxZoom: 19, duration: 0 }
    )
  }, [mapLoaded, allPoints])

  /* Keep the ref in sync so the persistent style.load handler applies the
     current mode's config after Mapbox reloads a Standard style. */
  useEffect(() => {
    mapModeRef.current = mapMode
    saveMapMode(mapMode)
  }, [mapMode])

  /* On mode change: ease the camera (pitch/bearing) and re-apply the basemap
     config. Config is applied here directly for same-style switches
     (e.g. 3D jour ↔ 3D nuit share the Standard style, so style.load never
     fires); cross-style switches are covered by the style.load handler. */
  useEffect(() => {
    if (!mapLoaded) return
    const map = mapRef.current?.getMap?.()
    if (!map) return
    const mode = MAP_MODES[mapMode]
    if (skipInitialModeCameraRef.current) {
      skipInitialModeCameraRef.current = false
      if (map.isStyleLoaded()) applyMapboxConfig(map, mapMode)
      return
    }
    if (mode?.camera) {
      map.easeTo({ pitch: mode.camera.pitch, bearing: mode.camera.bearing, duration: 700 })
    }
    if (map.isStyleLoaded()) applyMapboxConfig(map, mapMode)
  }, [mapMode, mapLoaded])

  /* Recenter the camera to frame every visible equipment (lamps + LCUs).
     Uses only DB-stored coordinates — never the user's geolocation. */
  const recenterAll = useCallback(() => {
    const points = [
      ...filtered.map((l) => [Number(l.longitude), Number(l.latitude)]),
      ...visibleLCUs.map((l) => [Number(l.longitude), Number(l.latitude)]),
    ].filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat))
    if (!points.length) { toast('Aucun équipement localisé', { icon: 'ℹ️' }); return }
    const map = mapRef.current
    if (points.length === 1) { map?.flyTo({ center: points[0], zoom: 17, duration: 800 }); return }
    const lngs = points.map((p) => p[0])
    const lats = points.map((p) => p[1])
    map?.fitBounds(
      [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
      { padding: 80, maxZoom: 18, duration: 800 }
    )
  }, [filtered, visibleLCUs])

  /* Frame the whole route once it's computed. Padding accounts for the left
     sidebar, the bottom details card and the right-hand route/legend panels. */
  useEffect(() => {
    if (routeStatus !== 'ready' || !route?.geometry?.coordinates?.length) return
    const coords = route.geometry.coordinates
    const lngs = coords.map((c) => c[0])
    const lats = coords.map((c) => c[1])
    mapRef.current?.fitBounds(
      [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
      {
        padding: {
          top: 90,
          bottom: selected ? 220 : 90, // bottom details card
          left: sideOpen ? 300 : 70,   // left sidebar
          right: 290,                  // route panel + legend
        },
        duration: 900,
      },
    )
    // Refit only when a new route arrives, not on every panel toggle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeStatus, route])

  /* Selecting a different equipment removes the previous route. Recalculation
     happens only when the user clicks the button again (never automatic). */
  useEffect(() => {
    if (!route || !selected) return
    const sameTarget = selected.type === route.destination?.type
      && Number(selected.data?.id) === Number(route.destination?.id)
    if (!sameTarget) clearRoute()
  }, [selected, route, clearRoute])

  const stats = useMemo(() => ({
    lit:         lamps.filter((l) => (l.intensite ?? 0) > 0).length,
    dark:        lamps.filter((l) => (l.intensite ?? 0) === 0).length,
    online:      lamps.filter((l) => l.etat === 'online').length,
    offline:     lamps.filter((l) => l.etat === 'offline').length,
    maintenance: lamps.filter((l) => l.etat === 'maintenance').length,
    alerts:      lamps.filter((l) => l.has_critical_alert).length,
  }), [lamps])

  const repositionChanged = repositioning
    ? Math.abs(repositioning.latitude - repositioning.originalLatitude) > 1e-9
      || Math.abs(repositioning.longitude - repositioning.originalLongitude) > 1e-9
    : false

  if (loading) return <PageLoader />

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-red-500/25 bg-red-500/5 p-8 text-center">
        <div>
          <AlertTriangle size={24} className="mx-auto text-red-400" />
          <p className="mt-3 text-sm font-semibold text-[var(--text)]">Jeton Mapbox non configuré</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Ajoutez VITE_MAPBOX_ACCESS_TOKEN dans le fichier .env du frontend.</p>
        </div>
      </div>
    )
  }

  return (
    <div id="map-page-root" className="relative flex h-[calc(100vh-3.5rem-3rem)] -m-4 lg:-m-6 overflow-hidden bg-[var(--bg)]">

      {/* ═══ MAP ═══════════════════════════════════════════════ */}
      <MapboxMap
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={savedMapViewRef.current ?? { ...center, zoom: 14, bearing: 0, pitch: 0 }}
        minZoom={3}
        maxZoom={21}
        mapStyle={MAP_MODES[mapMode].style}
        reuseMaps
        attributionControl
        style={{ flex: 1, height: '100%' }}
        className="mapbox-page-container"
        cursor={placing || addingLCU || repositioning ? 'crosshair' : 'grab'}
        onLoad={(event) => {
          const map = event.target
          // Re-apply the current mode's Standard-basemap config after every
          // style (re)load. Registered once; persists across style switches
          // and reads the latest mode via the ref, so no duplicate handlers.
          map.on('style.load', () => applyMapboxConfig(map, mapModeRef.current))
          applyMapboxConfig(map, mapModeRef.current)
          setMapLoaded(true)
        }}
        onClick={handleMapClick}
        onMoveEnd={(event) => saveMapViewState(event.viewState)}
        onMouseMove={handleMapMouseMove}
        onMouseLeave={() => setHoveredLamp(null)}
      >
        <NavigationControl position="bottom-right" showCompass visualizePitch />
        <ScaleControl position="bottom-left" unit="metric" />
        {/* User geolocation only — equipment positions always come from the DB */}
        <GeolocateControl position="bottom-right" positionOptions={{ enableHighAccuracy: true }}
          trackUserLocation showUserHeading />
        {/* Fullscreen targets the whole map page (map + network sidebar +
            stats + panels), not just the map canvas — the app chrome around
            it is excluded, but every map overlay stays visible. */}
        <FullscreenControl position="top-right" containerId="map-page-root" />

        {/* LCU coverage zones */}
        <Source id="lcu-coverage" type="geojson" data={coverageGeoJSON}>
          <Layer id="lcu-coverage-fill" type="fill" paint={{
            'fill-color': '#0ea5e9',
            'fill-opacity': ['case', ['boolean', ['get', 'selected'], false], 0.13, 0.045],
          }} />
          <Layer id="lcu-coverage-line" type="line" paint={{
            'line-color': '#38bdf8',
            'line-width': ['case', ['boolean', ['get', 'selected'], false], 2, 1],
            'line-opacity': 0.55,
            'line-dasharray': [3, 2],
          }} />
        </Source>

        {/* LCU → LP connection lines */}
        <Source id="lcu-connections" type="geojson" data={connectionGeoJSON}>
          <Layer id="lcu-connections-line" type="line" paint={{
            'line-color': '#38bdf8', 'line-width': 1.5, 'line-opacity': 0.55, 'line-dasharray': [2, 3],
          }} />
        </Source>

        {/* Driving route — declared in JSX so react-map-gl re-adds it after a
            style switch. Kept below the lamp layers so points stay clickable. */}
        {routeGeoJSON && (
          <Source id="route-source" type="geojson" data={routeGeoJSON}>
            <Layer id="route-line-casing" type="line"
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
              paint={{ 'line-color': '#0b1220', 'line-width': 10, 'line-opacity': 0.35, 'line-blur': 1 }} />
            <Layer id="route-line" type="line"
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
              paint={{ 'line-color': routeColor, 'line-width': 6, 'line-opacity': 0.9, 'line-emissive-strength': 1 }} />
          </Source>
        )}

        {/* Route start (user position) marker — one instance, updated in place */}
        {route?.start && Number.isFinite(route.start.longitude) && Number.isFinite(route.start.latitude) && (
          <Marker longitude={route.start.longitude} latitude={route.start.latitude} anchor="center">
            <div className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-white"
              style={{ background: routeColor, boxShadow: `0 0 12px ${routeColor}` }}>
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
            </div>
          </Marker>
        )}

        {/* Route destination marker */}
        {route?.destination && Number.isFinite(Number(route.destination.longitude)) && Number.isFinite(Number(route.destination.latitude)) && (
          <Marker longitude={Number(route.destination.longitude)} latitude={Number(route.destination.latitude)} anchor="bottom">
            <div className="flex flex-col items-center" style={{ color: routeColor }}>
              <div className="rounded-lg border border-white/70 px-2 py-0.5 text-[10px] font-bold text-white"
                style={{ background: routeColor, boxShadow: `0 0 12px ${routeColor}` }}>
                {route.destination.label}
              </div>
              <MapPin size={20} className="-mt-0.5 drop-shadow" fill={routeColor} stroke="#fff" strokeWidth={1.5} />
            </div>
          </Marker>
        )}

        {/* Native Mapbox WebGL clustering for lampadaires */}
        <Source id="lamps" type="geojson" data={lampGeoJSON} cluster clusterMaxZoom={16} clusterRadius={60}>
          <Layer id="lamp-clusters" type="circle" filter={['has', 'point_count']} paint={{
            'circle-color': '#082f49',
            'circle-radius': ['step', ['get', 'point_count'], 18, 25, 23, 100, 28],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#0ea5e9',
            'circle-opacity': 0.94,
            'circle-emissive-strength': 1,
          }} />
          <Layer id="lamp-cluster-count" type="symbol" filter={['has', 'point_count']} layout={{
            'text-field': ['get', 'point_count_abbreviated'],
            'text-size': 12,
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          }} paint={{ 'text-color': '#ffffff' }} />
          <Layer id="lamp-points" type="circle" filter={['!', ['has', 'point_count']]} paint={{
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 5, 17, 8],
            'circle-color': ['case',
              ['>', ['get', 'intensity'], 0], '#22c55e',
              ['match', ['get', 'etat'], 'offline', '#ef4444', 'maintenance', '#f59e0b', '#475569'],
            ],
            'circle-stroke-width': ['case', ['boolean', ['get', 'hasAlert'], false], 3, 2],
            'circle-stroke-color': ['case', ['boolean', ['get', 'hasAlert'], false], '#ef4444', '#ffffff'],
            'circle-opacity': 0.95,
            'circle-blur': ['case', ['>', ['get', 'intensity'], 0], 0.14, 0],
            'circle-emissive-strength': 1,
          }} />
        </Source>

        {/* Hover information for an unclustered LP */}
        {hoveredLamp && !(selected?.type === 'lamp' && selected.data.id === hoveredLamp.id) && (
          <Popup longitude={Number(hoveredLamp.longitude)} latitude={Number(hoveredLamp.latitude)}
            anchor="bottom" offset={12} closeButton={false} closeOnClick={false} className="mapbox-tooltip">
            <div className="map-glass whitespace-nowrap px-2.5 py-1.5 text-[11px] font-medium text-white">
              <span className="font-mono">{hoveredLamp.reference}</span>
              <span className="mx-1.5 opacity-40">·</span>
              <span style={{ color: STATUS[hoveredLamp.etat]?.hex }}>{STATUS[hoveredLamp.etat]?.label}</span>
              <span className="mx-1.5 opacity-40">·</span>
              <span className="text-white/70">{hoveredLamp.intensite ?? 0}%</span>
            </div>
          </Popup>
        )}

        {/* Selected LP stays outside the cluster and remains draggable. */}
        {selected?.type === 'lamp' && selected.data.latitude != null && selected.data.longitude != null && (
          <Marker
            longitude={repositioning?.lampId === selected.data.id ? repositioning.longitude : Number(selected.data.longitude)}
            latitude={repositioning?.lampId === selected.data.id ? repositioning.latitude : Number(selected.data.latitude)}
            anchor="center"
            draggable={repositioning?.lampId === selected.data.id}
            onDragEnd={(event) => {
              if (repositioning?.lampId === selected.data.id) updateRepositionDraft(event.lngLat.lat, event.lngLat.lng)
            }}
            onClick={(event) => event.originalEvent.stopPropagation()}>
            <LampMarkerVisual lamp={selected.data} selected />
          </Marker>
        )}

        {/* New LCU preview */}
        {newLCUPos && (
          <Marker longitude={newLCUPos.lng} latitude={newLCUPos.lat} anchor="bottom">
            <LCUMarkerVisual lcu={{ reference: 'NOUVEAU' }} count={0} selected />
          </Marker>
        )}

        {/* LCU markers */}
        {visibleLCUs.map((lcu) => {
          const isSelected = selected?.type === 'lcu' && selected.data.id === lcu.id
          const count = (lampsByLCU[lcu.id] || []).length
          return (
            <Marker key={`lcu-${lcu.id}`} longitude={Number(lcu.longitude)} latitude={Number(lcu.latitude)} anchor="bottom"
              onClick={(event) => {
                event.originalEvent.stopPropagation()
                setSelected({ type: 'lcu', data: lcu })
                setExpandedLCU(lcu.id)
              }}>
              <LCUMarkerVisual lcu={lcu} count={count} selected={isSelected} />
            </Marker>
          )
        })}

        {selected?.type === 'lcu' && selected.data.latitude != null && selected.data.longitude != null && (
          <Popup longitude={Number(selected.data.longitude)} latitude={Number(selected.data.latitude)}
            anchor="bottom" offset={36} closeButton onClose={() => setSelected(null)}
            maxWidth="340px" className="lcu-popup">
            <LCUMapPopup
              lcu={selected.data}
              lamps={lampsByLCU[selected.data.id] || []}
              toggleLamp={toggleLamp}
              toggleLCUGroup={toggleLCUGroup}
              togglingLamp={togglingLamp}
              togglingLCU={togglingLCU}
              onFlyTo={flyTo}
              onSelect={(lamp) => setSelected({ type: 'lamp', data: lamp })}
            />
          </Popup>
        )}
      </MapboxMap>

      {/* ═══ RECENTER-ON-ALL BUTTON (sits below the fullscreen control) ═══ */}
      <button
        onClick={recenterAll}
        title="Recentrer sur tous les équipements"
        className="absolute right-2.5 top-14 z-[500] flex h-[29px] w-[29px] items-center justify-center rounded-md map-glass text-white/70 transition-colors hover:bg-white/15 hover:text-white">
        <Maximize size={15} />
      </button>

      {/* ═══ DRIVING ROUTE PANEL ══════════════════════════════ */}
      <RoutePanel status={routeStatus} error={routeError} route={route} onClear={clearRoute} />

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
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none z-10" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher référence, zone…"
                style={{ backgroundColor: 'rgba(0,0,0,0.35)', color: 'white', colorScheme: 'dark' }}
                className="w-full border border-white/15 rounded-xl pl-8 pr-3 py-2 text-[12px] placeholder:text-white/35 focus:outline-none focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/30" />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Tab navigation */}
          <div className="flex border-b border-white/8 shrink-0">
            {[{ key: 'controls', label: 'Carte' }, { key: 'network', label: 'Réseau' }].map((t) => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={cn(
                  'flex-1 py-2.5 text-[12px] font-semibold transition-all relative',
                  activeTab === t.key ? 'text-white' : 'text-white/35 hover:text-white/60'
                )}>
                {t.label}
                {activeTab === t.key && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full bg-brand-500" />
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">

            {/* ── Carte tab ── */}
            {activeTab === 'controls' && (
              <div className="px-4 py-4 space-y-5">

                {/* Status filters */}
                <div>
                  <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mb-3">Filtrer par état</p>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(STATUS).map(([key, s]) => {
                      const count = lamps.filter((l) => l.etat === key).length
                      return (
                        <button key={key} onClick={() => setFilters((f) => ({ ...f, [key]: !f[key] }))}
                          className={cn(
                            'flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all',
                            filters[key] ? 'bg-white/6 border-white/10' : 'bg-transparent border-white/5 opacity-30'
                          )}>
                          <span className="w-2.5 h-2.5 rounded-full"
                            style={{ background: s.hex, boxShadow: filters[key] ? `0 0 8px ${s.hex}80` : 'none' }} />
                          <span className="text-[17px] font-bold leading-none" style={{ color: s.hex }}>{count}</span>
                          <span className="text-[9px] text-white/45">{s.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Layer toggles */}
                <div>
                  <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mb-1">Couches de carte</p>
                  {[
                    { label: 'Zones de couverture', key: 'zones', val: showZones, set: setShowZones },
                    { label: 'Lignes de connexion', key: 'lines', val: showLines, set: setShowLines },
                  ].map((t) => (
                    <div key={t.key} onClick={() => t.set((v) => !v)}
                      className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0 cursor-pointer">
                      <span className={cn('text-[12px] transition-colors', t.val ? 'text-white/75' : 'text-white/35')}>
                        {t.label}
                      </span>
                      <div className={cn('relative w-9 h-5 rounded-full transition-colors shrink-0',
                        t.val ? 'bg-brand-500' : 'bg-white/15')}>
                        <span className={cn(
                          'absolute top-[3px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform duration-200 left-[3px]',
                          t.val ? 'translate-x-[16px]' : 'translate-x-0'
                        )} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Map-mode selector — Standard / Satellite / 3D day / 3D night */}
                <div>
                  <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mb-2">Mode de carte</p>
                  <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-white/5">
                    {Object.keys(MAP_MODES).map((k) => (
                      <button key={k} onClick={() => setMapMode(k)}
                        className={cn(
                          'py-1.5 rounded-lg text-[11px] font-medium transition-all',
                          mapMode === k ? 'bg-brand-500 text-white' : 'text-white/45 hover:text-white/70'
                        )}>{k}</button>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* ── Réseau tab ── */}
            {activeTab === 'network' && (
              <div className="py-3">

                {/* Missing lamps */}
                {missing.length > 0 && (
                  <div className="mx-3 mb-3 rounded-xl p-3"
                    style={{ background: 'rgba(234,179,8,0.07)', border: '1px solid rgba(234,179,8,0.18)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin size={11} className="text-yellow-400" />
                      <span className="text-[11px] font-semibold text-yellow-300 flex-1">Non localisés</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-400">
                        {missing.length}
                      </span>
                    </div>
                    <button onClick={() => startPlacing(missing)}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                      style={{ background:'rgba(234,179,8,0.1)', border:'1px solid rgba(234,179,8,0.28)', color:'#fde047' }}>
                      <LocateFixed size={11} /> Localiser tous ({missing.length})
                    </button>
                    <div className="mt-1.5 space-y-0.5 max-h-24 overflow-y-auto">
                      {missing.map((lamp) => (
                        <div key={lamp.id} className="flex items-center gap-2 px-1 py-1 rounded-lg hover:bg-yellow-400/8 group">
                          <span className="text-[10px] font-mono text-white/45 flex-1 truncate">{lamp.reference}</span>
                          <button onClick={() => startPlacing([lamp])}
                            className="opacity-0 group-hover:opacity-100 text-[10px] text-yellow-400 transition-all font-medium">
                            Placer
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* LCU section */}
                {visibleLCUs.length > 0 && (
                  <div className="px-3 mb-3">
                    <div className="flex items-center gap-2 px-1 mb-2">
                      <Radio size={10} className="text-blue-400" />
                      <span className="text-[10px] font-semibold text-white/35 uppercase tracking-widest flex-1">Passerelles LCU</span>
                      <span className="text-[11px] font-bold text-blue-400">{visibleLCUs.length}</span>
                    </div>
                    <div className="space-y-1.5">
                      {visibleLCUs.map((lcu) => {
                        const isSelected = selected?.type === 'lcu' && selected.data.id === lcu.id
                        const group = lampsByLCU[lcu.id] || []
                        const count = group.length
                        const isExpanded = expandedLCU === lcu.id
                        const isGroupToggling = togglingLCU.has(lcu.id)
                        const allOn  = count > 0 && group.every((l) => (l.intensite ?? 0) > 0)
                        const allOff = count > 0 && group.every((l) => (l.intensite ?? 0) === 0)
                        const litCount = group.filter((l) => (l.intensite ?? 0) > 0).length
                        return (
                          <div key={`lcu-side-${lcu.id}`}
                            className={cn('rounded-xl overflow-hidden transition-all',
                              isSelected ? 'ring-1 ring-blue-500/40 bg-blue-500/8' : 'bg-white/4'
                            )}>
                            {/* LCU name row */}
                            <div className="flex items-center gap-2 px-3 py-2.5">
                              <Radio size={10} className="text-blue-400/60 shrink-0" />
                              <button onClick={() => setSelected({ type:'lcu', data:lcu })}
                                className="flex-1 text-left min-w-0">
                                <span className="text-[12px] font-semibold text-white/80 truncate block">
                                  {lcu.reference || lcu.name}
                                </span>
                              </button>
                              <span className="text-[10px] shrink-0">
                                <span className="text-green-400 font-bold">{litCount}</span>
                                <span className="text-white/25">/{count}</span>
                              </span>
                              <button onClick={() => { setSelected({ type:'lcu', data:lcu }); flyTo(lcu.latitude, lcu.longitude, 16) }}
                                className="p-1 rounded hover:bg-white/10 text-white/20 hover:text-blue-400 transition-colors shrink-0"
                                title="Centrer"><Eye size={10} /></button>
                              <button onClick={() => setExpandedLCU((v) => v === lcu.id ? null : lcu.id)}
                                className="p-1 rounded hover:bg-white/10 text-white/20 hover:text-white transition-colors shrink-0">
                                {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                              </button>
                            </div>
                            {/* Group controls */}
                            <div className="flex gap-1.5 px-3 pb-2.5">
                              <button onClick={() => toggleLCUGroup(lcu, true, group)}
                                disabled={isGroupToggling || allOn}
                                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-bold transition-all disabled:opacity-25"
                                style={{ background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.25)', color:'#22c55e' }}>
                                <Power size={9} /> Allumer
                              </button>
                              <button onClick={() => toggleLCUGroup(lcu, false, group)}
                                disabled={isGroupToggling || allOff}
                                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-bold transition-all disabled:opacity-25"
                                style={{ background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.2)', color:'#ef4444' }}>
                                <PowerOff size={9} /> Éteindre
                              </button>
                            </div>
                            {/* Expanded lamp rows */}
                            {isExpanded && (
                              <div className="border-t border-white/6 px-3 py-2 space-y-0.5 max-h-40 overflow-y-auto">
                                {group.length === 0 ? (
                                  <p className="text-[10px] text-white/25 text-center py-2">Aucun lampadaire</p>
                                ) : group.map((lamp) => {
                                  const hex = STATUS[lamp.etat]?.hex || '#6b7280'
                                  const isToggling = togglingLamp.has(lamp.id)
                                  return (
                                    <div key={`exp-${lamp.id}`}
                                      className="flex items-center gap-2 py-1.5 px-1 rounded-lg hover:bg-white/5">
                                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: hex }} />
                                      <button onClick={() => { setSelected({ type:'lamp', data:lamp }); flyTo(lamp.latitude, lamp.longitude) }}
                                        className="flex-1 text-left min-w-0">
                                        <span className="text-[11px] font-mono text-white/60 truncate block">{lamp.reference}</span>
                                      </button>
                                      <span className="text-[10px]" style={{ color: (lamp.intensite ?? 0) > 0 ? '#22c55e' : '#6b7280' }}>
                                        {lamp.intensite ?? 0}%
                                      </span>
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
                  </div>
                )}

                {/* Lamp list */}
                <div className="px-3">
                  <div className="flex items-center gap-2 px-1 mb-2">
                    <Zap size={10} className="text-yellow-400/60" />
                    <span className="text-[10px] font-semibold text-white/35 uppercase tracking-widest flex-1">Lampadaires</span>
                    <span className="text-[11px] font-bold text-white/35">{filtered.length}</span>
                  </div>
                  <div className="space-y-0.5">
                    {filtered.slice(0, 80).map((lamp) => {
                      const isSelected = selected?.type === 'lamp' && selected.data.id === lamp.id
                      const s = STATUS[lamp.etat]
                      const isToggling = togglingLamp.has(lamp.id)
                      return (
                        <div key={lamp.id}
                          className={cn(
                            'group flex items-center gap-2 px-2.5 py-2 rounded-xl transition-all cursor-pointer',
                            isSelected ? 'bg-white/12' : 'hover:bg-white/6'
                          )}
                          onClick={() => setSelected({ type:'lamp', data:lamp })}>
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s?.hex }} />
                          <span className="text-[11px] font-mono text-white/70 flex-1 truncate">{lamp.reference}</span>
                          {lamp.has_critical_alert && <AlertTriangle size={10} className="text-red-400 shrink-0" />}
                          <span className="text-[10px] text-white/30 shrink-0">{lamp.intensite ?? 0}%</span>
                          <button onClick={(e) => { e.stopPropagation(); setSelected({ type:'lamp', data:lamp }); flyTo(lamp.latitude, lamp.longitude) }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 text-white/25 hover:text-white transition-all shrink-0"
                            title="Zoomer"><Eye size={10} /></button>
                          <div onClick={(e) => e.stopPropagation()}>
                            <LampToggle lamp={lamp} onToggle={toggleLamp} disabled={isToggling} size="xs" />
                          </div>
                        </div>
                      )
                    })}
                    {filtered.length > 80 && (
                      <p className="text-[10px] text-white/25 text-center py-2">+{filtered.length - 80} autres</p>
                    )}
                  </div>
                </div>

              </div>
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
                    style={{ backgroundColor: 'rgba(255,255,255,0.07)', color: 'white', colorScheme: 'dark' }}
                    className="w-full mt-0.5 border border-white/10 rounded-lg px-2.5 py-1.5 text-[12px] placeholder:text-white/25 focus:outline-none focus:border-blue-400/60"
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

      {/* ═══ REPOSITION EXISTING LAMP BANNER ══════════════════ */}
      {repositioning && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-[650] -translate-x-1/2">
          <div className="map-glass pointer-events-auto flex flex-wrap items-center justify-center gap-4 px-5 py-3"
            style={{ border: '1px solid rgba(14,165,233,0.55)', boxShadow: '0 0 28px rgba(14,165,233,0.22)' }}>
            <LocateFixed size={17} className="shrink-0 animate-pulse text-sky-400" />
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-sky-300/70">Repositionnement du lampadaire</p>
              <p className="font-mono text-[14px] font-bold leading-tight text-white">{repositioning.reference}</p>
              <p className="mt-0.5 text-[10px] text-white/45">Glissez le marqueur ou cliquez sur la nouvelle position.</p>
            </div>
            <div className="hidden h-9 w-px bg-white/10 sm:block" />
            <div className="font-mono text-[10px] leading-relaxed text-white/55">
              <p>{repositioning.latitude.toFixed(6)}</p>
              <p>{repositioning.longitude.toFixed(6)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={cancelReposition} disabled={savingReposition}
                className="rounded-lg bg-white/10 px-3 py-1.5 text-[11px] font-medium text-white/65 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-40">
                Annuler
              </button>
              <button type="button" onClick={saveReposition} disabled={savingReposition || !repositionChanged}
                className="rounded-lg border border-sky-400/45 bg-sky-500/20 px-3 py-1.5 text-[11px] font-bold text-sky-300 transition-colors hover:bg-sky-500/30 disabled:cursor-not-allowed disabled:opacity-40">
                {savingReposition ? 'Enregistrement…' : 'Enregistrer la position'}
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
      <AIEntityInsightPanel
        entityType={aiPanel?.entityType}
        entityId={aiPanel?.entityId}
        open={aiPanel !== null}
        onClose={() => setAiPanel(null)}
      />

      {selected && (
        <div className="absolute bottom-0 left-0 right-0 z-[500]" onClick={(e) => e.stopPropagation()}>
          <div className="map-glass rounded-b-none rounded-t-2xl">
            {selected.type === 'lamp' && (
              <LampCard
                lamp={selected.data}
                lcu={lcus.find((l) => Number(l.id) === Number(selected.data.lcu_id)) ?? null}
                allLCUs={lcus}
                onClose={() => { setRepositioning(null); setSelected(null) }}
                flyTo={flyTo}
                onUpdateIntensity={updateLampIntensity}
                onStartReposition={startReposition}
                isRepositioning={repositioning?.lampId === selected.data.id}
                onDirections={() => handleDirections('lamp', selected.data)}
                routeLoading={routeStatus === 'loading'}
                onAIInsight={(info) => setAiPanel(info)}
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
                togglingLCU={togglingLCU}
                onDirections={() => handleDirections('lcu', selected.data)}
                routeLoading={routeStatus === 'loading'}
                onAIInsight={(info) => setAiPanel(info)} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────
   LCU MAP POPUP (rendered inside a Mapbox Popup)
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
function LampCard({ lamp, lcu, allLCUs = [], onClose, flyTo, onUpdateIntensity, onSelectLCU, onLCUAssigned, onAIInsight, onStartReposition, isRepositioning, onDirections, routeLoading }) {
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

  // pickingLCU is now closed via a backdrop div — no document listener needed

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
          <>
            {/* Transparent backdrop — clicking outside closes the dropdown without interfering with buttons inside */}
            <div className="fixed inset-0 z-10" onClick={() => setPickingLCU(false)} />
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
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 shrink-0">
        <button type="button" onClick={() => onStartReposition?.(lamp)} disabled={isRepositioning}
          className={cn(
            'mr-1 flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold transition-colors',
            isRepositioning
              ? 'border-sky-400/40 bg-sky-500/20 text-sky-300'
              : 'border-white/10 bg-white/5 text-white/50 hover:border-sky-400/40 hover:bg-sky-500/15 hover:text-sky-300'
          )}
          title="Déplacer ce lampadaire sur la carte">
          <LocateFixed size={12} /> {isRepositioning ? 'Déplacement…' : 'Repositionner'}
        </button>
        <button type="button" onClick={onDirections} disabled={routeLoading}
          className="mr-1 flex items-center gap-1.5 rounded-lg border border-brand-500/30 bg-brand-500/10 px-2.5 py-1.5 text-[10px] font-semibold text-brand-400 transition-colors hover:bg-brand-500/20 disabled:opacity-40"
          title="Itinéraire routier depuis ma position">
          <Navigation size={12} /> {routeLoading ? 'Calcul…' : 'Itinéraire'}
        </button>
        <button
          onClick={() => onAIInsight?.({ entityType: 'lampadaire', entityId: lamp.id })}
          className="p-1.5 rounded-lg hover:bg-white/8 text-white/25 hover:text-purple-400 transition-colors"
          title="Analyse IA">
          <Sparkles size={13} />
        </button>
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
function LCUCard({ lcu, lamps, onClose, onSelect, flyTo, toggleLamp, toggleLCUGroup, applyGroupIntensity, togglingLamp, togglingLCU, onAIInsight, onDirections, routeLoading }) {
  const navigate = useNavigate()
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
        <button
          onClick={() => {
            const params = new URLSearchParams({
              create: '1',
              target_type: 'lcu',
              target_value: lcu.reference || lcu.name || '',
              zone: lcu.zone || '',
              name: `Profil ${lcu.reference || lcu.name}`,
            })
            navigate(`/profiles?${params.toString()}`)
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
          style={{ background:'rgba(139,92,246,0.15)', border:'1px solid rgba(139,92,246,0.4)', color:'#a78bfa' }}
          title="Créer un profil d'éclairage pour cette LCU">
          <Workflow size={11} /> Profil
        </button>
        <button onClick={onDirections} disabled={routeLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all disabled:opacity-40"
          style={{ background:'rgba(14,174,232,0.15)', border:'1px solid rgba(14,174,232,0.4)', color:'var(--brand)' }}
          title="Itinéraire routier depuis ma position">
          <Navigation size={11} /> {routeLoading ? 'Calcul…' : 'Itinéraire'}
        </button>
        {lcu.latitude && lcu.longitude && (
          <button onClick={() => flyTo(lcu.latitude, lcu.longitude, 16)}
            className="p-1.5 rounded-lg hover:bg-blue-500/20 text-white/30 hover:text-blue-400 transition-colors"
            title="Centrer sur la LCU">
            <Eye size={14} />
          </button>
        )}
        <button
          onClick={() => onAIInsight?.({ entityType: 'lcu', entityId: lcu.id })}
          className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-purple-400 transition-colors"
          title="Analyse IA">
          <Sparkles size={14} />
        </button>
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
