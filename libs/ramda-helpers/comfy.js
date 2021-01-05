import ComfyJS from 'comfy.js'
import debugs from 'debug'
import {
  always,
  andThen,
  cond,
  curry, equals, includes,
  isEmpty, pipe,
  replace,
  T,
  tap,
  thunkify, toLower,
  prop,
} from 'ramda'
import { askQnAMaker } from '../../services/ask-qna-maker.js'
import { getLUISIntent } from '../../services/get-luis-intent.js'
import { getWeather } from '../../services/open-weather-api.js'
import { IGNORED_CHATTERS } from '../constants.js'
import { formatChatMessage } from '../display.js'
import { changeLightToColorMaybe, loopChangeOfficeLightState } from './hue.js'
import { pipeWhileNotEmpty, pipeWhileNotEmptyOrFalse, pipeWhileNotFalsey } from './index.js'
import {
  findCelsiusEntity, findColorEntity,
  findLocationEntity, isBlinkIntent,
  isColorOnIntent,
  isTemperatureIntent
} from './luis.js'

const debug = debugs('app-comfy')

export const isIgnoredChatter = pipe(
  toLower,
  (user) => includes(user, IGNORED_CHATTERS)
)

export const onChat = ({ user, message, extra }) => {
  if(isIgnoredChatter(user)) {
    return
  }

  console.log(formatChatMessage(message, extra))
  console.log('----------')

  return pipeWhileNotEmptyOrFalse([
    cond([
      [equals('Kappa'), always('KappaPride')],
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
    }
  } catch (error) {
    debug('Error happened when running command:', command)
  }
}

const onLUISCommand = (hueApp, message) => {
  return pipeWhileNotFalsey([
    getLUISIntent,
    andThen(tap((intent) => debug('LUIS Intent:', intent))),
    andThen(cond([
      [isColorOnIntent, curry(changeLightColor)(hueApp)],
      [isBlinkIntent, thunkify(blinkLights)(hueApp)],
      [isTemperatureIntent, getTemperature],
    ]))
  ])(message)
}

function lightAlert(hueApp, command) {
  const lightState = hueApp.buildLightStateFor({
    type: 'light',
    desiredEvent: command,
  })

  loopChangeOfficeLightState(lightState)
}

async function getTemperature(intent) {
  const { entity: location } = findLocationEntity(intent.entities)
  const celsiusRequested = !!findCelsiusEntity(intent.entities)
  await getWeather(location, celsiusRequested)
}

async function blinkLights(hueApp) {
  const lightState = hueApp.buildLightStateFor({
    desiredEvent: 'blink',
  })

  const officeGroup = await hueApp.getGroupByName('Office')
  hueApp.setGroupLightState(officeGroup.id, lightState)
}

const changeLightColor = (hueApp) => pipe(
  prop('entities'),
  findColorEntity,
  prop('entity'),
  curry(changeLightToColorMaybe)(hueApp),
)

