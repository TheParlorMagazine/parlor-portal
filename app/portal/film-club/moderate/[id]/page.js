import FilmClubModeration from '../../../../_components/FilmClubModeration'
import PortalShell from '../../../_components/PortalShell'

export default async function FilmClubModerationPage({ params }) {
  const { id } = await params
  return (
    <PortalShell active="filmclub" returnTo={`/portal/film-club/moderate/${id}`}>
      <h1>Film Club moderation</h1>
      <FilmClubModeration forumId={id} />
    </PortalShell>
  )
}
