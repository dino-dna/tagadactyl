chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.openOptionsPage) chrome.runtime.openOptionsPage()
})
