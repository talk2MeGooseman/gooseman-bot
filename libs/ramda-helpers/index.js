const R = require('ramda')

const isNotEmpty = (arg) => R.not(R.isEmpty(arg))

const pipeWhileNotEmpty = R.pipeWith((f, res) =>
  R.isEmpty(res) ? res : f(res)
)

const pipeWhileNotFalsey = R.pipeWith((f, res) => (res ? f(res) : res))

exports.isNotEmpty = isNotEmpty
exports.pipeWhileNotFalsey = pipeWhileNotFalsey
exports.pipeWhileNotEmpty = pipeWhileNotEmpty
