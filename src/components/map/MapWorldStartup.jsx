import { useEffect, useState } from 'react'
import MaadenAILogo from '../brand/MaadenAILogo'

export default function MapWorldStartup({ duration = 20000, onComplete }) {
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => setLeaving(true), Math.max(0, duration - 550))
    const completeTimer = window.setTimeout(onComplete, duration)
    return () => {
      window.clearTimeout(fadeTimer)
      window.clearTimeout(completeTimer)
    }
  }, [duration, onComplete])

  return (
    <div className={`map-world-startup${leaving ? ' map-world-startup--leaving' : ''}`}
      style={{ '--map-startup-duration': `${duration}ms` }}
      role="status" aria-label="Initialisation de la carte mondiale">
      <style>{`
        .map-world-startup{position:absolute;inset:-1rem;z-index:900;display:grid;place-items:center;overflow:hidden;background:radial-gradient(circle at 50% 48%,rgba(7,134,184,.18),transparent 34%),linear-gradient(145deg,#020a12,#061724 54%,#020b13);opacity:1;transition:opacity .55s ease,visibility .55s ease}
        .map-world-startup--leaving{opacity:0;visibility:hidden}
        .map-world-stars{position:absolute;inset:0;opacity:.36;background-image:radial-gradient(circle at 15% 22%,#7eeaff 0 1px,transparent 1.5px),radial-gradient(circle at 76% 18%,#fff 0 1px,transparent 1.5px),radial-gradient(circle at 83% 72%,#7eeaff 0 1px,transparent 1.5px),radial-gradient(circle at 27% 77%,#8d78ff 0 1px,transparent 1.5px),radial-gradient(circle at 61% 36%,#fff 0 1px,transparent 1.5px);background-size:290px 230px,360px 280px,410px 330px,330px 300px,470px 390px;animation:mapStars 3s ease-in-out infinite}
        .map-world-grid{position:absolute;inset:0;opacity:.08;background-image:linear-gradient(rgba(83,213,255,.26) 1px,transparent 1px),linear-gradient(90deg,rgba(83,213,255,.26) 1px,transparent 1px);background-size:64px 64px;mask-image:radial-gradient(circle at center,#000,transparent 69%)}
        .map-world-stage{position:relative;width:350px;height:350px;display:grid;place-items:center;animation:mapWorldRise .75s cubic-bezier(.16,1,.3,1) both}
        .map-world-halo{position:absolute;inset:28px;border-radius:50%;background:rgba(34,211,238,.07);filter:blur(34px);animation:mapWorldPulse 2s ease-in-out infinite}
        .map-world-globe{width:256px;height:256px;filter:drop-shadow(0 0 26px rgba(34,211,238,.2));overflow:visible}
        .map-world-sphere{fill:url(#worldOcean);stroke:url(#worldEdge);stroke-width:1.4}
        .map-world-lines{fill:none;stroke:#75e6ff;stroke-width:.65;opacity:.25}
        .map-world-land{fill:#19b8f0;fill-opacity:.13;stroke:#79e8ff;stroke-width:.8;stroke-opacity:.5}
        .map-world-scan{fill:url(#worldScan);animation:mapWorldScan 2.3s ease-in-out infinite}
        .map-world-orbit{position:absolute;inset:21px;border:1px dashed rgba(102,226,255,.22);border-radius:50%;animation:mapWorldOrbit 8s linear infinite}
        .map-world-orbit:before,.map-world-orbit:after{content:'';position:absolute;width:7px;height:7px;border-radius:50%;background:#74e8ff;box-shadow:0 0 15px #31d1ff}
        .map-world-orbit:before{top:25px;right:50px}.map-world-orbit:after{bottom:37px;left:31px;background:#8b76ff;box-shadow:0 0 15px #8b76ff}
        .map-world-arc{position:absolute;inset:66px 35px;border-top:1px solid rgba(119,231,255,.45);border-radius:50%;transform:rotate(-18deg);animation:mapArc 2.1s ease-in-out infinite}
        .map-world-brand{position:absolute;left:50%;bottom:max(7vh,32px);transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:14px}
        .map-world-progress{width:min(250px,55vw);height:2px;overflow:hidden;border-radius:99px;background:rgba(255,255,255,.08)}
        .map-world-progress span{display:block;width:100%;height:100%;transform:scaleX(0);transform-origin:left;background:linear-gradient(90deg,#22d3ee,#3b82f6,#8b5cf6);box-shadow:0 0 12px rgba(34,211,238,.7);animation:mapWorldProgress var(--map-startup-duration,5s) cubic-bezier(.2,.72,.2,1) forwards}
        @keyframes mapWorldRise{from{opacity:0;transform:scale(.84) translateY(16px)}to{opacity:1;transform:none}}
        @keyframes mapWorldPulse{0%,100%{opacity:.45;transform:scale(.9)}50%{opacity:1;transform:scale(1.08)}}
        @keyframes mapWorldOrbit{to{transform:rotate(360deg)}}
        @keyframes mapWorldScan{0%,100%{transform:translateX(-105%);opacity:.15}50%{transform:translateX(105%);opacity:.75}}
        @keyframes mapArc{0%,100%{opacity:.2;transform:rotate(-18deg) scaleX(.85)}50%{opacity:1;transform:rotate(-18deg) scaleX(1.05)}}
        @keyframes mapStars{0%,100%{opacity:.22}50%{opacity:.48}}
        @keyframes mapWorldProgress{to{transform:scaleX(1)}}
        @media(min-width:1024px){.map-world-startup{inset:-1.5rem}}
        @media(max-width:520px){.map-world-stage{width:280px;height:280px}.map-world-globe{width:205px;height:205px}.map-world-orbit{inset:16px}.map-world-arc{inset:52px 28px}}
        @media(prefers-reduced-motion:reduce){.map-world-startup *{animation:none!important}.map-world-progress span{transform:scaleX(1)}}
      `}</style>

      <div className="map-world-stars" aria-hidden="true" />
      <div className="map-world-grid" aria-hidden="true" />
      <div className="map-world-stage" aria-hidden="true">
        <div className="map-world-halo" />
        <div className="map-world-orbit" />
        <div className="map-world-arc" />
        <svg className="map-world-globe" viewBox="0 0 260 260">
          <defs>
            <radialGradient id="worldOcean" cx="36%" cy="30%" r="72%"><stop stopColor="#0d3850"/><stop offset=".58" stopColor="#071e2e"/><stop offset="1" stopColor="#03101b"/></radialGradient>
            <linearGradient id="worldEdge" x1="40" y1="25" x2="220" y2="235"><stop stopColor="#7ce9ff"/><stop offset=".52" stopColor="#20bce9"/><stop offset="1" stopColor="#7965ff"/></linearGradient>
            <linearGradient id="worldScan" x1="0" x2="1"><stop stopColor="#62e3ff" stopOpacity="0"/><stop offset=".5" stopColor="#62e3ff" stopOpacity=".2"/><stop offset="1" stopColor="#62e3ff" stopOpacity="0"/></linearGradient>
            <clipPath id="worldClip"><circle cx="130" cy="130" r="105"/></clipPath>
          </defs>
          <circle className="map-world-sphere" cx="130" cy="130" r="105"/>
          <g className="map-world-lines">
            <ellipse cx="130" cy="130" rx="105" ry="39"/><ellipse cx="130" cy="130" rx="105" ry="76"/>
            <ellipse cx="130" cy="130" rx="48" ry="105"/><ellipse cx="130" cy="130" rx="81" ry="105"/>
            <path d="M25 130h210M36 84h188M36 176h188"/>
          </g>
          <g className="map-world-land">
            <path d="M61 69 79 54l27-6 17 9 7 15-12 9-4 15-18 6-6 21-14-2-8-15-15-7-6-16Z"/>
            <path d="m100 126 17-8 19 7 12 17-5 20-14 12-7 32-13-5-7-28-12-21Z"/>
            <path d="m142 63 23-10 32 8 17 14-7 13-22 4-8 13-22-3-8 16-14-8 5-18-11-9Z"/>
            <path d="m178 147 16-8 17 9 4 16-12 13-21-4-8-13Z"/>
          </g>
          <g fill="#8cf0ff"><circle cx="105" cy="108" r="2.6"/><circle cx="151" cy="111" r="2.3"/><circle cx="174" cy="83" r="2.4"/><circle cx="125" cy="157" r="2.5"/></g>
          <rect className="map-world-scan" clipPath="url(#worldClip)" x="25" y="25" width="68" height="210"/>
        </svg>
      </div>

      <div className="map-world-brand">
        <MaadenAILogo size={38} thinking />
        <div className="map-world-progress" aria-hidden="true"><span /></div>
      </div>
    </div>
  )
}
