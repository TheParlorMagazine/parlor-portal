// Shared styling for the in-portal Library (browse + detail views), ported from
// dashboard.html so both match the original design exactly.
export const libCss = `
  @import url("https://use.typekit.net/azq6zbr.css");
  *,*::before,*::after{box-sizing:border-box}
  :root{--ink:#000;--paper:#fff;--cream:#fdf5f6;--border:#e8d4d8;--muted:#888;--pink:#F1B7C0;--pinkborder:#e8a0b0;--accent:#000;--gold:#000;--goldlight:#fce8ec;--white:#fff}
  html,body{height:100%}
  body{margin:0;font-family:'thermal-variable',Georgia,serif;background:var(--paper);color:var(--ink);font-size:15px}
  a{text-decoration:none;color:inherit}

  .lib-shell{display:flex;height:100vh;overflow:hidden}
  .sidebar{background:#000;display:flex;flex-direction:column;width:260px;flex-shrink:0;height:100vh;overflow-y:auto}
  .sb-logo{font-family:'thermal-variable',Georgia,serif;font-size:18px;font-weight:600;letter-spacing:0.02em;padding:22px 20px 16px;border-bottom:1px solid rgba(255,255,255,0.12);color:#fff;display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
  .sb-logo small{display:block;font-size:10px;color:rgba(255,255,255,0.45);font-weight:400;letter-spacing:0.05em;margin-top:2px}
  .sb-home-btn{display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:7px;background:rgba(255,255,255,0.08);flex-shrink:0;margin-top:1px}
  .sb-home-btn:hover{background:rgba(255,255,255,0.18)}
  .sb-home-btn svg{width:14px;height:14px;color:#fff}
  .sb-section{font-size:9.5px;font-weight:500;text-transform:uppercase;letter-spacing:0.13em;color:rgba(255,255,255,0.35);padding:13px 20px 4px}
  .sb-item{display:flex;align-items:center;gap:9px;padding:7px 14px 7px 20px;margin-right:10px;border-radius:0 7px 7px 0;font-size:13px;color:rgba(255,255,255,0.55);cursor:pointer;transition:all 0.15s;border-left:2px solid transparent}
  .sb-item:hover{background:rgba(255,255,255,0.08);color:#fff}
  .sb-item.active{background:rgba(241,183,192,0.15);color:#fff;font-weight:500;border-left:2px solid var(--pink)}
  .sb-item svg{width:13px;height:13px;flex-shrink:0;opacity:0.55}
  .sb-item.active svg,.sb-item:hover svg{opacity:1}
  .sb-item.sb-slim{font-size:12px;color:rgba(255,255,255,0.5);padding:8px 20px;border-radius:0;margin-right:0}
  .sb-item.sb-slim.sb-border{border-bottom:1px solid rgba(255,255,255,0.12)}
  .sb-accordion-header{cursor:pointer;display:flex;align-items:center;justify-content:space-between}
  .sb-accordion-header::after{content:'›';font-size:12px;color:rgba(255,255,255,0.3);transform:rotate(90deg);display:inline-block;transition:transform 0.15s}
  .sb-accordion-header.open::after{transform:rotate(270deg)}
  .sb-accordion-content{display:none}
  .sb-accordion-content.open{display:block}

  .library-content{min-width:0;flex:1;overflow-y:auto;height:100vh}
  .lib-topbar{padding:0 38px;border-bottom:1px solid var(--border)}
  .lib-page-eyebrow{font-size:10.5px;font-weight:500;text-transform:uppercase;letter-spacing:0.13em;color:#000;padding-top:22px;margin-bottom:5px}
  .lib-page-title{font-family:'thermal-variable',Georgia,serif;font-size:28px;font-weight:500;padding-bottom:18px}
  .theme-banner{background:var(--ink);color:var(--paper);padding:24px 38px;display:flex;align-items:center;justify-content:space-between;gap:30px}
  .theme-label{font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:0.14em;color:var(--muted);margin-bottom:5px}
  .theme-name{font-family:'thermal-variable',Georgia,serif;font-size:22px;font-style:italic;font-weight:400}
  .theme-desc{font-size:13.5px;color:#c8c4b8;line-height:1.6;max-width:420px;margin-top:5px}
  .theme-cta{flex-shrink:0;background:var(--pink);color:#000;border:none;padding:9px 18px;border-radius:7px;font-family:'thermal-variable',Georgia,serif;font-size:13px;font-weight:500;cursor:pointer;white-space:nowrap}
  .theme-cta:hover{opacity:0.85}
  .filters-bar{display:flex;align-items:center;gap:8px;padding:14px 38px;border-bottom:1px solid var(--border);flex-wrap:wrap}
  .filter-btn{font-size:12.5px;font-weight:500;padding:5px 14px;border-radius:20px;border:1px solid var(--border);background:none;color:var(--muted);cursor:pointer;font-family:'thermal-variable',Georgia,serif;transition:all 0.15s}
  .filter-btn:hover{border-color:var(--pinkborder);color:var(--ink)}
  .filter-btn.active{background:var(--ink);color:#fff;border-color:var(--ink)}
  .lib-search-wrap{position:relative;display:flex;align-items:center;gap:9px;background:var(--white);border:1px solid var(--border);border-radius:10px;padding:9px 16px;transition:border-color 0.15s;width:100%}
  .lib-search-wrap:focus-within{border-color:var(--pinkborder)}
  .lib-search-wrap svg{width:13px;height:13px;color:var(--muted);flex-shrink:0}
  .lib-search-input{border:none;outline:none;font-family:'thermal-variable',Georgia,serif;font-size:13.5px;color:var(--ink);background:transparent;width:100%}
  .lib-search-input::placeholder{color:var(--muted)}

  .library-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:20px;padding:28px 38px 48px}
  .lib-card{background:var(--white);border:1px solid var(--border);border-radius:11px;overflow:hidden;cursor:pointer;transition:border-color 0.15s,transform 0.15s;display:block}
  .lib-card:hover{border-color:var(--pinkborder);transform:translateY(-2px)}
  .card-thumb{width:100%;height:160px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}
  .thumb-essay{background:var(--cream)}
  .thumb-lines{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:24px 28px;gap:6px}
  .thumb-line{height:2px;background:var(--border);border-radius:1px}
  .thumb-line.dark{background:#c8c0a8}
  .new-badge{position:absolute;top:10px;right:10px;background:var(--pink);color:#000;font-size:9.5px;font-weight:500;padding:2px 8px;border-radius:20px}
  .card-body{padding:15px 17px 17px}
  .card-type{display:flex;align-items:center;gap:6px;font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:7px}
  .type-dot{width:5px;height:5px;border-radius:50%}
  .td-essay{background:var(--accent)}
  .tc-essay{color:#000}
  .card-title{font-family:'thermal-variable',Georgia,serif;font-size:16px;font-weight:500;line-height:1.35;margin-bottom:4px;color:var(--ink)}
  .card-author{font-size:12px;color:var(--muted);margin-bottom:11px}
  .card-note{font-size:12.5px;color:var(--muted);line-height:1.55;border-top:1px solid var(--border);padding-top:10px;font-style:italic;display:-webkit-box;-webkit-line-clamp:5;-webkit-box-orient:vertical;overflow:hidden}
  .lib-msg{padding:60px 38px;color:var(--muted);font-style:italic}

  /* ── Detail view ── */
  .lib-detail-wrap{width:100%;overflow-y:auto;height:100vh}
  .lib-detail-back{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--muted);cursor:pointer;background:none;border:none;font-family:'thermal-variable',Georgia,serif;padding:0}
  .lib-detail-back:hover{color:#000}
  .lib-detail-back svg{width:14px;height:14px}
  .lib-detail-hero{background:var(--ink);padding:48px 48px 40px;position:relative;overflow:hidden}
  .lib-detail-hero-bg{position:absolute;inset:0;background-size:cover;background-position:center;opacity:0.35}
  .lib-detail-hero-content{position:relative;z-index:1;max-width:1000px}
  .lib-eyebrow{display:flex;align-items:center;gap:8px;font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:0.12em;color:rgba(255,255,255,0.6);margin-bottom:11px}
  .lib-eyebrow-dot{width:5px;height:5px;border-radius:50%;background:var(--pink)}
  .theme-tag{display:inline-flex;align-items:center;gap:6px;background:rgba(241,183,192,0.2);color:var(--pink);font-size:10.5px;font-weight:500;padding:4px 12px;border-radius:20px;margin-bottom:16px}
  .lib-detail-title{font-family:'thermal-variable',Georgia,serif;font-size:38px;font-weight:500;line-height:1.15;margin-bottom:10px;color:#fff}
  .lib-detail-author{font-size:15px;color:rgba(255,255,255,0.6);margin-bottom:22px}
  .editorial-note{background:rgba(255,255,255,0.08);border-left:3px solid var(--pink);border-radius:0 9px 9px 0;padding:16px 20px;margin-bottom:4px}
  .editorial-label{font-size:9.5px;font-weight:500;text-transform:uppercase;letter-spacing:0.13em;color:rgba(255,255,255,0.5);margin-bottom:8px}
  .editorial-text{font-family:'thermal-variable',Georgia,serif;font-size:16px;font-style:italic;line-height:1.75;color:rgba(255,255,255,0.9)}
  .editorial-sig{font-size:12px;color:rgba(255,255,255,0.45);margin-top:10px}
  .detail-actions{display:flex;gap:8px;flex-wrap:wrap;padding:18px 48px 0}
  .btn-tab{background:none;color:var(--ink);border:1px solid var(--border);padding:10px 20px;border-radius:8px;font-family:'thermal-variable',Georgia,serif;font-size:13.5px;font-weight:500;cursor:pointer;transition:all 0.15s;display:flex;align-items:center;gap:7px}
  .btn-tab:hover{border-color:var(--pinkborder)}
  .btn-tab svg{width:14px;height:14px}
  .btn-tab.active{background:var(--ink);color:#fff;border-color:var(--ink)}
  .lib-detail-body{padding:14px 48px 60px}
  .content-area{background:var(--white);border:1px solid var(--border);border-radius:11px;overflow:hidden}
  .content-reader{padding:28px 32px;font-family:'thermal-variable',Georgia,serif;font-size:17px;line-height:1.9;color:var(--ink)}
  .content-reader p{margin-bottom:1.1em}
  .content-reader p:first-child::first-letter{font-size:3.2em;font-weight:600;float:left;line-height:0.75;padding:0.1em 0.12em 0 0;color:#000}
  .content-reader img{max-width:100%;height:auto;border-radius:6px}
  .content-footer{padding:16px 22px;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:#fdf1f4;gap:14px;flex-wrap:wrap}
  .content-footer-note{font-size:13.5px;color:var(--muted);font-style:italic}
  .read-full-btn{display:inline-block;background:#0a0a0a;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-family:'thermal-variable',Georgia,serif;font-size:13.5px;font-weight:500;cursor:pointer;text-decoration:none;white-space:nowrap}
  .read-full-btn:hover{opacity:0.9}
  .disc-prompt{background:var(--white);border:1px solid var(--border);border-radius:11px;overflow:hidden;margin-bottom:20px}
  .disc-prompt-label{font-size:14px;font-weight:600;color:var(--ink);padding:14px 15px;border-bottom:1px solid var(--border)}
  .disc-prompt-q{font-family:'thermal-variable',Georgia,serif;font-size:17px;line-height:1.6;color:var(--ink);padding:16px 15px 0;white-space:pre-line}
  .disc-join-btn{display:inline-block;background:var(--pink);color:#000;border:none;padding:8px 20px;border-radius:7px;font-family:'thermal-variable',Georgia,serif;font-size:13px;font-weight:500;cursor:pointer;margin:16px 15px}
  .disc-join-btn:hover{opacity:0.85}
  .lib-related-head{font-family:'thermal-variable',Georgia,serif;font-size:16px;font-style:italic;color:var(--muted);margin:8px 0 14px}
  .lib-related-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}
  .lib-related-card{border:1px solid var(--border);border-radius:10px;display:block;overflow:hidden;transition:border-color 0.15s}
  .lib-related-card:hover{border-color:var(--pinkborder)}
  .lib-related-thumb{width:100%;aspect-ratio:16/9;background:#f2ece4;overflow:hidden}
  .lib-related-thumb img{width:100%;height:100%;object-fit:cover;display:block}
  .lib-related-body{padding:14px 16px}
  .lib-related-type{font-size:10px;letter-spacing:0.09em;text-transform:uppercase;color:#9a7580;margin-bottom:6px}
  .lib-related-title{font-family:'thermal-variable',Georgia,serif;font-size:15px;font-weight:600;line-height:1.3;color:var(--ink)}

  @media (max-width:820px){
    .lib-shell{flex-direction:column;height:auto;overflow:visible}
    .sidebar{width:100%;height:auto}
    .library-content,.lib-detail-wrap{height:auto}
    .lib-topbar,.filters-bar,.library-grid{padding-left:18px;padding-right:18px}
    .lib-detail-hero,.detail-actions,.lib-detail-body{padding-left:18px;padding-right:18px}
    .theme-banner{padding:18px}
  }
`
