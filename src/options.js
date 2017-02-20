'use strict'

var ghTokenInput = document.getElementById('github_api_token')

function saveOptions () {
  var ghAPIKey = ghTokenInput.value
  chrome.storage.local.set({
    ghAPIKey: ghAPIKey
  }, function handledOptionsSaved () {
    var status = document.getElementById('status')
    status.style.opacity = 1
    status.textContent = 'Options saved successfully'
    setTimeout(function () { status.style.opacity = 0 }, 5000)
  })
}

ghTokenInput.addEventListener('keyup', saveOptions)

