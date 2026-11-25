import SiteHeader from '../_components/SiteHeader'
import SiteFooter from '../_components/SiteFooter'
import PublishedFilmClub from '../portal/film-club/PublishedFilmClub'
export const metadata={title:'The Parlor Film Club',description:'Documentary screenings and conversations from The Parlor.'}
export default function FilmClubPublicPage(){return <><SiteHeader/><main style={{padding:'32px 20px',background:'#fff',color:'#0a0a0a','--ink':'#0a0a0a','--border':'#e8d4d8','--cream':'#fcf7f8','--muted':'#666'}}><PublishedFilmClub publicView/></main><SiteFooter/></>}
