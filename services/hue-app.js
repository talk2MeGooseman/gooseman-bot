import 'dotenv/config'
import * as hue from 'node-hue-api'
import debugs from 'debug'
const debug = debugs('app-hue')

const v3 = hue.v3

// LightState fo r interacting with Lights
const LightState = v3.lightStates.LightState
// LightState for interacting with Group Lights
const GroupLightState = v3.lightStates.GroupLightState
const discovery = v3.discovery
const hueApi = v3.api
const appName = 'node-hue-api'
const deviceName = 'example-code'

const IP_ADDRESS = '192.168.1.73'

const remoteBootstrap = v3.api.createRemote(process.env.HUE_CLIENT_ID, process.env.HUE_CLIENT_SECRET)

export const App = class HueApp {
  constructor() {
    const USERNAME = process.env['HUE_USER']
    this.api = null

    if (process.env['HUE_RUN_LOCAL']) {
      this.api = v3.api.createLocal(IP_ADDRESS).connect(USERNAME).then((api) => {
        debug('Connected to localhost')
        this.api = api
      }).catch(() => {
        debug('Error connecting')
      })
    } else {
      remoteBootstrap.connectWithTokens(process.env.HUE_TOKEN, process.env.HUE_REFRESH_TOKEN, USERNAME)
        .catch(err => {
          debug('Failed to get a remote connection using existing tokens')
          debug(err)
        })
        .then(api => {
          debug('Successfully connected using the existing OAuth tokens')
          this.api = api
        })
    }
  }

  /**
   * Refresh oauth token for Hue API
   *
   */
  refresh() {
    this.api.remote.refreshTokens().catch(error => debug(error.message))
  }

  /**
   *
   *
   * @param {string} name
   * @returns { ({ id: number, name: string, lights: string[] }|undefined) }
   */
  async getGroupByName(_name) {
    const matchedGroups = await this.api.groups.getGroupByName('Office')

    if (matchedGroups.length === 1) {
      return matchedGroups[0]
    } else if (matchedGroups.length > 1) {
      throw new Error('More then one group found')
    }

    return undefined
  }

  buildLightStateFor({
    type,
    desiredEvent,
    rgbColor,
  }) {
    const stateObject = type === 'light' ? new LightState() : new GroupLightState()
    let state = stateObject.effectNone().transitionInstant()

    switch (desiredEvent) {
    case 'lights_on':
      state = state.reset().on().brightness(100)
      break
    case 'color':
      state = state.on().rgb(rgbColor[0], rgbColor[1], rgbColor[2]).brightness(100)
      break
    case 'lights_off':
      state = state.off()
      break
    case 'color_loop':
      state = state.on().brightness(100).effectColorLoop()
      break
    case 'blink':
      state = state
        .alertLong()
      break
    case 'alert':
      state = state
        .hsl(0, 100, 50) // red
        .alertLong()
      break
    default:
      debug('Invalid State for Hue')
      return undefined
    }

    return state
  }

  async setLightState(lightId, state) {
    this.api.lights.setLightState(lightId, state).then(result => {
      debug(`Update Light State: ${result}`)
    })
  }

  async getLight(name) {
    const light = await this.api.lights.getLightByName(name)
    debug(light.toStringDetailed())
  }

  async getGroups() {
    const allGroups = await this.api.groups.getAll()

    allGroups.forEach(group => {
      debug('Group Info:', group.toStringDetailed())
    })
  }

  async setGroupLightState(groupId, groupState) {
    this.api.groups.setGroupState(groupId, groupState)
      .then(result => {
        debug(`Updated Group State: ${result}`)
      })

  }
}


async function discoverBridge() {
  const discoveryResults = await discovery.nupnpSearch()

  if (discoveryResults.length === 0) {
    debug('Failed to resolve any Hue Bridges')
    return null
  } else {
    // Ignoring that you could have more than one Hue Bridge on a network as this is unlikely in 99.9% of users situations
    return IP_ADDRESS || discoveryResults[0].ipaddress
  }
}

export const discoverAndCreateUser = async function discoverAndCreateUser() {
  const ipAddress = await discoverBridge()

  // Create an unauthenticated instance of the Hue API so that we can create a new user
  let unauthenticatedApi
  try {
    unauthenticatedApi = await hueApi.createLocal(ipAddress).connect()
  } catch (error) {
    console.error(`Unexpected Error: ${error.message}`)
    return
  }

  let createdUser
  try {
    createdUser = await unauthenticatedApi.users.createUser(
      appName,
      deviceName
    )
    console.log(
      '*******************************************************************************\n'
    )
    console.log(
      'User has been created on the Hue Bridge. The following username can be used to\n' +
        'authenticate with the Bridge and provide full local access to the Hue Bridge.\n' +
        'YOU SHOULD TREAT THIS LIKE A PASSWORD\n'
    )
    // console.log(`Hue Bridge User: ${createdUser.username}`);
    // console.log(`Hue Bridge User Client Key: ${createdUser.clientkey}`);
    console.log(
      '*******************************************************************************\n'
    )

    // Create a new API instance that is authenticated with the new user we created
    const authenticatedApi = await hueApi
      .createLocal(ipAddress)
      .connect(createdUser.username)

    // Do something with the authenticated user/api
    const bridgeConfig = await authenticatedApi.configuration.get()
    console.log(
      `Connected to Hue Bridge: ${bridgeConfig.name} :: ${bridgeConfig.ipaddress}`
    )
  } catch (err) {
    if (err.getHueErrorType() === 101) {
      console.error(
        'The Link button on the bridge was not pressed. Please press the Link button and try again.'
      )
    } else {
      console.error(`Unexpected Error: ${err.message}`)
    }
  }
}
