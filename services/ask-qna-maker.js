import * as dotenv from 'dotenv'
import axios from 'axios'
import * as R from 'ramda'
import { isNotEmpty }  from '../libs/ramda-helpers/index.js'
import debugs from 'debug'
const debug = debugs('app-QnA')
dotenv.config()

const log = (data) => debug(data)

const emptyResponse = () => ({ data: { answers: [] } })

const URL = `https://gooseman-bot-qna-maker.azurewebsites.net/qnamaker/knowledgebases/${process.env.KB_ID}/generateAnswer`
const makeBody = (question) => ({
  question,
  isTest: true,
  scoreThreshold: 85,
  top: 1,
})

const postQuestion = (body) =>
  axios.post(URL, body, {
    headers: {
      Authorization: `EndpointKey ${process.env.QNA_AUTH}`,
    },
  })

const isValidScore = (answerObject) => R.gt(answerObject.score, 0)

const getBestAnswer = R.pipe(
  R.head,
  R.tap(log),
  R.cond([
    [isValidScore, R.prop('answer')],
    [R.T, R.always('')],
  ])
)

const processAnswers = R.cond([
  [isNotEmpty, getBestAnswer],
  [R.T, R.always('')],
])

export const askQnAMaker = R.pipe(
  makeBody,
  postQuestion,
  R.otherwise(emptyResponse),
  R.andThen(R.path(['data', 'answers'])),
  R.andThen(processAnswers)
)

