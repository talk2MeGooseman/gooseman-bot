import { INTENTS } from '../../services/getLUISIntent.js'
import { propEq } from 'ramda'

export const isColorOnIntent = propEq('intent', INTENTS.TURN_ON_COLOR)
export const isBlinkIntent = propEq('intent', INTENTS.TURN_ON_BLINK)

export const isTemperatureIntent = propEq('intent', INTENTS.TEMP)
