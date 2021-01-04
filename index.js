import chalk from 'chalk'
import ComfyJS from 'comfy.js'
import debugs from 'debug'
import * as dotenv from 'dotenv'
import { always, andThen, cond, equals, isEmpty, replace, T } from 'ramda'
import { pipeWhileNotEmpty } from './libs/ramda-helpers/index.js'
import {
  isBlinkIntent,
  isColorOnIntent,
  isTemperatureIntent,
  findColorEntity,
  findCelsiusEntity,
  findLocationEntity,
} from './libs/ramda-helpers/luis.js'
import { isIgnoredChatter, onChat } from './libs/ramda-helpers/comfy.js'
import { changeLightToColorMaybe, loopChangeOfficeLightState } from './libs/ramda-helpers/hue.js'
import { startServer } from './server.js'
import { askQnAMaker } from './services/ask-qna-maker.js'
import { getLUISIntent } from './services/get-luis-intent.js'
import { App } from './services/hue-app.js'
import { getWeather } from './services/open-weather-api.js'
import { sonicPi } from './services/sonic-pi.js'
const debug = debugs('app-main')
dotenv.config()

let hueApp = new App()
sonicPi.initUdpPort()

const displayUserName = (metadata) =>
  chalk.hex(metadata.userColor).bold(metadata.displayName)

const formatChatMessage = (message, metadata) =>
  `${displayUserName(metadata)}: ${message}`

ComfyJS.onChat = async (user, message, flags, self, extra) => {
  if (isIgnoredChatter(user)) return
  console.log(formatChatMessage(message, extra))
  console.log('----------')

  onChat(user)(message)
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
        changeLightToColorMaybe(hueApp, entityColor)
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
    } else if (equals(command, 'note')) {
      sonicPi.sendUDPMessage('/twitchchat', message)
    } else if (equals(command, 'playback')) {
      sonicPi.sendUDPMessage('/twitchmusic')
    }
  } catch (error) {
    if (equals(command, 'luis')) {
      ComfyJS.Say('Sorry about that but can you ask me in the form of a question? I can change the color of the lights, make them blink, or look up the weather.')
    }
    debug('Error happened when running command:', command)
  }
}

ComfyJS.Init('Gooseman_Bot', process.env.OAUTH, 'talk2megooseman')
startServer()
