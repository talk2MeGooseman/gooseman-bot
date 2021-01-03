import { propEq, find } from 'ramda'
import { INTENTS, ENTITY_TYPES } from '../../services/get-luis-intent.js'

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
