import chalk from 'chalk'

const displayUserName = (
  { userColor, displayName } = { userColor: '#ffffff' }
) => chalk.hex(userColor).bold(displayName)

export const formatChatMessage = (message, metadata) =>
  `${displayUserName(metadata)}: ${message}`
