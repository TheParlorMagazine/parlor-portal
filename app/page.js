'use client'

import { useState, useEffect, useRef } from 'react'

const ARTICLES = [
  { url: "https://www.theparlormagazine.com/post/no-prince-charming-required", cover: "https://static.wixstatic.com/media/d449e2_86ef5a85fd1c460c8d41fc9cbdc329fe~mv2.jpg", title: "No Prince Charming Required", excerpt: "Bernie Sinclair Wants Single Mothers to Find Their Village", category: "Society & Culture", authorName: "Lindsey Brock Morales", authorPhoto: "https://static.wixstatic.com/media/d449e2_4429ebf01f69467c94651fb7965fc374~mv2.png" },
  { url: "https://www.theparlormagazine.com/post/the-love-of-the-femme", cover: "https://static.wixstatic.com/media/d449e2_2bee4a5291224515b87957c6f7e07f99~mv2.jpg", title: "The Love of the Femme", excerpt: "Sophie Lewis on Femmephilia, Enemy Feminisms and the Politics of Care", category: "Society & Culture", authorName: "Lindsey Brock Morales", authorPhoto: "https://static.wixstatic.com/media/d449e2_4429ebf01f69467c94651fb7965fc374~mv2.png" },
  { url: "https://www.theparlormagazine.com/post/she-buys-because-she-cares", cover: "https://static.wixstatic.com/media/d449e2_04dbfba4169849f1b1a465677e58027e~mv2.jpg", title: "She Buys Because She Cares", excerpt: "How Sustainable Wellness Outsources the Climate Crisis to Women", category: "Society & Culture", authorName: "Jenna Stanco", authorPhoto: "https://static.wixstatic.com/media/d449e2_61e9ff246e1d443ea511e70d84313c53~mv2.jpg" },
  { url: "https://www.theparlormagazine.com/post/the-giving-tree-was-a-warning", cover: "https://static.wixstatic.com/media/d449e2_4a85ecb420f44c3fb8e18be9e312fdd3~mv2.jpg", title: "The Giving Tree Was a Warning", excerpt: "Kerry Docherty on selfishness, self-erasure, and why reclaiming yourself is never just about you", category: "Perspectives & Identity", authorName: "Elisa Shoenberger", authorPhoto: "https://static.wixstatic.com/media/d449e2_5dabfb78140444c5bd0fa162d8e13d39~mv2.png" },
  { url: "https://www.theparlormagazine.com/post/scorched-earth", cover: "https://static.wixstatic.com/media/d449e2_09b8282dc8f040f2bb69c1923b370e0f~mv2.jpg", title: "Scorched Earth", excerpt: "War, ecocide, and the generational environmental toll on Lebanon and Gaza", category: "World & Politics", authorName: "Varsha Yajman", authorPhoto: "https://static.wixstatic.com/media/d449e2_aa04ba2ce813468aa54d2a61e88f1c65~mv2.png" },
  { url: "https://www.theparlormagazine.com/post/cabo-rojo-no-se-vende", cover: "https://static.wixstatic.com/media/d449e2_86e9526579dd417bb6515a37b8ed82ff~mv2.jpg", title: "Cabo Rojo No Se Vende", excerpt: "The Fight to Save Boquerón from a $2 Billion Luxury Enclave", category: "World & Politics", authorName: "Iñaki Estivaliz", authorPhoto: "https://static.wixstatic.com/media/d449e2_a309996f99314a3daf6004f54697c83b~mv2.png" },
  { url: "https://www.theparlormagazine.com/post/building-damsel", cover: "https://static.wixstatic.com/media/d449e2_502cc0f3ca704277a1caa2f43e5f2ef2~mv2.jpg", title: "Building Damsel", excerpt: "Inside London's first women-only creative hub", category: "Work & Wealth", authorName: "Elizabeth Collins", authorPhoto: "https://static.wixstatic.com/media/d449e2_2db0e9bf1acb44ba838644538fee5899~mv2.png" },
  { url: "https://www.theparlormagazine.com/post/alarm-bells-no-one-heard", cover: "https://static.wixstatic.com/media/d449e2_ebd4cbe750854ced9656396a07a5c474~mv2.jpg", title: "Alarm Bells No One Heard", excerpt: "A Brown University custodian flagged the future shooter weeks before the attack.", category: "World & Politics", authorName: "Delina Haileab", authorPhoto: "https://static.wixstatic.com/media/d449e2_63bc24c845484526b40f1a2ec1a3c623~mv2.png" },
  { url: "https://www.theparlormagazine.com/post/occupied-minnesota-inside-the-resistance-to-operation-metro-surge", cover: "https://static.wixstatic.com/media/d449e2_389059f6b84b4c969fcdb5d08cab05a1~mv2.jpg", title: "Occupied Minnesota", excerpt: "How ordinary Minnesotans are protecting their neighbors from federal force", category: "World & Politics", authorName: "Delina Haileab", authorPhoto: "https://static.wixstatic.com/media/d449e2_63bc24c845484526b40f1a2ec1a3c623~mv2.png" },
]

const NAV_LINKS = ["Work & Wealth", "Society & Culture", "World & Politics", "Perspectives & Identity"]

const ABOUT_LINKS = [
  { label: "Our Mission", href: "/about/mission" },
  { label: "People of The Parlor", href: "/about/people" },
  { label: "Contact Us", href: "/contact" },
]

export default function HomePage() {
  const [ribbonCollapsed, setRibbonCollapsed] = useState(false)
  const [announceVisible, setAnnounceVisible] = useState(true)
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [visible, setVisible] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [memberOpen, setMemberOpen] = useState(false)
  const aboutRef = useRef(null)
  const memberRef = useRef(null)
  const visibleCards = 3
  const maxIndex = Math.max(0, ARTICLES.length - visibleCards)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e) {
      if (aboutRef.current && !aboutRef.current.contains(e.target)) setAboutOpen(false)
      if (memberRef.current && !memberRef.current.contains(e.target)) setMemberOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function scrollCarousel(dir) {
    setCarouselIndex(i => Math.min(Math.max(i + dir, 0), maxIndex))
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,700&family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;1,8..60,300&family=Alex+Brush&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --black: #0a0a0a;
          --pink: #f2b8c6;
          --pink-bg: #fce8ef;
          --white: #ffffff;
          --grey: #cccccc;
          --muted: #888888;
          --border: #222222;
          --card-border: #2a2a2a;
          --ribbon-bg: #f8d9dc;
        }
        html { scroll-behavior: smooth; }
        body { background: var(--black); color: var(--white); font-family: 'Source Serif 4', Georgia, serif; overflow-x: hidden; }
        a { text-decoration: none; color: inherit; }
        button { cursor: pointer; border: none; background: none; }

        /* ── ANNOUNCE BAR ── */
        .announce-bar {
          background: var(--black);
          border-bottom: 1px solid #1a1a1a;
          padding: 9px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          font-size: 13px;
          color: var(--grey);
        }
        .announce-bar strong { font-style: italic; font-family: 'Playfair Display', Georgia, serif; color: var(--white); }
        .announce-deadline { color: var(--pink); font-weight: 600; }
        .announce-cta {
          background: var(--pink); color: var(--black);
          padding: 6px 16px;
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 12px; font-weight: 700; letter-spacing: 0.03em;
          transition: background 0.15s; white-space: nowrap; flex-shrink: 0;
        }
        .announce-cta:hover { background: var(--white); }
        .announce-close { color: var(--muted); font-size: 20px; line-height: 1; padding: 0; background: none; border: none; cursor: pointer; flex-shrink: 0; }

        /* ── HEADER ── */
        .site-header { background: var(--white); position: sticky; top: 0; z-index: 100; border-bottom: 1px solid #e5e7eb; }
        .header-top { display: flex; align-items: center; justify-content: space-between; padding: 14px 40px; border-bottom: 1px solid #f0f0f0; }
        .header-side { display: flex; align-items: center; gap: 24px; flex: 1; }
        .header-side.right { justify-content: flex-end; }

        /* About dropdown */
        .about-wrap { position: relative; }
        .about-trigger {
          font-family: 'Source Serif 4', Georgia, serif;
          font-size: 14px; color: #374151;
          cursor: pointer; background: none; border: none;
          padding: 0; transition: color 0.15s;
          text-underline-offset: 3px;
        }
        .about-trigger:hover, .about-trigger.open { color: var(--black); text-decoration: underline; }
        .about-dropdown {
          display: none;
          position: absolute;
          top: calc(100% + 10px);
          left: 0;
          background: var(--white);
          border: 0.5px solid rgba(0,0,0,0.12);
          border-radius: 0;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          min-width: 180px;
          z-index: 200;
          overflow: hidden;
        }
        .about-dropdown.open { display: block; }
        .about-dropdown a {
          display: block;
          padding: 10px 18px;
          font-family: 'Source Serif 4', Georgia, serif;
          font-size: 13px; color: #374151;
          transition: background 0.12s, color 0.12s;
          border-bottom: 0.5px solid rgba(0,0,0,0.06);
        }
        .about-dropdown a:last-child { border-bottom: none; }
        .about-dropdown a:hover { background: #f7f6f4; color: var(--black); }

        /* Logo */
        .logo-wrap { display: flex; align-items: center; justify-content: center; flex-shrink: 0; gap: 0; }
        .logo-mark { width: 54px; height: 54px; border-radius: 50%; object-fit: cover; }
        .logo-text-img { height: 38px; object-fit: contain; }

        /* Member widget */
        .member-wrap { position: relative; }
        .member-trigger {
          display: flex; align-items: center; gap: 7px;
          cursor: pointer; background: none; border: none; padding: 0;
          user-select: none;
        }
        .member-avatar-sm {
          width: 36px; height: 36px; border-radius: 50%;
          background: #1a1a1a;
          border: 1.5px solid rgba(0,0,0,0.12);
          display: flex; align-items: center; justify-content: center;
          overflow: hidden; flex-shrink: 0;
        }
        .member-avatar-sm svg { width: 22px; height: 22px; }
        .member-chevron {
          width: 9px; height: 9px;
          border-right: 1.5px solid rgba(0,0,0,0.4);
          border-bottom: 1.5px solid rgba(0,0,0,0.4);
          transform: rotate(45deg) translateY(-2px);
          transition: transform 0.2s ease;
        }
        .member-chevron.open { transform: rotate(225deg) translateY(-2px); }
        .member-dropdown {
          display: none;
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          width: 200px;
          background: var(--white);
          border: 0.5px solid rgba(0,0,0,0.1);
          border-radius: 0;
          box-shadow: 0 4px 24px rgba(0,0,0,0.1);
          overflow: hidden;
          z-index: 200;
        }
        .member-dropdown.open { display: block; }
        .member-dropdown-item {
          display: flex; align-items: center; gap: 10px;
          padding: 11px 16px;
          font-family: 'Source Serif 4', Georgia, serif;
          font-size: 13px; color: #374151;
          cursor: pointer; transition: background 0.12s;
          border-bottom: 0.5px solid rgba(0,0,0,0.06);
          text-decoration: none;
        }
        .member-dropdown-item:last-child { border-bottom: none; }
        .member-dropdown-item:hover { background: #f7f6f4; color: var(--black); }
        .member-dropdown-item svg { width: 14px; height: 14px; opacity: 0.45; flex-shrink: 0; }
        .member-dropdown-item:hover svg { opacity: 1; }

        /* Cart */
        .cart-btn {
          position: relative; display: flex; align-items: center; justify-content: center;
          width: 36px; height: 36px; cursor: pointer; color: var(--black);
          background: none; border: none; padding: 0;
        }
        .cart-btn svg { width: 22px; height: 22px; }
        .cart-count {
          position: absolute; top: -2px; right: -4px;
          background: var(--black); color: var(--white);
          font-size: 9px; font-weight: 700;
          width: 16px; height: 16px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Source Serif 4', Georgia, serif;
        }

        /* Nav bottom */
        .header-bottom { background: var(--black); display: flex; align-items: center; justify-content: center; gap: 44px; padding: 11px 40px; }
        .header-section-link {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 14px; color: rgba(255,255,255,0.65);
          letter-spacing: 0.04em; transition: color 0.15s;
          position: relative; padding-bottom: 2px;
        }
        .header-section-link::after {
          content: ''; position: absolute;
          bottom: -2px; left: 0; right: 0;
          height: 1px; background: var(--pink);
          transform: scaleX(0); transition: transform 0.2s ease; transform-origin: left;
        }
        .header-section-link:hover { color: var(--white); }
        .header-section-link:hover::after { transform: scaleX(1); }

        /* ── DIGITAL ISSUE HERO ── */
        .digital-hero { background: var(--black); display: grid; grid-template-columns: 1fr 1fr; min-height: 580px; }
        .digital-hero-left {
          position: relative; overflow: hidden;
          display: flex; align-items: center; justify-content: center;
          background: var(--black); padding: 40px;
        }
        .digital-hero-left img {
          width: 100%; max-width: 460px; height: auto;
          object-fit: contain; display: block; border-radius: 50%;
          transition: transform 6s ease;
        }
        .digital-hero-left:hover img { transform: scale(1.02); }
        .digital-hero-right {
          padding: 56px 52px 48px 44px;
          display: flex; flex-direction: column; justify-content: center;
        }

        /* fade-in classes */
        .fi { opacity: 0; transform: translateY(14px); transition: opacity 0.65s ease, transform 0.65s ease; }
        .fi.in { opacity: 1; transform: translateY(0); }
        .fi-d1 { transition-delay: 0.1s; }
        .fi-d2 { transition-delay: 0.25s; }
        .fi-d3 { transition-delay: 0.4s; }
        .fi-d4 { transition-delay: 0.52s; }
        .fi-d5 { transition-delay: 0.62s; }
        .fi-d6 { transition-delay: 0.72s; }

        .digital-issue-label {
          font-family: 'Source Serif 4', Georgia, serif;
          font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase;
          color: var(--pink); margin-bottom: 18px;
        }
        .digital-hero-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(40px, 5vw, 64px); font-weight: 700;
          color: var(--white); line-height: 1.04; margin-bottom: 14px;
        }
        .digital-hero-subtitle {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 18px; font-style: italic;
          color: var(--muted); margin-bottom: 28px;
        }

        /* Read the Full Issue — centered, pink outline */
        .read-issue-wrap { display: flex; justify-content: center; margin-bottom: 28px; }
        .read-issue-btn {
          display: inline-flex; align-items: center; justify-content: center;
          padding: 13px 36px;
          border: 1px solid var(--pink);
          color: var(--white);
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 13px; font-weight: 600;
          letter-spacing: 0.1em; text-transform: uppercase;
          cursor: pointer; background: transparent;
          text-decoration: none; width: 100%; max-width: 340px;
          transition: background 0.2s, color 0.2s;
        }
        .read-issue-btn:hover { background: var(--pink); color: var(--black); }

        /* ── CHIPS — exact port of your original HTML/CSS ── */
        .chips-outer { width: 100%; }
        .or-label {
          font-family: 'Source Serif 4', Georgia, serif;
          font-size: 12px; font-style: italic;
          color: var(--white); text-align: center;
          letter-spacing: 0.04em; margin-bottom: 12px;
        }
        .chips-row { display: flex; gap: 10px; margin-bottom: 0; }
        .chips-row + .chips-row { margin-top: 10px; }
        .chips-row.top { align-items: flex-end; }
        .chips-row.bottom { align-items: flex-start; }
        .chips-row.center { justify-content: center; }
        .chip {
          flex: 1;
          background: #fce8ef;
          border: 1px solid #f2b8c6;
          padding: 8px 12px;
          cursor: pointer;
          display: flex; flex-direction: column; justify-content: space-between;
          text-decoration: none;
          transition: border-color 0.2s, background 0.2s;
          min-width: 0; min-height: 36px;
        }
        .chips-row.center .chip { flex: 0 0 calc(50% - 5px); }
        .chip:hover { border-color: #f2b8c6; background: #0a0a0a; }
        .chip-top { display: flex; flex-direction: column; gap: 0; }
        .chip-bottom {
          display: flex; justify-content: flex-end;
          margin-top: 6px; max-height: 0; overflow: hidden; opacity: 0;
          transition: max-height 0.25s ease, opacity 0.25s ease;
        }
        .chip:hover .chip-bottom { max-height: 24px; opacity: 1; }
        .chip-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 13px; font-weight: 600;
          color: #7a1f3d; line-height: 1.3;
          transition: color 0.2s;
        }
        .chip:hover .chip-title { color: #ffffff; }
        .chip-subtitle {
          font-family: 'Source Serif 4', Georgia, serif;
          font-size: 11px; font-style: italic;
          color: #f2b8c6; line-height: 1.4;
          max-height: 0; overflow: hidden; opacity: 0;
          transition: max-height 0.25s ease, opacity 0.25s ease;
        }
        .chip:hover .chip-subtitle { max-height: 40px; opacity: 1; }
        .chip-arrow { font-size: 12px; color: #f2b8c6; }

        /* ── PRINT HERO ── */
        .print-hero { background: var(--black); display: grid; grid-template-columns: 1fr 1fr; min-height: 540px; border-top: 1px solid var(--border); }
        .print-hero-left { position: relative; overflow: hidden; }
        .print-hero-left img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 8s ease; }
        .print-hero-left:hover img { transform: scale(1.03); }
        .look-inside-btn {
          position: absolute; bottom: 30%; right: 12%;
          background: var(--white); color: var(--black);
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 12px; font-weight: 700; padding: 10px 18px;
          letter-spacing: 0.04em; display: flex; align-items: center; gap: 8px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.4); transition: all 0.15s; border: none; cursor: pointer;
        }
        .look-inside-btn:hover { background: var(--black); color: var(--white); transform: scale(1.04); }
        .print-hero-right { padding: 56px 48px; display: flex; flex-direction: column; justify-content: center; }
        .print-eyebrow { font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--pink); margin-bottom: 18px; }
        .print-headline { font-family: 'Playfair Display', Georgia, serif; font-size: clamp(28px,3.2vw,38px); font-weight: 700; color: var(--white); line-height: 1.08; margin-bottom: 8px; }
        .print-headline em { font-style: italic; color: var(--pink); }
        .print-subhead { font-family: 'Playfair Display', Georgia, serif; font-size: 15px; font-style: italic; color: var(--muted); margin-bottom: 20px; }
        .print-body { font-size: 15px; line-height: 1.78; color: var(--grey); margin-bottom: 24px; max-width: 420px; }
        .gift-box { border: 1px solid var(--card-border); border-left: 3px solid var(--pink); padding: 14px 18px; margin-bottom: 24px; background: #111; }
        .gift-label { font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--pink); margin-bottom: 7px; }
        .gift-text { font-family: 'Playfair Display', Georgia, serif; font-size: 14px; font-style: italic; color: var(--white); line-height: 1.6; }
        .cta-stack { display: flex; flex-direction: column; gap: 10px; }
        .cta-primary { background: var(--pink); color: var(--black); border: none; padding: 13px 22px; font-family: 'Playfair Display', Georgia, serif; font-size: 14px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: space-between; letter-spacing: 0.02em; transition: background 0.15s; text-decoration: none; }
        .cta-primary:hover { background: var(--white); }
        .cta-price { font-family: 'Source Serif 4', Georgia, serif; font-size: 12px; font-weight: 400; opacity: 0.7; }
        .cta-secondary { background: transparent; color: var(--pink); border: 1px solid var(--pink); padding: 13px 22px; font-family: 'Playfair Display', Georgia, serif; font-size: 14px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: space-between; letter-spacing: 0.02em; transition: all 0.15s; text-decoration: none; }
        .cta-secondary:hover { background: var(--pink); color: var(--black); }
        .cta-note { font-size: 12px; color: var(--muted); font-style: italic; padding-left: 2px; }

        /* ── CAROUSEL ── */
        .carousel-section { background: var(--white); padding: 52px 0 44px; }
        .carousel-header { display: flex; align-items: baseline; justify-content: space-between; padding: 0 40px; margin-bottom: 26px; }
        .carousel-label { font-family: 'Playfair Display', Georgia, serif; font-size: 12px; font-weight: 400; letter-spacing: 0.2em; text-transform: uppercase; color: #374151; }
        .carousel-nav { display: flex; gap: 8px; }
        .carousel-nav-btn { width: 34px; height: 34px; border: 1px solid #e5e7eb; background: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 18px; color: #374151; transition: all 0.15s; }
        .carousel-nav-btn:hover:not(:disabled) { background: var(--black); border-color: var(--black); color: var(--white); }
        .carousel-nav-btn:disabled { opacity: 0.25; cursor: not-allowed; }
        .carousel-track-outer { overflow: hidden; padding: 0 40px; }
        .carousel-track { display: flex; gap: 20px; transition: transform 0.42s cubic-bezier(0.25,0.46,0.45,0.94); }
        .article-card { flex: 0 0 calc(33.333% - 14px); background: var(--white); border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.05); transition: transform 0.2s, box-shadow 0.2s; text-decoration: none; display: block; cursor: pointer; }
        .article-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.11); }
        .article-cover { width: 100%; aspect-ratio: 16/9; object-fit: cover; display: block; }
        .article-meta { padding: 13px 15px 15px; }
        .article-byline { display: flex; align-items: center; gap: 9px; margin-bottom: 7px; }
        .article-avatar { width: 26px; height: 26px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
        .article-author { font-size: 12px; color: #6b7280; font-weight: 500; }
        .article-category { font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: #9ca3af; margin-bottom: 5px; }
        .article-title { font-family: 'Playfair Display', Georgia, serif; font-size: 17px; font-weight: 600; color: #111827; line-height: 1.3; margin-bottom: 5px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .article-excerpt { font-size: 13px; line-height: 1.55; color: #4b5563; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

        /* ── COMPETITION ── */
        .competition { background: var(--black); padding: 72px 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: center; border-top: 1px solid var(--border); }
        .comp-eyebrow { font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--pink); margin-bottom: 18px; }
        .comp-title { font-family: 'Playfair Display', Georgia, serif; font-size: clamp(34px,3.5vw,46px); font-weight: 700; color: var(--white); line-height: 1.08; margin-bottom: 8px; }
        .comp-title em { font-style: italic; color: var(--pink); }
        .comp-subtitle { font-family: 'Playfair Display', Georgia, serif; font-size: 16px; font-style: italic; color: var(--muted); margin-bottom: 20px; }
        .comp-body { font-size: 15px; line-height: 1.78; color: var(--grey); max-width: 420px; }
        .comp-right { border-left: 1px solid var(--border); padding-left: 52px; }
        .deadline-label { font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--muted); margin-bottom: 10px; }
        .deadline-date { font-family: 'Playfair Display', Georgia, serif; font-size: 40px; font-weight: 700; color: var(--pink); margin-bottom: 26px; line-height: 1; }
        .cat-row { display: grid; grid-template-columns: 1fr 1fr 80px; align-items: center; padding: 12px 0; border-bottom: 1px solid #1e1e1e; }
        .cat-row:last-of-type { border-bottom: none; }
        .cat-name { font-family: 'Playfair Display', Georgia, serif; font-size: 15px; font-style: italic; color: var(--white); }
        .cat-prize { font-size: 13px; color: var(--pink); font-weight: 500; }
        .cat-fee { font-size: 12px; color: #666; }
        .comp-cta { display: block; background: var(--pink); color: var(--black); text-align: center; padding: 14px 32px; font-family: 'Playfair Display', Georgia, serif; font-size: 15px; font-weight: 700; letter-spacing: 0.02em; margin-top: 26px; transition: background 0.15s; text-decoration: none; }
        .comp-cta:hover { background: var(--white); }

        /* ── RIBBON ── */
        .ribbon { position: fixed; bottom: 0; left: 0; right: 0; z-index: 9999; background: var(--ribbon-bg); box-shadow: 0 -18px 40px rgba(0,0,0,0.22), 0 -6px 14px rgba(0,0,0,0.12); font-family: 'Source Serif 4', Georgia, serif; color: var(--black); }
        .ribbon-inner { max-width: 1280px; margin: 0 auto; padding: 14px 64px 14px 28px; display: grid; grid-template-columns: max-content 1fr max-content; align-items: center; gap: 14px; position: relative; }
        .ribbon-kicker { font-size: 14px; font-weight: 800; letter-spacing: 0.07em; text-transform: uppercase; line-height: 1.1; }
        .ribbon-subhead { font-family: 'Alex Brush', cursive; font-size: 24px; font-weight: 400; line-height: 1.2; margin-top: 2px; }
        .ribbon-message { font-size: 16px; line-height: 1.35; font-weight: 500; opacity: 0.9; text-align: center; max-width: 52ch; margin: 0 auto; }
        .ribbon-cta { display: inline-flex; align-items: center; justify-content: center; padding: 12px 28px; background: var(--black); color: var(--white); font-family: 'Playfair Display', Georgia, serif; font-size: 14px; font-weight: 700; text-decoration: none; min-width: 240px; transition: background 0.15s; white-space: nowrap; }
        .ribbon-cta:hover { background: #222; }
        .ribbon-toggle { position: absolute; right: 18px; top: 50%; transform: translateY(-50%); width: 36px; height: 36px; border-radius: 50%; background: rgba(0,0,0,0.1); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.15s; color: var(--black); }
        .ribbon-toggle:hover { background: rgba(0,0,0,0.18); }
        .ribbon-toggle svg { transition: transform 0.25s ease; }
        .ribbon-toggle.flipped svg { transform: rotate(180deg); }

        /* ── FOOTER ── */
        .site-footer { background: #050505; border-top: 1px solid var(--border); padding: 48px 40px 32px; }
        .footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 40px; margin-bottom: 40px; }
        .footer-logo-row { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
        .footer-logo-mark { width: 34px; height: 34px; border-radius: 50%; object-fit: cover; }
        .footer-logo-name { font-family: 'Playfair Display', Georgia, serif; font-size: 17px; font-style: italic; color: var(--white); }
        .footer-tagline { font-size: 13px; line-height: 1.7; color: var(--muted); max-width: 240px; }
        .footer-col-title { font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--pink); margin-bottom: 14px; font-weight: 500; }
        .footer-link { display: block; font-size: 13px; color: var(--muted); margin-bottom: 8px; transition: color 0.15s; }
        .footer-link:hover { color: var(--white); }
        .footer-bottom { border-top: 1px solid var(--border); padding-top: 22px; display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: #444; }

        /* ── RESPONSIVE ── */
        @media (max-width: 900px) {
          .digital-hero, .print-hero, .competition { grid-template-columns: 1fr; }
          .digital-hero-left { height: 320px; padding: 24px; }
          .digital-hero-right { padding: 36px 24px 40px; }
          .print-hero-left { height: 280px; }
          .print-hero-right { padding: 32px 24px; }
          .competition { padding: 48px 24px; gap: 32px; }
          .comp-right { border-left: none; padding-left: 0; border-top: 1px solid var(--border); padding-top: 32px; }
          .header-top { padding: 12px 20px; }
          .header-bottom { gap: 20px; padding: 10px 20px; overflow-x: auto; }
          .header-section-link { font-size: 12px; white-space: nowrap; }
          .footer-grid { grid-template-columns: 1fr 1fr; gap: 28px; }
          .article-card { flex: 0 0 calc(80% - 10px); }
          .ribbon-inner { grid-template-columns: 1fr auto; gap: 10px; padding: 12px 56px 12px 18px; }
          .ribbon-message { display: none; }
        }
      `}</style>

      {/* Announcement bar */}
      {announceVisible && (
        <div className="announce-bar">
          <span>
            <strong>The Parlor</strong> Issue 2 Open Call — Essays, Photo Essays & Cover Illustrations &nbsp;·&nbsp; Deadline <span className="announce-deadline">June 30</span>
          </span>
          <div style={{display:'flex',alignItems:'center',gap:'12px',flexShrink:0}}>
            <a href="https://www.theparlormagazine.com/open-call" className="announce-cta">Submit your work →</a>
            <button className="announce-close" onClick={() => setAnnounceVisible(false)}>×</button>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <header className="site-header">
        <div className="header-top">

          {/* Left: About dropdown + Shop */}
          <div className="header-side">
            <div className="about-wrap" ref={aboutRef}>
              <button
                className={`about-trigger${aboutOpen?' open':''}`}
                onClick={() => setAboutOpen(o => !o)}
              >
                About
              </button>
              <div className={`about-dropdown${aboutOpen?' open':''}`}>
                {ABOUT_LINKS.map(l => (
                  <a key={l.label} href={l.href}>{l.label}</a>
                ))}
              </div>
            </div>
            <a href="/shop" style={{fontFamily:"'Source Serif 4',Georgia,serif",fontSize:'14px',color:'#374151',transition:'color 0.15s'}}>Shop</a>
          </div>

          {/* Center: Logo */}
          <a href="/" className="logo-wrap">
            <img src="https://res.cloudinary.com/dwytmbczs/image/upload/v1777313271/Copy_of_The_Parlour_200_x_200_px_q3d7jv.png" alt="The Parlor mark" className="logo-mark" />
            <img src="https://res.cloudinary.com/dwytmbczs/image/upload/v1779376345/Heading_2560_x_1000_px_2600_x_1000_px_2650_x_1000_px_3_1_lxgvp5.png" alt="The Parlor" className="logo-text-img" />
          </a>

          {/* Right: Member widget + Cart */}
          <div className="header-side right">
            {/* Member avatar/dropdown */}
            <div className="member-wrap" ref={memberRef}>
              <button className="member-trigger" onClick={() => setMemberOpen(o => !o)}>
                <div className="member-avatar-sm">
                  {/* Logged-out anon silhouette — matches your Wix widget exactly */}
                  <svg viewBox="0 0 36 36" fill="none">
                    <circle cx="18" cy="13" r="6" fill="rgba(255,255,255,0.85)"/>
                    <path d="M4 32c0-8 6-13 14-13s14 5 14 13" fill="rgba(255,255,255,0.85)"/>
                  </svg>
                </div>
                <div className={`member-chevron${memberOpen?' open':''}`}></div>
              </button>
              <div className={`member-dropdown${memberOpen?' open':''}`}>
                <a href="/dashboard" className="member-dropdown-item">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 2h3a1 1 0 011 1v10a1 1 0 01-1 1h-3M7 11l3-3-3-3M10 8H3"/></svg>
                  Log in
                </a>
              </div>
            </div>

            {/* Cart */}
            <a href="/cart" className="cart-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 01-8 0"/>
              </svg>
              <span className="cart-count">0</span>
            </a>
          </div>
        </div>

        {/* Section nav */}
        <nav className="header-bottom">
          {NAV_LINKS.map(link => (
            <a key={link} href={`/${link.toLowerCase().replace(/ & /g,'-').replace(/ /g,'-')}`} className="header-section-link">{link}</a>
          ))}
        </nav>
      </header>

      {/* ── DIGITAL ISSUE HERO ── */}
      <section className="digital-hero">
        <div className="digital-hero-left">
          <img
            src="https://res.cloudinary.com/dwytmbczs/image/upload/v1779376889/The_Parlor_Magazine_2__edited_edited_2_h2pwhq.png"
            alt="Borderlands of Identity — Issue 01"
          />
        </div>
        <div className="digital-hero-right">
          <div className={`digital-issue-label fi fi-d1${visible?' in':''}`}>Our inaugural digital issue</div>
          <h1 className={`digital-hero-title fi fi-d2${visible?' in':''}`}>Borderlands<br/>of Identity</h1>
          <div className={`digital-hero-subtitle fi fi-d3${visible?' in':''}`}>Our inaugural digital issue</div>

          {/* Read the Full Issue — centered, pink outline */}
          <div className={`read-issue-wrap fi fi-d4${visible?' in':''}`}>
            <a href="https://www.theparlormagazine.com/issue-1" className="read-issue-btn">
              Read the Full Issue
            </a>
          </div>

          {/* Section chips — exact port of your original */}
          <div className={`chips-outer fi fi-d5${visible?' in':''}`}>
            <div className="or-label">or browse by section</div>
            <div>
              <div className="chips-row top">
                <a className="chip" href="#">
                  <div className="chip-top">
                    <span className="chip-title">Homecoming</span>
                    <span className="chip-subtitle">On language, culture, diaspora, and colonial memory</span>
                  </div>
                  <div className="chip-bottom"><span className="chip-arrow">→</span></div>
                </a>
                <a className="chip" href="#">
                  <div className="chip-top">
                    <span className="chip-title">The Borders of the Body</span>
                    <span className="chip-subtitle">Autonomy, intimacy, and the politics of embodiment</span>
                  </div>
                  <div className="chip-bottom"><span className="chip-arrow">→</span></div>
                </a>
              </div>
              <div className="chips-row bottom">
                <a className="chip" href="#">
                  <div className="chip-top">
                    <span className="chip-title">Beyond Binaries</span>
                    <span className="chip-subtitle">Gender, care, and control in the politics of visibility</span>
                  </div>
                  <div className="chip-bottom"><span className="chip-arrow">→</span></div>
                </a>
                <a className="chip" href="#">
                  <div className="chip-top">
                    <span className="chip-title">The Places Power Keeps</span>
                    <span className="chip-subtitle">On displacement and the memory of war</span>
                  </div>
                  <div className="chip-bottom"><span className="chip-arrow">→</span></div>
                </a>
              </div>
              <div className="chips-row center bottom">
                <a className="chip" href="#">
                  <div className="chip-top">
                    <span className="chip-title">On Holding and Letting Go</span>
                    <span className="chip-subtitle">On grief, rupture, and repair</span>
                  </div>
                  <div className="chip-bottom"><span className="chip-arrow">→</span></div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRINT HERO ── */}
      <section className="print-hero">
        <div className="print-hero-left">
          <img src="https://static.wixstatic.com/media/d449e2_a3ac09162eb348b1aa8ee177efe4594e~mv2.png" alt="The Parlor — Issue 1 print edition" />
          <button className="look-inside-btn"><span>◎</span> Look inside</button>
        </div>
        <div className="print-hero-right">
          <div className="print-eyebrow">Now in print</div>
          <h2 className="print-headline">Hold the conversation<br/>in <em>your hands.</em></h2>
          <div className="print-subhead">Borderlands of Identity — Issue 01</div>
          <p className="print-body">Our inaugural print issue is a beautifully produced magazine on displacement, diaspora, the body, gender non-conformity, family, and resistance. Original essays, illustrations, and photography — made to be read slowly and kept.</p>
          <div className="gift-box">
            <div className="gift-label">Inaugural subscriber gift</div>
            <div className="gift-text">Every new print subscriber receives a tote bag and bookmark featuring our cover art — exclusively for founding members.</div>
          </div>
          <div className="cta-stack">
            <a href="/plans" className="cta-primary">
              Subscribe to the print edition
              <span className="cta-price">$25 / month · quarterly issues</span>
            </a>
            <a href="https://www.peecho.com/print/en/2212054" target="_blank" rel="noopener noreferrer" className="cta-secondary">
              Buy a single copy
              <span style={{fontFamily:"'Source Serif 4',Georgia,serif",fontSize:'12px',fontWeight:400,opacity:0.8}}>$35 + shipping</span>
            </a>
            <p className="cta-note">Print subscribers receive every issue automatically.</p>
          </div>
        </div>
      </section>

      {/* ── ARTICLE CAROUSEL ── */}
      <section className="carousel-section">
        <div className="carousel-header">
          <div className="carousel-label">Latest from The Parlor</div>
          <div className="carousel-nav">
            <button className="carousel-nav-btn" onClick={() => scrollCarousel(-1)} disabled={carouselIndex===0} aria-label="Previous">‹</button>
            <button className="carousel-nav-btn" onClick={() => scrollCarousel(1)} disabled={carouselIndex>=maxIndex} aria-label="Next">›</button>
          </div>
        </div>
        <div className="carousel-track-outer">
          <div className="carousel-track" style={{transform:`translateX(calc(-${carouselIndex} * (33.333% + 7px)))`}}>
            {ARTICLES.map((a,i) => (
              <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="article-card">
                <img src={a.cover} alt={a.title} className="article-cover" loading={i<3?'eager':'lazy'}/>
                <div className="article-meta">
                  <div className="article-byline">
                    <img src={a.authorPhoto} alt={a.authorName} className="article-avatar"/>
                    <span className="article-author">{a.authorName}</span>
                  </div>
                  <div className="article-category">{a.category}</div>
                  <div className="article-title">{a.title}</div>
                  <div className="article-excerpt">{a.excerpt}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPETITION ── */}
      <section className="competition">
        <div>
          <div className="comp-eyebrow">Inaugural Print Competition — Issue 2</div>
          <h2 className="comp-title">Submit to<br/><em>The Parlor.</em><br/>Get published<br/>in print.</h2>
          <div className="comp-subtitle">The World We're Building</div>
          <p className="comp-body">We are accepting essays, photo essays, and cover illustrations for our second print issue. Selected work appears in a beautifully produced independent magazine read by a global community of thinkers, writers, and makers.</p>
        </div>
        <div className="comp-right">
          <div className="deadline-label">Submissions close</div>
          <div className="deadline-date">June 30</div>
          <div>
            {[{n:'Essay',p:'$250 prize',f:'$10 entry'},{n:'Photo Essay',p:'$500 prize',f:'$20 entry'},{n:'Cover Illustration',p:'$250 prize',f:'$10 entry'}].map(c=>(
              <div key={c.n} className="cat-row">
                <span className="cat-name">{c.n}</span>
                <span className="cat-prize">{c.p}</span>
                <span className="cat-fee">{c.f}</span>
              </div>
            ))}
          </div>
          <a href="https://www.theparlormagazine.com/open-call" className="comp-cta">Submit your work →</a>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="site-footer">
        <div className="footer-grid">
          <div>
            <div className="footer-logo-row">
              <img src="https://res.cloudinary.com/dwytmbczs/image/upload/v1777313271/Copy_of_The_Parlour_200_x_200_px_q3d7jv.png" alt="" className="footer-logo-mark"/>
              <span className="footer-logo-name">The Parlor</span>
            </div>
            <p className="footer-tagline">An independent magazine for thinkers, writers, and makers. Print + digital. Community-first.</p>
          </div>
          <div>
            <div className="footer-col-title">Sections</div>
            {NAV_LINKS.map(l=><a key={l} href="#" className="footer-link">{l}</a>)}
          </div>
          <div>
            <div className="footer-col-title">Magazine</div>
            {['About','Shop','Open Call','Writer Profiles','Archive'].map(l=><a key={l} href="#" className="footer-link">{l}</a>)}
          </div>
          <div>
            <div className="footer-col-title">Members</div>
            {['Become a member','Member dashboard','Reading Room','Events','Library'].map(l=><a key={l} href="#" className="footer-link">{l}</a>)}
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} The Parlor Magazine. All rights reserved.</span>
          <span style={{display:'flex',gap:'20px'}}>
            <a href="#" className="footer-link" style={{marginBottom:0}}>Privacy</a>
            <a href="#" className="footer-link" style={{marginBottom:0}}>Terms</a>
          </span>
        </div>
      </footer>

      {/* ── RIBBON ── */}
      <div className="ribbon">
        <div className="ribbon-inner">
          <div>
            <div className="ribbon-kicker">Our inaugural issue is live</div>
            <div className="ribbon-subhead">Join us as it unfolds</div>
          </div>
          <div className="ribbon-message">
            Sustain the work and receive full access, early releases, and subscriber-only extras.
          </div>
          <a href="/plans" className="ribbon-cta">Become a paid subscriber</a>
          <button
            className={`ribbon-toggle${ribbonCollapsed?' flipped':''}`}
            onClick={() => setRibbonCollapsed(c=>!c)}
            aria-label={ribbonCollapsed?'Expand':'Collapse'}
            style={ribbonCollapsed?{bottom:0}:{}}
          >
            <svg viewBox="0 0 24 14" width="18" height="11" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 2L12 12L22 2"/>
            </svg>
          </button>
        </div>
      </div>
      <div style={{height:'72px'}}/>
    </>
  )
}
