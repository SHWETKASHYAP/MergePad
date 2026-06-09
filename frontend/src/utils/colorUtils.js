export function getColorFromUsername(username) {
  let hash = 0
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = (Math.abs(hash) * 137) % 360
  return `hsl(${hue}, 70%, 60%)`
}
