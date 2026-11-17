import AboutShell from '../_components/AboutShell'
import { getContributingWriters } from '../../../lib/contributingWriters'
import PeopleSections from '../_components/PeopleSections'

export const metadata = {
  title: 'The People of The Parlor | The Parlor',
  description: 'Meet the founding team and contributing writers behind The Parlor, an independent feminist publication and digital community.',
  alternates: { canonical: 'https://theparlormagazine.com/about/people' },
}
export const dynamic = 'force-dynamic'
export default async function PeoplePage() {
  let writers = [], writersUnavailable = false
  try { writers = await getContributingWriters() } catch { writersUnavailable = true }
  return <AboutShell activePage="/about/people">
    <section className="people-content">
      <PeopleSections writers={writers.map(({ id, name, slug, photo_url }) => ({ id, name, slug, photo_url }))} writersUnavailable={writersUnavailable} />
    </section>
  </AboutShell>
}
