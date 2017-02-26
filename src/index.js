'use strict'

var MutationObserver = window.MutationObserver
var testGroups = [
  { name: 'old-timerz', key: 'github.com/dino-dna/tagadactyl', global: true, users: [ { login: 'rkelly' } ] }
]

var tdac = {
  bindClickConfigureGroupHandler: function (node) {
    node.addEventListener('click', function (evt) {
      evt.stopImmediatePropagation()
      evt.stopPropagation()
      evt.preventDefault()
      console.log('blah!')
    })
  },
  getConfigureGroupButtonHTML: function (group) {
    return '<img id="TESTGROUP" class="taga-configure" src="' + chrome.extension.getURL('gear.svg') + '" />'
  },
  getNewULNodes: function (mutations) {
    return mutations.reduce(function (collection, mutation) {
      return collection.concat(Array.prototype.filter.call(
        mutation.addedNodes,
        function isCommentBlock (domNode) {
          if (domNode.classList) return domNode.classList.contains('mention-suggestions')
        }))
    }, [])
  },
  injectGroup: function (group, ul) {
    var li = document.createElement('li'); li.classList.add('js-navigation-item')
    li.innerHTML = 'Group: ' + group.name + ' <small>' + group.users.length + ' users</small>' + this.getConfigureGroupButtonHTML(group)
    ul.appendChild(li)
    var imgNode = li.children[1]
    this.bindClickConfigureGroupHandler(imgNode)
  },
  listenForGithubMentionDropdowns: function () {
    var observer = new MutationObserver(this.processNewMentionDropdowns.bind(this))
    observer.observe(document, { attributes: true, attributeFilter: ['class', 'classList'], childList: true, subtree: true })
  },
  processNewMentionDropdowns: function (mutations) {
    var ulNodes = this.getNewULNodes(mutations)
    if (!ulNodes.length) return
    this.injectGroup(testGroups[0], ulNodes[0])
  }
}

tdac.listenForGithubMentionDropdowns()
