const NAV_LINKS = ["Work & Wealth", "Society & Culture", "World & Politics", "Perspectives & Identity"]

export default function SiteFooter() {
  return (
    <>
      <style>{`
        .site-footer { background: #ffffff; border-top: 1px solid #e5e7eb; padding: 48px 40px 32px; }
        .footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 40px; margin-bottom: 40px; }
        .footer-logo-row { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
        .footer-logo-mark { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; }
        .footer-logo-wordmark { height: 56px; object-fit: contain; margin-top: 8px; }
        .footer-tagline { font-size: 13px; line-height: 1.7; color: #555555; max-width: 240px; font-family: 'Source Serif 4', Georgia, serif; }
        .footer-col-title { font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: #000000; margin-bottom: 14px; font-weight: 500; font-family: 'Source Serif 4', Georgia, serif; }
        .footer-link { display: block; font-size: 13px; color: #374151; margin-bottom: 8px; transition: color 0.15s; text-decoration: none; font-family: 'Source Serif 4', Georgia, serif; }
        .footer-link:hover { color: #000000; }
        .footer-bottom { border-top: 1px solid #e5e7eb; padding-top: 22px; display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: #374151; background: #ffffff; font-family: 'Source Serif 4', Georgia, serif; }
        @media (max-width: 900px) {
          .footer-grid { grid-template-columns: 1fr 1fr; gap: 28px; }
        }
      `}</style>

      <footer className="site-footer">
        <div className="footer-grid">
          <div>
            <div className="footer-logo-row">
              <img src="https://res.cloudinary.com/dwytmbczs/image/upload/v1777313271/Copy_of_The_Parlour_200_x_200_px_q3d7jv.png" alt="" className="footer-logo-mark"/>
              <img src="https://res.cloudinary.com/dwytmbczs/image/upload/v1779376345/Heading_2560_x_1000_px_2600_x_1000_px_2650_x_1000_px_3_1_lxgvp5.png" alt="The Parlor" className="footer-logo-wordmark"/>
            </div>
            <p className="footer-tagline">Independent feminist journalism on the politics of everyday life — in print and online, by and for the people who live it.</p>
          </div>
          <div>
            <div className="footer-col-title">Sections</div>
            {NAV_LINKS.map(l => <a key={l} href="#" className="footer-link">{l}</a>)}
          </div>
          <div>
            <div className="footer-col-title">Magazine</div>
            {['About','Shop','Open Call','Writer Profiles','Archive'].map(l => <a key={l} href="#" className="footer-link">{l}</a>)}
          </div>
          <div>
            <div className="footer-col-title">Members</div>
            {['Become a member','Member dashboard','Reading Room','Events','Library'].map(l => <a key={l} href="#" className="footer-link">{l}</a>)}
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
    </>
  )
}
