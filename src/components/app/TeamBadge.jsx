import { Badge } from '../ui'
import { getTeamMeta } from './scanPresentation.js'

/**
 * TeamBadge — the owning-team chip for team-scoped workspace surfaces.
 * Renders the short team name (Legal / Product / Growth) inside a ui Badge
 * with the team's tone; the full name is available as a native tooltip.
 */
export default function TeamBadge({ teamId, title }) {
  const meta = getTeamMeta(teamId)

  return (
    <Badge tone={meta.tone} size="sm" title={title || meta.name}>
      {meta.short}
    </Badge>
  )
}
