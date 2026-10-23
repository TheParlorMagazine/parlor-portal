import SiteHeader from './SiteHeader'
import SiteFooter from './SiteFooter'

export const POLICY_CONTACT = 'lindsey@theparlormagazine.com'
export function PolicyContact() { return <a href={`mailto:${POLICY_CONTACT}`}>{POLICY_CONTACT}</a> }

export default function LegalPage({ title, intro, sections }) {
  return <>
    <SiteHeader />
    <main className="legal-page">
      <header className="legal-heading">
        <p className="legal-kicker">The Parlor · Policies</p>
        <h1>{title}</h1>
        <p className="legal-date">Last updated <time dateTime="2026-10-23">23 October 2026</time></p>
        <p className="legal-draft">Draft for review before publication.</p>
        <p className="legal-intro">{intro}</p>
      </header>
      <div className="legal-layout">
        <nav className="legal-toc" aria-label={`${title} contents`}><h2>On this page</h2>{sections.map(section => <a key={section.id} href={`#${section.id}`}>{section.title}</a>)}</nav>
        <div className="legal-content">{sections.map(section => <section key={section.id} id={section.id} aria-labelledby={`${section.id}-heading`}><h2 id={`${section.id}-heading`}>{section.title}</h2>{section.body}</section>)}</div>
      </div>
    </main>
    <SiteFooter />
    <style>{`
      .legal-page{max-width:1100px;margin:0 auto;padding:54px 32px 80px;color:#242024;font:16px/1.8 'Source Serif 4',Georgia,serif}
      .legal-kicker{color:#9b3657;text-transform:uppercase;letter-spacing:.14em;font-size:11px;font-weight:700}
      .legal-heading{max-width:780px;margin-bottom:38px}.legal-heading h1{font:500 clamp(34px,5vw,54px)/1.15 'Playfair Display',Georgia,serif;margin:12px 0 16px}
      .legal-date{font-size:13px;color:#71676c}.legal-draft{display:inline-block;background:#fff1f5;border:1px solid #f0c7d3;border-radius:8px;padding:8px 14px;font-size:13px;color:#7b304d}
      .legal-intro{font-size:18px;line-height:1.7}.legal-layout{display:grid;grid-template-columns:220px minmax(0,1fr);gap:48px;align-items:start}
      .legal-toc{position:sticky;top:24px;border-left:2px solid #f0c7d3;padding-left:18px}.legal-toc h2{font-size:14px;margin:0 0 10px}.legal-toc a{display:block;font-size:13px;line-height:1.5;margin-bottom:9px;color:#6c3d4e;text-decoration:none}
      .legal-content section{scroll-margin-top:32px;margin-bottom:32px}.legal-content h2{font:500 24px/1.35 'Playfair Display',Georgia,serif;margin:0 0 12px}.legal-content p{margin:0 0 14px}.legal-content ul{padding-left:22px}.legal-content li{margin-bottom:8px}.legal-content a{color:#8f3151;text-decoration:underline;text-underline-offset:3px;overflow-wrap:anywhere}
      @media(max-width:700px){.legal-page{padding:32px 20px 54px}.legal-layout{grid-template-columns:1fr;gap:28px}.legal-toc{position:static}.legal-intro{font-size:16px}}
    `}</style>
  </>
}
