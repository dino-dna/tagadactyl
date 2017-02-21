'use strict'

var ghTokenInput = document.getElementById('github_api_token')

function saveOptions () {
  var ghAPIKey = ghTokenInput.value
  chrome.storage.local.set({
    ghAPIKey: ghAPIKey
  }, function handledOptionsSaved () {
    var status = document.getElementById('status')
    status.classList.add('is-visible')
    status.innerHTML = '<span>Options saved successfully</span>'
    setTimeout(function () {
      status.classList.remove('is-visible')
    }, 3000)
  })
}

ghTokenInput.addEventListener('keyup', saveOptions)

