// Shared styling for the Discussions (forum) pages — mirrors the Vercel embed's
// thread cards, guidelines box, and reply layout, in the portal's tokens.
export const forumCss = `
  .fr-wrap { max-width: 860px; }
  .fr-back { font-size: 12.5px; color: var(--muted); margin-bottom: 14px; display: inline-block; }
  .fr-back:hover { color: var(--ink); }

  .fr-h1 { font-family:'thermal-variable', Georgia, serif; font-size:26px; font-weight:500; margin:0 0 3px; }
  .fr-sub { font-size:13px; color:var(--muted); margin:0 0 22px; }

  /* Forum list cards */
  .fr-list { display:flex; flex-direction:column; gap:12px; }
  .fr-card { display:block; border:1px solid var(--border); border-radius:12px; padding:18px 20px; background:#fff; transition:border-color .15s; }
  .fr-card:hover { border-color:var(--pinkborder); }
  .fr-card-name { font-family:'thermal-variable', Georgia, serif; font-size:17px; font-weight:500; color:var(--ink); margin-bottom:4px; }
  .fr-card-desc { font-size:13px; color:var(--muted); line-height:1.5; margin-bottom:9px; }
  .fr-card-meta { font-size:11.5px; color:var(--muted); display:flex; gap:14px; }
  .fr-badge-host { font-size:9px; text-transform:uppercase; letter-spacing:.1em; color:#000; background:var(--pink); border-radius:20px; padding:2px 8px; margin-left:8px; vertical-align:middle; }

  /* Forum detail topbar */
  .fr-topbar { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:16px; }
  .fr-newbtn { display:inline-flex; align-items:center; gap:7px; background:var(--ink); color:#fff; border:none; padding:9px 16px; border-radius:8px; font-family:'thermal-variable', Georgia, serif; font-size:13px; font-weight:500; cursor:pointer; }
  .fr-newbtn:hover { opacity:.88; }

  /* Guidelines box */
  .fr-guide { background:var(--cream); border:1px solid var(--border); border-radius:10px; padding:15px 18px; margin-bottom:20px; }
  .fr-guide-title { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.08em; color:var(--ink); margin-bottom:7px; }
  .fr-guide-body { font-size:13px; color:var(--muted); line-height:1.65; white-space:pre-wrap; }

  /* Thread cards */
  .fr-threads { display:flex; flex-direction:column; }
  .fr-thread { display:grid; grid-template-columns:40px 1fr auto; gap:14px; padding:16px 2px; border-bottom:1px solid var(--border); align-items:start; }
  .fr-thread:last-child { border-bottom:none; }
  a.fr-thread:hover .fr-thread-title { color:#000; text-decoration:underline; text-underline-offset:2px; }
  .fr-av { width:38px; height:38px; border-radius:50%; flex-shrink:0; background:var(--pink); display:flex; align-items:center; justify-content:center; font-size:14px; color:#000; overflow:hidden; }
  .fr-av img { width:100%; height:100%; object-fit:cover; }
  .fr-av.sm { width:32px; height:32px; font-size:12px; }
  .fr-thread-body { min-width:0; }
  .fr-pin { font-size:9px; text-transform:uppercase; letter-spacing:.1em; color:#b26a00; margin-bottom:3px; }
  .fr-thread-title { font-family:'thermal-variable', Georgia, serif; font-size:16px; font-weight:500; color:var(--ink); line-height:1.35; margin-bottom:4px; }
  .fr-thread-excerpt { font-size:13px; color:var(--muted); line-height:1.5; margin-bottom:6px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
  .fr-thread-meta { font-size:11.5px; color:var(--muted); }
  .fr-thread-meta b { color:var(--ink); font-weight:500; }
  .fr-stats { display:flex; flex-direction:column; align-items:flex-end; gap:8px; min-width:54px; }
  .fr-votes { display:flex; align-items:center; gap:5px; border:1px solid var(--border); border-radius:20px; padding:3px 10px; font-size:12px; color:var(--muted); background:none; cursor:pointer; font-family:inherit; }
  .fr-votes.on { background:var(--pink); color:#000; border-color:var(--pinkborder); }
  .fr-votes svg { width:11px; height:11px; }
  .fr-replies { font-size:11px; color:var(--muted); }

  /* Thread detail */
  .fr-op { border:1px solid var(--border); border-radius:12px; padding:20px 22px; margin-bottom:22px; }
  .fr-op-head { display:flex; align-items:center; gap:11px; margin-bottom:12px; }
  .fr-op-title { font-family:'thermal-variable', Georgia, serif; font-size:22px; font-weight:500; line-height:1.25; margin:2px 0 10px; }
  .fr-op-body, .fr-reply-body { font-size:15px; color:#333; line-height:1.65; white-space:pre-wrap; word-break:break-word; }
  .fr-name { font-size:13.5px; font-weight:500; color:var(--ink); }
  .fr-time { font-size:11.5px; color:var(--muted); }
  .fr-op-actions { display:flex; gap:16px; margin-top:14px; padding-top:13px; border-top:1px solid var(--border); }
  .fr-linkbtn { background:none; border:none; padding:0; cursor:pointer; font-family:inherit; font-size:13px; color:var(--muted); }
  .fr-linkbtn:hover { color:var(--ink); }

  .fr-replies-label { font-size:9.5px; font-weight:500; text-transform:uppercase; letter-spacing:.13em; color:var(--muted); padding:6px 0 12px; }
  .fr-reply { display:grid; grid-template-columns:32px 1fr; gap:12px; padding:15px 0; border-bottom:1px solid var(--border); }
  .fr-reply:last-of-type { border-bottom:none; }
  .fr-reply-head { display:flex; align-items:center; gap:8px; margin-bottom:5px; }

  .fr-composer textarea { width:100%; padding:12px; border:1px solid var(--border); border-radius:8px; font-family:'thermal-variable', Georgia, serif; font-size:15px; resize:vertical; outline:none; background:#fff; }
  .fr-composer-row { display:flex; justify-content:flex-end; margin-top:8px; }
  .fr-postbtn { padding:9px 20px; background:var(--ink); color:#fff; border:none; border-radius:7px; font-family:inherit; font-size:14px; font-weight:500; cursor:pointer; }
  .fr-postbtn:disabled { background:#ccc; cursor:default; }

  /* New-thread modal */
  .fr-modal-bg { position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:200; display:flex; align-items:flex-start; justify-content:center; padding:52px 16px; overflow-y:auto; }
  .fr-modal { background:#fff; border-radius:14px; width:100%; max-width:560px; padding:24px 26px; }
  .fr-modal-title { font-family:'thermal-variable', Georgia, serif; font-size:20px; font-weight:500; margin-bottom:14px; }
  .fr-input { width:100%; padding:11px 13px; border:1px solid var(--border); border-radius:8px; font-family:'thermal-variable', Georgia, serif; font-size:15px; outline:none; margin-bottom:10px; box-sizing:border-box; }

  .fr-empty { border:1px solid var(--border); border-radius:12px; background:var(--cream); padding:34px 28px; text-align:center; color:var(--muted); font-size:13.5px; line-height:1.6; }
`
