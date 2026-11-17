import AboutShell from '../_components/AboutShell'
import content from './content.json'
import { latestAboutIssueHref } from '../../../lib/aboutLatestIssue'

export const metadata = {
  title: 'Editorial Standards | The Parlor',
  description: 'What The Parlor publishes, our editorial verticals, submission guidance, and our policy on AI use.',
  alternates: { canonical: 'https://theparlormagazine.com/about/editorial-standards' },
}
export const dynamic = 'force-dynamic'

export default async function EditorialStandardsPage() {
  const issueHref = await latestAboutIssueHref()
  // Only trusted, checked-in editorial markup is rendered here. The URL is
  // constructed server-side from an encoded issue ID, never submitted HTML.
  const html = content.html.replace('Explore our latest issue.', `<a href="${issueHref}">Check out our latest issue.</a>`)
  return <AboutShell activePage="/about/editorial-standards">
    <div className="standards-content" dangerouslySetInnerHTML={{ __html: html }} />
  </AboutShell>
}
