// Shared styling for the portal account views (profile / settings / subscriptions).
export const fieldCss = `
  .pg-title { font-family:'thermal-variable', Georgia, serif; font-size:26px; font-weight:500; margin:0 0 4px; }
  .pg-sub { font-size:13px; color:var(--muted); margin:0 0 24px; }

  .pg-card { background:#fff; border:1px solid var(--border); border-radius:12px; padding:24px 26px; margin-bottom:18px; max-width:640px; }
  .pg-card h2 { font-family:'thermal-variable', Georgia, serif; font-size:16px; font-weight:600; margin:0 0 4px; }
  .pg-card .pg-card-note { font-size:12.5px; color:var(--muted); margin:0 0 18px; line-height:1.5; }

  .fld { display:block; margin-bottom:16px; }
  .fld > span { display:block; font-size:12px; color:#555; margin-bottom:6px; letter-spacing:0.02em; }
  .fld > span em { color:var(--muted); font-style:italic; }
  .fld input, .fld textarea {
    width:100%; padding:10px 13px; border:1px solid var(--border); border-radius:8px;
    font-size:14px; font-family:'thermal-variable', Georgia, serif; color:var(--ink); background:#fff; outline:none; resize:vertical;
  }
  .fld input:focus, .fld textarea:focus { border-color:var(--pinkborder); }
  .fld input:disabled { background:#faf7f8; color:var(--muted); }

  .pg-actions { display:flex; align-items:center; gap:14px; margin-top:6px; }
  .pg-ok { font-size:13px; color:#2e7d46; }
  .pg-err { font-size:13px; color:#b23b3b; }

  .btn-primary {
    background:#000; color:#fff; border:none; border-radius:8px; padding:10px 20px;
    font-size:13.5px; font-weight:500; cursor:pointer; font-family:'thermal-variable', Georgia, serif;
  }
  .btn-primary:hover { background:#222; }
  .btn-primary:disabled { opacity:0.5; cursor:default; }
  .btn-secondary {
    background:rgba(241,183,192,0.14); color:#000; border:1px solid var(--pinkborder); border-radius:8px;
    padding:9px 16px; font-size:13px; cursor:pointer; font-family:'thermal-variable', Georgia, serif;
  }
  .btn-secondary:hover { background:rgba(241,183,192,0.24); }
  .btn-secondary:disabled { opacity:0.5; cursor:default; }
  .btn-text { background:none; border:none; color:var(--muted); font-size:12.5px; cursor:pointer; margin-left:10px; text-decoration:underline; text-underline-offset:2px; font-family:'thermal-variable', Georgia, serif; }

  .pf-avatar-row { display:flex; align-items:center; gap:18px; margin-bottom:22px; }
  .pf-avatar { width:72px; height:72px; border-radius:50%; background:var(--pink); display:flex; align-items:center; justify-content:center; font-size:28px; color:#000; overflow:hidden; flex-shrink:0; }
  .pf-avatar img { width:100%; height:100%; object-fit:cover; }

  .pg-row { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:14px 0; border-bottom:1px solid var(--border); }
  .pg-row:last-child { border-bottom:none; }
  .pg-row-label { font-size:14px; color:var(--ink); }
  .pg-row-label small { display:block; font-size:12px; color:var(--muted); margin-top:2px; }

  .pg-toggle { position:relative; width:42px; height:24px; border-radius:999px; background:#d8d0d2; border:none; cursor:pointer; transition:background 0.15s; flex-shrink:0; }
  .pg-toggle.on { background:#000; }
  .pg-toggle::after { content:''; position:absolute; top:3px; left:3px; width:18px; height:18px; border-radius:50%; background:#fff; transition:left 0.15s; }
  .pg-toggle.on::after { left:21px; }

  .pg-pill { display:inline-block; font-size:11px; letter-spacing:0.06em; text-transform:uppercase; padding:4px 11px; border-radius:999px; background:var(--pink); color:#000; }
  .pg-pill.muted { background:#eee; color:#666; }
  .pg-plan-name { font-family:'thermal-variable', Georgia, serif; font-size:22px; font-weight:600; margin:6px 0 2px; }

  .pi-head { display:flex; align-items:center; justify-content:space-between; gap:12px; }
  .pi-head h2 { margin:0; }
  .pi-edit { display:inline-flex; align-items:center; gap:6px; background:none; border:1px solid var(--border); border-radius:8px; padding:6px 12px; font-size:12.5px; color:#555; cursor:pointer; font-family:'thermal-variable', Georgia, serif; }
  .pi-edit:hover { border-color:var(--pinkborder); color:#000; }
  .pi-edit svg { width:13px; height:13px; }
  .pw-forgot { display:block; margin-top:14px; background:none; border:none; padding:0; color:var(--muted); font-size:12.5px; cursor:pointer; text-decoration:underline; text-underline-offset:2px; font-family:'thermal-variable', Georgia, serif; }
  .pw-forgot:hover { color:#000; }
`
