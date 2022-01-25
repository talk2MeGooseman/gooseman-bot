import { getWeather } from '../../services/open-weather-api.js'
import {
  findCelsiusEntity, findLocationEntity
} from './luis.js'

export async function getTemperature(intent) {
  const {
    entity: location
  } = findLocationEntity(intent.entities)
  const celsiusRequested = !!findCelsiusEntity(intent.entities)
  await getWeather(location, celsiusRequested)
}
