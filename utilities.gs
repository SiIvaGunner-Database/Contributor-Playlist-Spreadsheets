
function getPlaylistDetails(playlistId, getChannels) {
  const status = "Public"
  const videoIds = []
  let channels = []
  let nextPageToken = ""
  let playlistResponse

  try {
    playlistResponse = YouTube.Playlists.list("snippet", { id: playlistId })
  } catch (e) {
    errorlog.push(playlistId + "\n" + e)
    console.warn(playlistId + "\n", e)
  }

  const playlist = playlistResponse.items[0].snippet
  const playlistTitle = cleanString(playlist.title)
  const contributor = cleanString(playlist.channelTitle)
  const contributorId = playlist.channelId
  let videoCount

  while (nextPageToken !== undefined) {
    let playlistItemsResponse

    try {
      playlistItemsResponse = YouTube.PlaylistItems.list("snippet", { playlistId: playlistId, maxResults: 50, pageToken: nextPageToken })
    } catch (e) {
      errorlog.push(playlistId + "\n" + e)
      console.log(playlistId + "\n", e)
    }

    for (let i = 0; i < playlistItemsResponse.items.length; i++) {
      const videoId = playlistItemsResponse.items[i].snippet.resourceId.videoId
      videoIds.push(videoId)

      if (getChannels) {
        try {
          const videoResponse = YouTube.Videos.list("snippet", { id: videoId, maxResults: 1, type: 'video' })
          const video = videoResponse.items[0].snippet
          const channel = cleanString(video.channelTitle)
          const index = channels.findIndex(title => title === channel)

          if (index === -1) {
            channels.push(channel)
          }
        } catch (e) {
          console.warn(videoId + "\n", e)
        }
      } else {
        channels = "Ignore"
      }
    }

    videoCount = playlistItemsResponse.pageInfo.totalResults
    nextPageToken = playlistItemsResponse.nextPageToken
  }

  return [
    formatHyperlink(playlistId, "https://www.youtube.com/playlist?list=" + playlistId),
    playlistTitle,
    formatHyperlink(contributor, "https://www.youtube.com/channel/" + contributorId),
    channels,
    videoCount,
    videoIds,
    status
  ]
}

function cleanString(string) {
  return string.replaceAll("=", "")
}

function formatDate(date) {
  if (typeof date === "string") {
    return date.replace("T", "   ").replace("Z", "").replace(".000Z", "")
  } else {
    return Utilities.formatDate(date, "UTC", "yyyy-MM-dd   HH:mm:ss")
  }
}

function formatHyperlink(title, url) {
  return '=HYPERLINK("' + url + '", "' + title.replaceAll('"', '""') + '")'
}
