import chalk from 'chalk'

const displayUserName = (metadata) =>
  chalk.hex(metadata.userColor).bold(metadata.displayName)

export const formatChatMessage = (message, metadata) =>
  `${displayUserName(metadata)}: ${message}`
