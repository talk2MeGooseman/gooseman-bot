import * as R from 'ramda'

export const isNotEmpty = (arg) => R.not(R.isEmpty(arg))

export const pipeWhileNotEmpty = R.pipeWith((f, res) =>
  R.isEmpty(res) ? res : f(res)
)

export const pipeWhileNotEmptyOrFalse = R.pipeWith((f, res) =>
  R.isEmpty(res) && res ? res : f(res)
)

export const pipeWhileNotFalsey = R.pipeWith((f, res) => (res ? f(res) : res))
