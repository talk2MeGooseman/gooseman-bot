import chroma from 'chroma-js'
import { curry, map, pipe, prop, when } from 'ramda'
import { findColorEntity } from './luis.js'

export const loopChangeOfficeLightState = curry(async (hueApp, lightState) => {
  const officeGroup = await hueApp.getGroupByName('Office')

  pipe(
    prop('lights'),
    map((lightId) => hueApp.setLightState(lightId, lightState))
  )(officeGroup)
})

const curriedChangeHueLightsColor = curry(async function (hueApp, rgbColor) {
  if (rgbColor) {
    pipe(
      hueApp.buildLightStateFor,
      loopChangeOfficeLightState(hueApp)
    )({
      type: 'light',
      desiredEvent: 'color',
      rgbColor,
    })
  }
})

const changeLightColorPipe = curry((hueApp) => {
  return pipe(
    (message) => chroma(message).rgb(),
    curriedChangeHueLightsColor(hueApp)
  )
})

export const changeLightToColorMaybe = (hueApp, color) =>
  when(chroma.valid, changeLightColorPipe(hueApp))(color)

export function lightAlert(hueApp, command) {
  return pipe(
    hueApp.buildLightStateFor,
    loopChangeOfficeLightState(hueApp)
  )({
    type: 'light',
    desiredEvent: command,
  })
}

export async function blinkLights(hueApp) {
  const lightState = hueApp.buildLightStateFor({
    desiredEvent: 'blink',
  })
  const officeGroup = await hueApp.getGroupByName('Office')
  hueApp.setGroupLightState(officeGroup.id, lightState)
}

export const changeLightColor = (hueApp) =>
  pipe(
    prop('entities'),
    findColorEntity,
    prop('entity'),
    curry(changeLightToColorMaybe)(hueApp)
  )
