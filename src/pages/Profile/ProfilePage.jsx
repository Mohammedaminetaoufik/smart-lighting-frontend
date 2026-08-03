import { useState } from 'react'
import {
  User, Mail, Shield, KeyRound, LogOut, Eye, EyeOff,
  CheckCircle2, Clock, Fingerprint, Zap,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { changePasswordApi } from '../../api/auth'

const ROLE_META = {
  admin:    { label: 'Administrateur', color: 'text-red-500',   bg: 'bg-red-500/10',   border: 'border-red-500/25',   dot: 'bg-red-500'   },
  operator: { label: 'Technicien',     color: 'text-blue-500',  bg: 'bg-blue-500/10',  border: 'border-blue-500/25',  dot: 'bg-blue-500'  },
}

function PwdInput({ label, value, onChange, show, onToggle, placeholder = '••••••••', hint }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-700 uppercase tracking-wider text-[var(--text-muted)]">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="new-password"
          className="w-full px-3 py-2.5 pr-9 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
        >
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
      {hint && <p className="text-[10px] text-[var(--text-muted)]">{hint}</p>}
    </div>
  )
}

function SectionTitle({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon size={13} className="text-[var(--text-muted)]" />
      <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">{children}</span>
    </div>
  )
}

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [currentPwd,  setCurrentPwd]  = useState('')
  const [newPwd,      setNewPwd]      = useState('')
  const [confirmPwd,  setConfirmPwd]  = useState('')
  const [showCur,     setShowCur]     = useState(false)
  const [showNew,     setShowNew]     = useState(false)
  const [showConf,    setShowConf]    = useState(false)
  const [pwdLoading,  setPwdLoading]  = useState(false)
  const [pwdSuccess,  setPwdSuccess]  = useState(false)
  const [pwdError,    setPwdError]    = useState('')

  const roleMeta = ROLE_META[user?.role] ?? ROLE_META.operator
  const initials = (user?.name ?? 'U')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  async function handleChangePwd(e) {
    e.preventDefault()
    setPwdError('')
    if (!currentPwd || !newPwd || !confirmPwd) { setPwdError('Tous les champs sont requis.'); return }
    if (newPwd.length < 8) { setPwdError('Le nouveau mot de passe doit contenir au moins 8 caractères.'); return }
    if (newPwd !== confirmPwd) { setPwdError('Les mots de passe ne correspondent pas.'); return }
    setPwdLoading(true)
    try {
      await changePasswordApi(currentPwd, newPwd)
      setPwdSuccess(true)
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
      toast.success('Mot de passe modifié avec succès')
      setTimeout(() => setPwdSuccess(false), 3000)
    } catch (err) {
      setPwdError(err?.response?.data?.error ?? err?.message ?? 'Erreur lors du changement de mot de passe')
    } finally {
      setPwdLoading(false)
    }
  }

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">

      {/* Page heading */}
      <div>
        <p className="text-[var(--text-muted)] text-sm">{greeting}, <span className="font-semibold text-[var(--text)]">{user?.name}</span></p>
        <h1 className="text-[20px] font-bold text-[var(--text)] mt-0.5">Mon profil</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Left column ──────────────────────────────────── */}
        <div className="space-y-4">

          {/* Avatar card */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
            {/* Accent bar */}
            <div className="h-1 bg-[var(--primary)]" />

            <div className="p-6 flex flex-col items-center text-center">
              {/* Avatar rings */}
              <div className={`w-24 h-24 rounded-full border-2 ${roleMeta.border} flex items-center justify-center mb-4 relative`}>
                <div className={`w-[84px] h-[84px] rounded-full ${roleMeta.bg} flex items-center justify-center`}>
                  <span className={`text-3xl font-extrabold tracking-wide ${roleMeta.color}`}>{initials}</span>
                </div>
                {/* Online dot */}
                <span className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-[var(--surface)]" />
              </div>

              <h2 className="text-[15px] font-bold text-[var(--text)] leading-tight">{user?.name ?? '—'}</h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{user?.email ?? '—'}</p>

              {/* Role badge */}
              <div className={`inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${roleMeta.color} ${roleMeta.bg} ${roleMeta.border}`}>
                <Shield size={10} />
                {roleMeta.label}
              </div>
            </div>

            {/* Info rows */}
            <div className="border-t border-[var(--border)] divide-y divide-[var(--border)]">
              <div className="flex items-center gap-3 px-5 py-3">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <User size={13} className="text-blue-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">Nom complet</p>
                  <p className="text-[13px] font-medium text-[var(--text)] truncate">{user?.name ?? '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-5 py-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <Mail size={13} className="text-emerald-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">Email</p>
                  <p className="text-[13px] font-medium text-[var(--text)] truncate">{user?.email ?? '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-5 py-3">
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                  <Fingerprint size={13} className="text-purple-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">ID utilisateur</p>
                  <p className="text-[13px] font-medium text-[var(--text)] font-mono">#{user?.id ?? '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-5 py-3">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <Clock size={13} className="text-amber-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">Session démarrée</p>
                  <p className="text-[13px] font-medium text-[var(--text)]">
                    {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Logout card */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5">
            <SectionTitle icon={Zap}>Session</SectionTitle>
            <p className="text-[12px] text-[var(--text-muted)] mb-4 leading-relaxed">
              Déconnectez-vous de votre compte. Votre session JWT sera invalidée côté client.
            </p>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/30 bg-red-500/8 text-red-500 text-[13px] font-semibold hover:bg-red-500/15 hover:border-red-500/50 transition-colors"
            >
              <LogOut size={14} />
              Se déconnecter
            </button>
          </div>
        </div>

        {/* ── Right column ─────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Change password card */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
            <SectionTitle icon={KeyRound}>Sécurité — Changer le mot de passe</SectionTitle>

            {pwdSuccess ? (
              <div className="flex items-center gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
                <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                <p className="text-sm text-emerald-500 font-medium">Mot de passe modifié avec succès.</p>
              </div>
            ) : (
              <form onSubmit={handleChangePwd} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <PwdInput
                      label="Mot de passe actuel"
                      value={currentPwd}
                      onChange={setCurrentPwd}
                      show={showCur}
                      onToggle={() => setShowCur(v => !v)}
                    />
                  </div>
                  <PwdInput
                    label="Nouveau mot de passe"
                    value={newPwd}
                    onChange={setNewPwd}
                    show={showNew}
                    onToggle={() => setShowNew(v => !v)}
                    hint="Minimum 8 caractères"
                  />
                  <PwdInput
                    label="Confirmer le nouveau"
                    value={confirmPwd}
                    onChange={setConfirmPwd}
                    show={showConf}
                    onToggle={() => setShowConf(v => !v)}
                  />
                </div>

                {pwdError && (
                  <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                    <p className="text-xs text-red-500">{pwdError}</p>
                  </div>
                )}

                {/* Password strength hint */}
                {newPwd.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex gap-1">
                      {[1,2,3,4].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                          i === 1 ? 'bg-red-500' :
                          i === 2 && newPwd.length >= 8 ? 'bg-orange-500' :
                          i === 3 && newPwd.length >= 12 ? 'bg-yellow-500' :
                          i === 4 && newPwd.length >= 16 && /[A-Z]/.test(newPwd) && /[0-9]/.test(newPwd) ? 'bg-emerald-500' :
                          'bg-[var(--border)]'
                        }`} />
                      ))}
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      {newPwd.length < 8 ? 'Trop court' :
                       newPwd.length < 12 ? 'Acceptable' :
                       newPwd.length < 16 ? 'Bon' : 'Très fort'}
                    </p>
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={pwdLoading}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-[13px] font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {pwdLoading ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <KeyRound size={13} />
                    )}
                    {pwdLoading ? 'Enregistrement…' : 'Mettre à jour'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Security info card */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
            <SectionTitle icon={Shield}>Informations de sécurité</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Méthode d\'authentification', value: 'JWT HS256', icon: Fingerprint, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                { label: 'Durée de session', value: '8 heures', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                { label: 'Rôle actuel', value: roleMeta.label, icon: Shield, color: roleMeta.color, bg: roleMeta.bg },
                { label: 'État du compte', value: 'Actif', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                  <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={14} className={color} />
                  </div>
                  <div>
                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">{label}</p>
                    <p className={`text-[13px] font-semibold ${color}`}>{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
