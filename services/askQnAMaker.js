const axios = require('axios');
const R = require('ramda');
const { isNotEmpty } = require('../libs/ramda-helpers');
const debug = require('debug')('app-QnA');

const log = (data) => debug(data);

const URL = `https://gooseman-bot-qna-maker.azurewebsites.net/qnamaker/knowledgebases/${process.env.KB_ID}/generateAnswer`;
const makeBody = (question) => ({
  question,
  isTest: true,
  scoreThreshold: 85,
  top: 1,
});

const postQuestion = (body) =>
  axios.post(URL, body, {
    headers: {
      Authorization: `EndpointKey ${process.env.QNA_AUTH}`,
    },
  });

const isValidScore = (answerObject) => R.gt(answerObject.score, 0);

const getBestAnswer = R.pipe(
  R.head,
  R.tap(log),
  R.cond([
    [isValidScore, R.path(['answer'])],
    [R.T, R.always('')],
  ])
);

const processAnswers = R.cond([
  [isNotEmpty, getBestAnswer],
  [R.T, R.always('')],
]);

const getAnswer = R.pipe(
  makeBody,
  postQuestion,
  R.andThen(R.path(['data', 'answers'])),
  R.andThen(processAnswers)
);

exports.askQnAMaker = getAnswer;
