require('dotenv').config();
const ComfyJS = require('comfy.js');
const restify = require('restify');
const axios = require('axios');
const server = restify.createServer();
const hueApp = require('./hueApp');
const colorToHex = require('colornames');
const theColorAPI = require('./services/theColorAPI');

async function askQnAMaker(message) {
  // QNA_AUTH
  const URL = `https://gooseman-bot-qna-maker.azurewebsites.net/qnamaker/knowledgebases/${process.env.KB_ID}/generateAnswer`;

  const response = await axios.post(
    URL,
    {
      isTest: true,
      question: message,
      scoreThreshold: 85,
      top: 1,
    },
    {
      headers: {
        Authorization: `EndpointKey ${process.env.QNA_AUTH}`,
      },
    }
  );

  const answers = response.data.answers;

  if (answers.length > 0) {
    const possibleAnswer = answers[0];
    if (possibleAnswer.score > 0) {
      return possibleAnswer.answer;
    }
  }
  return '';
}

function convertToHexCode(message) {
  let result = message;

  const hexCode = colorToHex(message);
  if (hexCode) {
    result = hexCode.replace('#', '');
  }

  return result ;
}

function respond(req, res, next) {
  res.send('I am Alive!!!');
  next();
}

server.get('/', respond);

server.listen(8080, async function() {
  console.log('%s listening at %s', server.name, server.url);
  // hueApp.getLight('Hue go 1');
});

ComfyJS.onChat = async (user, message, flags) => {
  if (
    user.toLowerCase() === 'gooseman_bot' ||
    user.toLowerCase() === 'streamelements'
  ) {
    return;
  }

  switch (message) {
    case 'Kappa':
      ComfyJS.Say('KappaPride');
      break;

    default:
      const answer = await askQnAMaker(message);
      if (answer.length > 0) {
        const formattedAnswer = answer.replace('{user}', `${user}`);
        ComfyJS.Say(formattedAnswer);
      }
      break;
  }
};

ComfyJS.onCommand = async (user, command, message, flags, extra) => {
  let lightState;

  if (command === 'hue_connect' && flags.broadcaster) {
    await hueApp.discoverAndCreateUser();
  } else if (command === 'color') {
    let requestedColor = convertToHexCode(message);
    const hsl = await theColorAPI.fetchColor(requestedColor);
    if (hsl) {
      lightState = hueApp.buildLightState('color', hsl);
    }
  } else {
    lightState = hueApp.buildLightState(command);
  }

  if (lightState) {
    hueApp.setLightState(8, lightState);
  }
};

ComfyJS.Init('Gooseman_Bot', process.env.OAUTH, 'talk2megooseman');

ComfyJS.onConnected = () => {
  ComfyJS.Say("I'm Alive Baby!");
};

