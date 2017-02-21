'use strict'

var ghTokenInput = document.getElementById('github_api_token')
var statusEl = document.getElementById('status')

function getKey () {
  return new Promise(function (resolve) {
    chrome.storage.local.get('ghAPIKey', function (items) {
      resolve(items.ghAPIKey)
    })
  })
}

function setKey (key) {
  return new Promise(function (resolve) {
    chrome.storage.local.set({
      ghAPIKey: key
    }, function () {
      resolve(key)
    })
  })
}

function saveOptions () {
  setKey(ghTokenInput.value).then(function handleOptionsSaved () {
    statusEl.classList.add('is-visible')
    statusEl.innerHTML = '<span>Options saved successfully</span>'
    setTimeout(function () {
      statusEl.classList.remove('is-visible')
    }, 3000)
  })
}

// Set token to input if it was saved
getKey().then(function maybeSetInput (key) {
  if (key) {
    ghTokenInput.value = key
  }
})

ghTokenInput.addEventListener('keyup', saveOptions)
