import { pipe, includes, toLower } from 'ramda'
import { IGNORED_CHATTERS } from '../constants.js'
import ComfyJS from 'comfy.js'
import { always, andThen, cond, equals, replace, T } from 'ramda'
import { pipeWhileNotEmpty } from './index.js'
import { askQnAMaker } from '../../services/ask-qna-maker.js'

export const isIgnoredChatter = pipe(
  toLower,
  (user) => includes(user, IGNORED_CHATTERS)
)

export const onChat = (user) => {
  return pipeWhileNotEmpty([
    cond([
      [equals('Kappa'), always('KappaPride')],
      [
        T,
        pipeWhileNotEmpty([askQnAMaker, andThen(replace('{user}', `${user}`))]),
      ],
    ]),
    (x) => Promise.resolve(x),
    andThen(ComfyJS.Say),
  ])
}
