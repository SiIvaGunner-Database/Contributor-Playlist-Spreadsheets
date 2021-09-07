
function getPlaylistDetails(playlistId, getChannels) {
  var status = "Public";
  var channels = [];
  var videoIds = [];
  var nextPageToken = "";
  
  try {
    var playlistResponse = YouTube.Playlists.list("snippet", {id: playlistId});
  }
  catch(e) {
    errorlog.push(playlistId + "\n" + e);
    Logger.log(playlistId + "\n" + e);
  }
  
  var playlist = playlistResponse.items[0].snippet;
  var playlistTitle = playlist.title;
  var contributor = playlist.channelTitle;
  var contributorId = playlist.channelId;
  
  while (nextPageToken != null) {
    try {
      var playlistItemsResponse = YouTube.PlaylistItems.list("snippet", {playlistId: playlistId, maxResults: 50, pageToken: nextPageToken});
    }
    catch(e) {
      errorlog.push(playlistId + "\n" + e);
      Logger.log(playlistId + "\n" + e);
    }
    
    for (var i = 0; i < playlistItemsResponse.items.length; i++) {
      var videoId = playlistItemsResponse.items[i].snippet.resourceId.videoId;
      videoIds.push(videoId);
      
      if (getChannels) {
        try {
          var videoResponse = YouTube.Videos.list("snippet",{id: videoId, maxResults: 1, type: 'video'});
          
          var video = videoResponse.items[0].snippet;
          var channel = video.channelTitle;
          var channelId = video.channelId;
          
          var index = channels.findIndex(title => {return title == channel});
          
          if (index == -1)
            channels.push(channel);
        }
        catch (e) {}
      }
      else channels = "Ignore";
    }
    
    var videoCount = playlistItemsResponse.pageInfo.totalResults;
    nextPageToken = playlistItemsResponse.nextPageToken;
  }
  
  return [
    formatHyperlink(playlistId, "https://www.youtube.com/playlist?list=" + playlistId), 
    playlistTitle,
    formatHyperlink(contributor, "https://www.youtube.com/channel/" + contributorId),
    channels,
    videoCount,
    videoIds,
    status
  ];
}

function formatDate(date) {
  if (typeof date == "string")
    date = date.replace("T", "   ").replace("Z", "").replace(".000Z", "");
  else 
    date = Utilities.formatDate(date, "UTC", "yyyy-MM-dd   HH:mm:ss");
  
  return date;
}

function formatHyperlink(title, url) {
  var str = '=HYPERLINK("' + url + '", "' + title + '")';
  return str;
}

function checkPlaylistsTrigger() {
  ScriptApp.newTrigger("checkAllPlaylists")
  .timeBased()
  .everyHours(4)
  .create();
}
