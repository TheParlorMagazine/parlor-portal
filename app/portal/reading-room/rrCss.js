// Styling for the Reading Room (book club): featured pick + shelf, book detail,
// and prompt discussions. Reuses portal tokens; discussion reuses forum look.
export const rrCss = `
  .rr-wrap { max-width: 900px; }
  .rr-back { font-size:12.5px; color:var(--muted); margin-bottom:14px; display:inline-block; }
  .rr-back:hover { color:var(--ink); }
  .rr-h1 { font-family:'thermal-variable', Georgia, serif; font-size:27px; font-weight:500; margin:0 0 3px; }
  .rr-sub { font-size:13px; color:var(--muted); margin:0 0 24px; }
  .rr-eyebrow { font-size:10px; text-transform:uppercase; letter-spacing:.14em; color:var(--pink); font-weight:600; margin-bottom:10px; }

  /* Featured current pick */
  .rr-feature { display:grid; grid-template-columns:180px 1fr; gap:26px; border:1px solid var(--border); border-radius:14px; padding:24px; background:#fff; margin-bottom:34px; }
  .rr-cover { width:100%; aspect-ratio:2/3; border-radius:8px; object-fit:cover; background:#f2ece4; display:block; box-shadow:0 6px 20px rgba(0,0,0,0.10); }
  .rr-cover-ph { display:flex; align-items:center; justify-content:center; color:#c9b8bd; font-size:12px; text-align:center; padding:10px; }
  .rr-f-title { font-family:'thermal-variable', Georgia, serif; font-size:24px; font-weight:500; line-height:1.2; margin:2px 0 3px; }
  .rr-f-author { font-size:14px; color:var(--muted); margin-bottom:12px; }
  .rr-f-blurb { font-size:14.5px; color:#444; line-height:1.6; margin-bottom:16px; }
  .rr-meet { font-size:12.5px; color:var(--ink); background:var(--cream); border:1px solid var(--border); border-radius:8px; padding:8px 12px; display:inline-block; margin-bottom:16px; }
  .rr-actions { display:flex; gap:10px; flex-wrap:wrap; }
  .rr-btn { display:inline-flex; align-items:center; gap:7px; padding:10px 18px; border-radius:8px; font-family:'thermal-variable', Georgia, serif; font-size:13.5px; font-weight:500; cursor:pointer; border:none; }
  .rr-btn.primary { background:var(--ink); color:#fff; }
  .rr-btn.ghost { background:#fff; color:var(--ink); border:1px solid var(--border); }
  .rr-btn:hover { opacity:.9; }

  /* Shelf */
  .rr-shelf-title { font-family:'thermal-variable', Georgia, serif; font-size:16px; font-style:italic; color:var(--muted); margin:0 0 14px; }
  .rr-shelf { display:grid; grid-template-columns:repeat(auto-fill,minmax(130px,1fr)); gap:20px; }
  .rr-book { display:block; }
  .rr-book .rr-cover { box-shadow:0 3px 12px rgba(0,0,0,0.08); margin-bottom:9px; transition:transform .15s; }
  .rr-book:hover .rr-cover { transform:translateY(-3px); }
  .rr-book-title { font-family:'thermal-variable', Georgia, serif; font-size:13.5px; font-weight:500; line-height:1.3; color:var(--ink); }
  .rr-book-author { font-size:11.5px; color:var(--muted); margin-top:2px; }
  .rr-status { font-size:9px; text-transform:uppercase; letter-spacing:.1em; padding:2px 8px; border-radius:20px; display:inline-block; margin-bottom:7px; }
  .rr-status.current { background:var(--pink); color:#000; }
  .rr-status.upcoming { background:var(--goldlight); color:#8a5a00; }
  .rr-status.past { background:#eee; color:#888; }

  /* Paywall teaser */
  .rr-teaser { border:1px solid var(--border); border-radius:12px; background:linear-gradient(135deg,#f9eff2,#fce8ec); padding:26px 28px; text-align:center; margin-bottom:30px; }
  .rr-teaser h3 { font-family:'thermal-variable', Georgia, serif; font-size:19px; font-weight:500; margin:0 0 6px; }
  .rr-teaser p { font-size:14px; color:#666; margin:0 0 16px; }

  /* Prompt discussion (reuses forum look) */
  .rr-prompt { display:grid; grid-template-columns:38px 1fr auto; gap:14px; padding:16px 2px; border-bottom:1px solid var(--border); align-items:start; }
  .rr-prompt:last-child { border-bottom:none; }
  .rr-av { width:38px; height:38px; border-radius:50%; flex-shrink:0; background:var(--pink); display:flex; align-items:center; justify-content:center; font-size:14px; color:#000; overflow:hidden; }
  .rr-av img { width:100%; height:100%; object-fit:cover; }
  .rr-av.sm { width:32px; height:32px; font-size:12px; }
  .rr-prompt-title { font-family:'thermal-variable', Georgia, serif; font-size:16px; font-weight:500; color:var(--ink); line-height:1.35; margin-bottom:4px; }
  .rr-prompt-title:hover { text-decoration:underline; text-underline-offset:2px; }
  .rr-prompt-ex { font-size:13px; color:var(--muted); line-height:1.5; margin-bottom:6px; }
  .rr-prompt-meta { font-size:11.5px; color:var(--muted); }
  .rr-prompt-meta b { color:var(--ink); font-weight:500; }
  .rr-stats { display:flex; flex-direction:column; align-items:flex-end; gap:8px; min-width:54px; }
  .rr-votes { display:flex; align-items:center; gap:5px; border:1px solid var(--border); border-radius:20px; padding:3px 10px; font-size:12px; color:var(--muted); background:none; cursor:pointer; font-family:inherit; }
  .rr-votes.on { background:var(--pink); color:#000; border-color:var(--pinkborder); }
  .rr-votes svg { width:11px; height:11px; }
  .rr-editor-tag { font-size:9px; text-transform:uppercase; letter-spacing:.1em; color:#8a5a00; background:var(--goldlight); border-radius:20px; padding:1px 7px; margin-left:6px; vertical-align:middle; }

  .rr-op { border:1px solid var(--border); border-radius:12px; padding:20px 22px; margin:16px 0 22px; }
  .rr-op-head { display:flex; align-items:center; gap:11px; margin-bottom:12px; }
  .rr-op-title { font-family:'thermal-variable', Georgia, serif; font-size:22px; font-weight:500; line-height:1.25; margin:2px 0 10px; }
  .rr-op-body, .rr-reply-body { font-size:15px; color:#333; line-height:1.65; white-space:pre-wrap; word-break:break-word; }
  .rr-name { font-size:13.5px; font-weight:500; color:var(--ink); }
  .rr-time { font-size:11.5px; color:var(--muted); }
  .rr-reply { display:grid; grid-template-columns:32px 1fr; gap:12px; padding:15px 0; border-bottom:1px solid var(--border); }
  .rr-reply:last-of-type { border-bottom:none; }
  .rr-reply-head { display:flex; align-items:center; gap:8px; margin-bottom:5px; }
  .rr-linkbtn { background:none; border:none; padding:0; cursor:pointer; font-family:inherit; font-size:13px; color:var(--muted); }
  .rr-linkbtn:hover { color:var(--ink); }
  .rr-composer textarea { width:100%; padding:12px; border:1px solid var(--border); border-radius:8px; font-family:'thermal-variable', Georgia, serif; font-size:15px; resize:vertical; outline:none; }
  .rr-postbtn { padding:9px 20px; background:var(--ink); color:#fff; border:none; border-radius:7px; font-family:inherit; font-size:14px; font-weight:500; cursor:pointer; margin-top:8px; }
  .rr-postbtn:disabled { background:#ccc; cursor:default; }
  .rr-empty { border:1px solid var(--border); border-radius:12px; background:var(--cream); padding:30px; text-align:center; color:var(--muted); font-size:13.5px; line-height:1.6; }

  @media (max-width:640px){ .rr-feature{ grid-template-columns:120px 1fr; gap:16px; padding:16px; } }
`
