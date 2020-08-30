const R = require('ramda');

const isNotEmpty = (arg) => R.not(R.isEmpty(arg));

exports.isNotEmpty = isNotEmpty;
