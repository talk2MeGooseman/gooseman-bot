import {
  always,
  andThen,
  cond,
  curry,
  find,
  isNil,
  propEq,
  tap,
  thunkify,
} from 'ramda'
import {
  ENTITY_TYPES,
  getLUISIntent,
  INTENTS,
} from '../../services/get-luis-intent.js'
import { blinkLights, changeLightColor } from './hue.js'
import { pipeWhileNotFalsey } from './index.js'
import { getTemperature } from './weather.js'
import debugs from 'debug'
const debug = debugs('app-luis')

export const isColorOnIntent = propEq('intent', INTENTS.TURN_ON_COLOR)
export const isBlinkIntent = propEq('intent', INTENTS.TURN_ON_BLINK)

export const isTemperatureIntent = propEq('intent', INTENTS.TEMP)

export const hasEntityTypeColorName = propEq('type', ENTITY_TYPES.COLOR)
export const hasEntityTypeColorHex = propEq('type', ENTITY_TYPES.COLOR_HEX)
export const hasEntityTypeLocation = propEq('type', ENTITY_TYPES.LOCATION)
export const hasEntityTypeCelsius = propEq('type', ENTITY_TYPES.CELSIUS)

export const findColorEntity = (ent) =>
  find(hasEntityTypeColorHex, ent) || find(hasEntityTypeColorName, ent)

export const findLocationEntity = find(hasEntityTypeLocation)
export const findCelsiusEntity = find(hasEntityTypeCelsius)

export const onLUISCommand = curry((hueApp, message) => {
  return pipeWhileNotFalsey([
    getLUISIntent,
    andThen(tap((intent) => debug('LUIS Intent:', intent))),
    andThen(
      cond([
        [isNil, always()],
        [isColorOnIntent, curry(changeLightColor)(hueApp)],
        [isBlinkIntent, thunkify(blinkLights)(hueApp)],
        [isTemperatureIntent, getTemperature],
      ])
    ),
  ])(message)
})
