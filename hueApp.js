require('dotenv').config();
const v3 = require('node-hue-api').v3;
// LightState fo r interacting with Lights
const LightState = v3.lightStates.LightState;
// LightState for interacting with Scene Lights
const SceneLightState = v3.lightStates.GroupLightState;
// LightState for interacting with Group Lights
const GroupLightState = v3.lightStates.GroupLightState;
const discovery = v3.discovery;
const hueApi = v3.api;
const appName = 'node-hue-api';
const deviceName = 'example-code';

const USERNAME = process.env['HUE_USER'];
const IP_ADDRESS = '192.168.0.89';

async function discoverBridge() {
  const discoveryResults = await discovery.nupnpSearch();

  if (discoveryResults.length === 0) {
    console.error('Failed to resolve any Hue Bridges');
    return null;
  } else {
    // Ignoring that you could have more than one Hue Bridge on a network as this is unlikely in 99.9% of users situations
    return IP_ADDRESS || discoveryResults[0].ipaddress;
  }
}

exports.discoverAndCreateUser = async function discoverAndCreateUser() {
  const ipAddress = await discoverBridge();

  // Create an unauthenticated instance of the Hue API so that we can create a new user
  let unauthenticatedApi;
  try {
    unauthenticatedApi = await hueApi.createLocal(ipAddress).connect();
  } catch (error) {
    console.error(`Unexpected Error: ${error.message}`);
    return;
  }

  let createdUser;
  try {
    createdUser = await unauthenticatedApi.users.createUser(
      appName,
      deviceName
    );
    console.log(
      '*******************************************************************************\n'
    );
    console.log(
      'User has been created on the Hue Bridge. The following username can be used to\n' +
        'authenticate with the Bridge and provide full local access to the Hue Bridge.\n' +
        'YOU SHOULD TREAT THIS LIKE A PASSWORD\n'
    );
    // console.log(`Hue Bridge User: ${createdUser.username}`);
    // console.log(`Hue Bridge User Client Key: ${createdUser.clientkey}`);
    console.log(
      '*******************************************************************************\n'
    );

    // Create a new API instance that is authenticated with the new user we created
    const authenticatedApi = await hueApi
      .createLocal(ipAddress)
      .connect(createdUser.username);

    // Do something with the authenticated user/api
    const bridgeConfig = await authenticatedApi.configuration.get();
    console.log(
      `Connected to Hue Bridge: ${bridgeConfig.name} :: ${bridgeConfig.ipaddress}`
    );
  } catch (err) {
    if (err.getHueErrorType() === 101) {
      console.error(
        'The Link button on the bridge was not pressed. Please press the Link button and try again.'
      );
    } else {
      console.error(`Unexpected Error: ${err.message}`);
    }
  }
};

exports.getLight = async function getLight(name) {
  const api = await v3.api.createLocal(IP_ADDRESS).connect(USERNAME);
  const light = await api.lights.getLightByName(name);
  console.log(light.toStringDetailed());
};

exports.buildLightState = function buildLightState(desiredState, hslColor) {
  let state = new LightState().effectNone().transitionInstant();
  switch (desiredState) {
    case 'lights_on':
      state = state
        .reset()
        .on()
        .brightness(100);
      break;
    case 'color':
      state = state.hsl(hslColor.h, hslColor.s, hslColor.l);
      break;
    case 'lights_off':
      state = state.off();
      break;
    case 'color_loop':
      state = state
        .on()
        .brightness(100)
        .effectColorLoop();
      break;
    case 'alert':
      state = state
        .hsl(0, 100, 50) // red
        .alertLong();
      break;
    default:
      console.log('Invalid State for Hue');
      return undefined;
      break;
  }

  return state;
};

exports.setLightState = async function setLightState(lightId, state) {
  const api = await v3.api.createLocal(IP_ADDRESS).connect(USERNAME);
  api.lights.setLightState(lightId, state).then(result => {
    console.log(`Light state change was successful? ${result}`);
  });
};
