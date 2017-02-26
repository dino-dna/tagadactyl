'use strict'

var MutationObserver = window.MutationObserver
// https://gist.github.com/pbroschwitz/3891293
var supplant = function (str, kvPairs) {
  return str.replace(
    /{([^{}]*)}/g,
    function (a, b) {
      var r = kvPairs[b]
      return typeof r === 'string' || typeof r === 'number' ? r : a
    }
  )
}

// @TODO, remove post testing
var testGroups = [
  {
    name: 'old-timerz',
    key: 'github.com/dino-dna/tagadactyl',
    global: false,
    users: [
      { login: 'dylancwood' },
      { login: 'rkelly' }
    ]
  },
  {
    name: 'def',
    key: 'github.com/dino-dna/NOTTDACTYL',
    global: false,
    users: [
      { login: 'swashcap' },
      { login: 'wa11-e' }
    ]

  }
]
var tdac = {
  _cache: {
    collaborators: {}, // GH collaborators, as stated by GH service. e.g. { 'dino-dna/tagadactyl': [...] }
    groups: [] // user specified groups, e.g. [{ key: 'dino-dna/tagadactyl', name: 'mygroup', users: [...], global: boolean }]
  },
  get currentProjectKey () { return window.location.hostname + '/' + this.owner + '/' + this.repo },
  get owner () { return window.location.pathname.split('/')[1] },
  get repo () { return window.location.pathname.split('/')[2] },

  bindClickConfigureGroupHandler (node) {
    debugger
    node.addEventListener('click', function (evt) {
      evt.stopImmediatePropagation()
      evt.stopPropagation()
      evt.preventDefault()
      console.log('blah!')
    })
  },
  /**
   * Get an <li> ready for insertion into the GitHub suggestions list.
   * @param {object} opts
   * @param {string} [opts.textInjectedOnSelect] text injected into GH comments
   *   section when the <li> is selected
   * @param {HTMLLIElement} li
   */
  createListNode: function (opts) {
    opts = opts || {}
    var li = document.createElement('li')
    li.classList.add('js-navigation-item')
    li.setAttribute('data-value', opts.textInjectedOnSelect || '')
    return li
  },
  /**
   * @returns {Promise<Object[],Error>}
   */
  getCollaborators: function () {
    if (this._cache.collaborators[this.currentProjectKey]) {
      return Promise.resolve(this._cache.collaborators[this.currentProjectKey])
    }
    var headers = new Headers()
    return this.getGHAPIToken()
      .then(function (key) {
        headers.append('Authorization', 'token ' + key)
        return fetch(
          'https://api.github.com/repos/' + this.owner + '/' + this.repo + '/collaborators',
          { headers: headers }
        )
      }.bind(this))
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
        this._cache.collaborators[this.currentProjectKey] = collaborators
        return collaborators
      }.bind(this))
  },
  getConfigureGroupButtonHTML: function (group) {
    return supplant(
      '<img id={id} class="taga-configure" src="{url}" />',
      {
        id: this.mapGroupToGroupId(group),
        url: chrome.extension.getURL('gear.svg')
      }
    )
  },
  getGroups: function () {
    return new Promise(function (resolve, reject) {
      chrome.storage.local.get('groups', function (options) {
        // return resolve((options.groups || []).filter(this.shouldRenderGroup))
        resolve(testGroups.filter(this.shouldRenderGroup))
      }.bind(this))
    }.bind(this))
  },
  /**
   * @returns {Promise<string>} ghAPIKey
   */
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
  handleProcessCommentBoxesDataSourcingFail: function (err) {
    if (err && err.code === 'ENOGHKEY') {
      return chrome.runtime.sendMessage({ openOptionsPage: true })
    }
    throw err
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
    var serializedCollaborators = collaborators.map(this.mapCollaboratorToGHTag).join(' ')
    return suggestedUsersNodes.forEach(function appendCollaborators (node) {
      var tagNode = this.createListNode({ textInjectedOnSelect: serializedCollaborators })
      tagNode.innerHTML = 'Collaborators <small>' + collaborators.length + ' users</small>'
      node.appendChild(tagNode)
    }.bind(this))
  },
  /**
   * @param {object} opts {@see indexDataSources}
   * @returns {unde}
   */
  injectGroups: function (opts) {
    var groupSet = opts.groups.map(function appendGroupNode (group) {
      var serializedGroup = group.users.map(this.mapCollaboratorToGHTag).join(' ')
      var tagNode = this.createListNode({ textInjectedOnSelect: serializedGroup })
      tagNode.innerHTML = [
        'Group: ', group.name, ' <small>',
        group.users.length, ' users</small>',
        this.getConfigureGroupButtonHTML(group)
      ].join('')
      group.tagNode = tagNode
      return group
    }.bind(this))
    opts.suggestedUsersNodes.forEach(function appendGroupInjectButton (node) {
      groupSet.forEach(function (group) {
        node.appendChild(group.tagNode)
        var imgNode = group.tagNode.children[1] // @TODO robustify img selection here
        this.bindClickConfigureGroupHandler(imgNode)
      }.bind(this))
    }.bind(this))
  },
  listenForComments: function () {
    var observer = new MutationObserver(this.processCommentBoxes)
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
  mapCollaboratorToGHTag: function (collab, ndx) {
    return (ndx ? '@' : '') + collab.login
  },
  mapGroupToGroupId (group) {
    return 'group_' + group.key.replace(/\W/g, '')
  },
  processCommentBoxes: function (mutations) {
    var suggestedUsersNodes = this.filterSuggestedUsers(mutations)
    if (!suggestedUsersNodes.length) return
    var asyncSources = Promise.all([
      this.getCollaborators(),
      this.getGroups(),
      suggestedUsersNodes
    ])
      .then(function indexDataSources (datas) {
        return { collaborators: datas[0], groups: datas[1], suggestedUsersNodes: datas[2] }
      })
    // note, the below are intentionally not chained so as to provide each .then
    // full unhidered access to the datas
    asyncSources.then(this.injectCollaborators)
    asyncSources.then(this.injectGroups)
    asyncSources.catch(this.handleProcessCommentBoxesDataSourcingFail)
  },
  shouldRenderGroup: function (group) {
    return group.global || group.key === this.currentProjectKey
  }
}

// eager bind tdac members, s.t. `this` behaves more `class``like
for (var key in tdac) if (typeof tdac[key] === 'function') tdac[key] = tdac[key].bind(tdac)

tdac.listenForComments()
