import { pipe, includes, toLower } from 'ramda'
import { IGNORED_CHATTERS } from '../constants.js'

export const isIgnoredChatter = pipe(
  toLower,
  (user) => includes(user, IGNORED_CHATTERS)
)
