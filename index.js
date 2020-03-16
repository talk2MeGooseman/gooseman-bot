require('dotenv').config()
const ComfyJS = require("comfy.js");
const restify = require('restify');
const axios = require('axios');
const server = restify.createServer();

async function askQnAMaker(message) {
  // QNA_AUTH
  const URL = `https://gooseman-bot-qna-maker.azurewebsites.net/qnamaker/knowledgebases/${process.env.KB_ID}/generateAnswer`

  const response = await axios.post(
    URL,
    {
      question: message,
    },
    {
      headers: {
        Authorization: `EndpointKey ${process.env.QNA_AUTH}`,
      },
    }
  );

  const answers = response.data.answers;

  if( answers.length > 0 ) {
    const possibleAnswer = answers[0];
    if(possibleAnswer.score > 85) {
      return possibleAnswer.answer;
    }
  }

  return '';
}

function respond(req, res, next) {
  res.send('I am Alive!!!');
  next();
}

server.get('/', respond);

server.listen(8080, function() {
  console.log('%s listening at %s', server.name, server.url);
});

ComfyJS.onChat = async (user, message) => {
  if (user.toLowerCase() === 'gooseman_bot' || user.toLowerCase() === 'streamelements') {
    return;
  }

  if (message == 'Kappa') {
    ComfyJS.Say('KappaPride');
  } else {
    const answer = await askQnAMaker(message);
    if (answer.length > 0) {
      const formattedAnswer = answer.replace('{user}', `${user}`);
      ComfyJS.Say(formattedAnswer);
    }
  }
}

ComfyJS.onCommand = ( user, command, message, flags, extra ) => {
  if( command === "test" ) {
    console.log( "!test was typed in chat" );
    ComfyJS.Say( `${user} said ${message}` );
  }
}

ComfyJS.Init( 'Gooseman_Bot', process.env.OAUTH, 'talk2megooseman' );
