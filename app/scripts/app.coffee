'use strict'

hwPlay = angular.module 'hwPlayUiApp', ['hwWebCore']


hwPlay.config ['$routeProvider', ($routeProvider) ->

  $routeProvider
    .when '/signup',
      templateUrl: 'views/signup.html'
      controller: 'SignupCtrl'
    .when '/me',
      templateUrl: 'views/me.html'
      controller: 'ProfileCtrl'
      reloadOnSearch: false
      access: 'player'
    .when '/start',
      templateUrl: 'views/coupons.html'
      controller: 'CouponCtrl'
      reloadOnSearch: false
      access: 'player'
    .when '/player/:playerId',
      templateUrl: 'views/player.html'
      controller: 'ProfileCtrl'
      reloadOnSearch: false
      access: 'player'
    .when '/challenge/:coupon',
      templateUrl: 'views/challenges.html'
      controller: 'ChallengeCtrl'
      access: 'player'
    .when '/sponsored',
      templateUrl: 'views/sponsored.html'
      controller: 'ChallengeCtrl'
      access: 'player'
    .when '/game/:challenge/:coupon',
      templateUrl: 'views/game.html'
      controller: 'GameCtrl'
      access: 'player'
    .when '/settings',
      templateUrl: 'views/settings.html'
      controller: 'SettingsCtrl'
      access: 'player'
    .when '/points',
      templateUrl: 'views/points.html'
      controller: 'PointsCtrl'
      access: 'player'
    .when '/tour',
      templateUrl: 'views/tour.html'
      controller: 'TourCtrl'
      access: 'player'
    .when '/password/reset/:reset',
      controller: 'PasswordCtrl'
      templateUrl: 'views/reset.html'
    .when '/social',
      templateUrl: 'views/social.html'
      controller: 'SocialCtrl'
    .when '/merchant',
      templateUrl: 'views/merchant.html'
    .when '/developer',
      templateUrl: 'views/developer.html'
    .when '/privacy',
      templateUrl: 'views/privacy.html'
    .when '/imprint',
      templateUrl: 'views/imprint.html'
    .when '/',
      name: 'landing'
      templateUrl: 'views/main.html'
    .otherwise
      redirectTo: '/'

]


hwPlay.run ['$rootScope', '$location', '$window', '$filter', 'CoreAPI', 'Socket', 'API_HOST', 'API_VERSION', ($rootScope, $location, $window, $filter, CoreAPI, Socket, API_HOST, API_VERSION) ->

  lists =
    notifications:
      limit: 12
      offset: 0
    activities:
      limit: 12
      offset: 0

  $rootScope.API = 'http://' + API_HOST + '/api/' + API_VERSION

  $rootScope.ui = 
    ready: false
    current: 0
    overlay: null
    errors: {}
    beta: {}
    step: null
    toplink: 'home'
  $rootScope.activity =
    stream: []
    notifications: []
    running: []
    players: []
  $rootScope.credentials = {}

  $rootScope.search = $location.search()

  if $rootScope.search and $rootScope.search.code and $rootScope.search.mode is 'beta'
    $rootScope.ui.beta.code = $rootScope.search.code

  $rootScope.setUser = (user) ->
    if not $rootScope.user

      $rootScope.getRunning()

      $rootScope.getActivities()

      $rootScope.getNotifications()

      Socket.on 'connected', () ->
        $rootScope.$apply () ->
          Socket.send action: 'handshake', data: email: user.email, type: 'player', otk: user.oneTimeKey
          Socket.clearQueue()

      Socket.on 'authenticated', () ->
        $rootScope.$apply () ->
          if user.following.length
            Socket.send action: 'listen', data: players: user.following

      Socket.subscribe 'activity', (message) ->
        $rootScope.$apply () ->
          if message.action.name is 'challenge/won' or message.action.name is 'sponsoredChallenge/won'
            if message.data.winner.id is $rootScope.user.id
              # FIXME
              message.read = false
              $rootScope.activity.notifications.unshift message
            else
              $rootScope.activity.stream.unshift message

          if message.action.name is 'challenge/notwon'
            message.read = false
            $rootScope.activity.notifications.unshift message

      Socket.subscribe 'player', (message) ->
        $rootScope.$apply () ->
          if message.action.name == 'follower/new'
            # FIXME
            message.read = false
            $rootScope.activity.notifications.unshift message

          if message.action.name == 'social/feedback'
            # FIXME
            message.read = false
            $rootScope.activity.notifications.unshift message

      Socket.subscribe 'challenge', (message) ->
        data = message.data
        $rootScope.$apply () ->
          for c, i in $rootScope.activity.running
            if c.id is data.challengeId
              if message.action.name is 'challenge/over'
                $rootScope.removeRunningChallenge($rootScope.activity.running[i])
              else
                dest = $rootScope.activity.running[i]
              break
          if $rootScope.challenge and $rootScope.challenge.id is data.challengeId
            dest = $rootScope.challenge
          if dest
            if message.action.name is 'player/joined'
              dest.leaderboard.push player: data.player, score: 0
              dest.slots--
            else
              for item, index in dest.leaderboard
                if data.playerId is item.player.id
                  if message.action.name is 'challenge/highscore'
                    item.score = data.score
                    break
                  if message.action.name is 'player/finished'
                    item.finished = true
            $rootScope.getRanking dest

      Socket.on 'points/changed', (data) ->
        $rootScope.user.points = data.total

      Socket.connect()

    $rootScope.user = user
    
    $rootScope.$broadcast 'gotUser', user

  $rootScope.getUser = () ->
    CoreAPI.get('/player/me')
      .success (response) ->
        if !!response.data.setName
          $location.url('/social')
        $rootScope.setUser response.data
      .error (data) ->
        $location.url('/').replace()

  $rootScope.getPlayerSuggestions = () ->
    CoreAPI.get('/player/suggest')
      .success (data) ->
        $rootScope.activity.players = data

  $rootScope.getNotifications = () ->
    CoreAPI.get('/player/notifications/list?limit=' + lists.notifications.limit + '&offset=' + lists.notifications.offset)
      .success (data) ->
        if data.length
          lists.notifications.offset += lists.notifications.limit
          $rootScope.activity.notifications.push(msg) for msg in data

  $rootScope.getActivities = () ->
    CoreAPI.get('/player/activities/list?limit=' + lists.activities.limit + '&offset=' + lists.activities.offset)
      .success (data) ->
        if data.length
          lists.activities.offset += lists.activities.limit
          $rootScope.activity.stream.push(msg) for msg in data

  $rootScope.getRunning = () ->
    CoreAPI.get('/player/running/list')
      .success (data) ->
        if data.length
          Socket.send action: 'listen', data: challenges: (c.id for c in data)
          $rootScope.activity.running = data
        else
          $rootScope.getPlayerSuggestions()

  $rootScope.muteChallenges = ->
    if $rootScope.activity.running.length
      Socket.send action: 'silence', data: challenges: (c.id for c in $rootScope.activity.running)

  $rootScope.reconnectSocket = () ->
    CoreAPI.get('/player/me')
      .success (response) ->
        $rootScope.user.oneTimeKey = response.data.oneTimeKey
        Socket.connect()

  $rootScope.closeSocket = () ->
    Socket.close()

  $rootScope.login = (data) ->
    CoreAPI.post('/player/login', data)
      .success (response) ->
        $rootScope.setUser response.data
        $location.url('/start')

  $rootScope.logout = (user) ->
    $rootScope.closeSocket()
    $rootScope.user = null
    $rootScope.activity =
      stream: []
      running: []
      notifications: []
    CoreAPI.get('/player/logout')
      .success ->
        $location.url('/')

  $rootScope.updateProfile = ->
    data = angular.copy $rootScope.ui.account
    data.address = [$rootScope.ui.account.address]
    delete data.birthday
    delete data.birthmonth
    delete data.birthyear
    data.birthDate = $rootScope.ui.account.birthyear + '-' + $rootScope.ui.account.birthmonth + '-' + $rootScope.ui.account.birthday + 'T12:00:00.000'
    CoreAPI.put('/player/me', data)
      .success (response) ->
        $rootScope.ui.overlay = 'redeem'

  $rootScope.follow = (player) ->
    # FIXME
    playerId = if player._id then player._id else player.id
    CoreAPI.put('/player/follow/' + playerId)
      .success (response) ->
        $rootScope.user.following.push playerId
        $rootScope.$broadcast 'user.follow', response.data

  $rootScope.unfollow = (player) ->
    # FIXME
    playerId = if player._id then player._id else player.id
    CoreAPI.del('/player/follow/' + playerId)
      .success () ->
        inFollwings = $rootScope.user.following.indexOf(playerId)
        if not (inFollwings is -1)
          $rootScope.$broadcast 'user.unfollow', player
          $rootScope.user.following.splice inFollwings, 1

  $rootScope.checkFollow = (player) ->
    playerId = null
    if player
      # FIXME
      playerId = if player._id then player._id else player.id
    if $rootScope.user and playerId isnt null
      $rootScope.user.following.indexOf(playerId) > -1
    else
      false

  $rootScope.seenNotifications = () ->
    CoreAPI.get('/player/notifications/read')
      .success (response) ->
        for notification in $rootScope.activity.notifications
          notification.read = true

  $rootScope.getAvatar = (image) ->
    if image
      image
    else
      '/upload/avatar.png'

  $rootScope.updateAvatar = (data) ->
    CoreAPI.put('/player/me', images: large: data.logo, thumb: data.logo)
      .success (response) ->
        if not $rootScope.user
          $rootScope.user =
            images: {}
        $rootScope.user.images.thumb = data.logo + '?' + new Date().getTime()

  $rootScope.goToPlayer = (player) ->
    # FIXME
    playerId = if player._id then player._id else player.id
    if playerId
      $location.url('/player/' + playerId)

  $rootScope.chooseCoupon = (coupon) ->
    $rootScope.ui.pointsRequired = 0
    if coupon.pointsRequired <= $rootScope.user.points
      $location.url('/challenge/' + coupon._id)
      $rootScope.closeOverlay()
    else
      $rootScope.ui.pointsRequired = coupon.pointsRequired
      $rootScope.ui.overlay = 'nopoints'

  $rootScope.addRunningChallenge = (challenge) ->
    if challenge.challengeEndsAt
      challenge.stopAt = challenge.challengeEndsAt
    $rootScope.activity.running.unshift challenge
    challenge

  $rootScope.removeRunningChallenge = (challenge) ->
    pos = $rootScope.activity.running.indexOf challenge
    if pos isnt -1
      if $rootScope.challenge and (challenge.id is $rootScope.challenge.id)
        $rootScope.challenge = angular.copy $rootScope.activity.running[pos]
      $rootScope.activity.running.splice pos, 1
    if !$rootScope.activity.running.length
      $rootScope.getPlayerSuggestions()

  $rootScope.getRanking = (challenge) ->
    if challenge.leaderboard
      challenge.leaderboard.sort (a, b) ->
        b.score - a.score
      for player, index in challenge.leaderboard
        if player.player and (player.player.id is $rootScope.user.id)
          challenge.rank = index + 1
          break
    challenge

  $rootScope.upload = (image) ->
    if image
      $rootScope.ui.userImage = image.url + '?' + new Date().getTime()

  $rootScope.loadPopup = (path) ->
    if $rootScope.search and $rootScope.search.code
      path += '/' + $rootScope.search.code + '/' + $rootScope.search.entity
    $window.open($rootScope.API + '/player/' + path, 'popup', 'top=150,left=150,innerHeight=400,innerWidth=600,location=no,menubar=no,resizable=no,status=no,toolbar=no')

  $rootScope.closeOverlay = ->
    $rootScope.ui.overlay = null

  $rootScope.showResult = (challenge) ->
    CoreAPI.get('/challenge/leaderboard/' + challenge.id)
      .success (data) ->
        challenge.leaderboard = data
    $rootScope.challenge = challenge
    if challenge.campaign.affiliatePointsWin
      $rootScope.challenge.points = [challenge.campaign.affiliatePointsWin]
    $rootScope.ui.overlay = 'result'

  $rootScope.closeResult = ->
    $rootScope.challenge = null
    $rootScope.closeOverlay()

  $rootScope.requestCode = (contact) ->
    CoreAPI.get('/player/signup/beta/' + contact.email)
      .success ->
        $rootScope.ui.beta.requested = true

  $rootScope.resetPassword = (account) ->
    $rootScope.ui.errors.pwreset = false
    CoreAPI.get('/player/account/password/reset/?email=' + account.email)
      .success ->
        $rootScope.ui.showReset = false
        $rootScope.closeOverlay()
      .error ->
        $rootScope.ui.errors.pwreset = true

  newTry = () ->
    $rootScope.$emit 'requireUser'

  $rootScope.$on 'requireUser', ->
    if $rootScope.user
      $rootScope.$broadcast 'gotUser', $rootScope.user
    else
      $window.setTimeout newTry, 400

  $rootScope.$on '$routeChangeStart', (evt, next, current) ->
    $rootScope.ui.ready = false
    # restricted route
    if next.name is 'landing'
      $rootScope.getUser()
        .success () ->
          $location.url('/start')
    if next.access is 'player'
      if not $rootScope.user
        $rootScope.getUser()
          .success (data) ->
            if !$rootScope.user.seenTour
              $location.url('/tour').replace()
            $rootScope.ui.ready = true
      else
        $rootScope.ui.ready = true
    # public
    else
      $rootScope.ui.ready = true
    if $window._gaq and $location.path().length > 1
      $window._gaq.push ['_trackPageview', $location.path()]

  $rootScope.$on '$destroy', () ->
    $rootScope.closeSocket()

]


hwPlay.controller 'SettingsCtrl', ['$scope', 'CoreAPI', ($scope, CoreAPI) ->

  $scope.profile = {}

  $scope.setProfile = (user) ->
    $scope.profile =
      firstName: user.firstName
      lastName: user.lastName
      address: [city: user.city || '']
      publicName: user.publicName
      publicAge: user.publicAge
      publicWins: user.publicWins
      emailNotifications: user.emailNotifications
      emailUpdates: user.emailUpdates
      emailNewsletters: user.emailNewsletters

  $scope.updateProfile = () ->
    CoreAPI.put('/player/me', $scope.profile)
      .success (response) ->
        $scope.setUser(response.data)

  $scope.$on 'gotUser', (evt, user) ->
    $scope.setProfile user

  $scope.$emit 'requireUser'

]


hwPlay.controller 'PointsCtrl', ['$scope', 'CoreAPI', ($scope, CoreAPI) ->

  requested = false

  $scope.tab = 'invite'

  $scope.setTab = (tab) ->
    $scope.tab = tab

  $scope.sendFeedback = (message) ->
    CoreAPI.post('/player/feedback', feedback: message)
    $scope.ui.feedback = true

  $scope.checkLike = ->
    CoreAPI.get('/player/facebook/like')

  $scope.$on 'gotUser', (evt, user) ->
    if not requested
      requested = true
      CoreAPI.get('/player/' + $scope.user.id + '/coupons/won?limit=1')
        .success (data) ->
          if data.length
            $scope.lastCoupon = data[0]

  $scope.$emit 'requireUser'

]


hwPlay.controller 'ProfileCtrl', ['$scope', '$routeParams', '$location', 'CoreAPI', ($scope, $routeParams, $location, CoreAPI) ->

  lists =
    wins:
      limit: 10
      offset: 0
      attr: 'won'
      end: false
    offers:
      limit: 10
      offset: 0
      attr: 'second'
      end: false

  setRatio = (all, won) ->
    ratio = won / all
    $scope.showsecond = false
    if ratio > 0.5
      $scope.firstrotation = 180
      $scope.secondrotation = ratio * 360 | 0
      $scope.showsecond = true
    else
      $scope.firstrotation = ratio * 360 | 0

  $scope.tab = null

  $scope.account = {}

  $scope.location = $location

  $scope.profile =
    followers: []
    following: []
    wonCoupons: []
    wonOffers: []
    followList: null
    followerList: null

  $scope.setCoupon = (coupon) ->
    if coupon
      coupon.flip = false
    $scope.activeCoupon = coupon

  $scope.setWinlist = (list) ->
    $scope.setCoupon null
    if list is 'offers'
      $scope.winList = $scope.profile.wonOffers
    else
      $scope.winList = $scope.profile.wonCoupons
    $scope.activeList = list
    $scope.getWins()
    $scope.activeCoupon = $scope.winList[0]

  $scope.getWins = ->
    params = lists[$scope.activeList]
    if not params.end
      uId = if $routeParams.playerId then '/' + $routeParams.playerId else ''
      CoreAPI.get('/player' + uId + '/coupons/' + params.attr + '?limit=' + params.limit + '&offset=' + params.offset)
        .success (data) ->
          if data.length
            if data.length == params.limit
              params.offset = params.offset + params.limit
            else
              params.end = true
            # FIXME
            $scope.winList.push(win) for win in data
            $scope.setCoupon $scope.winList[0]
          else
            params.end = true

  $scope.getFollowers = ->
    uId = if $routeParams.playerId then '/' + $routeParams.playerId else ''
    CoreAPI.get('/player/followers' + uId)
      .success (response) ->
        $scope.profile.followerList = response.data

  $scope.getFollowing = ->
    uId = if $routeParams.playerId then '/' + $routeParams.playerId else ''
    CoreAPI.get('/player/following' + uId)
      .success (response) ->
        $scope.profile.followList = response.data

  $scope.setTab = (tab, search) ->
    if search
      $location.search tab: tab
    else
      $scope.tab = tab

  $scope.redeem = (coupon) ->
    CoreAPI.get('/player/coupons/redeem/' + coupon.id)
      .success (data) ->
        $scope.ui.redeem = data.realId
        $scope.ui.overlay = 'redeem'
      .error ->
        $scope.ui.account = 
          firstName: $scope.user.firstName
          lastName: $scope.user.lastName
          gender: $scope.user.gender
          address: $scope.user.address || {}
        $scope.ui.overlay = 'profile'

  $scope.$watch 'location.search()', (val) ->
    if val and val.tab
      if val.tab is 'wins'
        if $scope.ui.showOffers
          $scope.ui.showOffers = false
          $scope.setWinlist('offers')
        else
          $scope.setWinlist('wins')
      if val.tab is 'followers'
        $scope.getFollowers()
      if val.tab is 'following'
        $scope.getFollowing()
      $scope.setTab val.tab

  # Player Profile
  if $routeParams.playerId
    # Is it me?
    if $scope.user and ($scope.user.id is $routeParams.playerId)
      $location.replace().url('/me')
    else
      CoreAPI.get('/player/you/' + $routeParams.playerId)
        .success (data) ->
          angular.extend $scope.profile, data
          # FIXME
          $scope.profile.followersCount = data.followers.length
          $scope.profile.followingCount = data.following.length
          $scope.profile.age = (new Date() - Date.parse(data.birthday)) / 31536000000 | 0
          setRatio($scope.profile.participatedCount, $scope.profile.wonCouponsCount)

  # My Profile
  else
    requested = false
    $scope.$on 'gotUser', (evt, user) ->
      if not requested
        requested = true
        CoreAPI.get('/player/statistics/game')
          .success (data) ->
            $scope.profile.statistics = data
            # FIXME
            if data.length < 4
              fill = [0..(4 - data.length)]
              $scope.profile.statistics.push({}) for i in fill
        $scope.user.age = (new Date() - Date.parse($scope.user.birthday)) / 31536000000 | 0
        setRatio(user.participatedCount, user.wonCouponsCount)

    $scope.$emit 'requireUser'

  $scope.flipCoupon = (coupon) ->
    coupon.flip = !coupon.flip

]


hwPlay.controller 'CouponCtrl', ['$scope', '$location', 'CoreAPI', ($scope, $location, CoreAPI) ->

  position = { lat: 52.4952592, lng: 13.360984 }

  $scope.coupons = null

  CoreAPI.post('/player/coupons', position)
    .success (data) ->
      $scope.coupons = data.coupons
    .error ->
      $scope.coupons = []

  $scope.showDetail = (coupon) ->
    $scope.ui.coupon = coupon
    $scope.ui.overlay = 'detail'

]

hwPlay.controller 'ChallengeCtrl', ['$scope', '$routeParams', '$location', 'CoreAPI', ($scope, $routeParams, $location, CoreAPI) ->

  $scope.challenges = null

  getChallenges = ->
    url = if $routeParams.coupon then '/player/challenges/' + $routeParams.coupon + '/browser' else '/player/coupons/sponsored/browser'
    CoreAPI.get(url)
      .success (data) ->
        $scope.challenges = data.challenges
      .error ->
        $location.url('/start').replace()

  getChallenges()

  $scope.flipChallenge = (challenge) ->
    if !challenge.flip
      if challenge.id
        CoreAPI.get('/challenge/leaderboard/' + challenge.id)
          .success (data) ->
            challenge.leaderboard = data
            challenge.fetched = true
      else
        challenge.fetched = true
    for c in $scope.challenges
      if c.id != challenge.id
        c.flip = false
    challenge.flip = !challenge.flip

  $scope.showManual = (game) ->
    $scope.ui.manual = game.description
    $scope.ui.overlay = 'manual'

  $scope.enterChallenge = (challenge) ->
    if challenge.challenge
      if $routeParams.coupon
        $location.url('/game/' + challenge.id + '/' + $routeParams.coupon).replace()
      else
        $location.url('/game/' + challenge.id + '/' + challenge.campaign._id).replace()
    else
      $location.url('/game/new/' + challenge.game.id + '-' + challenge.campaign._id).replace()

]


hwPlay.controller 'GameCtrl', ['$scope', '$routeParams', '$location', 'CoreAPI', 'Socket', ($scope, $routeParams, $location, CoreAPI, Socket) ->

  Socket.check()

  $scope.muteChallenges()

  $scope.loaded = false

  initSocketListener = () ->
    Socket.on 'game/started', (data) ->
      if data.challengeId is $scope.challenge.challenge
        $scope.$apply ->
          $scope.countdown = $scope.challenge.game.playTime

    Socket.on 'player/joined', (data) ->
      if data.challengeId is $scope.challenge.challenge
        $scope.$apply ->
          $scope.challenge.leaderboard.push player: data.player, score: 0

    Socket.on 'challenge/highscore', (data) ->
      if data.challengeId is $scope.challenge.challenge
        $scope.$apply ->
          for item, index in $scope.challenge.leaderboard
            if data.playerId is item.player.id
              item.score = data.score

    Socket.on 'player/finished', (data) ->
      if data.challengeId is $scope.challenge.challenge
        $scope.$apply ->
          for item, index in $scope.challenge.leaderboard
            if data.playerId is item.player.id
              item.finished = true

    Socket.on 'game/over', (data) ->
      if data.challengeId is $scope.challenge.challenge
        $scope.$apply ->
          $scope.$broadcast 'gameover'

    Socket.send action: 'listen', data: challenges: [$scope.challenge.challenge]

  setGame = (data) ->
    conf =
      challenge: data.challenge
      level: 1
      key: data.ek
    param = Base64.encode JSON.stringify conf
    #host = 'http://localhost:9000/games/fruit/'
    host = data.game.browserAttributes[0].url
    $scope.host = host + '?' + param

  if $routeParams.challenge and $routeParams.coupon

    if $routeParams.challenge is 'new'

      params = $routeParams.coupon.split '-'

      CoreAPI.put('/challenge/open/' + params[0] + '/' + params[1])
        .success (data) ->

          setGame(data)
          $scope.challenge = data
          initSocketListener()
          $scope.running = true

        .error () ->
          $location.url('/start').replace()

    else

      CoreAPI.put('/challenge/enter/' + $routeParams.challenge + '/' + $routeParams.coupon)
        .success (data) ->

          if data.campaign.affiliatePointsWin
            $scope.points = [data.campaign.affiliatePointsWin]

          setGame(data)
          $scope.challenge = data
          initSocketListener()
          $scope.running = true

        .error () ->
          $location.url('/start').replace()

  $scope.startGame = (score) ->
    CoreAPI.get('/challenge/start/' + $scope.challenge.challenge)

  $scope.sendScore = (score) ->
    Socket.send action: 'highscore', data: score

  $scope.finishGame = () ->
    if $scope.running

      Socket.off 'game/started'
      Socket.off 'player/joined'
      Socket.off 'challenge/highscore'
      Socket.off 'player/finished'
      Socket.off 'game/over'

      result = $scope.challenge
      # FIXME
      result.id = $scope.challenge.challenge

      CoreAPI.get('/challenge/finish/' + $scope.challenge.challenge)

      $scope.getRunning()
        .success (data) ->
          # FIXME
          if data[0].id is result.id
            $scope.showResult data[0]
          else
            $scope.showResult result

      $scope.running = false

      if $scope.challenge.campaign.affiliatePointsWin
        $location.url('/sponsored').replace()
      else
        $location.url('/start').replace()

  $scope.$on '$destroy', () ->
    Socket.off 'game/started'

]


hwPlay.controller 'SignupCtrl', ['$scope', '$location', 'CoreAPI', ($scope, $location, CoreAPI) ->

  $scope.error = {}
  $scope.profile = {}
  $scope.account =
    address: [{}]

  if $location.search().error
    $scope.error[$location.search().error] = true

  $scope.submitSignup = () ->
    params = if $scope.search and $scope.search.code then '/' + $scope.search.code + '/' + $scope.search.entity else ''
    if $scope.signupForm.$valid
      $scope.error = {}
      CoreAPI.post('/player/signup' + params, $scope.account)
        .success ->
          $scope.showActivation = true
        .error (data, status) ->
          switch status
            when 404
              $scope.error.code = true
            when 450
              $scope.error.email = true
              $scope.error.nick = true
            when 451
              $scope.error.nick = true
            when 452
              $scope.error.email = true
            else
              $scope.error.failed = true

]


hwPlay.controller 'SocialCtrl', ['$scope', '$location', 'CoreAPI', ($scope, $location, CoreAPI) ->

  $scope.account = {}
  $scope.friends = {}

  $scope.getFriends = () ->
    CoreAPI.get('/player/friends/facebook')
      .success (data) ->
        if data.players.length is 0
          $location.url('/tour').replace()
        else
          $scope.friendList = data
          $scope.friends.follow = {}
          for player in data.players
            $scope.friends.follow[player._id] = true
      .error ->
        $location.url('/tour').replace()

  $scope.followPlayers = () ->
    players = []
    for player, checked of $scope.friends.follow
      if checked
        players.push player
    CoreAPI.put('/player/follow', players)
      .success () ->
        $scope.user.following = players
        $location.url('/tour').replace()

  $scope.createAccount = () ->
    CoreAPI.put('/player/me', $scope.account)
      .success (response) ->
        $scope.setUser(response.data)
        if !!response.data.facebook
          $scope.getFriends()
      .error () ->
        $scope.error = true

]


hwPlay.controller 'PasswordCtrl', ['$scope', '$routeParams', '$location', 'CoreAPI', ($scope, $routeParams, $location, CoreAPI) ->

  $scope.account = {}

  $scope.changePassword = ->
    $scope.error = false
    if $routeParams.reset and $scope.resetForm.$valid
      CoreAPI.post('/player/account/password/set/' + $routeParams.reset, $scope.account)
        .success ->
          $location.url('/')
          $scope.ui.overlay = 'login'
        .error ->
          $scope.error = true
    else
      $scope.error = true

]

hwPlay.controller 'TourCtrl', ['$scope', '$location', 'CoreAPI', ($scope, $location, CoreAPI) ->

  $scope.ui.overlay = 'beta'

  $scope.closeTour = ->
    CoreAPI.put('/player/tour/seen')
    $scope.ui.step = null
    $location.url('/start')

]


hwPlay.directive 'timesince', [() ->

  restrict: 'A'
  scope:
    timesince: '@'
  link: ($scope, $element, $attrs) ->

    formatDelta = (start, now) ->
      timedelta = now - start
      # more than a day
      if timedelta > 86400000
        days = timedelta / 86400000 | 0
        if days > 1
          out = 'vor ' + days + ' Tagen'
        else
          out = 'vor einem Tag'
        out
      else if timedelta > 3600000
        hours = timedelta / 3600000 | 0
        if hours > 1
          out = 'vor ' + hours + ' Stunden'
        else
          out = 'vor einer Stunde'
        out
      else if timedelta > 60000
        minutes = timedelta / 60000 | 0
        if minutes > 1
          out = 'vor ' + minutes + ' Minuten'
        else
          out = 'vor einer Minute'
        out
      else
        out = 'vor wenigen Sekunden'

    $scope.setTime = (now) ->
      if now.getTime() > $scope.start.getTime()
        $scope.timer = formatDelta($scope.start.getTime(), now.getTime())

    $attrs.$observe 'timesince', (val) ->
      if val
        now = new Date()
        $scope.start = new Date(Date.parse(val))
        $scope.setTime now

]


hwPlay.directive 'grid', [() ->

  restrict: 'A'
  scope: true
  link: ($scope, $element, $attrs) ->

    length = 0

    cols = Math.floor $element.width() / 210

    sizes = [3, 2, 3, 2, 3, 1, 2, 1, 2, 3, 2, 3, 2, 3, 1]

    $scope.grid = []

    $scope.$watch $attrs.grid + '.length', (val) ->
      if val
        col = []
        grid = []
        items = $scope.$eval $attrs.grid
        overall = items.length
        if length
          items = items.slice length
        part = if (cols < overall) then Math.floor(items.length / cols) else 1
        rest = items.length - (part * cols)
        for item, index in items
          if (index % part) is 0
            col = []
            grid.push col
          if index >= items.length - rest
            col = if grid[items.length - index - 1] then grid[items.length - index - 1] else []
          item.size = sizes[(grid.length + 1) * (index + 1) % 14]
          col.push item
        length = overall
        if $scope.grid.length
          for c, i in grid
            if $scope.grid[i]
              $scope.grid[i] = $scope.grid[i].concat c
        else
          $scope.grid = grid

]


hwPlay.directive 'listScroll', ['$window', ($window) ->

  restrict: 'A'
  scope: true
  link: ($scope, $element, $attrs) ->

    load = false

    $container = if $attrs.container then $($attrs.container) else $(window)

    getNext = () ->
      $scope.$apply ->
        if $attrs.getNext
          $scope.$eval $attrs.getNext
        else
          $scope.getNext()

    $scope.$watch $attrs.listScroll + '.length', (val) ->
      if val
        height = if $container[0].scrollHeight then $container[0].scrollHeight else $(document).height()
        $container.off('scroll.list').on 'scroll.list', () ->
          top = $container.scrollTop()
          if (top + $container.height() > height * 0.8) and !load
            load = true
            getNext()
        load = false

    $scope.$on '$destroy', ->
      $container.off('scroll.list')

]


hwPlay.directive 'login', [() ->

  restrict: 'A'
  scope: true
  link: ($scope, $element, $attrs) ->

    $scope.submitLogin = () ->
      $scope.ui.errors.login = false
      credentials = {}
      post = $element.serializeArray()
      if post.length > 1
        for field in post
          credentials[field.name] = if (field.value is 'on') then true else field.value
      $element[0].reset()
      $scope.login(credentials)
        .success () ->
          $scope.ui.overlay = null
        .error () ->
          $scope.ui.errors.login = true

]


hwPlay.directive 'appHeader', [() ->

  restrict: 'C'
  link: ($scope, $element, $attrs) ->

    close = () ->
      $scope.$apply () ->
        if $scope.ui.dropdowns.msg
          $scope.seenNotifications()
          $scope.ui.overlay = null
        $scope.ui.dropdowns = {}

    $scope.ui.dropdowns = {}

    $scope.dropDown = (evt, key) ->
      if $scope.ui.dropdowns.msg
        $scope.seenNotifications()
        $scope.ui.overlay = null
      if $scope.ui.dropdowns[key]
        $scope.ui.dropdowns = {}
      else
        if key is 'msg'
         $scope.ui.overlay = 'notifications'
        $scope.ui.dropdowns = {}
        $scope.ui.dropdowns[key] = true
        $(document).one 'click', close
      evt.stopPropagation()

]


hwPlay.directive 'player', [() ->

  restrict: 'A'
  templateUrl: 'playerTmpl'
  transclude: true
  replace: true
  #link: ($scope, $element, $attrs) ->
    
]


hwPlay.directive 'mapWidget', [() ->

  restrict: 'A'
  link: ($scope, $element, $attrs) ->

    initialConf =
      dragging: false
      touchZoom: false
      doubleClickZoom: false
      scrollWheelZoom: false
      boxZoom: false
      keyboard: false
      #zoomControl: false
      attributionControl: false

    $.ajaxSetup(
      cache: true
    )

    marker = null
    map = null

    $.getScript('/scripts/vendor/leaflet/leaflet.js')
      .success ->

        pin = L.icon(
          iconUrl: '/scripts/vendor/leaflet/images/marker-icon.png'
          iconRetinaUrl: '/scripts/vendor/leaflet/images/marker-icon-2x.png'
          iconSize: [20, 30]
          iconAnchor: [20, 30]
          popupAnchor: [-3, -76]
          shadowUrl: '/scripts/vendor/leaflet/images/marker-shadow.png'
          #shadowRetinaUrl: 'my-icon-shadow@2x.png'
          shadowSize: [30, 40]
          shadowAnchor: [20, 36]
        )

        map = L.map($element[0], initialConf)

        L.tileLayer('http://{s}.tile.cloudmade.com/95838d71054f485f9898613b0745abd5/22677/256/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map)

        if marker
          L.marker([marker.lat, marker.long], icon: pin).addTo(map)
          map.setView([marker.lat, marker.long], 13)

    $attrs.$observe 'mapWidget', (val) ->
      if val
        marker = $scope.$eval val

]


hwPlay.directive 'uiFieldCheck', [() ->

  restrict: 'C'
  scope: true
  link: ($scope, $element, $attrs) ->

    check = ->
      $scope.$apply ->
        $scope.checked = true

    $element.find('.input').on 'blur.check', check

    $scope.$on '$destroy', ->
      $element.off 'blur.check'

]


hwPlay.directive 'uiInputMatch', [() ->

  restrict: 'A'
  require: 'ngModel',
  link: ($scope, $element, $attrs, Ctrl) ->

    check = ->
      match = $element.val() is $scope.$eval $attrs.uiInputMatch
      Ctrl.$setValidity('match', match)

    $element.on 'keyup.match', () ->
      $scope.$apply ->
        check()

    $scope.$watch $attrs.uiInputMatch, (val) ->
      if val
        check()

    $scope.$on '$destroy', ->
      $element.off 'keyup.match'

]


hwPlay.directive 'uiCarousel', [() ->

  restrict: 'A'
  scope: true
  link: ($scope, $element, $attrs) ->

    $scope.items = []

    $scope.setView = () ->
      for item, index in $scope.items
        if index is $scope.ui.current
          item.klass = 'current'
        else
          item.klass = 'hidden'
      if $scope.items.length > 1
        if ($scope.ui.current + 1) < $scope.items.length
          $scope.items[$scope.ui.current + 1].klass = 'next'
        else
          $scope.items[0].klass = 'next'
      if $scope.items.length > 2
        if $scope.ui.current > 0
          $scope.items[$scope.ui.current - 1].klass = 'prev'
        else
          $scope.items[$scope.items.length - 1].klass = 'prev'

    $scope.getNext = () ->
      if $scope.ui.current < ($scope.items.length - 1)
        $scope.ui.current++
      else
        $scope.ui.current = 0
      
    $scope.getPrevious = () ->
      if $scope.ui.current > 0
        $scope.ui.current--
      else
        $scope.ui.current = $scope.items.length - 1

    $scope.select = (item) ->
      if item.klass is 'current'
        $scope.showResult(item)
      if item.klass is 'next'
        $scope.getNext()
      if item.klass is 'prev'
        $scope.getPrevious()
      $scope.setView()

    $scope.$watch $attrs.uiCarousel + '.length', (newVal, oldVal) ->
      if newVal
        items = $scope.$eval $attrs.uiCarousel
        $scope.items = items
        if $scope.ui.current >= items.length or newVal is 0
          $scope.ui.current = 0
        $scope.setView()

]


hwPlay.directive 'imageUpload', [->

  restrict: 'A'
  scope: true
  link: ($scope, $element, $attrs) ->

    $.ajaxSetup(
      cache: true
    )

    $.getScript('/components/jquery-form/jquery.form.js')
      .success ->

        $element.on 'submit.upload', (evt) ->
          evt.preventDefault()
          evt.stopPropagation()
          $element.ajaxSubmit
            url: $attrs.action
            method: 'POST'
            data: data: merchant_id: $attrs.imageUpload
            resetForm: true
            uploadProgress: (evt, pos, total, percent) ->
              $('.loadingbar').width(percent + '%')

            error: (xhr, status, err) ->
              $scope.$apply ->
                $scope.upload null

            beforeSend: ->
              $scope.$apply ->
                $scope.ui.overlay = 'crop'

            success: (data, status, xhr) ->
              #element.find('.status').remove()
              if data
                image = JSON.parse(data)
                $scope.$apply ->
                  $scope.upload(image)

    $element.find('#file').on 'change', ->
      $element.submit()

    $scope.$on '$destroy', ->
      $element.off 'submit.upload'

]


hwPlay.directive 'imageCrop', ['$http', ($http) ->

  restrict: 'A'
  scope:
    image: '@imageCrop'
    user: '@'
    cancel: '&onCancel'
    update: '&onSave'

  link: ($scope, $element, $attrs) ->

    jcropOptions =
      allowSelect: false
      bgOpacity: 0.4
      boxWidth: 600
      boxHeight: 400  
      minSize: [100, 100]
      aspectRatio: 1

    jcrop = null

    $.ajaxSetup( cache: true )

    $scope.init = () ->
      $.getScript('/components/jcrop/js/jquery.Jcrop.min.js')
      image = $element.find('.target').on 'load', ->
        $scope.$apply ->
          $scope.loaded = true
        height = image.height()
        width = image.width()
        if height > width
          x = width / 6 * 4 | 0
          tl = [width / 6 | 0, (height - x) / 2 | 0]
        else
          x = height / 6 * 4 | 0
          tl = [(width - x) / 2 | 0, height / 6 | 0]
        select = tl.concat([tl[0] + x, tl[1] + x])
        jcropOptions.setSelect = select

        image.Jcrop jcropOptions, ->
          jcrop = @
      
    calculateCropping = ->
      coordinates = jcrop.tellSelect()
      zoom = $element.find('.target').attr('data-zoom') || 1
      zoom = parseFloat(zoom)
      cropping = [coordinates.x, coordinates.y, coordinates.w, coordinates.h, 130, 130]
      cropping

    $scope.save = ->
      url = $scope.image.split('/').slice(-1)[0]
      cropping = calculateCropping()
      $http.post('/services/merchant/crop', data: image: url, merchant_id: $scope.user, crop: cropping)
        .success (response) ->
          $scope.update()(response.data)
          $scope.cancel()

    $scope.saveCoordinates = (type, width, height) ->
      # get the coordinates
      coordinates = jcrop.tellSelect()
      # render preview
      $scope[type + 'Coordinates'] = coordinates
      $scope[type + 'Preview'] = calculateStyle width, height, coordinates
      $scope.cancel()

    $scope.$on '$destroy', ->
      jcrop.destroy?()

]


hwPlay.directive 'game', ['$window', ($window) ->

  restrict: 'A'
  link: ($scope, $element, $attrs) ->

    timer = null
    timedelta = null
    $countdown = $('#countdown')

    countdown = () ->
      if timedelta > 0
        setTimer timedelta--
      else
        $window.clearInterval timer

    setTimer = (timedelta) ->
      minutes = timedelta / 60 | 0
      seconds = timedelta - (minutes * 60)
      if seconds < 10
        seconds = '0' + seconds
      $countdown.text minutes + ':' + seconds

    receiveMessage = (evt) ->
      msg = JSON.parse(evt.data)
      if msg.action == 'startGame'
        $scope.startGame()
      if msg.action is 'updateScore'
        $scope.sendScore(msg.score)
      if msg.action == 'finishGame'
        $scope.finishGame()

    $attrs.$observe 'game', (val) ->
      if val
        game = $('<iframe src="' + val + '" frameborder="0" name="game" class="game"></iframe>')
        game.appendTo($element).on 'load', (evt) ->
          $scope.$apply ->
            $scope.loaded = true

    $window.addEventListener 'message', receiveMessage, false

    $scope.$watch 'countdown', (val) ->
      if val
        timedelta = val
        setTimer timedelta
        timer = $window.setInterval countdown, 1000

    $scope.$on 'gameover', () ->
      game.postMessage('gameover', '*')

    $scope.$on '$destroy', ->
      if timer
        $window.clearInterval timer
      $window.removeEventListener 'message', receiveMessage, false

]
