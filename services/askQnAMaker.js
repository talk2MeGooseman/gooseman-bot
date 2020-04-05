const axios = require('axios');

async function askQnAMaker(message) {
  const URL = `https://gooseman-bot-qna-maker.azurewebsites.net/qnamaker/knowledgebases/${process.env.KB_ID}/generateAnswer`;
  const response = await axios.post(URL, {
    isTest: true,
    question: message,
    scoreThreshold: 85,
    top: 1,
  }, {
    headers: {
      Authorization: `EndpointKey ${process.env.QNA_AUTH}`,
    },
  });
  const answers = response.data.answers;
  if (answers.length > 0) {
    const possibleAnswer = answers[0];
    if (possibleAnswer.score > 0) {
      return possibleAnswer.answer;
    }
  }
  return '';
}

exports.askQnAMaker = askQnAMaker;
