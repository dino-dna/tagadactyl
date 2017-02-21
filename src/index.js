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
    return this.getGHAPIToken()
      .then(function (key) {
        headers.append('Authorization', 'token ' + key)
        return fetch(
          'https://api.github.com/repos/' + owner + '/' + repo + '/collaborators',
          { headers: headers }
        )
      })
      .then(function (response) { return Promise.all([response, response.json()]) })
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
      .then(function (collaborators) {
        this._cache.collaborators = collaborators
        return collaborators
      }.bind(this))
  },
  getGHAPIToken: function () {
    return new Promise(function (resolve, reject) {
      chrome.storage.local.get('ghAPIKey', function (options) {
        if (!options || !options.ghAPIKey) {
          var err = new Error('no GH key')
          err.code = 'ENOGHKEY'
          return reject(err)
        }
        return resolve(options.ghAPIKey)
      })
    })
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
  /**
   * Inject collaborators into @-tag list
   * @param {object} opts
   * @param {array} opts.collaborators GH collaborators
   * @param {array} opts.suggestedUsersNodes
   * @returns {undefined}
   */
  injectCollaborators: function (opts) {
    var collaborators = opts.collaborators
    var suggestedUsersNodes = opts.suggestedUsersNodes
    var serializedCollaborators = collaborators
      .map(function (collab, ndx) {
        return (ndx ? '@' : '') + collab.login
      })
      .join(' ')
    suggestedUsersNodes.forEach(function appendCollaborators (node) {
      var li = document.createElement('li')
      li.classList.add('js-navigation-item')
      li.setAttribute('data-value', serializedCollaborators)
      li.innerHTML = 'Collaborators <small>' + collaborators.length + ' users</small>'
      node.appendChild(li)
    })
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
    var suggestedUsersNodes = this.filterSuggestedUsers(mutations)
    if (!suggestedUsersNodes.length) return
    return this.getCollaborators()
      .then(function (collaborators) {
        return this.injectCollaborators({
          collaborators: collaborators,
          suggestedUsersNodes: suggestedUsersNodes
        })
      }.bind(this))
      .catch(function (err) {
        if (err && err.code === 'ENOGHKEY') {
          return chrome.runtime.sendMessage({ openOptionsPage: true })
        }
        throw err
      })
  }
}

tdac.listenForComments()

/*
  1a. make query for collabs
  1b. modify DOM, add <li> thing
  - listen for click/enter
    - on select, inject users
*/
