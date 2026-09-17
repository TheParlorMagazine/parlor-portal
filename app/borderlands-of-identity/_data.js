// ─────────────────────────────────────────────────────────────
// Borderlands of Identity — shared issue data
// Single source of truth for the hub page and every chapter page.
// ─────────────────────────────────────────────────────────────

export const ISSUE = {
  slug: 'borderlands-of-identity',
  title: 'Borderlands of Identity',
  intro:
    'As borders harden and identities are forced into negotiation, how do these lines shape the way we care for and relate to one another?',
  // Full-bleed botanical art behind the hub hero. Swap any time.
  heroBg:
    'https://res.cloudinary.com/dwytmbczs/image/upload/v1779376889/The_Parlor_Magazine_2__edited_edited_2_h2pwhq.png',
}

// Shared botanical base layer behind each topic strip.
export const BASE_BG_URL =
  'https://static.wixstatic.com/media/d449e2_ed030ea86e024c7d97dfd3bac6258e0a~mv2.png'

// TODO: replace each `image` below with that topic's portrait feature photo.
// They can be portrait — the hub tiles show them portrait (no crop) and the
// chapter hero shows the full image beside the title. For now every topic
// reuses the issue illustration as a placeholder.
const PLACEHOLDER_IMAGE = ISSUE.heroBg

export const AUTHOR_HEADSHOTS = {
  'Rawand Abu Ganem':
    'https://static.wixstatic.com/media/d449e2_d19e9e2f106a4728b2804eef56482cfa~mv2.png',
  'Hassan Adam Ishaq Suleiman':
    'https://static.wixstatic.com/media/d449e2_d15455c591914e34952faadcd2f69582~mv2.png',
  'Jordan Reeves':
    'https://static.wixstatic.com/media/d449e2_3c0c072dee4f470493920d21ceb6ea1d~mv2.png',
  'Shanéa Thomas':
    'https://static.wixstatic.com/media/d449e2_0f4ac391306241a99a07c439cab56557~mv2.png',
  'JL Edzards':
    'https://static.wixstatic.com/media/d449e2_4ed5ecefd98f43df8f5a4e58d5d70e49~mv2.png',
  'Venus Lockett':
    'https://static.wixstatic.com/media/d449e2_43d01ec2fcf74b84a592bef9e6c714b4~mv2.png',
  'Scarlett Longstreet':
    'https://static.wixstatic.com/media/d449e2_744aedd9397e45d6aa2eef357a203371~mv2.png',
  'Luqmaan Zeerak':
    'https://static.wixstatic.com/media/d449e2_c3c25b493bd74f76b0a619b54ed63239~mv2.png',
  'Niharika Manda':
    'https://static.wixstatic.com/media/d449e2_2451d8d09fc0451888095bf9b81f5f0f~mv2.png',
  'Rosalba Mancuso':
    'https://static.wixstatic.com/media/d449e2_f5764849e5d34cf08dc3d99de0a35873~mv2.png',
  'Vironika Wilde':
    'https://static.wixstatic.com/media/d449e2_896389868dba4a16ba790231b575bcbe~mv2.png',
  'Jillian Rae':
    'https://static.wixstatic.com/media/d449e2_55a8fec93b8642ff9d3dad8ad47d1017~mv2.png',
  'Sareena Bilal':
    'https://static.wixstatic.com/media/d449e2_a1ab347ac61342d29f233d156af3c6ef~mv2.png',
  'Jessica Shih':
    'https://static.wixstatic.com/media/d449e2_822b4d028a644fe19d29e71776063d90~mv2.png',
  'Julia Viviane Kurtz':
    'https://static.wixstatic.com/media/d449e2_a0ff494278514ec694197e2aa9bf7669~mv2.png',
  'Feon Chau':
    'https://static.wixstatic.com/media/d449e2_4dfcc1df898844d29c885a1cbb67e296~mv2.png',
  'Lily Sherwood':
    'https://static.wixstatic.com/media/d449e2_afe3a4e6de214ddcba00527a8d6407ac~mv2.png',
  'Jill Felix':
    'https://static.wixstatic.com/media/d449e2_1072679bd26d4659bb62459094e111a5~mv2.png',
  'Roxana Tanasie':
    'https://static.wixstatic.com/media/d449e2_bbfa6c6b1fd5452bac75f7d88b4bde52~mv2.png',
}

export const SECTIONS = [
  {
    slug: 'homecoming',
    title: 'Homecoming',
    subtitle: 'On language, culture, diaspora, and colonial memory',
    image: PLACEHOLDER_IMAGE, // TODO: portrait feature image for Homecoming
    articles: [
      {
        title:
          'How to Write a Bio / No Word for That Feeling / Chronic Pain Origins and Other Theories',
        author: 'Vironika Wilde',
        dek:
          'These three poems move through inherited fractures of language, belonging, and memory, tracing how history lodges itself in the body long after the vocabulary for it is lost. Together, they examine how identity is shaped as much by what was never said as by what remains.',
        isLive: false,
      },
      {
        title: "I Didn’t Think I'd Ever Belong Until My Kids Waved Paper Flags",
        author: 'Feon Chau',
        dek:
          'Tracing the author’s journey from Hong Kong to Canada to Taiwan, this essay explores belonging not as ideology or performance, but as something that accumulates quietly through care, routine, and lived safety—reframing home as something practiced rather than declared.',
        isLive: true,
        url: 'https://www.theparlormagazine.com/borderlands-of-identity/i-didnt-think-id-ever-belong',
      },
      {
        title: 'The Long Way Back to my Mother',
        author: 'Niharika Manda',
        dek:
          'Moving between Bangalore and Seattle, this essay traces migration, inheritance, and maternal courage through the ritual of packing—revealing how love, mobility, and understanding often arrive only after living their consequences.',
        isLive: true,
        url: 'https://www.theparlormagazine.com/borderlands-of-identity/the-long-way-back-to-my-mother',
      },
      {
        title: 'Between Accents and Skin',
        author: 'Sareena Bilal',
        dek:
          'From classroom humiliations over accent to family violence rooted in colorism and colonial beauty standards, this essay traces how language, complexion, and migration dreams shape identity for South Asian women across generations.',
        isLive: true,
        url: 'https://www.theparlormagazine.com/borderlands-of-identity/between-accents-and-skin',
      },
    ],
  },
  {
    slug: 'the-borders-of-the-body',
    title: 'The Borders of the Body',
    subtitle: 'Autonomy, intimacy, and the politics of embodiment',
    image: PLACEHOLDER_IMAGE, // TODO: portrait feature image for The Borders of the Body
    articles: [
      {
        title: 'A Body Interrupted',
        author: 'Rosalba Mancuso',
        dek:
          'Diagnosed with Parkinson’s disease at fifty, the writer confronts not only the loss of physical control but a profound crisis of identity. Set against pandemic-era medical delays in southern Italy, this essay traces how illness reshaped her autonomy, faith, and sense of womanhood.',
        isLive: true,
        url: 'https://www.theparlormagazine.com/borderlands-of-identity/a-body-interrupted/',
      },
      {
        title: 'Defying the Gravity of Age',
        author: 'Jill Felix',
        dek:
          'Through menopause, chronic pain, and decades of cultural messaging about aging and femininity, the author discovers pole dance not as spectacle but as mirror—reclaiming physical agency and inhabiting age fully.',
        isLive: true,
        url: 'https://www.theparlormagazine.com/borderlands-of-identity/defying-the-gravity-of-age/',
      },
      {
        title: 'Mind Breaks Free',
        author: 'Lily Sherwood',
        dek:
          'This essay recounts the lived experience of a nonspeaking autistic person navigating a world that consistently mistook motor disability for intellectual deficiency—exposing how systems that refuse to presume competence actively silence autistic voices.',
        isLive: true,
        url: 'https://www.theparlormagazine.com/borderlands-of-identity/mind-breaks-free/',
      },
      {
        title: 'The Space Between Names: A Nonlinear Becoming',
        author: 'JL Edzards',
        dek:
          'Moving through caregiving, grief, disability, and late transition, this essay traces a nonlinear journey of becoming shaped by survival, translation, and quiet crossings.',
        isLive: true,
        url: 'https://www.theparlormagazine.com/borderlands-of-identity/the-space-between-names/',
      },
    ],
  },
  {
    slug: 'beyond-binaries',
    title: 'Beyond Binaries',
    subtitle: 'Gender, care, and control in the politics of visibility',
    image: PLACEHOLDER_IMAGE, // TODO: portrait feature image for Beyond Binaries
    disableScrollArrows: true,
    articles: [
      {
        title:
          'Threading Carefully: Notes on Visibility, Rejection, and Survival as a Trans Woman in Southern Brazil',
        author: 'Julia Viviane Kurtz',
        dek:
          'In southern Brazil, where violence against trans people is routine and far-right ideologies have grown bolder, the writer’s safety depends on constant calculation—when to stay silent, when to soften, and when to leave.',
        isLive: false,
      },
      {
        title: 'Traveling While Queer',
        author: 'Jillian Rae',
        dek:
          'For queer people who travel alone, movement is a continual negotiation of safety, visibility, and disclosure—deciding when to speak, when to pass, and when silence is survival.',
        isLive: true,
        url: 'https://www.theparlormagazine.com/borderlands-of-identity/traveling-while-queer',
      },
      {
        title:
          'Beyond Pink and Blue: Gender, Misrecognition, and Domestic Life Inside a Modern American Family',
        author: 'Jessica Shih',
        dek:
          'A feminine-presenting stay-at-home father and a masculine-presenting military mother navigate love, labor, and misrecognition—quietly expanding what family, gender, and “normal” can mean in contemporary America.',
        isLive: true,
        url: 'https://www.theparlormagazine.com/borderlands-of-identity/beyond-pink-and-blue/',
      },
    ],
  },
  {
    slug: 'the-places-power-keeps',
    title: 'The Places Power Keeps',
    subtitle: 'On displacement and the memory of war',
    image: PLACEHOLDER_IMAGE, // TODO: portrait feature image for The Places Power Keeps
    articles: [
      {
        title: 'December 1st, 2025',
        author: 'Rawand Abu Ganem',
        dek:
          'Written from inside a tent in Gaza during the winter of 2025, this lyrical testimony captures how something once gentle—rain—has become another force of terror. Moving between memory and survival, the writer recounts caring for her children as water floods their shelter, revealing how war transforms even the most ordinary elements of life into threats. A meditation on motherhood, loss, endurance, and what it means to keep breathing while waiting for the surface.',
        isLive: true,
        url: 'https://www.theparlormagazine.com/borderlands-of-identity/december-1st-2025/',
      },
      {
        title: 'Between Darfur and the Sea',
        author: 'Hassan Adam Ishaq Suleiman',
        dek:
          'This personal account traces one man’s life across war, displacement, and forced migration—from a childhood in a Darfur displacement camp to years of precarious survival in Libya. Through interrupted education, informal labor, detention, and repeated failed attempts to cross the Mediterranean, the writer documents how conflict and global asylum systems shape refugee lives long after the moment of flight.',
        isLive: true,
        url: 'https://www.theparlormagazine.com/borderlands-of-identity/between-darfur-and-the-sea/',
      },
      {
        title: 'Nothing Dramatic Happens at the Border',
        author: 'Luqmaan Zeerak',
        dek:
          'Set along the India–Pakistan border in Jammu and Kashmir, this reported essay traces how Partition continues to shape everyday life decades after the violence of 1947. By focusing on ordinary moments rather than spectacle, it shows how borders endure through repetition, silence, and the slow erosion of belonging.',
        isLive: true,
        url: 'https://www.theparlormagazine.com/borderlands-of-identity/nothing-dramatic-happens-at-the-border/',
      },
      {
        title: 'No Memorial',
        author: 'Roxana Tanasie',
        dek:
          'This essay traces one Romni’s inheritance of survival through her grandmother, a survivor of the Porrajmos—the Nazi genocide of Roma and Sinti people—an atrocity that remains largely absent from public memory. It examines how the lack of memorialization mirrors the ongoing marginalization of Rom communities across Europe today.',
        isLive: true,
        url: 'https://www.theparlormagazine.com/borderlands-of-identity/no-memorial/',
      },
    ],
  },
  {
    slug: 'on-holding-and-letting-go',
    title: 'On Holding and Letting Go',
    subtitle: 'On grief, rupture, and repair',
    image: PLACEHOLDER_IMAGE, // TODO: portrait feature image for On Holding and Letting Go
    articles: [
      {
        title:
          'My Grief’s Favorite Hoodie / On the Eighth Day / The Things You Owe',
        author: 'Venus Lockett',
        dek:
          'In this triptych of poems, grief is rendered as something intimate and invasive—tracing how love fractures into mourning and how survival demands both remembrance and refusal.',
        isLive: true,
        url: 'https://www.theparlormagazine.com/borderlands-of-identity/my-griefs-favorite-hoodie/',
      },
      {
        title: 'She Would’ve Stayed',
        author: 'Scarlett Longstreet',
        dek:
          'This essay examines the inheritance of harm between mothers and daughters—exploring how love, protection, neglect, and violence can coexist within the same hands.',
        isLive: true,
        url: 'https://www.theparlormagazine.com/borderlands-of-identity/she-wouldve-stayed/',
      },
      {
        title: 'Where the Heart Draws Its Lines',
        author: 'Jordan Reeves',
        dek:
          'As a mother faces cancer, the writer reflects on queerness, estrangement, and return—asking how the borders we build to survive can later become paths back to love.',
        isLive: true,
        url: 'https://www.theparlormagazine.com/borderlands-of-identity/where-the-heart-draws-its-lines/',
      },
      {
        title:
          'Holding Death at the Small of Its Back: A Day in the Life of a Death Doula',
        author: 'Shanéa Thomas',
        dek:
          'Drawing from work in a Washington, D.C. morgue, this essay reflects on death doulaship as a practice of presence—slowing time, holding silence, and guiding others through the first moments of mourning.',
        isLive: true,
        url: 'https://www.theparlormagazine.com/borderlands-of-identity/holding-death-at-the-small-of-its-back/',
      },
    ],
  },
]

export function getSection(slug) {
  return SECTIONS.find(s => s.slug === slug) || null
}

export function getSectionIndex(slug) {
  return SECTIONS.findIndex(s => s.slug === slug)
}

export function initials(name) {
  const parts = String(name || 'Writer')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
  return parts.map(p => (p[0] || '').toUpperCase()).join('')
}
