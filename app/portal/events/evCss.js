// Styling for the Events pages — list (upcoming + past) and event detail.
export const evCss = `
  .ev-wrap { max-width: 880px; }
  .ev-back { font-size:12.5px; color:var(--muted); margin-bottom:14px; display:inline-block; }
  .ev-back:hover { color:var(--ink); }
  .ev-h1 { font-family:'thermal-variable', Georgia, serif; font-size:27px; font-weight:500; margin:0 0 3px; }
  .ev-sub { font-size:13px; color:var(--muted); margin:0 0 24px; }
  .ev-section { font-family:'thermal-variable', Georgia, serif; font-size:16px; font-style:italic; color:var(--muted); margin:26px 0 14px; }

  .ev-list { display:flex; flex-direction:column; gap:14px; }
  .ev-card { display:grid; grid-template-columns:88px 1fr auto; gap:18px; border:1px solid var(--border); border-radius:12px; padding:16px 18px; background:#fff; align-items:center; transition:border-color .15s; }
  .ev-card:hover { border-color:var(--pinkborder); }
  .ev-date { text-align:center; border-radius:9px; background:var(--cream); border:1px solid var(--border); padding:9px 0; }
  .ev-date .m { font-size:10px; text-transform:uppercase; letter-spacing:.1em; color:var(--pink); font-weight:600; }
  .ev-date .d { font-family:'thermal-variable', Georgia, serif; font-size:24px; font-weight:600; line-height:1; margin-top:2px; }
  .ev-date .t { font-size:10.5px; color:var(--muted); margin-top:3px; }
  .ev-c-title { font-family:'thermal-variable', Georgia, serif; font-size:17px; font-weight:500; color:var(--ink); line-height:1.3; margin-bottom:3px; }
  .ev-c-blurb { font-size:13px; color:var(--muted); line-height:1.5; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
  .ev-c-meta { font-size:11.5px; color:var(--muted); margin-top:5px; }
  .ev-loc { display:inline-block; font-size:10px; text-transform:uppercase; letter-spacing:.08em; color:#8a5a00; background:var(--goldlight); border-radius:20px; padding:2px 8px; margin-bottom:5px; }
  .ev-going-tag { font-size:11px; color:#2d8f5a; font-weight:500; white-space:nowrap; }
  .ev-past .ev-card { opacity:.72; }

  .ev-empty { border:1px solid var(--border); border-radius:12px; background:var(--cream); padding:32px; text-align:center; color:var(--muted); font-size:13.5px; line-height:1.6; }

  /* Detail */
  .ev-hero { width:100%; aspect-ratio:16/6; object-fit:cover; border-radius:14px; margin-bottom:20px; background:#f2ece4; }
  .ev-d-title { font-family:'thermal-variable', Georgia, serif; font-size:30px; font-weight:500; line-height:1.15; margin:0 0 10px; }
  .ev-meta-grid { display:flex; flex-wrap:wrap; gap:22px; margin-bottom:20px; }
  .ev-meta { }
  .ev-meta .k { font-size:10px; text-transform:uppercase; letter-spacing:.1em; color:var(--muted); margin-bottom:3px; }
  .ev-meta .v { font-size:14.5px; color:var(--ink); font-weight:500; }
  .ev-desc { font-size:15.5px; color:#333; line-height:1.7; white-space:pre-wrap; margin-bottom:26px; }
  .ev-cta { display:flex; gap:10px; flex-wrap:wrap; align-items:center; padding:18px 0; border-top:1px solid var(--border); border-bottom:1px solid var(--border); margin-bottom:22px; }
  .ev-btn { display:inline-flex; align-items:center; gap:7px; padding:11px 22px; border-radius:8px; font-family:'thermal-variable', Georgia, serif; font-size:14px; font-weight:500; cursor:pointer; border:none; }
  .ev-btn.primary { background:var(--ink); color:#fff; }
  .ev-btn.going { background:#eaf6ef; color:#2d8f5a; border:1px solid #b7e0c8; }
  .ev-btn.ghost { background:#fff; color:var(--ink); border:1px solid var(--border); }
  .ev-btn:hover { opacity:.9; }
  .ev-join { background:var(--cream); border:1px solid var(--border); border-radius:10px; padding:14px 16px; margin-bottom:20px; font-size:14px; }
  .ev-join a { color:var(--pink); font-weight:600; }
  .ev-count { font-size:12.5px; color:var(--muted); }
`
