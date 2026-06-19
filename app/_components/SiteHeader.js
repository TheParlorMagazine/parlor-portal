'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '../../lib/supabase'

const NAV_LINKS = ["Work & Wealth", "Society & Culture", "World & Politics", "Perspectives & Identity"]
const ABOUT_LINKS = [
  { label: "Our Mission", href: "/about/mission" },
  { label: "People of The Parlor", href: "/about/people" },
  { label: "Contact Us", href: "/contact" },
]

export default function SiteHeader({ hideOnScroll = false, activeCategory = null }) {
  const [aboutOpen, setAboutOpen] = useState(false)
  const [memberOpen, setMemberOpen] = useState(false)
  const [member, setMember] = useState(null)
  const [hidden, setHidden] = useState(false)
  const aboutRef = useRef(null)
  const memberRef = useRef(null)
  const lastScrollY = useRef(0)
  const supabase = createClient()

  useEffect(() => {
    async function loadMember() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('members').select('role').eq('id', user.id).single()
      setMember({ ...user, role: data?.role ?? null })
    }
    loadMember()
  }, [])

  useEffect(() => {
    function handleClick(e) {
      if (aboutRef.current && !aboutRef.current.contains(e.target)) setAboutOpen(false)
      if (memberRef.current && !memberRef.current.contains(e.target)) setMemberOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (!hideOnScroll) return
    function onScroll() {
      const y = window.scrollY
      setHidden(y > lastScrollY.current && y > 80)
      lastScrollY.current = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [hideOnScroll])

  return (
    <>
      <style>{`
        :root {
          --sh-black: #0a0a0a;
          --sh-pink: #f2b8c6;
          --sh-white: #ffffff;
        }
        body { margin: 0; }
        .site-header {
          background: var(--sh-white);
          position: sticky;
          top: 0;
          z-index: 100;
          transition: transform 0.3s ease;
        }
        .site-header-hidden { transform: translateY(-100%); }
        .header-top { display: flex; align-items: center; justify-content: space-between; padding: 10px 40px; }
        .header-side { display: flex; align-items: center; gap: 40px; flex: 1; }
        .header-text-link {
          font-family: 'Source Serif 4', Georgia, serif;
          font-size: 18px; color: #374151;
          text-decoration: none; transition: color 0.15s;
          text-underline-offset: 3px;
        }
        .header-text-link:hover { color: var(--sh-black); text-decoration: underline; }
        .header-side.right { justify-content: flex-end; }
        .about-wrap { position: relative; }
        .about-trigger {
          font-family: 'Source Serif 4', Georgia, serif;
          font-size: 18px; color: #374151;
          cursor: pointer; background: none; border: none;
          padding: 0; transition: color 0.15s;
          text-underline-offset: 3px;
        }
        .about-trigger:hover, .about-trigger.open { color: var(--sh-black); text-decoration: underline; }
        .about-dropdown {
          display: none;
          position: absolute;
          top: calc(100% + 10px);
          left: 0;
          background: var(--sh-white);
          border: 0.5px solid rgba(0,0,0,0.12);
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
          text-decoration: none;
        }
        .about-dropdown a:last-child { border-bottom: none; }
        .about-dropdown a:hover { background: #f7f6f4; color: var(--sh-black); }
        .logo-wrap { display: flex; align-items: center; justify-content: center; flex-shrink: 0; gap: 8px; text-decoration: none; }
        .logo-mark { width: 96px; height: 96px; border-radius: 50%; object-fit: cover; }
        .logo-text-img { height: 124px; object-fit: contain; margin-top: 14px; }
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
          background: var(--sh-white);
          border: 0.5px solid rgba(0,0,0,0.1);
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
        .member-dropdown-item:hover { background: #f7f6f4; color: var(--sh-black); }
        .member-dropdown-item svg { width: 14px; height: 14px; opacity: 0.45; flex-shrink: 0; }
        .member-dropdown-item:hover svg { opacity: 1; }
        .cart-btn {
          position: relative; display: flex; align-items: center; justify-content: center;
          width: 36px; height: 36px; cursor: pointer; color: var(--sh-black);
          background: none; border: none; padding: 0;
          text-decoration: none;
        }
        .cart-btn svg { width: 22px; height: 22px; }
        .cart-count {
          position: absolute; top: -2px; right: -4px;
          background: var(--sh-black); color: var(--sh-white);
          font-size: 9px; font-weight: 700;
          width: 16px; height: 16px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Source Serif 4', Georgia, serif;
        }
        .header-bottom {
          background: var(--sh-black);
          display: flex; align-items: center; justify-content: center;
          gap: 48px; padding: 11px 40px;
          border-bottom: 1px solid rgba(255,255,255,0.18);
        }
        .header-section-link {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 20px; color: rgba(255,255,255,0.65);
          letter-spacing: 0.04em; transition: color 0.15s;
          position: relative; padding-bottom: 2px;
          text-decoration: none;
        }
        .header-section-link::after {
          content: ''; position: absolute;
          bottom: -2px; left: 0; right: 0;
          height: 1px; background: var(--sh-pink);
          transform: scaleX(0); transition: transform 0.2s ease; transform-origin: left;
        }
        .header-section-link:hover { color: var(--sh-white); }
        .header-section-link:hover::after { transform: scaleX(1); }
        .header-section-link.active { color: var(--sh-white); }
        .header-section-link.active::after { transform: scaleX(1); background: var(--sh-pink); }
        @media (max-width: 900px) {
          .header-top { padding: 12px 20px; }
          .header-bottom { gap: 20px; padding: 10px 20px; overflow-x: auto; }
          .header-section-link { font-size: 12px; white-space: nowrap; }
        }
      `}</style>

      <header className={`site-header${hidden ? ' site-header-hidden' : ''}`}>
        <div className="header-top">

          <div className="header-side">
            <div className="about-wrap" ref={aboutRef}>
              <button
                className={`about-trigger${aboutOpen ? ' open' : ''}`}
                onClick={() => setAboutOpen(o => !o)}
              >
                About
              </button>
              <div className={`about-dropdown${aboutOpen ? ' open' : ''}`}>
                {ABOUT_LINKS.map(l => (
                  <a key={l.label} href={l.href}>{l.label}</a>
                ))}
              </div>
            </div>
            <a href="/shop" className="header-text-link">Shop</a>
          </div>

          <a href="/" className="logo-wrap">
            <img src="https://res.cloudinary.com/dwytmbczs/image/upload/v1777313271/Copy_of_The_Parlour_200_x_200_px_q3d7jv.png" alt="The Parlor mark" className="logo-mark" />
            <img src="https://res.cloudinary.com/dwytmbczs/image/upload/v1779376345/Heading_2560_x_1000_px_2600_x_1000_px_2650_x_1000_px_3_1_lxgvp5.png" alt="The Parlor" className="logo-text-img" />
          </a>

          <div className="header-side right">
            <div className="member-wrap" ref={memberRef}>
              <button className="member-trigger" onClick={() => setMemberOpen(o => !o)}>
                <div className="member-avatar-sm">
                  <svg viewBox="0 0 36 36" fill="none">
                    <circle cx="18" cy="13" r="6" fill="rgba(255,255,255,0.85)"/>
                    <path d="M4 32c0-8 6-13 14-13s14 5 14 13" fill="rgba(255,255,255,0.85)"/>
                  </svg>
                </div>
                <div className={`member-chevron${memberOpen ? ' open' : ''}`}></div>
              </button>
              <div className={`member-dropdown${memberOpen ? ' open' : ''}`}>
                {member ? (
                  <>
                    <a href="/dashboard" className="member-dropdown-item">
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="5" height="5" rx="0.5"/><rect x="9" y="2" width="5" height="5" rx="0.5"/><rect x="2" y="9" width="5" height="5" rx="0.5"/><rect x="9" y="9" width="5" height="5" rx="0.5"/></svg>
                      Member Portal
                    </a>
                    <a href="/account/subscriptions" className="member-dropdown-item">
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4h12M2 8h8M2 12h10"/></svg>
                      My subscriptions
                    </a>
                    <a href="/account/wishlist" className="member-dropdown-item">
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 13.5S2 9.5 2 5.5A3.5 3.5 0 018 3a3.5 3.5 0 016 2c0 4-6 8.5-6 8.5z"/></svg>
                      Wishlist
                    </a>
                    <a href="/account/orders" className="member-dropdown-item">
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 2h2l2 7h6l2-5H5"/><circle cx="7" cy="13" r="1"/><circle cx="12" cy="13" r="1"/></svg>
                      My orders
                    </a>
                    <a href="/account/settings" className="member-dropdown-item">
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="2.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"/></svg>
                      Account settings
                    </a>
                    {member.role === 'admin' && (
                      <a href="/admin" className="member-dropdown-item">
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 2l1.5 3h3l-2.5 2 1 3L8 8.5 5 10l1-3L3.5 5h3z"/></svg>
                        Admin Dashboard
                      </a>
                    )}
                    <a href="/logout" className="member-dropdown-item">
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 2h3a1 1 0 011 1v10a1 1 0 01-1 1h-3M7 11l3-3-3-3M10 8H3"/></svg>
                      Log out
                    </a>
                  </>
                ) : (
                  <a href="/login" className="member-dropdown-item">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 2h3a1 1 0 011 1v10a1 1 0 01-1 1h-3M7 11l3-3-3-3M10 8H3"/></svg>
                    Log in
                  </a>
                )}
              </div>
            </div>

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

        <nav className="header-bottom">
          <a href="/" className="header-section-link">Home</a>
          {NAV_LINKS.map(link => {
            const isActive = activeCategory &&
              activeCategory.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-') ===
              link.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')
            return (
              <a
                key={link}
                href={`/${link.toLowerCase().replace(/ & /g,'-').replace(/ /g,'-')}`}
                className={`header-section-link${isActive ? ' active' : ''}`}
              >
                {link}
              </a>
            )
          })}
        </nav>
      </header>
    </>
  )
}
