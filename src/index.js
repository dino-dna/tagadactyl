'use strict'

var MutationObserver = window.MutationObserver

var tdac = {
  _cache: {},
  /**
   * @returns {Promise<Object[],Error>}
   */
  getCollaborators: function () {
    if (this._cache.collaborators) {
      return Promise.resolve(this._cache.collaborators)
    }
    var pieces = window.location.pathname.split('/')
    var owner = pieces[1]
    var repo = pieces[2]
    var headers = new Headers()
    headers.append('Authorization', 'token a6f94a1050b486ac25b729fa833978fe95b67731')
    return fetch('https://api.github.com/repos/' + owner + '/' + repo + '/collaborators', {
      headers: headers
    })
<<<<<<< HEAD
      .then(function (response) { return response.json() })
      .then(function (collaborators) {
        this._cache.collaborators = collaborators
        return collaborators
      }.bind(this))
=======
      .then(function (response) {
        return Promise.all([response, response.json()])
      })
      .then(function (responses) {
        var response = responses[0]
        var body = responses[1]

        if (response.status < 200 || response.status >= 400) {
          var error = new Error('API responded with ' + response.status)
          error.body = body
          throw error
        }

        return body
      })
>>>>>>> a5c8c41a720b3fd2d2f81cef213f14f2127858b4
  },
  filterSuggestedUsers: function (mutations) {
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
  /**
   * Inject collaborators into @-tag list
   * @param {object} opts
   * @param {array} opts.collaborators GH collaborators
   * @param {array} opts.suggestedUsersNodes
   * @returns {undefined}
   */
  injectCollaborators: function (opts) {
    var suggestedUsersNodes = opts.suggestedUsersNodes
    suggestedUsersNodes.forEach(function appendCollaborators (node) {
      var li = document.createElement('li')
      li.classList.add('js-navigation-item')
      li.setAttribute('data-value', 'testers')
      li.innerHTML = 'Collaborators <small>3 users</small>'
      node.appendChild(li)
    })
  },
  processCommentBoxes: function (mutations) {
    var suggestedUsersNodes = this.filterSuggestedUsers(mutations)
    if (!suggestedUsersNodes.length) return
    return this.getCollaborators()
      .then(function (collaborators) {
        debugger
        return this.injectCollaborators({
          collaborators: collaborators,
          suggestedUsersNodes: suggestedUsersNodes
        })
      }.bind(this))
  }
}

tdac.listenForComments()

/*
  1a. make query for collabs
  1b. modify DOM, add <li> thing
  - listen for click/enter
    - on select, inject users
*/
