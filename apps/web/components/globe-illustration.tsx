export function GlobeIllustration() {
  const stars: [number, number, number][] = [
    [28, 42, 0.4], [68, 18, 0.3], [15, 180, 0.35], [32, 320, 0.25],
    [462, 55, 0.3], [478, 190, 0.4], [490, 375, 0.25], [448, 460, 0.3],
    [52, 432, 0.2], [130, 472, 0.3], [382, 480, 0.25], [472, 422, 0.35],
    [90, 62, 0.2], [440, 140, 0.2], [22, 260, 0.3], [488, 300, 0.2],
  ]

  return (
    <svg
      viewBox="0 0 500 500"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-[500px]"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="gGlobe" cx="38%" cy="30%" r="68%">
          <stop offset="0%" stopColor="#17172c" />
          <stop offset="40%" stopColor="#0d0d1c" />
          <stop offset="78%" stopColor="#07070f" />
          <stop offset="100%" stopColor="#030308" />
        </radialGradient>

        <radialGradient id="gSpec" cx="33%" cy="27%" r="40%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.07" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>

        <radialGradient id="gAtmo" cx="50%" cy="50%" r="50%">
          <stop offset="58%" stopColor="transparent" stopOpacity="0" />
          <stop offset="82%" stopColor="#4060d8" stopOpacity="0.07" />
          <stop offset="100%" stopColor="#3050c0" stopOpacity="0.22" />
        </radialGradient>

        <clipPath id="cGlobe">
          <circle cx="250" cy="250" r="210" />
        </clipPath>

        <filter id="fNode" x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="fLine" x="-15%" y="-15%" width="130%" height="130%">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Stars */}
      {stars.map(([x, y, o], i) => (
        <circle key={i} cx={x} cy={y} r="1" fill="white" opacity={o} />
      ))}

      {/* Atmosphere rings */}
      <circle cx="250" cy="250" r="228" fill="none" stroke="#4060d8" strokeWidth="1.5" opacity="0.10" />
      <circle cx="250" cy="250" r="220" fill="none" stroke="#4060d8" strokeWidth="5" opacity="0.05" />

      {/* Globe body */}
      <circle cx="250" cy="250" r="210" fill="url(#gGlobe)" />

      {/* Grid lines */}
      <g clipPath="url(#cGlobe)" stroke="rgba(85,110,210,0.14)" strokeWidth="0.75" fill="none">
        {/* Latitudes */}
        <line x1="145" y1="68" x2="355" y2="68" />
        <line x1="68" y1="145" x2="432" y2="145" />
        <line x1="40" y1="250" x2="460" y2="250" />
        <line x1="68" y1="355" x2="432" y2="355" />
        <line x1="145" y1="432" x2="355" y2="432" />
        {/* Longitudes: half-ellipse arcs (semi-major=210 on y-axis) */}
        <path d="M 250 40 A 182 210 0 0 0 250 460" />
        <path d="M 250 40 A 105 210 0 0 0 250 460" />
        <line x1="250" y1="40" x2="250" y2="460" />
        <path d="M 250 40 A 105 210 0 0 1 250 460" />
        <path d="M 250 40 A 182 210 0 0 1 250 460" />
      </g>

      {/* Globe limb */}
      <circle cx="250" cy="250" r="210" fill="none" stroke="rgba(85,110,210,0.22)" strokeWidth="1" />

      {/* Specular highlight */}
      <circle cx="250" cy="250" r="210" fill="url(#gSpec)" />

      {/* Connection arcs — clipped to globe */}
      <g clipPath="url(#cGlobe)" fill="none" filter="url(#fLine)">
        {/* New York → London (transatlantic) */}
        <path d="M 121 113 Q 205 26 295 86" stroke="#FF6A2A" strokeWidth="0.9" strokeOpacity="0.42" strokeDasharray="5 4">
          <animate attributeName="stroke-dashoffset" from="0" to="-200" dur="4s" repeatCount="indefinite" />
        </path>
        {/* New York → São Paulo */}
        <path d="M 121 113 Q 107 224 164 334" stroke="#FF6A2A" strokeWidth="0.9" strokeOpacity="0.36" strokeDasharray="5 4">
          <animate attributeName="stroke-dashoffset" from="0" to="200" dur="5.2s" repeatCount="indefinite" />
        </path>
        {/* London → Frankfurt */}
        <path d="M 295 86 Q 305 60 315 89" stroke="#FF6A2A" strokeWidth="0.9" strokeOpacity="0.42" strokeDasharray="4 3">
          <animate attributeName="stroke-dashoffset" from="0" to="-55" dur="2.5s" repeatCount="indefinite" />
        </path>
        {/* Frankfurt → Dubai */}
        <path d="M 315 89 Q 393 58 434 161" stroke="#FF6A2A" strokeWidth="0.9" strokeOpacity="0.36" strokeDasharray="5 4">
          <animate attributeName="stroke-dashoffset" from="0" to="-230" dur="4.8s" repeatCount="indefinite" />
        </path>
        {/* Dubai → Nairobi */}
        <path d="M 434 161 Q 453 208 426 255" stroke="#FF6A2A" strokeWidth="0.9" strokeOpacity="0.30" strokeDasharray="5 4">
          <animate attributeName="stroke-dashoffset" from="0" to="-130" dur="3.5s" repeatCount="indefinite" />
        </path>
        {/* Nairobi → Cape Town */}
        <path d="M 426 255 Q 412 318 358 367" stroke="#FF6A2A" strokeWidth="0.9" strokeOpacity="0.26" strokeDasharray="5 4">
          <animate attributeName="stroke-dashoffset" from="0" to="-165" dur="4s" repeatCount="indefinite" />
        </path>
        {/* NY → Frankfurt (secondary route, faint) */}
        <path d="M 121 113 Q 218 36 315 89" stroke="#FF6A2A" strokeWidth="0.6" strokeOpacity="0.18" strokeDasharray="5 6">
          <animate attributeName="stroke-dashoffset" from="0" to="-235" dur="7s" repeatCount="indefinite" />
        </path>
      </g>

      {/* Network nodes */}
      <g clipPath="url(#cGlobe)" filter="url(#fNode)">
        {/* New York */}
        <circle cx="121" cy="113" r="7" fill="#FF6A2A" opacity="0.18" />
        <circle cx="121" cy="113" r="4.5" fill="#FF6A2A" opacity="0.95" />
        <circle cx="121" cy="113" r="4.5" fill="none" stroke="#FF6A2A" strokeWidth="1">
          <animate attributeName="r" from="4.5" to="22" dur="2.8s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.55" to="0" dur="2.8s" repeatCount="indefinite" />
        </circle>

        {/* London */}
        <circle cx="295" cy="86" r="7" fill="#FF6A2A" opacity="0.18" />
        <circle cx="295" cy="86" r="4.5" fill="#FF6A2A" opacity="0.95" />
        <circle cx="295" cy="86" r="4.5" fill="none" stroke="#FF6A2A" strokeWidth="1">
          <animate attributeName="r" from="4.5" to="22" dur="2.8s" begin="0.7s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.55" to="0" dur="2.8s" begin="0.7s" repeatCount="indefinite" />
        </circle>

        {/* Frankfurt */}
        <circle cx="315" cy="89" r="6" fill="#FF6A2A" opacity="0.16" />
        <circle cx="315" cy="89" r="4" fill="#FF6A2A" opacity="0.90" />
        <circle cx="315" cy="89" r="4" fill="none" stroke="#FF6A2A" strokeWidth="1">
          <animate attributeName="r" from="4" to="19" dur="2.8s" begin="1.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.50" to="0" dur="2.8s" begin="1.4s" repeatCount="indefinite" />
        </circle>

        {/* São Paulo */}
        <circle cx="164" cy="334" r="6" fill="#FF6A2A" opacity="0.16" />
        <circle cx="164" cy="334" r="4" fill="#FF6A2A" opacity="0.88" />
        <circle cx="164" cy="334" r="4" fill="none" stroke="#FF6A2A" strokeWidth="1">
          <animate attributeName="r" from="4" to="19" dur="2.8s" begin="2.1s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.50" to="0" dur="2.8s" begin="2.1s" repeatCount="indefinite" />
        </circle>

        {/* Dubai */}
        <circle cx="434" cy="161" r="6" fill="#FF6A2A" opacity="0.16" />
        <circle cx="434" cy="161" r="4" fill="#FF6A2A" opacity="0.88" />
        <circle cx="434" cy="161" r="4" fill="none" stroke="#FF6A2A" strokeWidth="1">
          <animate attributeName="r" from="4" to="19" dur="2.8s" begin="0.35s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.50" to="0" dur="2.8s" begin="0.35s" repeatCount="indefinite" />
        </circle>

        {/* Nairobi */}
        <circle cx="426" cy="255" r="5.5" fill="#FF6A2A" opacity="0.14" />
        <circle cx="426" cy="255" r="3.5" fill="#FF6A2A" opacity="0.85" />
        <circle cx="426" cy="255" r="3.5" fill="none" stroke="#FF6A2A" strokeWidth="1">
          <animate attributeName="r" from="3.5" to="16" dur="2.8s" begin="1.9s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.45" to="0" dur="2.8s" begin="1.9s" repeatCount="indefinite" />
        </circle>

        {/* Cape Town */}
        <circle cx="358" cy="367" r="5.5" fill="#FF6A2A" opacity="0.14" />
        <circle cx="358" cy="367" r="3.5" fill="#FF6A2A" opacity="0.80" />
        <circle cx="358" cy="367" r="3.5" fill="none" stroke="#FF6A2A" strokeWidth="1">
          <animate attributeName="r" from="3.5" to="16" dur="2.8s" begin="2.6s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.45" to="0" dur="2.8s" begin="2.6s" repeatCount="indefinite" />
        </circle>
      </g>

      {/* City labels */}
      <g fontFamily="ui-monospace,'SF Mono',Menlo,Consolas,monospace" fontSize="8.5" fill="rgba(161,161,161,0.70)">
        <text x="115" y="107" textAnchor="end">New York</text>
        <text x="289" y="78" textAnchor="end">London</text>
        <text x="321" y="82" textAnchor="start">Frankfurt</text>
        <text x="164" y="350" textAnchor="middle">São Paulo</text>
        <text x="428" y="156" textAnchor="end">Dubai</text>
        <text x="420" y="264" textAnchor="end">Nairobi</text>
        <text x="363" y="382" textAnchor="start">Cape Town</text>
      </g>

      {/* Atmosphere overlay */}
      <circle cx="250" cy="250" r="210" fill="url(#gAtmo)" />
    </svg>
  )
}
