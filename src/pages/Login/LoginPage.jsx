import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Moon, Sun } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { loginApi } from '../../api/auth'
import BrandLogo from '../../components/brand/BrandLogo'
import MaadenAILogo from '../../components/brand/MaadenAILogo'

export default function LoginPage() {
  const { login } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await loginApi(email.trim().toLowerCase(), password)
      login(res.user)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message || 'Identifiants invalides')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020b12] text-white">
      <style>{`
        @keyframes loginScan { from { transform: translateY(-120%) } to { transform: translateY(650%) } }
      `}</style>

      <img src="/images/maaden-login-future-v2.png" alt="" aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover object-[48%_center]" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#020b12]/15 via-transparent to-[#020b12]/90" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#020b12]/75 via-transparent to-[#020b12]/50" />

      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between p-5 sm:p-7 lg:px-10">
        <BrandLogo size="default" className="[--logo-ink:#eafaff] drop-shadow-[0_0_18px_rgba(34,211,238,.18)]" />
        <button type="button" onClick={toggle}
          className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-[#061622]/70 text-slate-400 backdrop-blur-xl transition hover:border-cyan-300/30 hover:text-cyan-300"
          title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
          aria-label={theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'}>
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 pb-8 pt-24 lg:justify-end lg:px-[7vw] lg:py-24">
        <div className="relative w-full max-w-[400px]">
          <div className="absolute -inset-px rounded-[28px] bg-gradient-to-br from-cyan-200/35 via-white/5 to-transparent blur-[1px]" />
          <form onSubmit={handleSubmit}
            className="relative overflow-hidden rounded-[27px] border border-white/10 bg-[#06131d]/75 p-7 shadow-[0_40px_110px_rgba(0,0,0,.62)] backdrop-blur-2xl sm:p-9">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
            <div className="absolute left-0 top-0 h-20 w-full bg-gradient-to-b from-cyan-300/[0.04] to-transparent" />
            <div className="absolute inset-x-0 top-0 h-px bg-cyan-200/40 blur-sm" style={{ animation: 'loginScan 7s linear infinite' }} />

            <div className="relative mb-9 flex justify-center">
              <div className="rounded-[22px] border border-cyan-200/15 bg-cyan-300/[0.05] p-2 shadow-[0_0_36px_rgba(34,211,238,.12)]">
                <MaadenAILogo size={62} thinking />
              </div>
            </div>

            <div className="relative space-y-5">
              <div className="space-y-2">
                <label htmlFor="login-email" className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Email</label>
                <div className="group relative">
                  <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-cyan-300" />
                  <input id="login-email" type="email" autoComplete="email" required value={email}
                    onChange={(event) => setEmail(event.target.value)} placeholder="admin@lamalif.ma"
                    className="h-[50px] w-full rounded-xl border border-white/10 bg-[#020b12]/65 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-cyan-200/45 focus:ring-4 focus:ring-cyan-300/[0.06]" />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="login-password" className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Mot de passe</label>
                <div className="group relative">
                  <LockKeyhole size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-cyan-300" />
                  <input id="login-password" type={showPwd ? 'text' : 'password'} autoComplete="current-password" required value={password}
                    onChange={(event) => setPassword(event.target.value)} placeholder="••••••••"
                    className="h-[50px] w-full rounded-xl border border-white/10 bg-[#020b12]/65 pl-11 pr-12 text-sm text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-cyan-200/45 focus:ring-4 focus:ring-cyan-300/[0.06]" />
                  <button type="button" onClick={() => setShowPwd((value) => !value)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-cyan-300"
                    aria-label={showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && <p className="rounded-xl border border-red-400/20 bg-red-400/[0.08] px-3 py-2.5 text-xs text-red-300" role="alert">{error}</p>}

              <button type="submit" disabled={loading}
                className="group mt-3 flex h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 to-sky-400 text-sm font-bold text-[#021018] shadow-[0_14px_35px_rgba(34,211,238,.18)] transition hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_18px_42px_rgba(34,211,238,.28)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0">
                {loading
                  ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#021018]/25 border-t-[#021018]" />
                  : <><span>Se connecter</span><ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
