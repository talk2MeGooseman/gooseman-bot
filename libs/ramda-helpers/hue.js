import { curry, pipe, when } from 'ramda'
import chroma from 'chroma-js'


export async function loopChangeOfficeLightState(hueApp, lightState) {
  const officeGroup = await hueApp.getGroupByName('Office')

  officeGroup.lights.forEach((lightId) => {
    hueApp.setLightState(lightId, lightState)
  })
}

const curriedChangeHueLightsColor = curry(async function(hueApp, rgbColor) {
  if (rgbColor) {
    const lightState = hueApp.buildLightStateFor({
      type: 'light',
      desiredEvent: 'color',
      rgbColor,
    })

    loopChangeOfficeLightState(hueApp, lightState)
  }
})

const changeLightColorPipe = curry((hueApp) => {
  return pipe(
    (message) => chroma(message).rgb(),
    curriedChangeHueLightsColor(hueApp)
  )
})

export const changeLightToColorMaybe = (hueApp, color) => when(chroma.valid, changeLightColorPipe(hueApp))(color)
