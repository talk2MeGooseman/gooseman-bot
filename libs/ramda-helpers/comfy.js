import ComfyJS from 'comfy.js'
import debugs from 'debug'
import {
  always,
  andThen,
  cond, equals, includes,
  isEmpty, pipe, replace,
  T, toLower
} from 'ramda'
import { askQnAMaker } from '../../services/ask-qna-maker.js'
import { sonicPi } from '../../services/sonic-pi.js'
import { IGNORED_CHATTERS } from '../constants.js'
import { formatChatMessage } from '../display.js'
import { lightAlert } from './hue.js'
import { pipeWhileNotEmpty, pipeWhileNotEmptyOrFalse } from './index.js'
import {
  onLUISCommand
} from './luis.js'

const debug = debugs('app-comfy')

export const isIgnoredChatter = pipe(
  toLower,
  (user) => includes(user, IGNORED_CHATTERS)
)

sonicPi.initUdpPort()

export const onChat = ({ user, message, extra }) => {
  if(isIgnoredChatter(user)) {
    return
  }

  console.log(formatChatMessage(message, extra))
  console.log('----------')

  return pipeWhileNotEmptyOrFalse([
    cond([
      [equals('Kappa'), always('KappaPride')],
      [equals('VoHiYo'), always('VoHiYo')],
      [
        T,
        pipeWhileNotEmpty([askQnAMaker, andThen(replace('{user}', `${user}`))]),
      ],
    ]),
    (x) => Promise.resolve(x),
    andThen(ComfyJS.Say),
  ])(message)
}


export const onCommand = async ({ user, command, message, hueApp }) => {
  if (isIgnoredChatter(user)) return

  try {
    if (equals(command, 'commands')) {
      ComfyJS.Say('Additional commands: !luis, !alert, !controls')
    } else if (equals(command, 'refresh')) {
      // hueApp.refresh()
    } else if (equals(command, 'luis')) {
      if (isEmpty(message)) {
        ComfyJS.Say(
          'Tell Luis what you would like it to do. You can control my lights or check the weather in a city.'
        )
        return
      }

      onLUISCommand(hueApp, message)
    } else if (equals(command, 'alert')) {
      lightAlert(hueApp, command)
    } else if (equals(command, 'note')) {
      if(isEmpty(message)) {
        ComfyJS.Say('Please provide the note you would like to play, the cutoff, and how long to sustain the note. ie. !note 50, 50, 5')
      } else {
        sonicPi.sendUDPMessage('/twitchchat', message)
      }
    } else if (equals(command,  'playback')) {
      sonicPi.sendUDPMessage('/twitchmusic')
    }
  } catch (error) {
    debug('Error happened when running command:', command)
  }
}


