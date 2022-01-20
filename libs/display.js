import chalk from 'chalk'

const displayUserName = ({ userColor, displayName }) =>
  chalk.hex(userColor).bold(displayName)

export const formatChatMessage = (message, metadata) =>
  `${displayUserName(metadata)}: ${message}`
