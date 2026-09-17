// Shared stylesheet for the Borderlands hub + chapter pages.
export default function IssueStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,700&family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;1,8..60,300&display=swap');
      *, *::before, *::after { box-sizing: border-box; }
      body { background: #000; font-family: 'Source Serif 4', Georgia, serif; }
      /* Zero-specificity so component classes (header nav, topic nav, etc.) keep their own colors. */
      :where(.boi-root a) { text-decoration: none; color: inherit; }

      /* ── HUB HERO (full-bleed, layered) ── */
      .boi-hero {
        position: relative;
        min-height: 80vh;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        text-align: center;
        padding: 96px 24px;
        background-color: #fce8ef;
        overflow: hidden;
      }
      .boi-hero-bg {
        position: absolute; left: 0; right: 0; top: -55%; height: 210%; z-index: 0;
        background-image: var(--herobg);
        background-size: cover; background-position: center 30%;
        will-change: transform;
      }
      .boi-hero-wash {
        position: absolute; inset: 0; z-index: 1;
        background:
          radial-gradient(130% 100% at 50% 38%, rgba(252,232,239,0.28) 0%, rgba(252,232,239,0.66) 82%),
          linear-gradient(180deg, rgba(252,232,239,0.42), rgba(252,232,239,0.52));
      }
      .boi-title-wrap { position: relative; display: inline-block; }
      .boi-hero-title, .boi-title-fx {
        font-family: 'Playfair Display', Georgia, serif;
        font-size: clamp(46px, 8.6vw, 108px); font-weight: 700;
        text-transform: uppercase; letter-spacing: 0.015em; line-height: 0.97;
        margin: 0;
      }
      .boi-title-fx {
        position: absolute; top: 0; left: 0; width: 100%; z-index: 2;
        pointer-events: none;
        color: transparent; -webkit-text-fill-color: transparent;
        -webkit-background-clip: text; background-clip: text;
        background-repeat: no-repeat;
      }
      .boi-title-fx.shine {
        background-image: linear-gradient(105deg,
          rgba(255,255,255,0) 40%,
          rgba(255,255,255,0.95) 47%,
          rgba(255,225,236,0.98) 50%,
          rgba(255,255,255,0.95) 53%,
          rgba(255,255,255,0) 60%);
        background-size: 300% 100%;
        background-position: 150% 0;
        animation: boi-shine 3.6s linear infinite;
      }
      .boi-title-fx.glitter-a, .boi-title-fx.glitter-b {
        animation: boi-glitter 2.6s ease-in-out infinite;
      }
      .boi-title-fx.glitter-a {
        background-image:
          radial-gradient(circle at 11% 30%, #fff 0, rgba(255,255,255,0.85) 2px, rgba(255,255,255,0) 8px),
          radial-gradient(circle at 31% 66%, #ffe1ec 0, rgba(255,225,236,0.85) 2px, rgba(255,225,236,0) 8px),
          radial-gradient(circle at 52% 24%, #fff 0, rgba(255,255,255,0.85) 2px, rgba(255,255,255,0) 8px),
          radial-gradient(circle at 69% 60%, #fff 0, rgba(255,255,255,0.85) 2px, rgba(255,255,255,0) 8px),
          radial-gradient(circle at 88% 34%, #fff 0, rgba(255,255,255,0.85) 2px, rgba(255,255,255,0) 8px);
      }
      .boi-title-fx.glitter-b {
        background-image:
          radial-gradient(circle at 20% 58%, #fff 0, rgba(255,255,255,0.85) 2px, rgba(255,255,255,0) 8px),
          radial-gradient(circle at 42% 40%, #fff 0, rgba(255,255,255,0.85) 2px, rgba(255,255,255,0) 8px),
          radial-gradient(circle at 60% 80%, #ffe1ec 0, rgba(255,225,236,0.85) 2px, rgba(255,225,236,0) 8px),
          radial-gradient(circle at 78% 26%, #fff 0, rgba(255,255,255,0.85) 2px, rgba(255,255,255,0) 8px),
          radial-gradient(circle at 92% 66%, #fff 0, rgba(255,255,255,0.85) 2px, rgba(255,255,255,0) 8px);
        animation-delay: 1.3s;
      }
      @keyframes boi-glitter { 0%, 100% { opacity: 0.2; } 50% { opacity: 1; } }
      @keyframes boi-shine { 0% { background-position: 150% 0; } 100% { background-position: -150% 0; } }
      .boi-hero-inner {
        position: relative; z-index: 3;
        max-width: 1040px; width: 100%;
        display: flex; flex-direction: column; align-items: center;
      }
      .boi-hero-title {
        color: #2f2f2f; position: relative; z-index: 1;
        text-shadow: 0 2px 22px rgba(252,232,239,0.95), 0 1px 4px rgba(252,232,239,0.9);
      }
      .boi-hero-intro {
        margin: 34px 0 0;
        display: inline-block;
        background: rgba(242,184,198,0.52);
        padding: 16px 24px;
        font-family: 'Playfair Display', Georgia, serif;
        font-weight: 700;
        font-size: clamp(18px, 2.3vw, 28px);
        line-height: 1.42; color: #2b2b2b;
        max-width: 780px;
      }

      /* ── HUB CONTENTS GRID ── */
      .boi-hub {
        max-width: 1160px; margin: 0 auto; padding: 56px 20px 72px;
      }
      .boi-hub-head { text-align: center; margin-bottom: 34px; }
      .boi-hub-eyebrow {
        font-family: 'Source Serif 4', Georgia, serif;
        font-size: 13px; letter-spacing: 0.24em; text-transform: uppercase;
        color: #f2b8c6; margin-bottom: 12px;
      }
      .boi-hub-heading {
        font-family: 'Playfair Display', Georgia, serif;
        font-size: clamp(26px, 3vw, 38px); font-weight: 700; color: #fff; margin: 0;
      }
      .boi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
        gap: 20px;
      }
      .boi-tile {
        display: flex; flex-direction: column;
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 16px; overflow: hidden; background: #0d0d0d;
        transition: transform 0.2s ease, border-color 0.2s ease;
      }
      .boi-tile:hover { transform: translateY(-4px); border-color: rgba(242,184,198,0.55); }
      .boi-tile-figure {
        position: relative; aspect-ratio: 3 / 4; overflow: hidden; background: #fce8ef;
      }
      .boi-tile-figure img {
        width: 100%; height: 100%; object-fit: cover; display: block;
        transition: transform 6s ease;
      }
      .boi-tile:hover .boi-tile-figure img { transform: scale(1.05); }
      .boi-tile-count {
        position: absolute; top: 10px; right: 10px;
        background: rgba(0,0,0,0.6); color: #fff;
        font-family: 'Source Serif 4', Georgia, serif;
        font-size: 11px; letter-spacing: 0.04em;
        padding: 4px 10px; border-radius: 999px;
      }
      .boi-tile-body { padding: 14px 16px 18px; display: flex; flex-direction: column; gap: 6px; }
      .boi-tile-title {
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 19px; font-weight: 700; color: #fff; line-height: 1.18; margin: 0;
      }
      .boi-tile-sub {
        font-family: 'Source Serif 4', Georgia, serif;
        font-size: 13px; line-height: 1.4; color: rgba(255,255,255,0.7); margin: 0;
      }
      .boi-tile-more {
        margin-top: 4px; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase;
        color: #f2b8c6; display: inline-flex; align-items: center; gap: 6px;
      }

      /* ── STICKY TOPIC NAV (chapter pages) ── */
      .boi-topicnav {
        position: sticky; top: var(--boi-header-h, 0px); z-index: 90;
        background: rgba(10,10,10,0.96);
        backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
        border-bottom: 1px solid rgba(255,255,255,0.12);
      }
      .boi-topicnav-inner {
        max-width: 1160px; margin: 0 auto;
        display: flex; gap: 4px; padding: 0 12px;
        overflow-x: auto; scrollbar-width: none;
      }
      .boi-topicnav-inner::-webkit-scrollbar { display: none; }
      .boi-topiclink {
        flex: 0 0 auto;
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 15px; color: rgba(255,255,255,0.6);
        padding: 14px 14px 12px; white-space: nowrap;
        border-bottom: 2px solid transparent; transition: color 0.15s, border-color 0.15s;
      }
      .boi-topiclink:hover { color: #fff; }
      .boi-topiclink.active { color: #fff; border-bottom-color: #f2b8c6; }

      /* ── CHAPTER HERO (split: portrait image + copy) ── */
      .boi-chapter-hero {
        background: #0a0a0a;
        display: grid; grid-template-columns: minmax(0, 0.8fr) 1fr;
        gap: 44px; align-items: center;
        max-width: 1160px; margin: 0 auto; padding: 56px 24px 44px;
      }
      .boi-chapter-figure {
        aspect-ratio: 3 / 4; border-radius: 16px; overflow: hidden;
        background: #fce8ef; border: 1px solid rgba(255,255,255,0.12);
      }
      .boi-chapter-figure img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .boi-chapter-eyebrow {
        font-family: 'Source Serif 4', Georgia, serif;
        font-size: 13px; letter-spacing: 0.2em; text-transform: uppercase;
        color: #f2b8c6; margin-bottom: 16px;
      }
      .boi-chapter-title {
        font-family: 'Playfair Display', Georgia, serif;
        font-size: clamp(34px, 4.6vw, 60px); font-weight: 700;
        color: #fff; line-height: 1.04; margin: 0 0 18px;
      }
      .boi-chapter-sub {
        font-family: 'Playfair Display', Georgia, serif;
        font-size: clamp(17px, 2vw, 22px); font-style: italic;
        color: rgba(255,255,255,0.72); margin: 0;
      }
      .boi-chapter-count {
        margin-top: 22px; font-family: 'Source Serif 4', Georgia, serif;
        font-size: 14px; color: rgba(255,255,255,0.55); letter-spacing: 0.04em;
      }

      /* ── CARD CAROUSEL ── */
      .boi-wrap {
        --gap: 14px; max-width: 1160px; margin: 0 auto; padding: 6px 16px 40px;
        color: #fff;
      }
      .boi-cards-wrap { position: relative; }
      .boi-cards {
        display: grid;
        grid-auto-flow: column;
        grid-auto-columns: minmax(320px, 360px);
        gap: var(--gap);
        overflow-x: auto; scroll-behavior: smooth;
        padding: 4px 44px 10px; margin: 0;
      }
      .boi-scroll-btn {
        position: absolute; top: 50%; transform: translateY(-50%);
        width: 44px; height: 44px; border-radius: 999px;
        border: 1px solid rgba(0,0,0,0.18);
        background: rgba(255,255,255,0.85); color: #111;
        cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
        z-index: 3; font-size: 26px; line-height: 1;
      }
      .boi-scroll-btn.left { left: 6px; }
      .boi-scroll-btn.right { right: 6px; }
      .boi-scroll-btn.boi-hidden { display: none; }
      .boi-scroll-btn:focus-visible { outline: 3px solid rgba(255,255,255,0.35); outline-offset: 2px; }

      .boi-card {
        border: 1px solid rgba(0,0,0,0.12);
        border-radius: 16px; padding: 14px; background: #fff;
        display: grid; grid-template-columns: 56px 1fr; gap: 12px;
        align-content: start; min-height: 140px;
      }
      .boi-avatar {
        width: 56px; height: 56px; border-radius: 999px; overflow: hidden;
        border: 1px solid rgba(0,0,0,0.12); background: rgba(0,0,0,0.04);
        display: grid; place-items: center;
        font-family: 'Source Serif 4', system-ui, sans-serif;
        font-weight: 650; color: #111;
      }
      .boi-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .boi-a-title {
        font-family: 'Playfair Display', ui-serif, Georgia, serif;
        margin: 0; font-size: 18px; line-height: 1.2; color: #111;
      }
      .boi-byline {
        margin: 6px 0 0; font-family: 'Source Serif 4', system-ui, sans-serif;
        font-size: 13px; opacity: 0.85; color: #111;
      }
      .boi-dek {
        margin: 10px 0 0; font-family: 'Source Serif 4', system-ui, sans-serif;
        font-size: 14px; line-height: 1.35; opacity: 0.92; color: #111;
      }
      .boi-cta, .boi-soon {
        margin-top: 12px; font-family: 'Source Serif 4', system-ui, sans-serif;
        font-size: 14px; display: inline-flex; align-items: center; gap: 8px;
        border: 1px solid rgba(0,0,0,0.18); padding: 10px 12px;
        border-radius: 999px; background: #fff; width: fit-content; color: #111;
      }
      .boi-cta:hover { background: #0a0a0a; color: #fff; border-color: #0a0a0a; }
      .boi-soon { background: rgba(0,0,0,0.04); color: #6b7280; font-style: italic; }

      /* ── PREV / NEXT CHAPTER ── */
      .boi-chapnav {
        max-width: 1160px; margin: 0 auto; padding: 12px 24px 72px;
        display: flex; justify-content: space-between; gap: 16px;
        border-top: 1px solid rgba(255,255,255,0.12);
      }
      .boi-chapnav a {
        display: flex; flex-direction: column; gap: 4px; max-width: 46%;
        padding: 18px 4px;
      }
      .boi-chapnav a.next { text-align: right; margin-left: auto; align-items: flex-end; }
      .boi-chapnav-label {
        font-family: 'Source Serif 4', Georgia, serif;
        font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase;
        color: rgba(255,255,255,0.5);
      }
      .boi-chapnav-title {
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 20px; color: #fff; line-height: 1.15;
      }
      .boi-chapnav a:hover .boi-chapnav-title { color: #f2b8c6; }

      @media (max-width: 900px) {
        .boi-hero { min-height: 64vh; padding: 72px 20px; }
        .boi-chapter-hero { grid-template-columns: 1fr; gap: 24px; padding: 36px 20px 32px; }
        .boi-chapter-figure { max-width: 360px; margin: 0 auto; width: 100%; }
      }
      @media (prefers-reduced-motion: reduce) {
        .boi-title-fx { animation: none; opacity: 0.7; }
        .boi-hero-bg { transform: none !important; }
        .boi-tile, .boi-tile-figure img { transition: none; }
      }
      @media (max-width: 720px) {
        .boi-cards {
          grid-auto-flow: row; grid-auto-columns: unset;
          overflow-x: visible; padding: 0;
        }
        .boi-scroll-btn { display: none; }
      }
    `}</style>
  )
}
