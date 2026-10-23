'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { createClient } from '../lib/supabase'
import { useCart } from '../lib/useCart'
import { useUnreadNotifications } from '../lib/useUnreadNotifications'
import { openCart, openWishlist } from '../lib/cartUI'

const FIRST_EAGER = 5
const LOOKAHEAD = 3

const ARTICLES = [
  { url: "https://www.theparlormagazine.com/post/no-prince-charming-required", cover: "https://static.wixstatic.com/media/d449e2_86ef5a85fd1c460c8d41fc9cbdc329fe~mv2.jpg", title: "No Prince Charming Required", excerpt: "Bernie Sinclair Wants Single Mothers to Find Their Village", category: "Society & Culture", authorName: "Lindsey Brock Morales", authorPhoto: "https://static.wixstatic.com/media/d449e2_4429ebf01f69467c94651fb7965fc374~mv2.png", authorProfile: "https://www.theparlormagazine.com/writer-profiles/lindsey-brock-morales", date: "May 06, 2026" },
  { url: "https://www.theparlormagazine.com/post/the-love-of-the-femme", cover: "https://static.wixstatic.com/media/d449e2_2bee4a5291224515b87957c6f7e07f99~mv2.jpg", title: "The Love of the Femme", excerpt: "Sophie Lewis on Femmephilia, Enemy Feminisms and the Politics of Care", category: "Society & Culture", authorName: "Lindsey Brock Morales", authorPhoto: "https://static.wixstatic.com/media/d449e2_4429ebf01f69467c94651fb7965fc374~mv2.png", authorProfile: "https://www.theparlormagazine.com/writer-profiles/lindsey-brock-morales", date: "May 06, 2026" },
  { url: "https://www.theparlormagazine.com/post/she-buys-because-she-cares", cover: "https://static.wixstatic.com/media/d449e2_04dbfba4169849f1b1a465677e58027e~mv2.jpg", title: "She Buys Because She Cares", excerpt: "How Sustainable Wellness Outsources the Climate Crisis to Women", category: "Society & Culture", authorName: "Jenna Stanco", authorPhoto: "https://static.wixstatic.com/media/d449e2_61e9ff246e1d443ea511e70d84313c53~mv2.jpg", authorProfile: "https://www.theparlormagazine.com/writer-profiles/jenna-stanco", date: "Apr 22, 2026" },
  { url: "https://www.theparlormagazine.com/post/the-giving-tree-was-a-warning", cover: "https://static.wixstatic.com/media/d449e2_4a85ecb420f44c3fb8e18be9e312fdd3~mv2.jpg", title: "The Giving Tree Was a Warning", excerpt: "Kerry Docherty on selfishness, self-erasure, and why reclaiming yourself is never just about you", category: "Perspectives & Identity", authorName: "Elisa Shoenberger", authorPhoto: "https://static.wixstatic.com/media/d449e2_5dabfb78140444c5bd0fa162d8e13d39~mv2.png", authorProfile: "https://www.theparlormagazine.com/writer-profiles/elisa-shoenberger", date: "Apr 28, 2026" },
  { url: "https://www.theparlormagazine.com/post/engaging-men-centering-survivors", cover: "https://static.wixstatic.com/media/d449e2_3d7f397f9d7e4e718e5bb49775ec2a60~mv2.jpg", title: "Engaging Men, Centering Survivors", excerpt: "How advocates are shifting sexual assault prevention from crisis response to cultural change", category: "Society & Culture", authorName: "Jessica Shih", authorPhoto: "https://static.wixstatic.com/media/d449e2_822b4d028a644fe19d29e71776063d90~mv2.png", authorProfile: "https://www.theparlormagazine.com/writer-profiles/jessica-shih", date: "Apr 28, 2026" },
  { url: "https://www.theparlormagazine.com/post/scorched-earth", cover: "https://static.wixstatic.com/media/d449e2_09b8282dc8f040f2bb69c1923b370e0f~mv2.jpg", title: "Scorched Earth", excerpt: "War, ecocide, and the generational environmental toll on Lebanon and Gaza", category: "World & Politics", authorName: "Varsha Yajman", authorPhoto: "https://static.wixstatic.com/media/d449e2_aa04ba2ce813468aa54d2a61e88f1c65~mv2.png", authorProfile: "https://www.theparlormagazine.com/writer-profiles/varsha-yajman", date: "Apr 28, 2026" },
  { url: "https://www.theparlormagazine.com/post/cabo-rojo-no-se-vende", cover: "https://static.wixstatic.com/media/d449e2_86e9526579dd417bb6515a37b8ed82ff~mv2.jpg", title: "Cabo Rojo No Se Vende", excerpt: "The Fight to Save Boquerón from a $2 Billion Luxury Enclave", category: "World & Politics", authorName: "Iñaki Estivaliz", authorPhoto: "https://static.wixstatic.com/media/d449e2_a309996f99314a3daf6004f54697c83b~mv2.png", authorProfile: "https://www.theparlormagazine.com/writer-profiles/inaki-estivaliz", date: "Apr 23, 2026" },
  { url: "https://www.theparlormagazine.com/post/building-damsel", cover: "https://static.wixstatic.com/media/d449e2_502cc0f3ca704277a1caa2f43e5f2ef2~mv2.jpg", title: "Building Damsel", excerpt: "Inside London's first women-only creative hub—and the model reshaping who gets space, funding, and power", category: "Work & Wealth", authorName: "Elizabeth Collins", authorPhoto: "https://static.wixstatic.com/media/d449e2_2db0e9bf1acb44ba838644538fee5899~mv2.png", authorProfile: "https://www.theparlormagazine.com/writer-profiles/elizabeth-collins", date: "Apr 12, 2026" },
  { url: "https://www.theparlormagazine.com/post/following-the-foodways", cover: "https://static.wixstatic.com/media/d449e2_ef2522e7041f4c6ba53bfe7b02255c49~mv2.jpg", title: "Following the Foodways", excerpt: "Josmine Evans on Culture, Community, and the Sacred Work of Seasoning", category: "Work & Wealth", authorName: "Elisa Shoenberger", authorPhoto: "https://static.wixstatic.com/media/d449e2_61fd112360f2462d80b67a0a6121a703~mv2.png", authorProfile: "https://www.theparlormagazine.com/writer-profiles/elisa-shoenberger", date: "Apr 1, 2026" },
  { url: "https://www.theparlormagazine.com/post/the-cost-of-control-eating-disorders-in-elite-sport", cover: "https://static.wixstatic.com/media/d449e2_62823931bd634433b017e09d54a6f9d8~mv2.jpg", title: "The Cost of Control: Eating Disorders in Elite Sport", excerpt: "When performance demands push bodies beyond their limits", category: "Society & Culture", authorName: "Varsha Yajman", authorPhoto: "https://static.wixstatic.com/media/d449e2_aa04ba2ce813468aa54d2a61e88f1c65~mv2.png", authorProfile: "https://www.theparlormagazine.com/writer-profiles/varsha-yajman", date: "Apr 1, 2026" },
  { url: "https://www.theparlormagazine.com/post/clinically-practicing-and-the-sacrifice-of-not-getting-some", cover: "https://static.wixstatic.com/media/d449e2_703b55d0110145078deff977545c5f91~mv2.png", title: "Clinically Practicing, and The Sacrifice of (Not) Getting Some", excerpt: "The Local Conflicts of a Sex Therapy Clinician", category: "Perspectives & Identity", authorName: "Dr. Shanéa Thomas", authorPhoto: "https://static.wixstatic.com/media/d449e2_a0984fbd008d48a8b27d2f0003e5a6a8~mv2.png", authorProfile: "https://www.theparlormagazine.com/writer-profiles/dr.-shanéa-thomas", date: "Apr 1, 2026" },
  { url: "https://www.theparlormagazine.com/post/women-at-the-frontlines-of-the-future", cover: "https://static.wixstatic.com/media/d449e2_501777236e4346c8958cf6ef7cdf555a~mv2.jpg", title: "Women at the Frontlines of the Future", excerpt: "Osprey Orielle Lake on dismantling extractive systems and building a relational future", category: "World & Politics", authorName: "Lindsey Brock Morales", authorPhoto: "https://static.wixstatic.com/media/d449e2_233868723e1041a7876aa16f8d469047~mv2.png", authorProfile: "https://www.theparlormagazine.com/writer-profiles/lindsey-brock-morales", date: "Apr 12, 2026" },
  { url: "https://www.theparlormagazine.com/post/the-distance-of-war", cover: "https://static.wixstatic.com/media/d449e2_b8065db377f940d5a619e0866d8301d7~mv2.jpg", title: "The Distance of War", excerpt: "Rethinking Conflict Fatigue in an Age of Endless Bombardment", category: "World & Politics", authorName: "Luqmaan Zeerak", authorPhoto: "https://static.wixstatic.com/media/d449e2_c2f84ded6a884facb7032e3fda9bf525~mv2.png", authorProfile: "https://www.theparlormagazine.com/writer-profiles/luqmaan-zeerak", date: "Apr 12, 2026" },
  { url: "https://www.theparlormagazine.com/post/eating-being-eaten-meaning-in-the-age-of-excess", cover: "https://static.wixstatic.com/media/d449e2_e02ca5587cc24d33a7d8b50e11d11bb6~mv2.jpg", title: "Eating & Being Eaten: Meaning in the Age of Excess", excerpt: "On the Things We Keep and the Stories We Tell About Ourselves", category: "Perspectives & Identity", authorName: "Mackenzie Miller", authorPhoto: "https://static.wixstatic.com/media/d449e2_3eb3ea756081423db0f0943d6a0526d3~mv2.png", authorProfile: "https://www.theparlormagazine.com/writer-profiles/mackenzie-miller", date: "Mar 18, 2026" },
  { url: "https://www.theparlormagazine.com/post/occupied-minnesota-inside-the-resistance-to-operation-metro-surge", cover: "https://static.wixstatic.com/media/d449e2_389059f6b84b4c969fcdb5d08cab05a1~mv2.jpg", title: "Occupied Minnesota: Inside the Resistance to Operation Metro Surge", excerpt: "How ordinary Minnesotans are protecting their neighbors from federal force", category: "World & Politics", authorName: "Delina Haileab", authorPhoto: "https://static.wixstatic.com/media/d449e2_63bc24c845484526b40f1a2ec1a3c623~mv2.png", authorProfile: "https://www.theparlormagazine.com/writer-profiles/delina-haileab", date: "Mar 19, 2026" },
  { url: "https://www.theparlormagazine.com/post/asterix-in-adjuntas-power-story-resistance", cover: "https://static.wixstatic.com/media/d449e2_5ce567debe6144db82ee0d4ae536f4b9~mv2.jpg", title: "Asterix in Adjuntas: Power, Story, Resistance", excerpt: "Energy Sovereignty and Communities United Against ICE in Puerto Rico", category: "World & Politics", authorName: "Iñaki Estivaliz", authorPhoto: "https://static.wixstatic.com/media/d449e2_a309996f99314a3daf6004f54697c83b~mv2.png", authorProfile: "https://www.theparlormagazine.com/writer-profiles/inaki-estivaliz", date: "Mar 25, 2026" },
  { url: "https://www.theparlormagazine.com/post/from-abstraction-to-humanity", cover: "https://static.wixstatic.com/media/d449e2_150168c338cb4ac5ba2ca0508d1b68e8~mv2.png", title: '"From Abstraction to Humanity"', excerpt: "Reading Persepolis in a Time of War", category: "Society & Culture", authorName: "Claudia Jobi", authorPhoto: "https://static.wixstatic.com/media/d449e2_ee81ab5330fc4551bc78111badb62f94~mv2.png", authorProfile: "https://www.theparlormagazine.com/writer-profiles/claudia-jobi", date: "Mar 26, 2026" },
  { url: "https://www.theparlormagazine.com/post/miles-mountains-and-blood-sugar", cover: "https://static.wixstatic.com/media/d449e2_f8a60c2c8880422dbc11522607473a7b~mv2.jpg", title: "Miles, Mountains and Blood Sugar", excerpt: "Off-Road Ultra-Cyclist Stephanie Hall Tackles Rough Terrain and Diabetes", category: "Perspectives & Identity", authorName: "Elisa Shoenberger", authorPhoto: "https://static.wixstatic.com/media/d449e2_5dabfb78140444c5bd0fa162d8e13d39~mv2.png", authorProfile: "https://www.theparlormagazine.com/writer-profiles/elisa-shoenberger", date: "Mar 7, 2026" },
  { url: "https://www.theparlormagazine.com/post/building-a-bigger-table", cover: "https://static.wixstatic.com/media/d449e2_27540f1f218e46d08f50ffc07942ad67~mv2.jpg", title: "Building a Bigger Table", excerpt: "Fran Ayala-Rock on Feminist Comedy, Rage and Community", category: "Perspectives & Identity", authorName: "Lindsey Brock Morales", authorPhoto: "https://static.wixstatic.com/media/d449e2_4429ebf01f69467c94651fb7965fc374~mv2.png", authorProfile: "https://www.theparlormagazine.com/writer-profiles/lindsey-brock-morales", date: "Mar 8, 2026" },
  { url: "https://www.theparlormagazine.com/post/alarm-bells-no-one-heard", cover: "https://static.wixstatic.com/media/d449e2_ebd4cbe750854ced9656396a07a5c474~mv2.jpg", title: "Alarm Bells No One Heard", excerpt: "A Brown University custodian flagged the future shooter weeks before the attack. The institution failed to act.", category: "World & Politics", authorName: "Delina Haileab", authorPhoto: "https://static.wixstatic.com/media/d449e2_63bc24c845484526b40f1a2ec1a3c623~mv2.png", authorProfile: "https://www.theparlormagazine.com/writer-profiles/delina-haileab", date: "Mar 9, 2026" },
  { url: "https://www.theparlormagazine.com/post/disbelief-as-diagnosis", cover: "https://static.wixstatic.com/media/d449e2_ef68ff11e25140d684a4d0747544ac43~mv2.png", title: "Disbelief as Diagnosis", excerpt: "How the System Learned Not to Believe Women — and How I Paid the Price", category: "World & Politics", authorName: "Elizabeth Collins", authorPhoto: "https://static.wixstatic.com/media/d449e2_2db0e9bf1acb44ba838644538fee5899~mv2.png", authorProfile: "https://www.theparlormagazine.com/writer-profiles/elizabeth-collins", date: "Mar 2, 2026" },
  { url: "https://www.theparlormagazine.com/post/between-checkpoints", cover: "https://static.wixstatic.com/media/d449e2_5a98fcf086704e339b01c82a6633e062~mv2.jpg", title: "Between Checkpoints", excerpt: "A journalist moves between the Palestinian territories, tracing who moves freely, and who must seek permission", category: "World & Politics", authorName: "Iñaki Estivaliz", authorPhoto: "https://static.wixstatic.com/media/d449e2_a309996f99314a3daf6004f54697c83b~mv2.png", authorProfile: "https://www.theparlormagazine.com/writer-profiles/i%C3%B1aki-estivaliz", date: "Feb 23, 2026" },
  { url: "https://www.theparlormagazine.com/post/painted-banners-and-post-punk-dreams", cover: "https://static.wixstatic.com/media/d449e2_93eaded9508140a7bd9f6016e0005fcb~mv2.jpg", title: "Painted Banners and Post-Punk Dreams", excerpt: "Inside Father Figure's self-made rise in Atlanta's local scene", category: "Society & Culture", authorName: "Olivia Gee", authorPhoto: "https://static.wixstatic.com/media/d449e2_9af6f510ddf64c5891245a0ec6929818~mv2.png", authorProfile: "https://www.theparlormagazine.com/writer-profiles/olivia-gee", date: "Feb 23, 2026" },
  { url: "https://www.theparlormagazine.com/post/where-are-the-young-people", cover: "https://static.wixstatic.com/media/d449e2_f7b8a17200ac4e2f82a822867914fe6f~mv2.jpg", title: "Where are the Young People?", excerpt: "Abdul-Razak Osmanu and the new generation reshaping local politics beyond the algorithm", category: "World & Politics", authorName: "Lennon Viera", authorPhoto: "https://static.wixstatic.com/media/d449e2_4fb77fcdc8aa488b9fb3a1810bdfd397~mv2.png", authorProfile: "https://www.theparlormagazine.com/writer-profiles/lennon-viera", date: "Feb 16, 2026" },
]

const NAV_LINKS = ["Work & Wealth", "Society & Culture", "World & Politics", "Perspectives & Identity"]

const ABOUT_LINKS = [
  { label: "Our Mission", href: "/about/mission" },
  { label: "People of The Parlor", href: "/about/people" },
  { label: "Contact Us", href: "/contact" },
]

function esc(s) { return (s ?? "").toString() }

// Split a hero title so the last ~40% of words render as the pink italic accent.
function splitHeadTail(title) {
  const words = (title || '').trim().split(/\s+/).filter(Boolean)
  if (words.length <= 1) return { head: '', tail: title || '' }
  // Short titles (e.g. "It Takes a Village") accent only the last word; longer
  // ones accent ~40% so the pink tail reads as a phrase.
  const tailCount = words.length <= 4
    ? 1
    : Math.max(1, Math.min(words.length - 1, Math.round(words.length * 0.4)))
  return {
    head: words.slice(0, words.length - tailCount).join(' '),
    tail: words.slice(words.length - tailCount).join(' '),
  }
}
function parseDateSafe(s) { return s ? (new Date(String(s).replace(/Sept\b/i, 'Sep')).getTime() || 0) : 0 }
function wixCover(url, w = 720, q = 85) {
  try {
    const u = new URL(url)
    if (!/static\.wixstatic\.com$/.test(u.hostname) || !/\/media\//.test(u.pathname)) return url
    if (/\/v1\//.test(u.pathname)) return url
    const ext = (u.pathname.match(/\.(jpe?g|png|webp)$/i) || ['', '.jpg'])[1].toLowerCase()
    return `${u.origin}${u.pathname}/v1/fill/w_${w},q_${q},al_c,usm_0.66_1.00_0.01/${encodeURIComponent('image.' + ext)}`
  } catch (e) { return url }
}
function wixAvatar(url, size = 96, q = 80) {
  try {
    const u = new URL(url)
    if (!/static\.wixstatic\.com$/.test(u.hostname) || !/\/media\//.test(u.pathname)) return url
    if (/\/v1\//.test(u.pathname)) return url
    const ext = (u.pathname.match(/\.(jpe?g|png|webp)$/i) || ['', '.jpg'])[1]
    return `${u.origin}${u.pathname}/v1/fill/w_${size},h_${size},q_${q},al_c,usm_0.66_1.00_0.01/${encodeURIComponent('avatar.' + ext)}`
  } catch (e) { return url }
}
// Per-article cover crop focus. Cards default to object-position: top (see .cover CSS);
// list a slug here to override when the subject's face sits lower in the image.
const COVER_FOCUS = {
  'not-a-patient-woman': 'center',
  'grief-glitter-and-the-business-of-staying-alive': 'center',
  'against-the-cloud': '5% 65%',
}
// Route remote images through Next's optimizer (resize + webp) so we don't ship
// multi-MB originals. Local/relative URLs pass through untouched.
function optimizeImg(url, w) {
  if (!url || !/^https?:\/\//.test(url)) return url || ''
  return `/_next/image?url=${encodeURIComponent(url)}&w=${w}&q=75`
}

// Classify a hero cover by aspect ratio: portrait/tall and wide-landscape covers
// use the two-column contained layout; only near-square covers keep the full-bleed
// crop. Returns 'tall' | 'wide' | null (null = near-square, keep full-bleed).
function heroKind(img) {
  if (!img || !img.naturalWidth) return null
  const ratio = img.naturalHeight / img.naturalWidth
  return ratio > 1.15 ? 'tall' : ratio < 0.8 ? 'wide' : null
}

function slideHTML(it, idx) {
  const authorNode = it.authorProfile
    ? `<a class="authorLink" href="${esc(it.authorProfile)}" target="_top">${esc(it.authorName || '')}</a>`
    : `<span class="authorLink">${esc(it.authorName || '')}</span>`
  const focus = COVER_FOCUS[it.slug]
  const coverStyle = focus ? ` style="object-position: ${focus}"` : ''
  const cover = it.cover
    ? `<img class="cover"${coverStyle} src="${esc(optimizeImg(it.cover, 750))}" data-full="${esc(it.cover)}" onerror="this.onerror=null;this.src=this.dataset.full" alt="" loading="${idx < FIRST_EAGER ? 'eager' : 'lazy'}" decoding="async">`
    : ''
  const avatarOriginal = it.authorPhoto || ''
  const avatarOptimized = avatarOriginal ? wixAvatar(avatarOriginal, 96, 80) : ''
  const avatar = avatarOriginal
    ? `<img class="avatar" src="${esc(avatarOptimized)}" data-fallback="${esc(avatarOriginal)}" alt="" loading="lazy" decoding="async" fetchpriority="low">`
    : ''
  const titleClass = it.titleLines === 3 ? ' title3' : ''
  return `<div class="swiper-slide">
    <div class="card${titleClass}">
      <div class="media">${cover}</div>
      <div class="meta">
        <div class="byline"><span class="avatarWrap">${avatar}</span>${authorNode}</div>
        ${it.category ? `<div class="category">${esc(it.category)}</div>` : ''}
        <a class="titleLink" href="${esc(it.url)}" target="_top"><h3 class="title">${esc(it.title)}</h3></a>
        ${it.excerpt ? `<p class="excerpt">${esc(it.excerpt)}</p>` : ''}
      </div>
    </div>
  </div>`
}

export default function HomePageClient({ initial = {} }) {
  const { cart } = useCart()
  const [announceVisible, setAnnounceVisible] = useState(true)
  const [visible, setVisible] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [memberOpen, setMemberOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [issuesList, setIssuesList] = useState([])
  const [ribbonCollapsed, setRibbonCollapsed] = useState(false)
  const [ribbonScrolling, setRibbonScrolling] = useState(false)
  const [uiHidden, setUiHidden] = useState(false)
  const [announcements, setAnnouncements] = useState([])
  const [ribbonIndex, setRibbonIndex] = useState(0)
  const [featuredEvents, setFeaturedEvents] = useState(initial.events || [])
  const [homeBanner, setHomeBanner] = useState(null)
  const [topBarData, setTopBarData] = useState(initial.topBar?.[0] || null)
  const [competitionData, setCompetitionData] = useState(initial.competition?.[0] || null)
  const [popupData, setPopupData] = useState(initial.popup?.[0] || null)
  const [member, setMember] = useState(null)
  const unreadNotifications = useUnreadNotifications(member?.id, memberOpen)
  const [articles, setArticles] = useState(initial.articles || [])
  const [heroSlides, setHeroSlides] = useState(initial.heroSlides || [])
  const [heroIssue, setHeroIssue] = useState(initial.heroIssue || null) // the issue the hero slides belong to (for the eyebrow)
  const [heroLoaded, setHeroLoaded] = useState(true)
  const [heroIndex, setHeroIndex] = useState(1) // 1-based into the cloned track
  const [heroNoTrans, setHeroNoTrans] = useState(false)
  // Slides whose cover is portrait get the two-column "split" layout (image left,
  // title right); wide/near-square covers keep the full-bleed layout.
  const [portraitSlides, setPortraitSlides] = useState({})
  const [heroClassified, setHeroClassified] = useState(false)
  const [printPopupOpen, setPrintPopupOpen] = useState(false)
  const lastScrollY = useRef(0)
  const aboutRef = useRef(null)
  const memberRef = useRef(null)
  const compSectionRef = useRef(null)
  const navScrollRef = useRef(null)
  const [navCanLeft, setNavCanLeft] = useState(false)
  const [navCanRight, setNavCanRight] = useState(false)
  const homeBannerRef = useRef(null)
  const homeBannerImgRef = useRef(null)
  const supabase = createClient()

  useEffect(() => {
    async function loadMember() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('members').select('role, avatar_url').eq('id', user.id).single()
      setMember({ ...user, role: data?.role ?? null, avatar_url: data?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || null })
    }
    loadMember()
  }, [])

  // Articles, hero, and events arrive server-rendered via `initial` (seeded into
  // state above) — no client fetch. The banner + ribbon are picked here because
  // the round-robin rotor reads localStorage (client-only); the lists themselves
  // come from `initial`, so no fetch round-trip.
  function rotorPick(list, key) {
    if (!list.length) return null
    let n = 0
    try { n = parseInt(localStorage.getItem(key) || '0', 10) || 0 } catch {}
    const chosen = list[n % list.length]
    if (list.length > 1) { try { localStorage.setItem(key, String((n + 1) % list.length)) } catch {} }
    return chosen
  }
  useEffect(() => {
    const banners = Array.isArray(initial.banners) ? initial.banners : []
    const ribbon = Array.isArray(initial.ribbon) ? initial.ribbon : []
    const banner = rotorPick(banners, 'parlorBannerRotor')
    if (banner) setHomeBanner(banner)
    // Ribbon excludes the banner's type and popup's type so they never duplicate a campaign.
    const popup = initial.popup?.[0] || null
    const excludeTypes = [banner?.type, popup?.type].filter(Boolean)
    const candidates = excludeTypes.length ? ribbon.filter(a => !excludeTypes.includes(a.type)) : ribbon
    setAnnouncements(candidates)
    const chosen = rotorPick(candidates, 'parlorRibbonRotor')
    setRibbonIndex(chosen ? candidates.indexOf(chosen) : 0)
    if (initial.topBar?.[0]) setTopBarData(initial.topBar[0])
    if (initial.competition?.[0]) setCompetitionData(initial.competition[0])
    if (initial.popup?.[0]) setPopupData(initial.popup[0])
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function updateNavArrows() {
    const el = navScrollRef.current
    if (!el) return
    const hasOverflow = el.scrollWidth > el.clientWidth + 1
    setNavCanLeft(hasOverflow && el.scrollLeft > 0)
    setNavCanRight(hasOverflow && el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
  }

  useEffect(() => {
    updateNavArrows()
    // Re-check after fonts load — on iOS Safari scrollWidth reads too small before fonts paint
    const t = setTimeout(updateNavArrows, 400)
    document.fonts?.ready?.then(updateNavArrows)
    window.addEventListener('resize', updateNavArrows)
    return () => { clearTimeout(t); window.removeEventListener('resize', updateNavArrows) }
  }, [])

  // Which REAL hero slide is centered — stable across the seamless-loop clone
  // snap (the clone and its real twin share this index).
  const heroRealActive = heroSlides.length > 1
    ? (((heroIndex - 1) % heroSlides.length) + heroSlides.length) % heroSlides.length
    : 0

  // Play the scroll-unfurl imperatively on whichever slide just became active.
  // Keyed on the REAL index, so it fires once per genuine slide change and never
  // re-fires on the clone snap (which keeps the same real index) — no flash.
  useEffect(() => {
    if (!heroSlides.length || typeof document === 'undefined') return
    const reduce = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // Animate BOTH the visible slide and its off-screen clone (same data-orig),
    // so after the snap the real slide is already unfurled.
    document.querySelectorAll(`.issue-hero-sub-wrap[data-orig="${heroRealActive}"]`).forEach(w => {
      const fill = w.querySelector('.issue-hero-sub-fill')
      const text = w.querySelector('.issue-hero-sub')
      if (text) {
        text.getAnimations().forEach(a => a.cancel())
        if (reduce) { text.style.opacity = '1'; text.style.transform = 'translateY(0)' }
        else text.animate([{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 700, delay: 200, easing: 'cubic-bezier(.25,0,.2,1)', fill: 'forwards' })
      }
    })
  }, [heroRealActive, heroSlides.length])

  // Classify hero covers that are ALREADY loaded at hydration. The per-<img> onLoad
  // never fires for a cached/SSR image (the load event happened before React
  // attached the listener), which would otherwise leave a wide/tall cover stuck in
  // the full-bleed cover crop. Scan on mount and after each slides change.
  useEffect(() => {
    if (!heroSlides.length || typeof document === 'undefined') return
    const scan = () => {
      document.querySelectorAll('.issue-hero-imgwrap img').forEach(img => {
        if (!img.complete || !img.naturalWidth) return
        const orig = Number(img.getAttribute('data-orig'))
        const k = heroKind(img)
        if (k) setPortraitSlides(p => (p[orig] ? p : { ...p, [orig]: k }))
      })
    }
    scan()
    setHeroClassified(true)
    // A couple of retries catch images that finish decoding just after mount.
    const t = setTimeout(scan, 200)
    return () => clearTimeout(t)
  }, [heroSlides.length])

  // Defensive: clear any body scroll-lock a wall/paywall on a previous page may
  // have left behind (e.g. after Back / bfcache restore), so the homepage never
  // inherits it and renders collapsed.
  useEffect(() => {
    const reset = () => {
      const b = document.body.style
      b.position = ''; b.top = ''; b.left = ''; b.right = ''; b.overflow = ''
    }
    reset()
    const onShow = e => { if (e.persisted) reset() }
    window.addEventListener('pageshow', onShow)
    return () => window.removeEventListener('pageshow', onShow)
  }, [])

  // Load the issue list for the hamburger drawer (newest first).
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('issues')
        .select('id, title, number, publication_date')
        .order('number', { ascending: false, nullsFirst: false })
        .order('publication_date', { ascending: false })
      if (data) {
        setIssuesList(data.map(iss => ({
          id: iss.id,
          title: iss.title || 'Untitled issue',
          number: iss.number,
          // Borderlands has a bespoke landing page; others use the generic route.
          href: /borderlands/i.test(iss.title || '') ? '/borderlands-of-identity' : `/issue/${iss.id}`,
        })))
      }
    })()
  }, [])

  // Esc closes the drawer; lock scroll while it's open.
  useEffect(() => {
    if (!drawerOpen) return
    const onKey = e => { if (e.key === 'Escape') setDrawerOpen(false) }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [drawerOpen])

  // Auto-advance the hero carousel. The track is [cloneLast, ...slides, cloneFirst]
  // so heroIndex runs 1..n as the real slides; stepping onto a clone at either end
  // lets the slide animate, then snaps (no transition) to the matching real slide.
  // This loops seamlessly in BOTH directions.
  useEffect(() => {
    if (heroSlides.length < 2) return
    const t = setInterval(() => setHeroIndex(i => Math.min(i + 1, heroSlides.length + 1)), 6500)
    return () => clearInterval(t)
  }, [heroSlides.length])

  // Re-enable the transition after the instant snap has painted. (setTimeout,
  // not rAF, so it still fires when the tab/pane is backgrounded.)
  useEffect(() => {
    if (!heroNoTrans) return
    const t = setTimeout(() => setHeroNoTrans(false), 60)
    return () => clearTimeout(t)
  }, [heroNoTrans])

  // When a slide finishes animating onto an end clone, jump to its real twin.
  function handleHeroTransitionEnd(e) {
    if (e.propertyName !== 'transform') return
    const n = heroSlides.length
    if (n < 2) return
    if (heroIndex === n + 1) { setHeroNoTrans(true); setHeroIndex(1) }
    else if (heroIndex === 0) { setHeroNoTrans(true); setHeroIndex(n) }
  }

  // Show the admin-managed popup on first load — once per browser session.
  useEffect(() => {
    if (!popupData) return
    let seen = false
    try { seen = sessionStorage.getItem(`popupSeen_${popupData.id}`) === '1' } catch {}
    if (seen) return
    const t = setTimeout(() => setPrintPopupOpen(true), 900)
    return () => clearTimeout(t)
  }, [popupData?.id])
  function closePrintPopup() {
    setPrintPopupOpen(false)
    try { if (popupData?.id) sessionStorage.setItem(`popupSeen_${popupData.id}`, '1') } catch {}
  }

  useEffect(() => {
    const el = compSectionRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('comp-section--visible'); obs.disconnect() } },
      { threshold: 0.12 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [competitionData])

  useEffect(() => {
    const el = homeBannerRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('hb-section--visible'); obs.disconnect() } },
      { threshold: 0.1 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [homeBanner])

  useEffect(() => {
    const img = homeBannerImgRef.current
    if (!img || !homeBanner?.image_url) return
    img.style.opacity = '0'
    img.style.transition = 'opacity 1.4s ease'
    const t = setTimeout(() => { img.style.opacity = '1' }, 120)
    return () => clearTimeout(t)
  }, [homeBanner?.image_url])

  const items = articles.filter(a => !a.featured).sort((a, b) => parseDateSafe(b.date) - parseDateSafe(a.date))
  const slidesHTML = items.map(slideHTML).join('')
  // Memoize the carousel markup on slidesHTML so the hero carousel's 6.5s
  // re-render doesn't reconcile this subtree. React reusing the same element
  // keeps Swiper from re-laying-out the slides on every hero tick (the flicker).
  const carouselSection = useMemo(() => (
    <section className="carousel-section">
      <div className="carousel-header">
        <div className="carousel-label">Recent Articles</div>
      </div>
      <div id="carousel" className="swiper" tabIndex="0" aria-label="Article carousel">
        <div className="fade-edge fade-left fade-hidden" aria-hidden="true"></div>
        <div className="fade-edge fade-right" aria-hidden="true"></div>
        <div id="slides" className="swiper-wrapper" dangerouslySetInnerHTML={{ __html: slidesHTML }}></div>
        <button className="swiper-button-prev" aria-label="Previous"></button>
        <button className="swiper-button-next" aria-label="Next"></button>
      </div>
    </section>
  ), [slidesHTML])

  // Current ribbon content: the active announcement in rotation, else the
  // default "second issue" copy so the ribbon is never empty.
  // Evergreen, type-neutral fallback — shown when there is no ribbon announcement
  // to display (none configured, or the only one was excluded for matching the
  // banner's type). Deliberately generic so it never clashes with the banner.
  const FALLBACK_RIBBON = { kicker: 'Support independent journalism', headline: 'Join The Parlor', message: 'Sustain the work and receive full access, early releases, and subscriber-only extras.', cta_label: 'Become a paid subscriber', cta_href: '/plans' }
  const ribbonData = announcements.length ? (announcements[ribbonIndex % announcements.length] || announcements[0]) : FALLBACK_RIBBON

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    let scrollTimer = null
    function handleScroll() {
      const y = window.scrollY
      setUiHidden(y > lastScrollY.current && y > 80)
      lastScrollY.current = y
      setRibbonScrolling(true)
      clearTimeout(scrollTimer)
      scrollTimer = setTimeout(() => setRibbonScrolling(false), 160)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => { window.removeEventListener('scroll', handleScroll); clearTimeout(scrollTimer) }
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
    if (!document.querySelector('link[href*="swiper@9"]')) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://cdn.jsdelivr.net/npm/swiper@9/swiper-bundle.min.css'
      document.head.appendChild(link)
    }

    let swiperInstance = null
    let _equalizeCards = null

    function initSwiper() {
      const carouselEl = document.getElementById('carousel')
      if (!carouselEl || !window.Swiper) return

      function attachFallback(img) {
        if (!img) return
        const fallback = img.getAttribute('data-fallback')
        if (!fallback) return
        img.addEventListener('error', () => { if (img.src !== fallback) img.src = fallback }, { once: true })
      }

      function loadImgElement(img, priority = 'low') {
        if (!img) return
        attachFallback(img)
        if (img.dataset && img.dataset.src) {
          img.src = img.dataset.src
          img.removeAttribute('data-src')
        }
        img.loading = 'eager'
        img.decoding = 'async'
        if ('fetchPriority' in img) img.fetchPriority = priority
      }

      function equalizeCards() {
        const cards = Array.from(document.querySelectorAll('#slides .card'))
        if (!cards.length) return
        cards.forEach(c => c.style.height = 'auto')
        let maxH = 0
        cards.forEach(c => { maxH = Math.max(maxH, c.offsetHeight) })
        cards.forEach(c => c.style.height = maxH + 'px')
      }
      _equalizeCards = equalizeCards

      function waitImagesAndEqualize() {
        const imgs = Array.from(document.querySelectorAll('#slides img.cover'))
        if (!imgs.length) { equalizeCards(); return }
        let left = imgs.length
        const done = () => { if (--left <= 0) equalizeCards() }
        imgs.forEach(img => {
          if (img.complete) done()
          else {
            img.addEventListener('load', done, { once: true })
            img.addEventListener('error', done, { once: true })
          }
        })
      }

      function loadSlideAt(i, priority = 'low') {
        const slides = document.querySelectorAll('#slides .swiper-slide')
        const slide = slides[i]
        if (!slide) return
        const img = slide.querySelector('img.cover')
        if (img && (img.hasAttribute('data-src') || img.getAttribute('src'))) loadImgElement(img, priority)
      }

      function loadNeighbors(index) {
        for (let d = -LOOKAHEAD; d <= LOOKAHEAD; d++) {
          loadSlideAt(index + d, d === 0 ? 'high' : 'low')
        }
      }

      function toggleArrowsAndFades(s) {
        const prev = carouselEl.querySelector('.swiper-button-prev')
        const next = carouselEl.querySelector('.swiper-button-next')
        const fadeL = carouselEl.querySelector('.fade-left')
        const fadeR = carouselEl.querySelector('.fade-right')
        if (!prev || !next || !fadeL || !fadeR) return
        prev.style.display = s.isBeginning ? 'none' : 'flex'
        next.style.display = s.isEnd ? 'none' : 'flex'
        fadeL.classList.toggle('fade-hidden', s.isBeginning)
        fadeR.classList.toggle('fade-hidden', s.isEnd)
      }

      const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return
          const img = entry.target.querySelector('img.cover[data-src]')
          if (img) loadImgElement(img, 'high')
          io.unobserve(entry.target)
        })
      }, { root: carouselEl, rootMargin: '240px', threshold: 0.01 })

      Array.from(document.querySelectorAll('#slides .swiper-slide')).forEach(slide => {
        if (slide.querySelector('img.cover[data-src]')) io.observe(slide)
      })
      Array.from(document.querySelectorAll('#slides img.cover')).forEach(attachFallback)

      window.addEventListener('resize', equalizeCards)
      waitImagesAndEqualize()

      swiperInstance = new window.Swiper('#carousel', {
        slidesPerView: 'auto',
        spaceBetween: 24,
        speed: 380,
        loop: false,
        preloadImages: false,
        lazy: false,
        allowTouchMove: true,
        threshold: 8,
        keyboard: { enabled: true, onlyInViewport: true },
        navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
        on: {
          init(s) { loadNeighbors(s.activeIndex || 0); equalizeCards(); toggleArrowsAndFades(s) },
          slideChangeTransitionStart(s) { loadNeighbors(s.activeIndex) },
          slideChange(s) { toggleArrowsAndFades(s) },
          reachBeginning(s) { toggleArrowsAndFades(s) },
          reachEnd(s) { toggleArrowsAndFades(s) },
          fromEdge(s) { toggleArrowsAndFades(s) },
          // NOTE: do NOT call equalizeCards() here. Swiper's ResizeObserver fires
          // this whenever the container size changes — and equalizeCards changes
          // card heights, which changes the container size, which fires this
          // again: an endless resize↔equalize loop that flickered the slides.
          // Real viewport resizes are handled by the window 'resize' listener.
          resize(s) { toggleArrowsAndFades(s) }
        }
      })
    }

    if (window.Swiper) {
      initSwiper()
    } else if (!document.querySelector('script[src*="swiper@9"]')) {
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/swiper@9/swiper-bundle.min.js'
      script.onload = initSwiper
      document.head.appendChild(script)
    }

    return () => {
      if (swiperInstance) { try { swiperInstance.destroy() } catch (e) {} }
      if (_equalizeCards) window.removeEventListener('resize', _equalizeCards)
    }
  }, [slidesHTML])

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
          --cardW: 360px;
          --chevBase: url('https://static.wixstatic.com/media/d449e2_60a2ca8371754e76879f849e6854164c~mv2.png');
          --chevHover: url('https://static.wixstatic.com/media/d449e2_e3128c680e344a0c8fee858855fb985a~mv2.png');
          --chevOpacity: .95;
          --arrowHit: 60px;
        }
        html { scroll-behavior: smooth; }
        body { background: var(--black); color: var(--white); font-family: 'Source Serif 4', Georgia, serif; overflow-x: hidden; }
        a { text-decoration: none; color: inherit; }
        button { cursor: pointer; border: none; background: none; }

        /* ── OPEN CALL STRIP ── */
        .sticky-bar {
          background: #0a0a0a;
          border-bottom: 2px solid #f2b8c6;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
          width: 100%;
          position: relative;
          overflow: hidden;
        }
        /* Desktop: static centered text */
        .sticky-desktop-text {
          flex: none; text-align: center; padding: 10px 16px;
          font-family: 'Source Serif 4', Georgia, serif;
          font-size: 13px; color: #ffffff; letter-spacing: .04em;
        }
        .sticky-desktop-text em {
          font-family: 'Playfair Display', Georgia, serif;
          font-style: italic; color: #f2b8c6;
        }
        /* Mobile: marquee (hidden on desktop) */
        .sticky-marquee-wrap {
          display: none;
          flex: 1; overflow: hidden; min-width: 0;
          mask-image: linear-gradient(to right, transparent 0%, black 4%, black 92%, transparent 100%);
          -webkit-mask-image: linear-gradient(to right, transparent 0%, black 4%, black 92%, transparent 100%);
        }
        @media (max-width: 900px) {
          .sticky-desktop-text { display: none; }
          .sticky-marquee-wrap { display: block; }
        }
        .sticky-marquee {
          display: flex; width: max-content;
          animation: sticky-marquee 32s linear infinite;
        }
        .sticky-marquee:hover { animation-play-state: paused; }
        .sticky-marquee-copy {
          font-family: 'Source Serif 4', Georgia, serif;
          font-size: 13px; color: #ffffff; letter-spacing: .04em;
          white-space: nowrap; padding: 10px 36px 10px 8px;
        }
        .sticky-marquee-copy em {
          font-family: 'Playfair Display', Georgia, serif;
          font-style: italic; color: #f2b8c6;
        }
        @keyframes sticky-marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .sticky-btn {
          background: #f2b8c6;
          color: #0a0a0a;
          border: none;
          padding: 9px 18px;
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          text-decoration: none;
          display: inline-block;
          letter-spacing: .04em;
          flex-shrink: 0;
          margin-right: 2px;
        }
        .sticky-btn:hover { background: #ffffff; }
        .sticky-close {
          position: absolute; right: 0; top: 0; bottom: 0;
          background: none; border: none;
          color: rgba(255,255,255,0.45); font-size: 15px;
          cursor: pointer; padding: 0 14px; line-height: 1;
          display: flex; align-items: center;
        }
        .sticky-close:hover { color: #fff; }
        @media (max-width: 900px) {
          .sticky-bar { justify-content: flex-start; }
          .sticky-close { position: static; }
        }

        /* ── HEADER ── */
        .site-header { background: var(--white); position: sticky; top: 0; z-index: 100; transition: transform 0.3s ease; }
        .site-header.ui-hidden { transform: translateY(-100%); }
        .header-top { display: flex; align-items: center; justify-content: space-between; padding: 10px 40px; }
        .header-side { display: flex; align-items: center; gap: 40px; flex: 1; }
        .header-text-link {
          font-family: 'Source Serif 4', Georgia, serif;
          font-size: 18px; color: #374151;
          text-decoration: none; transition: color 0.15s;
          text-underline-offset: 3px;
        }
        .header-text-link:hover { color: var(--black); text-decoration: underline; }
        .header-side.right { justify-content: flex-end; }

        /* About dropdown */
        .about-wrap { position: relative; }
        .about-trigger {
          font-family: 'Source Serif 4', Georgia, serif;
          font-size: 18px; color: #374151;
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
        .logo-wrap { display: flex; align-items: center; justify-content: center; flex-shrink: 0; gap: 8px; }
        .logo-mark { width: 96px; height: 96px; border-radius: 50%; object-fit: cover; }
        .logo-text-img { height: 124px; object-fit: contain; margin-top: 14px; }

        /* Member widget */
        .member-wrap { position: relative; }
        .member-trigger {
          display: flex; align-items: center; gap: 7px;
          cursor: pointer; background: none; border: none; padding: 0;
          user-select: none;
        }
        .header-avatar-frame { position:relative; display:inline-flex; flex-shrink:0; }
        .header-notification-badge { position:absolute; top:-6px; right:-7px; min-width:18px; height:18px; padding:0 4px; display:flex; align-items:center; justify-content:center; box-sizing:border-box; border:2px solid #fff; border-radius:12px; background:#9b3657; color:#fff; font:700 10px/1 Arial,sans-serif; pointer-events:none; }
        .header-notification-count { margin-left:auto; border-radius:12px; background:#9b3657; color:#fff; padding:2px 7px; font:700 11px/1.3 Arial,sans-serif; }
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
        button.member-dropdown-item { width:100%; text-align:left; background:none; border-top:none; border-left:none; border-right:none; }
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
        .header-bottom { position: relative; background: var(--black); display: flex; align-items: center; justify-content: center; gap: 48px; padding: 11px 40px; }
        /* Hamburger — pinned to the far left of the section nav */
        .hamburger-btn { display: inline-flex; flex-direction: column; justify-content: center; gap: 5px; width: 30px; height: 26px; padding: 0; background: none; border: none; cursor: pointer; }
        .hamburger-btn span { display: block; height: 2px; width: 100%; background: #1a1a1a; border-radius: 2px; transition: background 0.15s; }
        .hamburger-btn:hover span { background: var(--maroon, #7a2531); }
        /* Drawer */
        .nav-drawer-backdrop { position: fixed; inset: 0; z-index: 10000; background: rgba(10,10,10,0.5); backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px); opacity: 0; pointer-events: none; transition: opacity 0.25s; }
        .nav-drawer-backdrop.open { opacity: 1; pointer-events: auto; }
        .nav-drawer { position: fixed; top: 0; left: 0; bottom: 0; z-index: 10001; width: min(360px, 84vw); background: #faf5ef; box-shadow: 4px 0 40px rgba(0,0,0,0.22); transform: translateX(-100%); transition: transform 0.3s cubic-bezier(.4,0,.2,1); display: flex; flex-direction: column; overflow-y: auto; }
        .nav-drawer.open { transform: translateX(0); }
        .nav-drawer-head { display: flex; align-items: center; justify-content: space-between; padding: 22px 26px 18px; border-bottom: 1px solid #ece2d6; }
        .nav-drawer-brand { font-family: 'Playfair Display', Georgia, serif; font-style: italic; font-size: 22px; color: var(--maroon, #7a2531); }
        .nav-drawer-close { background: none; border: none; font-size: 30px; line-height: 1; color: #8a7a70; cursor: pointer; padding: 0 4px; }
        .nav-drawer-close:hover { color: #1a1a1a; }
        .nav-drawer-section { padding: 22px 26px; border-bottom: 1px solid #ece2d6; }
        .nav-drawer-label { font-family: 'Source Serif 4', Georgia, serif; font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; color: #a8968a; margin-bottom: 14px; }
        .nav-drawer-item { display: block; padding: 9px 0; text-decoration: none; }
        .nav-drawer-num { display: block; font-family: 'Source Serif 4', Georgia, serif; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--pink); margin-bottom: 2px; }
        .nav-drawer-title { display: block; font-family: 'Playfair Display', Georgia, serif; font-size: 20px; color: #1a1a1a; line-height: 1.2; transition: color 0.15s; }
        .nav-drawer-item:hover .nav-drawer-title { color: var(--maroon, #7a2531); }
        .nav-drawer-empty { font-family: 'Source Serif 4', Georgia, serif; font-size: 14px; font-style: italic; color: #b0a196; }
        .header-section-link {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 20px; color: rgba(255,255,255,0.65);
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
          display: flex; align-items: center; justify-content: flex-end;
          background: var(--black); padding: 20px; padding-right: 0;
        }
        .digital-hero-left img {
          width: 100%; max-width: 560px; height: auto;
          object-fit: contain; display: block; border-radius: 50%;
          transition: transform 6s ease;
        }
        .digital-hero-left:hover img { transform: scale(1.02); }
        .digital-hero-right {
          padding: 56px 52px 48px 44px;
          display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;
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
          font-size: 13px; letter-spacing: 0.2em; text-transform: uppercase;
          color: var(--pink); margin-bottom: 18px;
        }
        .digital-hero-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(40px, 5vw, 64px); font-weight: 700;
          color: var(--white); line-height: 1.04; margin-bottom: 32px;
        }
        .digital-hero-subtitle {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 18px; font-style: italic;
          color: var(--muted); margin-bottom: 28px;
        }

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

        /* ── CHIPS ── */
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

        /* (The old print-hero section was replaced by the "Now in print" first-load
           popup and the /print landing page; its styles were removed.) */

        /* Now-in-print first-load popup */
        .printpop-overlay { position: fixed; inset: 0; background: rgba(10,10,10,0.66); z-index: 10001; display: flex; align-items: center; justify-content: center; padding: 24px; animation: printpop-fade 0.25s ease; }
        @keyframes printpop-fade { from { opacity: 0; } to { opacity: 1; } }
        .printpop-modal { position: relative; display: grid; grid-template-columns: 0.85fr 1fr; width: min(760px, 96vw); max-height: 92vh; background: var(--black); border: 1px solid var(--pink); border-radius: 6px; overflow: hidden; box-shadow: 0 24px 80px rgba(0,0,0,0.5); }
        .printpop-close { position: absolute; top: 8px; right: 12px; background: none; border: none; font-size: 26px; line-height: 1; color: #fff; cursor: pointer; z-index: 2; opacity: 0.8; }
        .printpop-close:hover { opacity: 1; }
        .printpop-img { background: linear-gradient(160deg,#f7d7e0,#f3c3d1); display: flex; align-items: center; justify-content: center; }
        .printpop-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .printpop-body { padding: 34px 32px; display: flex; flex-direction: column; justify-content: center; }
        .printpop-eyebrow { font-family: 'Source Serif 4', Georgia, serif; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--pink); margin-bottom: 14px; }
        .printpop-headline { font-family: 'Playfair Display', Georgia, serif; font-size: clamp(24px,2.6vw,30px); font-weight: 700; color: #fff; line-height: 1.1; margin: 0 0 8px; }
        .printpop-headline em { font-style: italic; color: var(--pink); }
        .printpop-subhead { font-family: 'Playfair Display', Georgia, serif; font-size: 14px; font-style: italic; color: var(--muted); margin-bottom: 16px; }
        .printpop-text { font-family: 'Source Serif 4', Georgia, serif; font-size: 15px; line-height: 1.7; color: var(--grey); margin: 0 0 22px; }
        .printpop-cta { display: inline-block; text-align: center; background: var(--pink); color: var(--black); text-decoration: none; padding: 13px 22px; font-family: 'Playfair Display', Georgia, serif; font-size: 15px; font-weight: 700; letter-spacing: 0.02em; transition: background 0.15s; }
        .printpop-cta:hover { background: #fff; }
        .printpop-dismiss { margin-top: 12px; background: none; border: none; color: var(--muted); font-family: 'Source Serif 4', Georgia, serif; font-size: 13px; cursor: pointer; text-align: center; transition: color 0.15s; }
        .printpop-dismiss:hover { color: var(--pink); }
        @media (max-width: 640px) {
          .printpop-overlay { padding: 16px; }
          .printpop-modal { grid-template-columns: 1fr; width: min(340px, calc(100vw - 32px)); max-height: 90vh; overflow-y: auto; }
          .printpop-img { max-height: 260px; }
          .printpop-body { padding: 22px 20px 28px; }
        }

        /* ── ISSUE HERO CAROUSEL (large image; title/tagline layered over it) ── */
        .issue-hero { position: relative; background: var(--black); overflow: hidden; }
        .issue-hero-track { display: flex; transition: transform 0.6s cubic-bezier(.4,0,.2,1); will-change: transform; }
        .issue-hero-slide { flex: 0 0 100%; min-width: 0; position: relative; aspect-ratio: 16/9; align-self: auto; overflow: hidden; }
        .issue-hero-figure { position: relative; padding: 0; display: block; width: 100%; height: 100%; }
        .issue-hero-imgwrap { position: relative; display: block; width: 100%; height: 100%; }
        .issue-hero-imgwrap img { width: 100%; height: 100%; object-fit: cover; object-position: center; display: block; transform: scale(1.12); transform-origin: center; }
        /* Localized gradient behind the text block only */
        .issue-hero-head::before {
          content: ''; position: absolute; inset: -32px -48px; z-index: -1; pointer-events: none; border-radius: 4px;
          background: radial-gradient(ellipse at center, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.60) 50%, rgba(0,0,0,0.15) 80%, rgba(0,0,0,0) 100%);
        }
        /* Text pinned to bottom of hero */
        .issue-hero-head { position: absolute; top: 50%; transform: translateY(-50%); left: auto; right: clamp(40px,7vw,110px); width: clamp(280px,38vw,520px); z-index: 3; pointer-events: none; isolation: isolate; }
        .issue-hero-head a, .issue-hero-head button { pointer-events: auto; }
        .issue-hero-eyebrow { font-family: 'Source Serif 4', Georgia, serif; font-size: 12px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--pink); margin-bottom: 14px; text-shadow: 0 2px 14px rgba(0,0,0,0.6); }
        .issue-hero-sub-wrap { position: relative; display: block; width: fit-content; max-width: 44ch; margin: clamp(16px,2.4vh,26px) 0 0; }
        .issue-hero-sub-fill { display: none; }
        .issue-hero-sub { margin: 0; font-family: 'Source Serif 4', Georgia, serif; font-size: clamp(15px,1.15vw,17px); line-height: 1.6; color: #fff; opacity: 0; text-shadow: 0 1px 8px rgba(0,0,0,0.4); }
        .issue-hero-title { font-family: 'Playfair Display', Georgia, serif; font-size: clamp(30px,3.9vw,62px); font-weight: 700; color: var(--white); line-height: 1.06; margin: 0; letter-spacing: -0.01em; text-shadow: 0 2px 20px rgba(0,0,0,0.6); max-width: 22ch; }
        .issue-hero-accent { font-style: italic; color: var(--pink); }
        /* Read more button inline with text */
        .issue-hero-btn { display: inline-block; border: 1px solid var(--pink); background: rgba(10,10,10,0.7); color: var(--pink); padding: 13px 36px; font-family: 'Playfair Display', Georgia, serif; font-size: 16px; font-weight: 700; letter-spacing: 0.02em; text-decoration: none; transition: all 0.15s; margin-top: clamp(18px,2.4vh,28px); position: static; }
        .issue-hero-btn:hover { background: var(--pink); color: var(--black); }
        .issue-hero-nav { position: absolute; top: 50%; transform: translateY(-50%); z-index: 5; background: none; border: none; color: var(--white); font-size: 46px; line-height: 1; padding: 0 10px; cursor: pointer; opacity: 0.55; transition: opacity 0.15s; }
        .issue-hero-nav:hover { opacity: 1; }
        .issue-hero-nav.prev { left: 14px; }
        .issue-hero-nav.next { right: 14px; }
        .issue-hero-dots { display: flex; justify-content: center; gap: 9px; padding: 0; position: absolute; bottom: 16px; left: 0; right: 0; z-index: 5; margin: 0; }
        .issue-hero-dot { width: 8px; height: 8px; border-radius: 50%; border: none; padding: 0; background: rgba(255,255,255,0.3); cursor: pointer; transition: background 0.15s; }
        .issue-hero-dot.active { background: var(--pink); }
        .issue-hero-btn-head { display: inline-block; }
        /* All layout variants now use full-bleed — override split/tall/wide specifics */
        .issue-hero-slide--split, .issue-hero-slide--tall, .issue-hero-slide--wide { display: block; padding: 0; gap: 0; }
        .issue-hero-slide--split .issue-hero-head, .issue-hero-slide--tall .issue-hero-head, .issue-hero-slide--wide .issue-hero-head { position: absolute; top: 50%; transform: translateY(-50%); left: auto; right: clamp(40px,7vw,110px); width: clamp(280px,38vw,520px); }
        .issue-hero-slide--split .issue-hero-title, .issue-hero-slide--tall .issue-hero-title, .issue-hero-slide--wide .issue-hero-title { text-shadow: 0 2px 20px rgba(0,0,0,0.6); width: auto; max-width: 22ch; }
        .issue-hero-slide--split .issue-hero-imgwrap .issue-hero-btn { display: none; }
        /* Stars slide — shift text up into the clear blue sky area (desktop only) */
        @media (min-width: 901px) {
          .issue-hero-slide--stars .issue-hero-head { top: 28%; }
        }
        /* Sparkling 8-pointed stars */
        .hero-star { position: absolute; z-index: 4; pointer-events: none; opacity: 0; animation: hero-twinkle var(--dur, 2.4s) ease-in-out infinite var(--delay, 0s); }
        .hero-star svg { display: block; }
        @keyframes hero-twinkle {
          0%, 100% { opacity: 0; transform: scale(0.6) rotate(0deg); }
          50% { opacity: var(--peak, 0.85); transform: scale(1.1) rotate(22.5deg); }
        }


        /* ── SWIPER CAROUSEL ── */
        /* ── HOMEPAGE ANNOUNCEMENT BANNER ── */
        .home-banner { display: grid; grid-template-columns: 1fr 1.3fr; min-height: clamp(340px, 46vh, 520px); border-top: 1px solid var(--border); }
        .home-banner-left { background: #f2b8c6; display: flex; align-items: center; padding: clamp(40px,6vw,80px); }
        .home-banner-inner { max-width: 520px; }
        .home-banner-eyebrow { font-family: 'Source Serif 4', Georgia, serif; font-size: 13px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--black); opacity: 0.6; margin-bottom: 16px; }
        .home-banner-head { font-family: 'Playfair Display', Georgia, serif; font-size: clamp(28px,3.5vw,48px); font-weight: 700; color: var(--black); line-height: 1.08; margin: 0 0 16px; }
        .home-banner-desc { font-family: 'Source Serif 4', Georgia, serif; font-size: clamp(14px,1.2vw,17px); line-height: 1.7; color: rgba(10,10,10,0.75); margin: 0 0 28px; }
        .home-banner-cta { display: inline-block; background: var(--black); color: #fff; padding: 13px 26px; font-family: 'Playfair Display', Georgia, serif; font-size: 15px; font-weight: 700; letter-spacing: 0.02em; text-decoration: none; transition: background 0.15s; }
        .home-banner-cta:hover { background: #fff; color: var(--black); outline: 2px solid var(--black); }
        .home-banner-right { position: relative; overflow: hidden; background: #fdf8f5; }
        .home-banner-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center; }
        .home-banner-grad { position: absolute; inset: 0; pointer-events: none; background: linear-gradient(to right, #f2b8c6 0%, rgba(242,184,198,0.4) 25%, transparent 55%, transparent 70%, rgba(253,248,245,0.6) 88%, #fdf8f5 100%); }
        /* home banner scroll-in animations */
        .home-banner-eyebrow { opacity: 0; transform: translateX(-32px); transition: opacity 1s ease, transform 1s ease; }
        .home-banner-head { opacity: 0; transform: translateY(22px); transition: opacity 1s ease 0.2s, transform 1s ease 0.2s; }
        .home-banner-desc { opacity: 0; transform: translateY(22px); transition: opacity 1s ease 0.38s, transform 1s ease 0.38s; }
        .home-banner-cta { opacity: 0; transform: translateY(22px); transition: opacity 1s ease 0.54s, transform 1s ease 0.54s; }
        .hb-section--visible .home-banner-eyebrow { opacity: 0.6; transform: none; }
        .hb-section--visible .home-banner-head,
        .hb-section--visible .home-banner-desc,
        .hb-section--visible .home-banner-cta { opacity: 1; transform: none; }
        @media (max-width: 700px) {
          .home-banner { grid-template-columns: 1fr; }
          .home-banner-right { min-height: 260px; }
          .home-banner-grad { background: linear-gradient(to bottom, #f2b8c6 0%, rgba(242,184,198,0.2) 20%, transparent 40%); }
        }

        /* ── FEATURED EVENTS ── */
        .events-section { background: var(--black); padding: 58px 40px 62px; border-top: 1px solid var(--border); }
        .events-head { display: flex; align-items: baseline; justify-content: space-between; max-width: 1280px; margin: 0 auto 26px; }
        .events-label { font-family: 'Playfair Display', Georgia, serif; font-size: 22px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: var(--pink); }
        .events-all { font-family: 'Source Serif 4', Georgia, serif; font-size: 13px; color: var(--muted); text-decoration: none; letter-spacing: 0.04em; }
        .events-all:hover { color: var(--pink); }
        .events-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 26px; max-width: 1280px; margin: 0 auto; }
        .event-card { display: flex; flex-direction: column; text-decoration: none; background: #111; border: 1px solid var(--card-border); border-radius: 6px; overflow: hidden; transition: transform 0.15s ease, border-color 0.15s ease; }
        .event-card:hover { transform: translateY(-3px); border-color: var(--pink); }
        .event-cover { aspect-ratio: 16 / 9; background-size: cover; background-position: center; background-color: #1a1a1a; display: flex; align-items: center; justify-content: center; }
        .event-cover-fallback { font-family: 'Alex Brush', cursive; font-size: 30px; color: rgba(242,184,198,0.5); }
        .event-body { padding: 16px 18px 20px; display: flex; flex-direction: column; gap: 7px; }
        .event-date { font-family: 'Source Serif 4', Georgia, serif; font-size: 11.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--pink); }
        .event-title { font-family: 'Playfair Display', Georgia, serif; font-size: 20px; font-weight: 700; color: var(--white); line-height: 1.22; margin: 0; }
        .event-blurb { font-family: 'Source Serif 4', Georgia, serif; font-size: 14px; line-height: 1.55; color: var(--grey); margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .event-meta { display: flex; align-items: center; justify-content: space-between; margin-top: 5px; }
        .event-loc { font-family: 'Source Serif 4', Georgia, serif; font-size: 12px; color: var(--muted); }
        .event-details { font-family: 'Playfair Display', Georgia, serif; font-size: 13px; font-weight: 700; color: var(--pink); }
        @media (max-width: 900px) { .events-section { padding: 42px 20px 46px; } .events-grid { grid-template-columns: 1fr; gap: 18px; } }

        .carousel-section { background: #ffffff; padding: 48px 0 0; margin-bottom: 0; }
        .carousel-header { display: flex; align-items: baseline; justify-content: space-between; padding: 0 40px; margin-bottom: 16px; }
        .carousel-label { font-family: 'Playfair Display', Georgia, serif; font-size: 22px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: #374151; }

        .swiper { width: 100%; padding: 18px 0 10px !important; overflow: hidden !important; position: relative; }
        .swiper-wrapper { align-items: stretch; }
        .swiper-slide { --slidePad: 8px; height: auto; width: var(--cardW); padding: var(--slidePad); }
        @media (min-width: 1280px) { .swiper-slide { --slidePad: 10px; } }

        .fade-edge { position: absolute; top: 0; bottom: 0; width: min(12vw, 140px); pointer-events: none; z-index: 4; transition: opacity .18s ease; opacity: 1; }
        .fade-left { left: 0; background: linear-gradient(to right, rgba(255,255,255,.84), rgba(255,255,255,.44) 45%, rgba(255,255,255,0) 90%); }
        .fade-right { right: 0; background: linear-gradient(to left, rgba(255,255,255,.84), rgba(255,255,255,.44) 45%, rgba(255,255,255,0) 90%); }
        .fade-hidden { opacity: 0 !important; }

        .swiper-button-prev, .swiper-button-next {
          position: absolute !important;
          top: 42% !important;
          transform: translateY(-50%) !important;
          z-index: 6;
          width: var(--arrowHit) !important;
          height: var(--arrowHit) !important;
          background: transparent !important;
          border: 0 !important;
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
          margin-top: 0 !important;
        }
        .swiper-button-prev { left: 20px !important; display: none; }
        .swiper-button-next { right: 20px !important; }

        .swiper-button-prev::after, .swiper-button-next::after {
          content: "" !important;
          width: 100% !important; height: 100% !important;
          background-repeat: no-repeat !important;
          background-position: center !important;
          background-size: 100% 100% !important;
          opacity: var(--chevOpacity);
          font-family: unset !important;
          font-size: unset !important;
        }
        .swiper-button-prev::after { background-image: var(--chevBase) !important; }
        .swiper-button-next::after { background-image: var(--chevBase) !important; transform: scaleX(-1); }
        .swiper-button-prev:hover::after { background-image: var(--chevHover) !important; opacity: 1; }
        .swiper-button-next:hover::after { background-image: var(--chevHover) !important; opacity: 1; transform: scaleX(-1); }

        .swiper-button-prev::before, .swiper-button-next::before {
          content: "";
          position: absolute;
          inset: 4%;
          border-radius: 50%;
          background: rgba(255,255,255,.14);
          box-shadow: 0 6px 14px rgba(17,24,39,.12), 0 10px 26px rgba(17,24,39,.08);
          transform: scale(1.12);
          pointer-events: none;
          z-index: 0;
          transition: background .25s ease, box-shadow .25s ease, transform .25s ease;
        }
        .swiper-button-prev:hover::before, .swiper-button-next:hover::before {
          background: rgba(255,255,255,.24);
          box-shadow: 0 8px 22px rgba(17,24,39,.22), 0 14px 36px rgba(17,24,39,.14);
          transform: scale(1.15);
        }

        /* Cards */
        .card {
          display: grid;
          grid-template-rows: auto 1fr;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 0;
          overflow: hidden;
          box-shadow: 0 12px 32px rgba(17,24,39,.12), 0 2px 8px rgba(17,24,39,.06);
        }
        .media { position: relative; overflow: hidden; }
        .cover { width: 100%; aspect-ratio: 16/9; object-fit: cover; object-position: top; display: block; transform: scale(1.15); transform-origin: center; transition: transform 0.3s ease; }
        .meta { padding: 10px 14px 12px; display: grid; gap: 6px; grid-template-rows: 32px auto auto 1fr; }
        .byline { display: flex; align-items: center; gap: 10px; font-size: 13px; line-height: 1.2; min-height: 32px; color: #6b7280; }
        .avatarWrap { width: 32px; height: 32px; border-radius: 50%; overflow: hidden; flex: 0 0 32px; }
        .avatar { width: 100%; height: 100%; object-fit: cover; display: block; }
        .authorLink { color: #374151; font-weight: 600; text-decoration: none; cursor: pointer; }
        .category { color: #8b95a1; font-size: 11px; letter-spacing: .06em; text-transform: uppercase; }
        .titleLink { display: block; color: #111827; text-decoration: none; cursor: pointer; margin-bottom: 6px; }
        .titleLink:hover { text-decoration: underline; text-underline-offset: 2px; }
        .title { margin: 0; font-family: 'Playfair Display', Georgia, serif; font-size: 22px; font-weight: 700; color: #111827; line-height: 1.3; }
        .excerpt { margin: 0; font-size: 14px; line-height: 1.55; color: #4b5563; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        .card.title3 .titleLink { -webkit-line-clamp: 3; }
        .card.title3 .excerpt { -webkit-line-clamp: 2; }

        /* ── COMPETITION ── */
        .competition { background: var(--black); padding: 72px 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: center; border-top: 1px solid var(--border); }
        .competition--img { padding: 0 0 0 clamp(40px,5vw,72px); gap: 0; align-items: stretch; }
        .comp-eyebrow { font-size: 13px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--pink); margin-bottom: 18px; }
        .comp-title { font-family: 'Playfair Display', Georgia, serif; font-size: clamp(34px,3.5vw,46px); font-weight: 700; color: var(--white); line-height: 1.08; margin-bottom: 8px; }
        .comp-title em { font-style: italic; color: var(--pink); }
        .comp-subtitle { font-family: 'Playfair Display', Georgia, serif; font-size: 16px; font-style: italic; color: var(--muted); margin-bottom: 20px; }
        .comp-body { font-size: 15px; line-height: 1.78; color: var(--grey); max-width: 420px; }
        .comp-left--img { padding: clamp(48px,6vw,80px) clamp(40px,5vw,64px) clamp(48px,6vw,80px) 0; border-right: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column; justify-content: center; }
        .comp-right { border-left: 1px solid var(--border); padding-left: 52px; position: relative; overflow: hidden; }
        .comp-right--img { border-left: none; padding-left: 0; display: flex; flex-direction: column; justify-content: flex-end; min-height: 400px; }
        .comp-right-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0; }
        .comp-right-grad { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.65) 55%, rgba(0,0,0,0.9) 100%); z-index: 1; }
        .comp-right-content { position: relative; z-index: 2; padding: 40px; }
        .comp-right .comp-body { margin-bottom: 30px; }
        /* scroll-in animations */
        .comp-eyebrow { opacity: 0; transform: translateX(-32px); transition: opacity 1s ease, transform 1s ease; }
        .comp-title { opacity: 0; transform: translateY(22px); transition: opacity 1s ease 0.2s, transform 1s ease 0.2s; }
        .comp-body { opacity: 0; transform: translateY(22px); transition: opacity 1s ease 0.38s, transform 1s ease 0.38s; }
        .comp-cta { opacity: 0; transform: translateY(22px); transition: opacity 1s ease 0.54s, transform 1s ease 0.54s; }
        .comp-right-bg { opacity: 0; transition: opacity 1.2s ease 0.1s; }
        .comp-section--visible .comp-eyebrow,
        .comp-section--visible .comp-title,
        .comp-section--visible .comp-body,
        .comp-section--visible .comp-cta { opacity: 1; transform: none; }
        .comp-section--visible .comp-right-bg { opacity: 1; }
        .deadline-label { font-size: 13px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--muted); margin-bottom: 10px; }
        .deadline-date { font-family: 'Playfair Display', Georgia, serif; font-size: 40px; font-weight: 700; color: var(--pink); margin-bottom: 26px; line-height: 1; }
        .cat-row { display: grid; grid-template-columns: 1fr 1fr 80px; align-items: center; padding: 12px 0; border-bottom: 1px solid #1e1e1e; }
        .cat-row:last-of-type { border-bottom: none; }
        .cat-name { font-family: 'Playfair Display', Georgia, serif; font-size: 15px; font-style: italic; color: var(--white); }
        .cat-prize { font-size: 13px; color: var(--pink); font-weight: 500; }
        .cat-fee { font-size: 12px; color: #666; }
        .comp-cta { display: block; background: var(--pink); color: var(--black); text-align: center; padding: 14px 32px; font-family: 'Playfair Display', Georgia, serif; font-size: 15px; font-weight: 700; letter-spacing: 0.02em; margin-top: 26px; transition: background 0.15s; text-decoration: none; }
        .comp-cta:hover { background: var(--white); }

        /* ── RIBBON ── */
        .ribbon { position: fixed; bottom: 0; left: 0; right: 0; z-index: 9999; background: var(--ribbon-bg); box-shadow: 0 -18px 40px rgba(0,0,0,0.22), 0 -6px 14px rgba(0,0,0,0.12); font-family: 'Source Serif 4', Georgia, serif; color: var(--black); transition: opacity 220ms ease, transform 0.3s ease; padding-bottom: env(safe-area-inset-bottom, 0px); }
        .ribbon.ui-hidden { transform: translateY(100%); }
        .ribbon.scrolling { opacity: 0.5; }
        /* Desktop layout */
        .ribbon-inner { max-width: 1280px; margin: 0 auto; padding: 14px 64px 14px 28px; display: grid; grid-template-columns: max-content 1fr max-content; align-items: center; gap: 14px; position: relative; }
        .ribbon-thumb-wrap { position: relative; flex-shrink: 0; width: 72px; }
        .ribbon-thumb { position: absolute; bottom: 0; left: 0; width: auto; height: 140px; object-fit: contain; object-position: bottom; pointer-events: none; filter: drop-shadow(0 -3px 8px rgba(0,0,0,0.18)); }
        .ribbon-inner.has-thumb { padding-left: 110px; }
        .ribbon-thumb-slot { position: fixed; left: 8px; bottom: 0; width: 118px; height: 140px; z-index: 10000; pointer-events: none; transition: transform 0.3s ease; }
        .ribbon.ui-hidden ~ * .ribbon-thumb-slot, .ribbon-thumb-slot.ui-hidden { transform: translateY(100%); }
        .ribbon-kicker { font-size: 14px; font-weight: 800; letter-spacing: 0.07em; text-transform: uppercase; line-height: 1.1; }
        .ribbon-subhead { font-family: 'Alex Brush', cursive; font-size: 24px; font-weight: 400; line-height: 1.2; margin-top: 2px; }
        .ribbon-message { font-size: 16px; line-height: 1.35; font-weight: 500; opacity: 0.9; text-align: center; max-width: 52ch; margin: 0 auto; }
        .ribbon-cta { display: inline-flex; align-items: center; justify-content: center; padding: 12px 28px; background: var(--black); color: var(--white); font-family: 'Playfair Display', Georgia, serif; font-size: 14px; font-weight: 700; text-decoration: none; min-width: 240px; transition: background 0.15s, color 0.15s, outline 0.15s, font-size 0.15s; white-space: nowrap; }
        .ribbon-cta:hover { background: #fff; color: var(--black); outline: 2px solid var(--black); font-size: 15px; }
        /* Mobile layout — hidden on desktop */
        .ribbon-mobile { display: none; }
        /* Nav arrow wrap (shared style, desktop hides arrows) */
        .header-bottom-wrap { position: relative; background: #0a0a0a; border-bottom: 1px solid rgba(255,255,255,0.18); }
        .nav-arrow-btn { display: none; position: absolute; top: 0; bottom: 0; width: 44px; align-items: center; justify-content: center; background: transparent; border: none; cursor: pointer; z-index: 5; padding: 0; color: rgba(255,255,255,0.85); font-size: 26px; line-height: 1; user-select: none; }
        .nav-arrow-btn:hover { color: #fff; }
        .nav-arrow-btn--left { left: 0; background: linear-gradient(to right, #0a0a0a 55%, transparent); }
        .nav-arrow-btn--right { right: 0; background: linear-gradient(to left, #0a0a0a 55%, transparent); }

        /* ── FOOTER ── */
        .site-footer { background: #ffffff; border-top: 1px solid #e5e7eb; padding: 48px 40px 96px; }
        .footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 40px; margin-bottom: 40px; }
        .footer-logo-row { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
        .footer-logo-mark { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; }
        .footer-logo-wordmark { height: 56px; object-fit: contain; margin-top: 8px; }
        .footer-tagline { font-size: 13px; line-height: 1.7; color: #555555; max-width: 240px; }
        .footer-col-title { font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: #000000; margin-bottom: 14px; font-weight: 500; }
        .footer-link { display: block; font-size: 13px; color: #374151; margin-bottom: 8px; transition: color 0.15s; }
        .footer-link:hover { color: #000000; }
        .footer-bottom { border-top: 1px solid #e5e7eb; padding-top: 22px; display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: #374151; background: #ffffff; }

        /* ── RESPONSIVE ── */
        @media (max-width: 900px) {
          .digital-hero, .competition { grid-template-columns: 1fr; }
          .issue-hero-head {
            top: auto; bottom: 44px; left: 14px; right: 14px; width: auto;
            transform: none; text-align: right;
          }
          .issue-hero-eyebrow { font-size: 10px; letter-spacing: 0.16em; margin-bottom: 8px; }
          .issue-hero-title { font-size: clamp(18px, 5.5vw, 28px); max-width: none; }
          .issue-hero-sub { font-size: 13px; line-height: 1.5; }
          .issue-hero-sub-wrap { width: 100%; max-width: 28ch; margin-left: auto; }
          .issue-hero-btn { padding: 8px 16px; font-size: 12px; margin-top: 10px; }
          .issue-hero-nav { font-size: 30px; padding: 0 4px; }
          /* All variants stay full-bleed on mobile — reset split-specific overrides */
          .issue-hero-slide--split { flex-direction: row; gap: 0; min-height: 0; padding: 0; }
          .issue-hero-slide--split .issue-hero-figure { flex: none; max-width: 100%; }
          .issue-hero-slide--split .issue-hero-imgwrap img { max-height: none; }
          .issue-hero-slide--split .issue-hero-title,
          .issue-hero-slide--tall .issue-hero-title,
          .issue-hero-slide--wide .issue-hero-title { font-size: clamp(18px, 5.5vw, 28px); text-align: right; max-width: none; width: 100%; }
          .issue-hero-slide--split .issue-hero-head,
          .issue-hero-slide--tall .issue-hero-head,
          .issue-hero-slide--wide .issue-hero-head { top: auto; bottom: 44px; left: 14px; right: 14px; width: auto; transform: none; text-align: right; }
        }
        /* Phone hero: give article text room to fit */
        @media (max-width: 599px) {
          .issue-hero-slide {
            aspect-ratio: auto;
            height: clamp(290px, 85vw, 350px);
          }

          .issue-hero-head,
          .issue-hero-slide--split .issue-hero-head,
          .issue-hero-slide--tall .issue-hero-head,
          .issue-hero-slide--wide .issue-hero-head {
            top: auto;
            bottom: 32px;
            left: 14px;
            right: 14px;
            width: auto;
            transform: none;
            text-align: right;
          }

          .issue-hero-title,
          .issue-hero-slide--split .issue-hero-title,
          .issue-hero-slide--tall .issue-hero-title,
          .issue-hero-slide--wide .issue-hero-title {
            font-size: clamp(17px, 4.8vw, 23px);
            line-height: 1.12;
          }

          .issue-hero-eyebrow {
            font-size: 9px;
            margin-bottom: 5px;
          }

          .issue-hero-sub {
            font-size: 12px;
            line-height: 1.35;
          }

          .issue-hero-sub-wrap {
            margin-top: 9px;
          }

          .issue-hero-btn {
            margin-top: 8px;
            padding: 7px 13px;
            font-size: 11px;
          }
        }

        /* ── TABLET: constrain hero text block width ── */
        @media (min-width: 600px) and (max-width: 900px) {
          .issue-hero-head {
            left: auto; right: clamp(20px, 4vw, 56px);
            width: clamp(240px, 46vw, 440px);
            text-align: left;
          }
          .issue-hero-sub-wrap { max-width: 32ch; margin-left: 0; }
          .issue-hero-slide--split .issue-hero-head,
          .issue-hero-slide--tall .issue-hero-head,
          .issue-hero-slide--wide .issue-hero-head {
            left: auto; right: clamp(20px, 4vw, 56px);
            width: clamp(240px, 46vw, 440px);
            text-align: left;
          }
          .issue-hero-slide--split .issue-hero-title,
          .issue-hero-slide--tall .issue-hero-title,
          .issue-hero-slide--wide .issue-hero-title { text-align: left; }
        }
        @media (max-width: 900px) {
          .digital-hero-left { height: 320px; padding: 24px; }
          .digital-hero-right { padding: 36px 24px 40px; }
          .competition { padding: 48px 24px; gap: 32px; }
          .competition--img { padding: 48px 0 0; }
          .comp-left--img { padding: 32px 24px; border-right: none; border-bottom: 1px solid rgba(255,255,255,0.1); }
          .comp-right { border-left: none; padding-left: 0; border-top: 1px solid var(--border); padding-top: 32px; }
          .comp-right--img { border-top: none; padding-top: 0; min-height: 260px; }
          .header-top { padding: 10px 20px; align-items: flex-start; }
@media (max-width: 599px) {
  .header-top {
    position: relative;
    align-items: flex-start;
  }

  .header-top > .logo-wrap {
    position: absolute;
    left: 50%;
    top: 34px;
    transform: translateX(-50%);
    order: 0;
    z-index: 2;
  }

  .header-top > .header-side {
    flex: 1;
    min-width: 0;
  }

  .header-top > .header-side.right {
    position: relative;
    z-index: 3;
  }
}
          /* Reorder: cart → left, stacked logo → center, hamburger → right */
          .header-side { order: 1; justify-content: flex-start; padding-top: 8px; }
          .logo-wrap { order: 2; flex-direction: column; align-items: center; gap: 4px; }
          .logo-mark { width: 90px; height: 90px; }
          .logo-text-img { height: auto; width: clamp(180px, 54vw, 260px); margin-top: 0; }
          .header-side.right { order: 3; justify-content: flex-end; padding-top: 8px; gap: 14px; }
          .header-bottom { gap: 28px; padding: 14px 56px; overflow-x: auto; justify-content: flex-start; scrollbar-width: none; border-bottom: none; }
          .header-bottom::-webkit-scrollbar { display: none; }
          .header-section-link { font-size: 14px; white-space: nowrap; }
          .nav-arrow-btn { display: flex; }
          .footer-grid { grid-template-columns: 1fr 1fr; gap: 28px; }
          /* Mobile ribbon */
          .ribbon-inner { display: none; }
          .ribbon-mobile { display: block; }
          .ribbon-mobile { position: relative; }
          /* Compact bar — shown when collapsed */
          .ribbon-mob-bar {
            display: flex; align-items: center;
            padding: 11px 50px 11px 18px;
            gap: 10px;
          }
          .ribbon-mob-bar-text {
            flex: 1; min-width: 0; overflow: hidden;
            white-space: nowrap; text-overflow: ellipsis;
            font-family: 'Source Serif 4', Georgia, serif;
            font-size: 13px; font-weight: 600; color: var(--black);
          }
          .ribbon-mob-bar-kicker {
            font-weight: 800; letter-spacing: 0.07em; text-transform: uppercase;
            font-size: 11px; margin-right: 6px;
          }
          .ribbon-mob-bar-headline {
            font-family: 'Alex Brush', cursive; font-size: 17px;
            font-weight: 400; color: #7a2531;
          }
          .ribbon-mob-bar-cta {
            flex-shrink: 0; padding: 8px 14px;
            background: var(--black); color: var(--white);
            font-family: 'Playfair Display', Georgia, serif; font-size: 12px;
            font-weight: 700; text-decoration: none; white-space: nowrap;
          }
          .ribbon-mob-chevron {
            position: absolute; top: 8px; right: 10px; z-index: 5;
            width: 30px; height: 30px; border-radius: 50%;
            background: rgba(0,0,0,0.14); border: 1px solid rgba(0,0,0,0.18); cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            color: var(--black); transition: background 0.15s;
          }
          .ribbon-mob-chevron:hover { background: rgba(0,0,0,0.24); }
          .ribbon-mob-chevron svg { transform: rotate(180deg); transition: transform 0.25s ease; }
          .ribbon-mob-chevron.is-open svg { transform: rotate(0deg); }
          /* Full card — collapses above the bar */
          .ribbon-mob-card {
            overflow: hidden;
            max-height: 400px;
            transition: max-height 0.34s ease, opacity 0.24s ease;
            opacity: 1;
            border-bottom: 1px solid rgba(0,0,0,0.08);
          }
          .ribbon-mob-card.closed {
            max-height: 0;
            opacity: 0;
            pointer-events: none;
          }
          .ribbon-mob-card-inner { padding: 20px 18px 18px; }
          .ribbon-mob-kicker { font-size: 11px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.55; margin-bottom: 4px; }
          .ribbon-mob-headline { font-family: 'Alex Brush', cursive; font-size: 36px; font-weight: 400; line-height: 1.15; color: #7a2531; margin-bottom: 10px; }
          .ribbon-mob-message { font-size: 13px; line-height: 1.6; opacity: 0.85; margin-bottom: 18px; }
          .ribbon-mob-cta { display: block; text-align: center; padding: 13px 20px; background: var(--black); color: var(--white); font-family: 'Playfair Display', Georgia, serif; font-size: 14px; font-weight: 700; text-decoration: none; }
        }
        /* Mobile-only header and footer corrections */
        @media (max-width: 599px) {
          .header-top {
            position: relative;
            min-height: 210px;
            box-sizing: border-box;
            padding: 10px 16px 14px;
            align-items: flex-start;
          }

          .header-top > .logo-wrap {
            top: 34px;
          }

          .header-bottom-wrap {
            position: relative;
            z-index: 1;
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

        @media (max-width: 380px) {
          .header-top {
            min-height: 190px;
          }
        }

        /* Tablet: larger nav font */
        @media (min-width: 600px) and (max-width: 900px) {
          .header-section-link { font-size: 16px; }
          .header-bottom { gap: 32px; padding: 16px 60px; }
          .ribbon-mob-bar-kicker { font-size: 13px; }
          .ribbon-mob-bar-headline { font-size: 21px; }
          .ribbon-mob-bar-cta { font-size: 14px; padding: 10px 18px; }
        }
      `}</style>

      {/* Top bar — admin-managed (placement: top_bar) */}
      {topBarData && announceVisible && (
        <div className="sticky-bar">
          {/* Desktop: static text */}
          <span className="sticky-desktop-text">
            {topBarData.kicker && <em>{topBarData.kicker}</em>}
            {topBarData.kicker && topBarData.message && ' '}
            {topBarData.message}
          </span>
          {/* Mobile: scrolling marquee */}
          <div className="sticky-marquee-wrap">
            <div className="sticky-marquee">
              {[0, 1].map(i => (
                <span key={i} className="sticky-marquee-copy">
                  {topBarData.kicker && <em>{topBarData.kicker}</em>}
                  {topBarData.kicker && topBarData.message && ' '}
                  {topBarData.message}
                  &nbsp;&nbsp;·&nbsp;&nbsp;
                </span>
              ))}
            </div>
          </div>
          {topBarData.cta_label && <a href={topBarData.cta_href || '#'} className="sticky-btn">{topBarData.cta_label}</a>}
          <button className="sticky-close" onClick={() => setAnnounceVisible(false)} title="Dismiss">✕</button>
        </div>
      )}

      {/* ── HEADER ── */}
      <header className={`site-header${uiHidden ? ' ui-hidden' : ''}`}>
        <div className="header-top">

          {/* Left: hamburger menu (opens the drawer with About, Shop, Issues…) */}
          <div className="header-side">
            <button
              className="hamburger-btn"
              aria-label="Open menu"
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen(true)}
            >
              <span></span><span></span><span></span>
            </button>
          </div>

          {/* Center: Logo */}
          <a href="/" className="logo-wrap">
            <img src="https://res.cloudinary.com/dwytmbczs/image/upload/v1777313271/Copy_of_The_Parlour_200_x_200_px_q3d7jv.png" alt="The Parlor mark" className="logo-mark" />
            <img src="https://res.cloudinary.com/dwytmbczs/image/upload/v1779376345/Heading_2560_x_1000_px_2600_x_1000_px_2650_x_1000_px_3_1_lxgvp5.png" alt="The Parlor" className="logo-text-img" />
          </a>

          {/* Right: Member widget + Cart */}
          <div className="header-side right">
            <div className="member-wrap" ref={memberRef}>
              <button type="button" className="member-trigger" aria-label={unreadNotifications > 0 ? `Member menu, ${unreadNotifications} unread notifications` : 'Member menu'} aria-expanded={memberOpen} onClick={() => setMemberOpen(o => !o)}>
                <span className="header-avatar-frame"><span className="member-avatar-sm">
                  {member?.avatar_url
                    ? <img src={member.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', display: 'block' }} />
                    : <svg viewBox="0 0 36 36" fill="none">
                        <circle cx="18" cy="13" r="6" fill="rgba(255,255,255,0.85)"/>
                        <path d="M4 32c0-8 6-13 14-13s14 5 14 13" fill="rgba(255,255,255,0.85)"/>
                      </svg>
                  }
                </span>
                  {unreadNotifications > 0 && <span className="header-notification-badge" aria-hidden="true">{unreadNotifications > 99 ? '99+' : unreadNotifications}</span>}
                </span>
                <div className={`member-chevron${memberOpen ? ' open' : ''}`}></div>
              </button>
              <div className={`member-dropdown${memberOpen ? ' open' : ''}`}>
                {member ? (
                  <>
                    <a href="/portal" className="member-dropdown-item">
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="5" height="5" rx="0.5"/><rect x="9" y="2" width="5" height="5" rx="0.5"/><rect x="2" y="9" width="5" height="5" rx="0.5"/><rect x="9" y="9" width="5" height="5" rx="0.5"/></svg>
                      Member Portal
                    </a>
                    <a href="/portal/notifications" className="member-dropdown-item" aria-label={unreadNotifications > 0 ? `Notifications, ${unreadNotifications} unread` : 'Notifications'}>
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M3 11h10l-1.5-2V6a3.5 3.5 0 00-7 0v3L3 11zM6 13a2 2 0 004 0" /></svg>
                      Notifications
                      {unreadNotifications > 0 && <span className="header-notification-count" aria-hidden="true">{unreadNotifications > 99 ? '99+' : unreadNotifications}</span>}
                    </a>
                    <a href="/portal/subscriptions" className="member-dropdown-item">
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4h12M2 8h8M2 12h10"/></svg>
                      My subscriptions
                    </a>
                    <button type="button" onClick={() => { setMemberOpen(false); openWishlist() }} className="member-dropdown-item">
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 13.5S2 9.5 2 5.5A3.5 3.5 0 018 3a3.5 3.5 0 016 2c0 4-6 8.5-6 8.5z"/></svg>
                      Wishlist
                    </button>
                    <a href="/portal/orders" className="member-dropdown-item">
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 2h2l2 7h6l2-5H5"/><circle cx="7" cy="13" r="1"/><circle cx="12" cy="13" r="1"/></svg>
                      My orders
                    </a>
                    <a href="/portal/settings" className="member-dropdown-item">
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

            <button type="button" aria-label="Open cart" className="cart-btn" onClick={() => { setMemberOpen(false); openCart() }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 01-8 0"/>
              </svg>
              {cart.length > 0 && <span className="cart-count">{cart.length}</span>}
            </button>
          </div>
        </div>

        {/* Section nav */}
        <div className="header-bottom-wrap">
          {navCanLeft && (
            <button className="nav-arrow-btn nav-arrow-btn--left" aria-hidden="true"
              onClick={() => { navScrollRef.current?.scrollBy({ left: -180, behavior: 'smooth' }); setTimeout(updateNavArrows, 350) }}>
              ‹
            </button>
          )}
          <nav className="header-bottom" ref={navScrollRef} onScroll={updateNavArrows}>
            <a href="/" className="header-section-link">Home</a>
            {NAV_LINKS.map(link => (
              <a key={link} href={`/${link.toLowerCase().replace(/ & /g,'-').replace(/ /g,'-')}`} className="header-section-link">{link}</a>
            ))}
          </nav>
          {navCanRight && (
            <button className="nav-arrow-btn nav-arrow-btn--right" aria-hidden="true"
              onClick={() => { navScrollRef.current?.scrollBy({ left: 180, behavior: 'smooth' }); setTimeout(updateNavArrows, 350) }}>
              ›
            </button>
          )}
        </div>
      </header>

      {/* ── Issues / Collections side drawer ── */}
      <div className={`nav-drawer-backdrop${drawerOpen ? ' open' : ''}`} onClick={() => setDrawerOpen(false)} />
      <aside className={`nav-drawer${drawerOpen ? ' open' : ''}`} aria-hidden={!drawerOpen}>
        <div className="nav-drawer-head">
          <span className="nav-drawer-brand">The Parlor</span>
          <button className="nav-drawer-close" aria-label="Close menu" onClick={() => setDrawerOpen(false)}>&times;</button>
        </div>

        <div className="nav-drawer-section">
          <a href="/shop" className="nav-drawer-item"><span className="nav-drawer-title">Shop</span></a>
          <a href="/donate" className="nav-drawer-item"><span className="nav-drawer-title">Donate</span></a>
          {ABOUT_LINKS.map(l => (
            <a key={l.label} href={l.href} className="nav-drawer-item"><span className="nav-drawer-title">{l.label}</span></a>
          ))}
        </div>

        <div className="nav-drawer-section">
          <div className="nav-drawer-label">Issues</div>
          {issuesList.length === 0 ? (
            <div className="nav-drawer-empty">No issues yet.</div>
          ) : (
            issuesList.map(iss => (
              <a key={iss.id} href={iss.href} className="nav-drawer-item">
                <span className="nav-drawer-num">{iss.number ? `Issue ${String(iss.number).padStart(2, '0')}` : 'Inaugural Issue'}</span>
                <span className="nav-drawer-title">{iss.title}</span>
              </a>
            ))
          )}
        </div>

        <div className="nav-drawer-section">
          <div className="nav-drawer-label">Circulating Library</div>
          <div className="nav-drawer-empty">Coming soon.</div>
        </div>

        <div className="nav-drawer-section">
          <div className="nav-drawer-label">Games, Puzzles and Quizzes</div>
          <div className="nav-drawer-empty">Coming soon.</div>
        </div>
      </aside>

      {/* ── ISSUE HERO CAROUSEL — The World We're Building (Issue 02) ── */}
      {heroSlides.length > 0 && (() => {
        const n = heroSlides.length
        const cloneMode = n > 1
        const pos = cloneMode ? heroIndex : 0
        const realActive = cloneMode ? ((heroIndex - 1) % n + n) % n : 0
        const ext = cloneMode ? [heroSlides[n - 1], ...heroSlides, heroSlides[0]] : heroSlides
        return (
        <section className="issue-hero" aria-label="Featured issue" style={{ opacity: heroClassified ? 1 : 0, transition: 'opacity 0.3s ease' }}>
          <div className="issue-hero-track" onTransitionEnd={handleHeroTransitionEnd} style={{ transform: `translateX(-${pos * 100}%)`, transition: heroNoTrans ? 'none' : undefined }}>
          {ext.map((s, i) => {
            const orig = cloneMode ? ((i - 1) % n + n) % n : i
            return (
            <div key={i} className={`issue-hero-slide${i === pos ? ' active' : ''}${portraitSlides[orig] ? ' issue-hero-slide--split' : ''}${portraitSlides[orig] === 'wide' ? ' issue-hero-slide--wide' : ''}${portraitSlides[orig] === 'tall' ? ' issue-hero-slide--tall' : ''}${/against.the.cloud/i.test(s.title) ? ' issue-hero-slide--stars' : ''}`}>
              <div className="issue-hero-head">
                {heroIssue && <div className="issue-hero-eyebrow">Issue {heroIssue.number || 2} · {heroIssue.title || "The World We're Building"}</div>}
                <h1 className="issue-hero-title">
                  {(() => {
                    const { head, tail } = splitHeadTail(s.title)
                    return <>{head}{head ? ' ' : null}<em className="issue-hero-accent">{tail}</em></>
                  })()}
                </h1>
                <a href={s.url} className="issue-hero-btn issue-hero-btn-head">Read more</a>
                {s.subtitle && (
                  <div className="issue-hero-sub-wrap" data-orig={orig}>
                    <span className="issue-hero-sub-fill" aria-hidden="true"></span>
                    <p className="issue-hero-sub">{s.subtitle}</p>
                  </div>
                )}
              </div>
              {/against.the.cloud/i.test(s.title) && (
                <>
                  {[
                    { top:'8%',  left:'6%',  size:18, dur:2.2, delay:0,    peak:0.9 },
                    { top:'15%', left:'22%', size:12, dur:3.1, delay:0.4,  peak:0.7 },
                    { top:'5%',  left:'44%', size:22, dur:2.6, delay:0.9,  peak:0.85 },
                    { top:'12%', left:'62%', size:14, dur:1.9, delay:1.3,  peak:0.75 },
                    { top:'22%', left:'80%', size:20, dur:2.8, delay:0.2,  peak:0.9 },
                    { top:'35%', left:'91%', size:10, dur:3.4, delay:1.7,  peak:0.65 },
                    { top:'48%', left:'76%', size:16, dur:2.1, delay:0.6,  peak:0.8 },
                    { top:'60%', left:'88%', size:24, dur:2.9, delay:1.1,  peak:0.9 },
                    { top:'28%', left:'9%',  size:13, dur:3.6, delay:0.8,  peak:0.7 },
                    { top:'42%', left:'32%', size:19, dur:2.3, delay:1.5,  peak:0.85 },
                    { top:'18%', left:'51%', size:11, dur:3.0, delay:0.3,  peak:0.6 },
                    { top:'55%', left:'15%', size:21, dur:2.7, delay:2.0,  peak:0.8 },
                    { top:'70%', left:'5%',  size:15, dur:3.2, delay:0.5,  peak:0.75 },
                    { top:'38%', left:'56%', size:17, dur:2.5, delay:1.9,  peak:0.7 },
                    { top:'72%', left:'42%', size:23, dur:2.0, delay:0.7,  peak:0.95 },
                    { top:'10%', left:'36%', size:9,  dur:3.8, delay:1.2,  peak:0.6 },
                    { top:'50%', left:'68%', size:18, dur:2.4, delay:2.3,  peak:0.8 },
                    { top:'65%', left:'55%', size:12, dur:3.5, delay:0.1,  peak:0.7 },
                  ].map((star, si) => (
                    <span key={si} className="hero-star" aria-hidden="true"
                      style={{ top: star.top, left: star.left,
                        '--dur': star.dur + 's', '--delay': star.delay + 's', '--peak': star.peak }}>
                      <svg width={star.size} height={star.size} viewBox="0 0 24 24" fill="#f0c040">
                        <path d="M12,1 L13.7,7.8 L19.8,4.2 L16.2,10.3 L23,12 L16.2,13.7 L19.8,19.8 L13.7,16.2 L12,23 L10.3,16.2 L4.2,19.8 L7.8,13.7 L1,12 L7.8,10.3 L4.2,4.2 L10.3,7.8 Z"/>
                      </svg>
                    </span>
                  ))}
                </>
              )}
              <div className="issue-hero-figure">
                <div className="issue-hero-imgwrap">
                  {s.cover && (
                    <img
                      src={optimizeImg(s.cover, 1200)}
                      alt={s.title}
                      data-orig={orig}
                      loading={i === pos ? 'eager' : 'lazy'}
                      fetchPriority={i === pos ? 'high' : 'low'}
                      decoding="async"
                      style={COVER_FOCUS[s.slug] ? { objectPosition: COVER_FOCUS[s.slug] } : undefined}
                      onError={e => { if (s.cover && e.currentTarget.src !== s.cover) e.currentTarget.src = s.cover }}
                      onLoad={e => { const k = heroKind(e.currentTarget); if (k) setPortraitSlides(p => (p[orig] ? p : { ...p, [orig]: k })) }}
                    />
                  )}
                  <a href={s.url} className="issue-hero-btn">Read more</a>
                </div>
              </div>
            </div>
          )})}
          </div>
          {cloneMode && (
            <>
              <button className="issue-hero-nav prev" aria-label="Previous"
                onClick={() => setHeroIndex(i => Math.max(i - 1, 0))}>&#8249;</button>
              <button className="issue-hero-nav next" aria-label="Next"
                onClick={() => setHeroIndex(i => Math.min(i + 1, n + 1))}>&#8250;</button>
              <div className="issue-hero-dots">
                {heroSlides.map((_, i) => (
                  <button key={i} className={`issue-hero-dot${i === realActive ? ' active' : ''}`}
                    aria-label={`Go to slide ${i + 1}`} onClick={() => setHeroIndex(i + 1)} />
                ))}
              </div>
            </>
          )}
        </section>
        )
      })()}

      {/* PRINT HERO now lives as a first-load popup (below) → /print landing page. */}

      {/* ── HOMEPAGE ANNOUNCEMENT BANNER ── (admin-managed; hidden until set) */}
      {homeBanner && (
        <section ref={homeBannerRef} className="home-banner">
          <div className="home-banner-left">
            <div className="home-banner-inner">
              {homeBanner.kicker && <div className="home-banner-eyebrow">{homeBanner.kicker}</div>}
              {homeBanner.headline && <h2 className="home-banner-head">{homeBanner.headline}</h2>}
              {homeBanner.message && <p className="home-banner-desc">{homeBanner.message}</p>}
              {homeBanner.cta_label && <a href={homeBanner.cta_href || '#'} className="home-banner-cta">{homeBanner.cta_label}</a>}
            </div>
          </div>
          <div className="home-banner-right">
            {homeBanner.image_url && <img ref={homeBannerImgRef} className="home-banner-img" src={homeBanner.image_url} alt="" />}
            <div className="home-banner-grad" />
          </div>
        </section>
      )}

      {/* ── FEATURED EVENTS ── (hidden until there are upcoming events) */}
      {featuredEvents.length > 0 && (
        <section className="events-section">
          <div className="events-head">
            <div className="events-label">Featured Events</div>
            <a href="/portal/events" className="events-all">See all events →</a>
          </div>
          <div className="events-grid">
            {featuredEvents.map(ev => {
              const d = ev.starts_at ? new Date(ev.starts_at) : null
              const valid = d && !isNaN(d)
              const dateStr = valid ? d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : ''
              const timeStr = valid ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''
              const loc = ev.location_type === 'in_person' ? (ev.location || 'In person') : ev.location_type === 'hybrid' ? 'Hybrid' : 'Online'
              return (
                <a key={ev.id} href={`/portal/events/${ev.id}`} className="event-card">
                  <div className="event-cover" style={{ backgroundImage: ev.cover_image_url ? `url(${ev.cover_image_url})` : 'none' }}>
                    {!ev.cover_image_url && <span className="event-cover-fallback">The Parlor</span>}
                  </div>
                  <div className="event-body">
                    {dateStr && <div className="event-date">{dateStr}{timeStr ? ` · ${timeStr}` : ''}</div>}
                    <h3 className="event-title">{ev.title}</h3>
                    {ev.blurb && <p className="event-blurb">{ev.blurb}</p>}
                    <div className="event-meta">
                      <span className="event-loc">{loc}</span>
                      <span className="event-details">Details →</span>
                    </div>
                  </div>
                </a>
              )
            })}
          </div>
        </section>
      )}

      {/* ── ARTICLE CAROUSEL ── (memoized above so hero re-renders don't touch it) */}
      {carouselSection}

      {/* ── COMPETITION — admin-managed (placement: competition) ── */}
      {competitionData && (
        <section ref={compSectionRef} className={`competition${competitionData.image_url ? ' competition--img' : ''}`}>
          <div className={competitionData.image_url ? 'comp-left--img' : undefined}>
            {competitionData.kicker && <div className="comp-eyebrow">{competitionData.kicker}</div>}
            {competitionData.headline && <h2 className="comp-title" dangerouslySetInnerHTML={{ __html: competitionData.headline.replace(/\n/g, '<br/>') }} />}
          </div>
          <div className={`comp-right${competitionData.image_url ? ' comp-right--img' : ''}`}>
            {competitionData.image_url && <img className="comp-right-bg" src={competitionData.image_url} alt="" />}
            {competitionData.image_url && <div className="comp-right-grad" />}
            <div className={competitionData.image_url ? 'comp-right-content' : undefined}>
              {competitionData.message && <p className="comp-body">{competitionData.message}</p>}
              {competitionData.deadline_label && (
                <>
                  <div className="deadline-label">Submissions close</div>
                  <div className="deadline-date">{competitionData.deadline_label}</div>
                </>
              )}
              {competitionData.cta_label && <a href={competitionData.cta_href || '#'} className="comp-cta" target="_top">{competitionData.cta_label}</a>}
            </div>
          </div>
        </section>
      )}

      {/* ── POPUP — admin-managed (placement: popup), shown once per session per popup id ── */}
      {printPopupOpen && popupData && (
        <div className="printpop-overlay" onClick={closePrintPopup}>
          <div className="printpop-modal" onClick={e => e.stopPropagation()}>
            <button className="printpop-close" aria-label="Close" onClick={closePrintPopup}>&times;</button>
            {popupData.image_url && (
              <div className="printpop-img">
                <img src={popupData.image_url} alt="" />
              </div>
            )}
            <div className="printpop-body">
              {popupData.kicker && <div className="printpop-eyebrow">{popupData.kicker}</div>}
              {popupData.headline && <h2 className="printpop-headline" dangerouslySetInnerHTML={{ __html: popupData.headline.replace(/\n/g, '<br/>') }} />}
              {popupData.message && <p className="printpop-text">{popupData.message}</p>}
              {popupData.cta_label && <a href={popupData.cta_href || '#'} className="printpop-cta" onClick={closePrintPopup}>{popupData.cta_label}</a>}
              <button className="printpop-dismiss" onClick={closePrintPopup}>Maybe later</button>
            </div>
          </div>
        </div>
      )}

      {/* ── FOOTER ── */}
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
            {NAV_LINKS.map(l=><a key={l} href="#" className="footer-link">{l}</a>)}
          </div>
          <div>
            <div className="footer-col-title">Magazine</div>
            {[['About','#'],['Shop','#'],['Donate','/donate'],['People of The Parlor','#'],['Archive','#']].map(([l,h])=><a key={l} href={h} className="footer-link">{l}</a>)}
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

      {/* ── RIBBON ── (admin-managed announcements, rotating) */}
      {(() => {
        const marqueeText = [ribbonData.kicker, ribbonData.headline, ribbonData.message].filter(Boolean).join(' · ')
        return (
          <div className={`ribbon${ribbonScrolling ? ' scrolling' : ''}${uiHidden ? ' ui-hidden' : ''}`}>
            {/* Desktop: 3-column grid */}
            <div className={`ribbon-inner${ribbonData.image_url ? ' has-thumb' : ''}`}>
              {ribbonData.image_url && (
                <div className="ribbon-thumb-slot">
                  <img className="ribbon-thumb" src={ribbonData.image_url} alt="" />
                </div>
              )}
              <div>
                {ribbonData.kicker && <div className="ribbon-kicker">{ribbonData.kicker}</div>}
                {ribbonData.headline && <div className="ribbon-subhead">{ribbonData.headline}</div>}
              </div>
              {ribbonData.message && <div className="ribbon-message">{ribbonData.message}</div>}
              {ribbonData.cta_label && <a href={ribbonData.cta_href || '#'} className="ribbon-cta">{ribbonData.cta_label}</a>}
            </div>

            {/* Mobile: full card (default open) + compact bar when collapsed */}
            <div className="ribbon-mobile">
              {/* Chevron — always pinned to upper-right corner */}
              <button
                className={`ribbon-mob-chevron${!ribbonCollapsed ? ' is-open' : ''}`}
                onClick={() => setRibbonCollapsed(c => !c)}
                aria-label={ribbonCollapsed ? 'Expand' : 'Collapse'}
              >
                <svg viewBox="0 0 24 14" width="13" height="8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 2L12 12L22 2"/>
                </svg>
              </button>

              {/* Collapsible full card */}
              <div className={`ribbon-mob-card${ribbonCollapsed ? ' closed' : ''}`}>
                <div className="ribbon-mob-card-inner">
                  {ribbonData.kicker && <div className="ribbon-mob-kicker">{ribbonData.kicker}</div>}
                  {ribbonData.headline && <div className="ribbon-mob-headline">{ribbonData.headline}</div>}
                  {ribbonData.message && <div className="ribbon-mob-message">{ribbonData.message}</div>}
                  {ribbonData.cta_label && (
                    <a href={ribbonData.cta_href || '#'} className="ribbon-mob-cta">{ribbonData.cta_label}</a>
                  )}
                </div>
              </div>

              {/* Compact bar — shown when collapsed */}
              {ribbonCollapsed && (
                <div className="ribbon-mob-bar">
                  <div className="ribbon-mob-bar-text">
                    {ribbonData.kicker && <span className="ribbon-mob-bar-kicker">{ribbonData.kicker}</span>}
                    {ribbonData.headline && <span className="ribbon-mob-bar-headline">{ribbonData.headline}</span>}
                  </div>
                  {ribbonData.cta_label && (
                    <a href={ribbonData.cta_href || '#'} className="ribbon-mob-bar-cta">{ribbonData.cta_label}</a>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })()}
      <div style={{height:'72px'}}/>
    </>
  )
}
