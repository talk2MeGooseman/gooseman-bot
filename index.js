import * as dotenv from 'dotenv'
import debugs from 'debug'
import ComfyJS from 'comfy.js'
import chalk from 'chalk'
import { App } from './services/hueApp.js'
import chroma from 'chroma-js'
import { propEq, find, pipe, toLower, includes, when, cond, equals, always, T, andThen, replace, isEmpty } from 'ramda'
import { askQnAMaker } from './services/askQnAMaker.js'
import { getLUISIntent, ENTITY_TYPES } from './services/getLUISIntent.js'
import { getWeather } from './services/openWeatherAPI.js'
import { startServer } from './server.js'
import { pipeWhileNotEmpty } from './libs/ramda-helpers/index.js'
import { isColorOnIntent, isBlinkIntent, isTemperatureIntent } from './libs/ramda-helpers/luis.js'
const debug = debugs('app-main')
dotenv.config()

const IGNORED_CHATTERS = ['gooseman_bot', 'streamelements']

const hasEntityTypeColorName = propEq('type', ENTITY_TYPES.COLOR)
const hasEntityTypeColorHex = propEq('type', ENTITY_TYPES.COLOR_HEX)
const hasEntityTypeLocation = propEq('type', ENTITY_TYPES.LOCATION)
const hasEntityTypeCelsius = propEq('type', ENTITY_TYPES.CELSIUS)

const findColorEntity = (ent) =>
  find(hasEntityTypeColorHex, ent) || find(hasEntityTypeColorName, ent)

const findLocationEntity = find(hasEntityTypeLocation)
const findCelsiusEntity = find(hasEntityTypeCelsius)

const isIgnoredChatter = pipe(toLower, (user) =>
  includes(user, IGNORED_CHATTERS)
)

const changeLightColorPipe = pipe(
  (message) => chroma(message).rgb(),
  changeHueLightsColor
)

const changeLightToColorMaybe = when(chroma.valid, changeLightColorPipe)

let hueApp = new App()

async function loopChangeOfficeLightState(lightState) {
  const officeGroup = await hueApp.getGroupByName('Office')

  officeGroup.lights.forEach((lightId) => {
    hueApp.setLightState(lightId, lightState)
  })
}

async function changeHueLightsColor(rgbColor) {
  if (rgbColor) {
    const lightState = hueApp.buildLightStateFor({
      type: 'light',
      desiredEvent: 'color',
      rgbColor,
    })

    loopChangeOfficeLightState(lightState)
  }
}
const displayUserName = (metadata) =>
  chalk.hex(metadata.userColor).bold(metadata.displayName)

const formatChatMessage = (message, metadata) =>
  `${displayUserName(metadata)}: ${message}`

ComfyJS.onChat = async (user, message, flags, self, extra) => {
  if (isIgnoredChatter(user)) return
  console.log(formatChatMessage(message, extra))
  console.log('----------')

  const onChatMessagePipe = pipeWhileNotEmpty([
    cond([
      [equals('Kappa'), always('KappaPride')],
      [
        T,
        pipeWhileNotEmpty([
          askQnAMaker,
          andThen(replace('{user}', `${user}`)),
        ]),
      ],
    ]),
    (x) => Promise.resolve(x),
    andThen(ComfyJS.Say),
  ])

  onChatMessagePipe(message)
}

ComfyJS.onCommand = async (user, command, message, _flags, _extra) => {
  if (isIgnoredChatter(user)) return

  try {
    if (equals(command, 'commands')) {
      ComfyJS.Say('Additional commands: !luis, !alert, !controls')
    } else if (equals(command, 'refresh')) {
      hueApp.refresh()
    } else if (equals(command, 'luis')) {
      if (isEmpty(message)) {
        ComfyJS.Say(
          'Tell Luis what you would like it to do. You can control my lights or check the weather in a city.'
        )
        return
      }

      const intent = await getLUISIntent(message)
      debug('LUIS Intent:', intent)
      if (isColorOnIntent(intent)) {
        const { entity: entityColor } = findColorEntity(intent.entities)
        changeLightToColorMaybe(entityColor)
      } else if (isBlinkIntent(intent)) {
        const lightState = hueApp.buildLightStateFor({
          desiredEvent: 'blink',
        })

        const officeGroup = await hueApp.getGroupByName('Office')
        hueApp.setGroupLightState(officeGroup.id, lightState)
      } else if (isTemperatureIntent(intent)) {
        const { entity: location } = findLocationEntity(intent.entities)
        const celsiusRequested = !!findCelsiusEntity(intent.entities)

        await getWeather(location, celsiusRequested)
      }
    } else if (equals(command, 'alert')) {
      const lightState = hueApp.buildLightStateFor({
        type: 'light',
        desiredEvent: command,
      })

      loopChangeOfficeLightState(lightState)
    }
  } catch (error) {
    debug('Error happened when running command:', command)
  }
}

ComfyJS.Init('Gooseman_Bot', process.env.OAUTH, 'talk2megooseman')
startServer()
