const SECTION_LINKS = [
  ['Work & Wealth', '/work-wealth'],
  ['Society & Culture', '/society-culture'],
  ['World & Politics', '/world-politics'],
  ['Perspectives & Identity', '/perspectives-identity'],
]
const MAGAZINE_LINKS = [['About', '/about/mission'], ['Shop', '/shop'], ['Donate', '/donate'], ['People of The Parlor', '/about/people'], ['Archive', '/portal/library']]
const MEMBER_LINKS = [['Become a member', '/plans'], ['Member dashboard', '/portal'], ['Reading Room', '/portal/reading-room'], ['Events', '/portal/events'], ['Library', '/portal/library']]

export default function SiteFooter() {
  return (
    <>
      <style>{`
        .site-footer { background: #ffffff; border-top: 1px solid #e5e7eb; padding: 48px 40px 96px; }
        .footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 40px; margin-bottom: 40px; }
        .footer-logo-row { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
        .footer-logo-mark { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; }
        .footer-logo-wordmark { height: 56px; object-fit: contain; margin-top: 8px; }
        .footer-tagline { font-size: 13px; line-height: 1.7; color: #555555; max-width: 240px; font-family: 'Source Serif 4', Georgia, serif; }
        .footer-col-title { font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: #000000; margin-bottom: 14px; font-weight: 500; font-family: 'Source Serif 4', Georgia, serif; }
        .footer-link { display: block; font-size: 13px; color: #374151; margin-bottom: 8px; transition: color 0.15s; text-decoration: none; font-family: 'Source Serif 4', Georgia, serif; }
        .footer-link:hover { color: #000000; }
        .footer-bottom { border-top: 1px solid #e5e7eb; padding-top: 22px; display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: #374151; background: #ffffff; font-family: 'Source Serif 4', Georgia, serif; }
        @media (max-width: 599px) {
          .site-footer {
            padding: 36px 20px 80px;
          }

          .footer-grid {
            grid-template-columns: minmax(0, 1fr);
            gap: 28px;
          }

          .footer-grid > * {
            min-width: 0;
            width: 100%;
          }

          .footer-tagline {
            max-width: 100%;
          }

          .footer-bottom {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
        }
      `}</style>

      <footer className="site-footer">
        <div className="footer-grid">
          <div>
            <a href="/" aria-label="The Parlor home" className="footer-logo-row">
              <img src="https://res.cloudinary.com/dwytmbczs/image/upload/v1777313271/Copy_of_The_Parlour_200_x_200_px_q3d7jv.png" alt="" className="footer-logo-mark"/>
              <img src="https://res.cloudinary.com/dwytmbczs/image/upload/v1779376345/Heading_2560_x_1000_px_2600_x_1000_px_2650_x_1000_px_3_1_lxgvp5.png" alt="The Parlor" className="footer-logo-wordmark"/>
            </a>
            <p className="footer-tagline">Independent feminist journalism on the politics of everyday life — in print and online, by and for the people who live it.</p>
          </div>
          <div>
            <div className="footer-col-title">Sections</div>
            {SECTION_LINKS.map(([label, href]) => <a key={label} href={href} className="footer-link">{label}</a>)}
          </div>
          <div>
            <div className="footer-col-title">Magazine</div>
            {MAGAZINE_LINKS.map(([label, href]) => <a key={label} href={href} className="footer-link">{label}</a>)}
          </div>
          <div>
            <div className="footer-col-title">Members</div>
            {MEMBER_LINKS.map(([label, href]) => <a key={label} href={href} className="footer-link">{label}</a>)}
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} The Parlor Magazine. All rights reserved.</span>
          <span style={{display:'flex',gap:'20px'}}>
            <a href="/privacy" className="footer-link" style={{marginBottom:0}}>Privacy</a>
            <a href="/terms" className="footer-link" style={{marginBottom:0}}>Terms</a>
          </span>
        </div>
      </footer>
    </>
  )
}
