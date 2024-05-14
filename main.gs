const errorlog = []

function checkAllPlaylists() {
  const startTime = new Date()

  const playlistSpreadsheet = SpreadsheetApp.getActiveSpreadsheet()
  const playlistSheet = playlistSpreadsheet.getSheetByName("Contributor Playlists")
  const changelogSheet = playlistSpreadsheet.getSheetByName("Playlists Changelog")

  const formSpreadsheet = SpreadsheetApp.openById("1rKis0NkF_v5YLzveQ1e1MQMbDgjTpRUPkIdk-6PB12Q")
  const formSheet = formSpreadsheet.getSheetByName("Contributor Playlists")
  let row = formSheet.getLastRow()
  let status

  do {
    status = formSheet.getRange(row, 3).getValue()

    if (status === "") {
      const newPlaylists = formSheet.getRange(row, 2).getValue().replace(/ /g, "").split(",")

      for (const i in newPlaylists) {
        newPlaylists[i] = newPlaylists[i].replace("&feature=youtu.be", "").replace(/h.*list=/, "").replace(/\(.*/, "").trim()

        const playlistId = newPlaylists[i]
        const playlistIds = playlistSheet.getRange(2, 1, playlistSheet.getLastRow() - 1).getValues()
        const index = playlistIds.findIndex(id => id === playlistId)

        const emailAddress = "a.k.zamboni@gmail.com"
        const subject = "SiIvaGunner Contributor Playlists Update"
        const message = "New ID: " + playlistId + " [" + playlistId.length + "]"

        console.log(message)
        MailApp.sendEmail(emailAddress, subject, message)

        if (index !== -1) {
          formSheet.getRange(row, 3).setValue("Failed")
          console.log("Duplicate playlist ID: " + playlistId)
          errorlog.push("Duplicate playlist ID: " + playlistId)
        } else {
          const playlistDetails = getPlaylistDetails(playlistId, true)
          playlistSheet.insertRowBefore(2)
          playlistSheet.getRange(2, 1).setValue(playlistDetails[0])
          playlistSheet.getRange(2, 2).setValue(playlistDetails[1])
          playlistSheet.getRange(2, 3).setValue(playlistDetails[2])
          playlistSheet.getRange(2, 4).setValue(playlistDetails[3].toString().replace(/,/g, ", "))
          playlistSheet.getRange(2, 5).setValue(playlistDetails[4])
          playlistSheet.getRange(2, 6).setValue(playlistDetails[5].toString().replace(/,/g, ", "))
          playlistSheet.getRange(2, 7).setValue(playlistDetails[6])
          playlistSheet.getRange(2, 8).setValue(formatDate(new Date()))
          playlistSheet.getRange(2, 1, playlistSheet.getLastRow() - 1, playlistSheet.getLastColumn()).sort({ column: 3, ascending: true })
          formSheet.getRange(row, 3).setValue("Checked")
        }
      }
    }
  } while (--row > 1 && status === "")

  row = 2
  const lastRow = playlistSheet.getLastRow()
  let currentTime

  do {
    const changelog = []
    let playlistDetails = []

    const playlistId = playlistSheet.getRange(row, 1).getValue()
    const playlistTitle = playlistSheet.getRange(row, 2).getValue()
    const contributor = playlistSheet.getRange(row, 3).getFormula()
    const videoIds = playlistSheet.getRange(row, 6).getValue().toString().split(", ")
    let status = playlistSheet.getRange(row, 7).getValue()

    const url = "https://www.youtube.com/oembed?url=https://www.youtube.com/playlist?list=" + playlistId + "&format=json"
    let responseCode

    do {
      try {
        responseCode = UrlFetchApp.fetch(url, { muteHttpExceptions: true }).getResponseCode()
      } catch (e) {
        console.warn(e)
        Utilities.sleep(10000)
      }
    } while (responseCode === undefined)

    console.log("Row " + row + ": " + playlistTitle + " (" + responseCode + ")")

    switch (responseCode) {
      case 200:
        if (status !== "Public" && status !== "Unlisted") {
          playlistSheet.getRange(row, 7).setValue("Public")
          changelog.push("The playlist has been made public.")
          status = "Public"
        }
        break
      case 401:
        break
      case 403:
        if (status !== "Private") {
          playlistSheet.getRange(row, 7).setValue("Private")
          changelog.push("The playlist has been made private.")
          status = "Private"
        }
        break
      case 404:
        if (status !== "Deleted") {
          playlistSheet.getRange(row, 7).setValue("Deleted")
          changelog.push("The playlist has been deleted.")
          status = "Deleted"
        }
        break
      default:
        errorlog.push("Response code " + responseCode + "\n[" + playlistTitle + "]\n[" + url + "]")
    }

    if (status === "Public" || status === "Unlisted") {
      const channel = playlistSheet.getRange(row, 4).getValue()

      if (channel === "Ignore") {
        playlistDetails = getPlaylistDetails(playlistId, true)
      } else {
        playlistDetails = getPlaylistDetails(playlistId, false)
      }

      if (playlistDetails[1] !== playlistTitle) {
        console.log("Setting playlist title " + playlistDetails[1])
        changelog.push("Old playlist title: " + playlistTitle + "\nNew playlist title: " + playlistDetails[1])
        playlistSheet.getRange(row, 2).setValue(playlistDetails[1])
      }

      if (playlistDetails[2] !== contributor) {
        console.log("Setting contributor " + playlistDetails[2])
        changelog.push("Old contributor name: " + contributor.replace(/.*", "/g, "").replace("\")", "") +
          "\nNew contributor name: " + playlistDetails[2].replace(/.*", "/g, "").replace("\")", ""))
        playlistSheet.getRange(row, 3).setValue(playlistDetails[2])
      }

      if (playlistDetails[5].toString() !== videoIds.toString()) {
        console.log(videoIds)
        console.log(playlistDetails[5])

        for (const k in playlistDetails[5]) {
          const index = videoIds.findIndex(id => id === playlistDetails[5][k])

          if (index === -1) {
            changelog.push(formatHyperlink("Added " + playlistDetails[5][k], "https://www.youtube.com/watch?v=" + playlistDetails[5][k]))
          }
        }

        for (const k in videoIds) {
          const index = playlistDetails[5].findIndex(id => id === videoIds[k])

          if (index === -1) {
            changelog.push(formatHyperlink("Removed " + videoIds[k], "https://www.youtube.com/watch?v=" + videoIds[k]))
          }
        }

        if (playlistDetails[3] !== "Ignore") {
          playlistSheet.getRange(row, 4).setValue(playlistDetails[3].toString().replace(/,/g, ", "))
        }

        playlistSheet.getRange(row, 5).setValue(playlistDetails[4])
        playlistSheet.getRange(row, 6).setValue(playlistDetails[5].toString().replace(/,/g, ", "))
      }
    } else {
      playlistDetails[0] = formatHyperlink(playlistId, "https://www.youtube.com/playlist?list=" + playlistId)
      playlistDetails[1] = playlistTitle
      playlistDetails[2] = contributor
    }

    if (changelog.length > 0) {
      for (const i in changelog) {
        changelogSheet.insertRowBefore(2)
        changelogSheet.getRange(2, 1).setValue(playlistDetails[0])
        changelogSheet.getRange(2, 2).setValue(playlistDetails[1])
        changelogSheet.getRange(2, 3).setValue(changelog[i])
        changelogSheet.getRange(2, 4).setValue(playlistDetails[2])

        if (changelog[i].indexOf("Added") !== -1 || changelog[i].indexOf("Removed") !== -1) {
          const videoId = changelog[i].replace(/.*v=/g, "").replace(/".*/g, "")

          try {
            const videoResponse = YouTube.Videos.list("snippet", { id: videoId, maxResults: 1, type: 'video' })

            const video = videoResponse.items[0].snippet
            const channel = cleanString(video.channelTitle)

            changelogSheet.getRange(2, 5).setValue(channel)
          } catch (e) {
            errorlog.push(videoId + "\n" + e)
            changelogSheet.getRange(2, 5).setValue("Unknown")
          }
        } else {
          changelogSheet.getRange(2, 5).setValue("n/a")
        }

        const logDate = formatDate(new Date())
        changelogSheet.getRange(2, 6).setValue(logDate)
        playlistSheet.getRange(row, 8).setValue(logDate)
      }
    }

    currentTime = new Date()
  } while (++row <= lastRow && currentTime.getTime() - startTime.getTime() < 300000) // Run for 5 minutes.

  if (errorlog.length > 0) {
    // Send an email notifying of any changes or errors.
    const emailAddress = "a.k.zamboni@gmail.com"
    const subject = "SiIvaGunner Contributor Playlists Update"
    const changeCount = errorlog.length
    const message = "[https://docs.google.com/spreadsheets/d/13UJWz8wWSVADkMW_lW8nkQFcez6T7xuDw3_IrMuez2g/edit#gid=1039083277]\nThere are " + changeCount + " updates.\n\n" + errorlog.join("\n\n")

    MailApp.sendEmail(emailAddress, subject, message)
    console.log("Email successfully sent.\n" + message)
  }
}
