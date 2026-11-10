/** Hangar portrait. The playable craft is drawn independently by the WebGPU shader. */
export function ShipPortrait() {
  return (
    <svg
      viewBox="0 0 280 220"
      className="ship-portrait"
      role="img"
      aria-label="游隼战机，双引擎、分层钛合金装甲与后掠翼"
    >
      <defs>
        <linearGradient id="hull-titanium" x1="0" y1="0" x2="1" y2=".8">
          <stop stopColor="#ecf2f3" />
          <stop offset=".35" stopColor="#7c929e" />
          <stop offset=".48" stopColor="#d3e1e6" />
          <stop offset=".51" stopColor="#435767" />
          <stop offset="1" stopColor="#142332" />
        </linearGradient>
        <linearGradient id="wing-titanium" x2=".6" y2="1">
          <stop stopColor="#b7ccd6" />
          <stop offset=".3" stopColor="#536c7d" />
          <stop offset="1" stopColor="#182a38" />
        </linearGradient>
        <linearGradient id="cockpit-glass" x2=".8" y2="1">
          <stop stopColor="#e1ffff" />
          <stop offset=".25" stopColor="#64d5e6" />
          <stop offset=".6" stopColor="#205b76" />
          <stop offset="1" stopColor="#080f1c" />
        </linearGradient>
        <linearGradient id="ion-exhaust" x2="0" y2="1">
          <stop stopColor="#e0ffff" />
          <stop offset=".25" stopColor="#6beaff" stopOpacity=".8" />
          <stop offset="1" stopColor="#3d91ee" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="hangar-light">
          <stop stopColor="#3a9bb5" stopOpacity=".24" />
          <stop offset="1" stopColor="#153340" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="140" cy="118" rx="135" ry="99" fill="url(#hangar-light)" />
      <g fill="none" stroke="#638998" strokeOpacity=".2" strokeWidth=".6">
        <ellipse cx="140" cy="131" rx="110" ry="65" />
        <ellipse cx="140" cy="131" rx="93" ry="53" />
        <path d="M10 131h260M140 12v196M38 48l204 144M242 48 38 192" />
      </g>
      <g className="portrait-craft">
        <path d="m111 158 8 55 8-55m26 0 8 55 8-55" fill="url(#ion-exhaust)" />
        <path
          d="m140 25-18 64-74 67 3 17 60-19 29 22 29-22 60 19 3-17-74-67Z"
          fill="#030a13"
          transform="translate(0 6)"
          opacity=".75"
        />
        <path
          d="m125 75-16 22-68 66 8 10 61-22 15-19Zm30 0 16 22 68 66-8 10-61-22-15-19Z"
          fill="url(#wing-titanium)"
          stroke="#8ba6b5"
          strokeWidth=".7"
        />
        <path
          d="m112 100-49 55 48-21 14-38m43 4 49 55-48-21-14-38"
          fill="#253c4c"
          stroke="#7895a5"
          strokeWidth=".5"
        />
        <path d="m108 116-24 27 26-12m62-15 24 27-26-12" fill="#c2ced2" opacity=".75" />
        <path d="m76 144-10 11 9-4 9-11m120 4 10 11-9-4-9-11" fill="#d59658" />
        <path
          d="M107 91h20l4 61-7 14h-14l-6-15Zm46 0h20l3 60-6 15h-14l-7-14Z"
          fill="url(#hull-titanium)"
          stroke="#90a9b5"
          strokeWidth=".8"
        />
        <path d="M111 109h12v34h-12Zm46 0h12v34h-12Z" fill="#0c1924" />
        <path
          d="M112 114h10m-10 6h10m-10 6h10m-10 6h10m-10 6h10m35-24h10m-10 6h10m-10 6h10m-10 6h10m-10 6h10"
          stroke="#4a6a7a"
          strokeWidth="2"
        />
        <path
          d="m140 19-9 30-7 75 7 34h18l7-34-7-75Z"
          fill="url(#hull-titanium)"
          stroke="#aac3cf"
          strokeWidth=".8"
        />
        <path d="m140 24 0 130 9 20-7-40 5-45Z" fill="#e5eff0" opacity=".23" />
        <path
          d="m140 57-7 22 2 21 5 8 5-8 2-21Z"
          fill="url(#cockpit-glass)"
          stroke="#071925"
          strokeWidth="2"
        />
        <path d="m136 77 3-10m-3 14-1 9" stroke="#c6ffff" strokeWidth="1" />
        <path
          d="m122 137-17 24 7 5 17-10m29-19 17 24-7 5-17-10"
          fill="url(#wing-titanium)"
          stroke="#93b0be"
          strokeWidth=".6"
        />
        <path d="M112 158h12m32 0h12" stroke="#bfffff" strokeWidth="3" />
        <path d="M96 122v29m88-29v29" stroke="#111d28" strokeWidth="5" />
        <path d="M96 120v20m88-20v20" stroke="#7d9aa8" strokeWidth="2" />
        <path d="m52 162 13-4m150 0 13 4" stroke="#66e5f9" strokeWidth="2" />
        <g fill="#d0e6ea">
          <circle cx="118" cy="100" r="1" />
          <circle cx="162" cy="100" r="1" />
          <circle cx="132" cy="120" r="1" />
          <circle cx="148" cy="120" r="1" />
        </g>
      </g>
    </svg>
  );
}
