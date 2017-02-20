'use strict'

var MutationObserver = window.MutationObserver

var tdac = {
  /**
   * @returns {Promise<Object[],Error>}
   */
  getCollaborators: function () {
    var pieces = window.location.pathname.split('/')
    var owner = pieces[1]
    var repo = pieces[2]
    var headers = new Headers()
    headers.append('Authorization', 'token a6f94a1050b486ac25b729fa833978fe95b67731')
    return fetch('https://api.github.com/repos/' + owner + '/' + repo + '/collaborators', {
      headers: headers
    })
      .then(response => response.json())
  },
  filterCommentBlocks: function (mutations) {
    return mutations.reduce(function (collection, mutation) {
      return collection.concat(Array.prototype.filter.call(
        mutation.addedNodes,
        function isCommentBlock (domNode) {
          if (domNode.classList) {
            return domNode.classList.contains('mention-suggestions')
          }
        }))
    }, [])
  },
  listenForComments: function () {
    var observer = new MutationObserver(this.processCommentBoxes.bind(this))
    observer.observe(
      document,
      {
        attributes: true,
        attributeFilter: ['class', 'classList'],
        childList: true,
        subtree: true
      }
    )
  },
  processCommentBoxes: function (mutations) {
    var commentBlocks = this.filterCommentBlocks(mutations)
    if (!commentBlocks.length) return
    return Promise.all([ this.getCollaborators() ])
    .then(this.injectCollaborators.bind(this))
  }
}

tdac.listenForComments()

/*
  1a. make query for collabs
  1b. modify DOM, add <li> thing
  - listen for click/enter
    - on select, inject users
*/
