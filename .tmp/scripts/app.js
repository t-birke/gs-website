(function() {
  'use strict';
  var hwPlay;

  hwPlay = angular.module('hwPlayUiApp', ['hwWebCore']);

  hwPlay.config([
    '$routeProvider', function($routeProvider) {
      return $routeProvider.when('/signup', {
        templateUrl: 'views/signup.html',
        controller: 'SignupCtrl'
      }).when('/me', {
        templateUrl: 'views/me.html',
        controller: 'ProfileCtrl',
        reloadOnSearch: false,
        access: 'player'
      }).when('/start', {
        templateUrl: 'views/coupons.html',
        controller: 'CouponCtrl',
        reloadOnSearch: false,
        access: 'player'
      }).when('/player/:playerId', {
        templateUrl: 'views/player.html',
        controller: 'ProfileCtrl',
        reloadOnSearch: false,
        access: 'player'
      }).when('/challenge/:coupon', {
        templateUrl: 'views/challenges.html',
        controller: 'ChallengeCtrl',
        access: 'player'
      }).when('/sponsored', {
        templateUrl: 'views/sponsored.html',
        controller: 'ChallengeCtrl',
        access: 'player'
      }).when('/game/:challenge/:coupon', {
        templateUrl: 'views/game.html',
        controller: 'GameCtrl',
        access: 'player'
      }).when('/settings', {
        templateUrl: 'views/settings.html',
        controller: 'SettingsCtrl',
        access: 'player'
      }).when('/points', {
        templateUrl: 'views/points.html',
        controller: 'PointsCtrl',
        access: 'player'
      }).when('/tour', {
        templateUrl: 'views/tour.html',
        controller: 'TourCtrl',
        access: 'player'
      }).when('/password/reset/:reset', {
        controller: 'PasswordCtrl',
        templateUrl: 'views/reset.html'
      }).when('/social', {
        templateUrl: 'views/social.html',
        controller: 'SocialCtrl'
      }).when('/merchant', {
        templateUrl: 'views/merchant.html'
      }).when('/developer', {
        templateUrl: 'views/developer.html'
      }).when('/privacy', {
        templateUrl: 'views/privacy.html'
      }).when('/imprint', {
        templateUrl: 'views/imprint.html'
      }).when('/', {
        name: 'landing',
        templateUrl: 'views/main.html'
      }).otherwise({
        redirectTo: '/'
      });
    }
  ]);

  hwPlay.run([
    '$rootScope', '$location', '$window', '$filter', 'CoreAPI', 'Socket', 'API_HOST', 'API_VERSION', function($rootScope, $location, $window, $filter, CoreAPI, Socket, API_HOST, API_VERSION) {
      var lists, newTry;
      lists = {
        notifications: {
          limit: 12,
          offset: 0
        },
        activities: {
          limit: 12,
          offset: 0
        }
      };
      $rootScope.API = 'http://' + API_HOST + '/api/' + API_VERSION;
      $rootScope.ui = {
        ready: false,
        current: 0,
        overlay: null,
        errors: {},
        beta: {},
        step: null,
        toplink: 'home'
      };
      $rootScope.activity = {
        stream: [],
        notifications: [],
        running: [],
        players: []
      };
      $rootScope.credentials = {};
      $rootScope.search = $location.search();
      if ($rootScope.search && $rootScope.search.code && $rootScope.search.mode === 'beta') {
        $rootScope.ui.beta.code = $rootScope.search.code;
      }
      $rootScope.setUser = function(user) {
        if (!$rootScope.user) {
          $rootScope.getRunning();
          $rootScope.getActivities();
          $rootScope.getNotifications();
          Socket.on('connected', function() {
            return $rootScope.$apply(function() {
              Socket.send({
                action: 'handshake',
                data: {
                  email: user.email,
                  type: 'player',
                  otk: user.oneTimeKey
                }
              });
              return Socket.clearQueue();
            });
          });
          Socket.on('authenticated', function() {
            return $rootScope.$apply(function() {
              if (user.following.length) {
                return Socket.send({
                  action: 'listen',
                  data: {
                    players: user.following
                  }
                });
              }
            });
          });
          Socket.subscribe('activity', function(message) {
            return $rootScope.$apply(function() {
              if (message.action.name === 'challenge/won' || message.action.name === 'sponsoredChallenge/won') {
                if (message.data.winner.id === $rootScope.user.id) {
                  message.read = false;
                  $rootScope.activity.notifications.unshift(message);
                } else {
                  $rootScope.activity.stream.unshift(message);
                }
              }
              if (message.action.name === 'challenge/notwon') {
                message.read = false;
                return $rootScope.activity.notifications.unshift(message);
              }
            });
          });
          Socket.subscribe('player', function(message) {
            return $rootScope.$apply(function() {
              if (message.action.name === 'follower/new') {
                message.read = false;
                $rootScope.activity.notifications.unshift(message);
              }
              if (message.action.name === 'social/feedback') {
                message.read = false;
                return $rootScope.activity.notifications.unshift(message);
              }
            });
          });
          Socket.subscribe('challenge', function(message) {
            var data;
            data = message.data;
            return $rootScope.$apply(function() {
              var c, dest, i, index, item, _i, _j, _len, _len1, _ref, _ref1;
              _ref = $rootScope.activity.running;
              for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
                c = _ref[i];
                if (c.id === data.challengeId) {
                  if (message.action.name === 'challenge/over') {
                    $rootScope.removeRunningChallenge($rootScope.activity.running[i]);
                  } else {
                    dest = $rootScope.activity.running[i];
                  }
                  break;
                }
              }
              if ($rootScope.challenge && $rootScope.challenge.id === data.challengeId) {
                dest = $rootScope.challenge;
              }
              if (dest) {
                if (message.action.name === 'player/joined') {
                  dest.leaderboard.push({
                    player: data.player,
                    score: 0
                  });
                  dest.slots--;
                } else {
                  _ref1 = dest.leaderboard;
                  for (index = _j = 0, _len1 = _ref1.length; _j < _len1; index = ++_j) {
                    item = _ref1[index];
                    if (data.playerId === item.player.id) {
                      if (message.action.name === 'challenge/highscore') {
                        item.score = data.score;
                        break;
                      }
                      if (message.action.name === 'player/finished') {
                        item.finished = true;
                      }
                    }
                  }
                }
                return $rootScope.getRanking(dest);
              }
            });
          });
          Socket.on('points/changed', function(data) {
            return $rootScope.user.points = data.total;
          });
          Socket.connect();
        }
        $rootScope.user = user;
        return $rootScope.$broadcast('gotUser', user);
      };
      $rootScope.getUser = function() {
        return CoreAPI.get('/player/me').success(function(response) {
          if (!!response.data.setName) {
            $location.url('/social');
          }
          return $rootScope.setUser(response.data);
        }).error(function(data) {
          return $location.url('/').replace();
        });
      };
      $rootScope.getPlayerSuggestions = function() {
        return CoreAPI.get('/player/suggest').success(function(data) {
          return $rootScope.activity.players = data;
        });
      };
      $rootScope.getNotifications = function() {
        return CoreAPI.get('/player/notifications/list?limit=' + lists.notifications.limit + '&offset=' + lists.notifications.offset).success(function(data) {
          var msg, _i, _len, _results;
          if (data.length) {
            lists.notifications.offset += lists.notifications.limit;
            _results = [];
            for (_i = 0, _len = data.length; _i < _len; _i++) {
              msg = data[_i];
              _results.push($rootScope.activity.notifications.push(msg));
            }
            return _results;
          }
        });
      };
      $rootScope.getActivities = function() {
        return CoreAPI.get('/player/activities/list?limit=' + lists.activities.limit + '&offset=' + lists.activities.offset).success(function(data) {
          var msg, _i, _len, _results;
          if (data.length) {
            lists.activities.offset += lists.activities.limit;
            _results = [];
            for (_i = 0, _len = data.length; _i < _len; _i++) {
              msg = data[_i];
              _results.push($rootScope.activity.stream.push(msg));
            }
            return _results;
          }
        });
      };
      $rootScope.getRunning = function() {
        return CoreAPI.get('/player/running/list').success(function(data) {
          var c;
          if (data.length) {
            Socket.send({
              action: 'listen',
              data: {
                challenges: (function() {
                  var _i, _len, _results;
                  _results = [];
                  for (_i = 0, _len = data.length; _i < _len; _i++) {
                    c = data[_i];
                    _results.push(c.id);
                  }
                  return _results;
                })()
              }
            });
            return $rootScope.activity.running = data;
          } else {
            return $rootScope.getPlayerSuggestions();
          }
        });
      };
      $rootScope.muteChallenges = function() {
        var c;
        if ($rootScope.activity.running.length) {
          return Socket.send({
            action: 'silence',
            data: {
              challenges: (function() {
                var _i, _len, _ref, _results;
                _ref = $rootScope.activity.running;
                _results = [];
                for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                  c = _ref[_i];
                  _results.push(c.id);
                }
                return _results;
              })()
            }
          });
        }
      };
      $rootScope.reconnectSocket = function() {
        return CoreAPI.get('/player/me').success(function(response) {
          $rootScope.user.oneTimeKey = response.data.oneTimeKey;
          return Socket.connect();
        });
      };
      $rootScope.closeSocket = function() {
        return Socket.close();
      };
      $rootScope.login = function(data) {
        return CoreAPI.post('/player/login', data).success(function(response) {
          $rootScope.setUser(response.data);
          return $location.url('/start');
        });
      };
      $rootScope.logout = function(user) {
        $rootScope.closeSocket();
        $rootScope.user = null;
        $rootScope.activity = {
          stream: [],
          running: [],
          notifications: []
        };
        return CoreAPI.get('/player/logout').success(function() {
          return $location.url('/');
        });
      };
      $rootScope.updateProfile = function() {
        var data;
        data = angular.copy($rootScope.ui.account);
        data.address = [$rootScope.ui.account.address];
        delete data.birthday;
        delete data.birthmonth;
        delete data.birthyear;
        data.birthDate = $rootScope.ui.account.birthyear + '-' + $rootScope.ui.account.birthmonth + '-' + $rootScope.ui.account.birthday + 'T12:00:00.000';
        return CoreAPI.put('/player/me', data).success(function(response) {
          return $rootScope.ui.overlay = 'redeem';
        });
      };
      $rootScope.follow = function(player) {
        var playerId;
        playerId = player._id ? player._id : player.id;
        return CoreAPI.put('/player/follow/' + playerId).success(function(response) {
          $rootScope.user.following.push(playerId);
          return $rootScope.$broadcast('user.follow', response.data);
        });
      };
      $rootScope.unfollow = function(player) {
        var playerId;
        playerId = player._id ? player._id : player.id;
        return CoreAPI.del('/player/follow/' + playerId).success(function() {
          var inFollwings;
          inFollwings = $rootScope.user.following.indexOf(playerId);
          if (!(inFollwings === -1)) {
            $rootScope.$broadcast('user.unfollow', player);
            return $rootScope.user.following.splice(inFollwings, 1);
          }
        });
      };
      $rootScope.checkFollow = function(player) {
        var playerId;
        playerId = null;
        if (player) {
          playerId = player._id ? player._id : player.id;
        }
        if ($rootScope.user && playerId !== null) {
          return $rootScope.user.following.indexOf(playerId) > -1;
        } else {
          return false;
        }
      };
      $rootScope.seenNotifications = function() {
        return CoreAPI.get('/player/notifications/read').success(function(response) {
          var notification, _i, _len, _ref, _results;
          _ref = $rootScope.activity.notifications;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            notification = _ref[_i];
            _results.push(notification.read = true);
          }
          return _results;
        });
      };
      $rootScope.getAvatar = function(image) {
        if (image) {
          return image;
        } else {
          return '/upload/avatar.png';
        }
      };
      $rootScope.updateAvatar = function(data) {
        return CoreAPI.put('/player/me', {
          images: {
            large: data.logo,
            thumb: data.logo
          }
        }).success(function(response) {
          if (!$rootScope.user) {
            $rootScope.user = {
              images: {}
            };
          }
          return $rootScope.user.images.thumb = data.logo + '?' + new Date().getTime();
        });
      };
      $rootScope.goToPlayer = function(player) {
        var playerId;
        playerId = player._id ? player._id : player.id;
        if (playerId) {
          return $location.url('/player/' + playerId);
        }
      };
      $rootScope.chooseCoupon = function(coupon) {
        $rootScope.ui.pointsRequired = 0;
        if (coupon.pointsRequired <= $rootScope.user.points) {
          $location.url('/challenge/' + coupon._id);
          return $rootScope.closeOverlay();
        } else {
          $rootScope.ui.pointsRequired = coupon.pointsRequired;
          return $rootScope.ui.overlay = 'nopoints';
        }
      };
      $rootScope.addRunningChallenge = function(challenge) {
        if (challenge.challengeEndsAt) {
          challenge.stopAt = challenge.challengeEndsAt;
        }
        $rootScope.activity.running.unshift(challenge);
        return challenge;
      };
      $rootScope.removeRunningChallenge = function(challenge) {
        var pos;
        pos = $rootScope.activity.running.indexOf(challenge);
        if (pos !== -1) {
          if ($rootScope.challenge && (challenge.id === $rootScope.challenge.id)) {
            $rootScope.challenge = angular.copy($rootScope.activity.running[pos]);
          }
          $rootScope.activity.running.splice(pos, 1);
        }
        if (!$rootScope.activity.running.length) {
          return $rootScope.getPlayerSuggestions();
        }
      };
      $rootScope.getRanking = function(challenge) {
        var index, player, _i, _len, _ref;
        if (challenge.leaderboard) {
          challenge.leaderboard.sort(function(a, b) {
            return b.score - a.score;
          });
          _ref = challenge.leaderboard;
          for (index = _i = 0, _len = _ref.length; _i < _len; index = ++_i) {
            player = _ref[index];
            if (player.player && (player.player.id === $rootScope.user.id)) {
              challenge.rank = index + 1;
              break;
            }
          }
        }
        return challenge;
      };
      $rootScope.upload = function(image) {
        if (image) {
          return $rootScope.ui.userImage = image.url + '?' + new Date().getTime();
        }
      };
      $rootScope.loadPopup = function(path) {
        if ($rootScope.search && $rootScope.search.code) {
          path += '/' + $rootScope.search.code + '/' + $rootScope.search.entity;
        }
        return $window.open($rootScope.API + '/player/' + path, 'popup', 'top=150,left=150,innerHeight=400,innerWidth=600,location=no,menubar=no,resizable=no,status=no,toolbar=no');
      };
      $rootScope.closeOverlay = function() {
        return $rootScope.ui.overlay = null;
      };
      $rootScope.showResult = function(challenge) {
        CoreAPI.get('/challenge/leaderboard/' + challenge.id).success(function(data) {
          return challenge.leaderboard = data;
        });
        $rootScope.challenge = challenge;
        if (challenge.campaign.affiliatePointsWin) {
          $rootScope.challenge.points = [challenge.campaign.affiliatePointsWin];
        }
        return $rootScope.ui.overlay = 'result';
      };
      $rootScope.closeResult = function() {
        $rootScope.challenge = null;
        return $rootScope.closeOverlay();
      };
      $rootScope.requestCode = function(contact) {
        return CoreAPI.get('/player/signup/beta/' + contact.email).success(function() {
          return $rootScope.ui.beta.requested = true;
        });
      };
      $rootScope.resetPassword = function(account) {
        $rootScope.ui.errors.pwreset = false;
        return CoreAPI.get('/player/account/password/reset/?email=' + account.email).success(function() {
          $rootScope.ui.showReset = false;
          return $rootScope.closeOverlay();
        }).error(function() {
          return $rootScope.ui.errors.pwreset = true;
        });
      };
      newTry = function() {
        return $rootScope.$emit('requireUser');
      };
      $rootScope.$on('requireUser', function() {
        if ($rootScope.user) {
          return $rootScope.$broadcast('gotUser', $rootScope.user);
        } else {
          return $window.setTimeout(newTry, 400);
        }
      });
      $rootScope.$on('$routeChangeStart', function(evt, next, current) {
        $rootScope.ui.ready = false;
        if (next.name === 'landing') {
          $rootScope.getUser().success(function() {
            return $location.url('/start');
          });
        }
        if (next.access === 'player') {
          if (!$rootScope.user) {
            $rootScope.getUser().success(function(data) {
              if (!$rootScope.user.seenTour) {
                $location.url('/tour').replace();
              }
              return $rootScope.ui.ready = true;
            });
          } else {
            $rootScope.ui.ready = true;
          }
        } else {
          $rootScope.ui.ready = true;
        }
        if ($window._gaq && $location.path().length > 1) {
          return $window._gaq.push(['_trackPageview', $location.path()]);
        }
      });
      return $rootScope.$on('$destroy', function() {
        return $rootScope.closeSocket();
      });
    }
  ]);

  hwPlay.controller('SettingsCtrl', [
    '$scope', 'CoreAPI', function($scope, CoreAPI) {
      $scope.profile = {};
      $scope.setProfile = function(user) {
        return $scope.profile = {
          firstName: user.firstName,
          lastName: user.lastName,
          address: [
            {
              city: user.city || ''
            }
          ],
          publicName: user.publicName,
          publicAge: user.publicAge,
          publicWins: user.publicWins,
          emailNotifications: user.emailNotifications,
          emailUpdates: user.emailUpdates,
          emailNewsletters: user.emailNewsletters
        };
      };
      $scope.updateProfile = function() {
        return CoreAPI.put('/player/me', $scope.profile).success(function(response) {
          return $scope.setUser(response.data);
        });
      };
      $scope.$on('gotUser', function(evt, user) {
        return $scope.setProfile(user);
      });
      return $scope.$emit('requireUser');
    }
  ]);

  hwPlay.controller('PointsCtrl', [
    '$scope', 'CoreAPI', function($scope, CoreAPI) {
      var requested;
      requested = false;
      $scope.tab = 'invite';
      $scope.setTab = function(tab) {
        return $scope.tab = tab;
      };
      $scope.sendFeedback = function(message) {
        CoreAPI.post('/player/feedback', {
          feedback: message
        });
        return $scope.ui.feedback = true;
      };
      $scope.checkLike = function() {
        return CoreAPI.get('/player/facebook/like');
      };
      $scope.$on('gotUser', function(evt, user) {
        if (!requested) {
          requested = true;
          return CoreAPI.get('/player/' + $scope.user.id + '/coupons/won?limit=1').success(function(data) {
            if (data.length) {
              return $scope.lastCoupon = data[0];
            }
          });
        }
      });
      return $scope.$emit('requireUser');
    }
  ]);

  hwPlay.controller('ProfileCtrl', [
    '$scope', '$routeParams', '$location', 'CoreAPI', function($scope, $routeParams, $location, CoreAPI) {
      var lists, requested, setRatio;
      lists = {
        wins: {
          limit: 10,
          offset: 0,
          attr: 'won',
          end: false
        },
        offers: {
          limit: 10,
          offset: 0,
          attr: 'second',
          end: false
        }
      };
      setRatio = function(all, won) {
        var ratio;
        ratio = won / all;
        $scope.showsecond = false;
        if (ratio > 0.5) {
          $scope.firstrotation = 180;
          $scope.secondrotation = ratio * 360 | 0;
          return $scope.showsecond = true;
        } else {
          return $scope.firstrotation = ratio * 360 | 0;
        }
      };
      $scope.tab = null;
      $scope.account = {};
      $scope.location = $location;
      $scope.profile = {
        followers: [],
        following: [],
        wonCoupons: [],
        wonOffers: [],
        followList: null,
        followerList: null
      };
      $scope.setCoupon = function(coupon) {
        if (coupon) {
          coupon.flip = false;
        }
        return $scope.activeCoupon = coupon;
      };
      $scope.setWinlist = function(list) {
        $scope.setCoupon(null);
        if (list === 'offers') {
          $scope.winList = $scope.profile.wonOffers;
        } else {
          $scope.winList = $scope.profile.wonCoupons;
        }
        $scope.activeList = list;
        $scope.getWins();
        return $scope.activeCoupon = $scope.winList[0];
      };
      $scope.getWins = function() {
        var params, uId;
        params = lists[$scope.activeList];
        if (!params.end) {
          uId = $routeParams.playerId ? '/' + $routeParams.playerId : '';
          return CoreAPI.get('/player' + uId + '/coupons/' + params.attr + '?limit=' + params.limit + '&offset=' + params.offset).success(function(data) {
            var win, _i, _len;
            if (data.length) {
              if (data.length === params.limit) {
                params.offset = params.offset + params.limit;
              } else {
                params.end = true;
              }
              for (_i = 0, _len = data.length; _i < _len; _i++) {
                win = data[_i];
                $scope.winList.push(win);
              }
              return $scope.setCoupon($scope.winList[0]);
            } else {
              return params.end = true;
            }
          });
        }
      };
      $scope.getFollowers = function() {
        var uId;
        uId = $routeParams.playerId ? '/' + $routeParams.playerId : '';
        return CoreAPI.get('/player/followers' + uId).success(function(response) {
          return $scope.profile.followerList = response.data;
        });
      };
      $scope.getFollowing = function() {
        var uId;
        uId = $routeParams.playerId ? '/' + $routeParams.playerId : '';
        return CoreAPI.get('/player/following' + uId).success(function(response) {
          return $scope.profile.followList = response.data;
        });
      };
      $scope.setTab = function(tab, search) {
        if (search) {
          return $location.search({
            tab: tab
          });
        } else {
          return $scope.tab = tab;
        }
      };
      $scope.redeem = function(coupon) {
        return CoreAPI.get('/player/coupons/redeem/' + coupon.id).success(function(data) {
          $scope.ui.redeem = data.realId;
          return $scope.ui.overlay = 'redeem';
        }).error(function() {
          $scope.ui.account = {
            firstName: $scope.user.firstName,
            lastName: $scope.user.lastName,
            gender: $scope.user.gender,
            address: $scope.user.address || {}
          };
          return $scope.ui.overlay = 'profile';
        });
      };
      $scope.$watch('location.search()', function(val) {
        if (val && val.tab) {
          if (val.tab === 'wins') {
            if ($scope.ui.showOffers) {
              $scope.ui.showOffers = false;
              $scope.setWinlist('offers');
            } else {
              $scope.setWinlist('wins');
            }
          }
          if (val.tab === 'followers') {
            $scope.getFollowers();
          }
          if (val.tab === 'following') {
            $scope.getFollowing();
          }
          return $scope.setTab(val.tab);
        }
      });
      if ($routeParams.playerId) {
        if ($scope.user && ($scope.user.id === $routeParams.playerId)) {
          $location.replace().url('/me');
        } else {
          CoreAPI.get('/player/you/' + $routeParams.playerId).success(function(data) {
            angular.extend($scope.profile, data);
            $scope.profile.followersCount = data.followers.length;
            $scope.profile.followingCount = data.following.length;
            $scope.profile.age = (new Date() - Date.parse(data.birthday)) / 31536000000 |  0;
            return setRatio($scope.profile.participatedCount, $scope.profile.wonCouponsCount);
          });
        }
      } else {
        requested = false;
        $scope.$on('gotUser', function(evt, user) {
          if (!requested) {
            requested = true;
            CoreAPI.get('/player/statistics/game').success(function(data) {
              var fill, i, _i, _j, _len, _ref, _results, _results1;
              $scope.profile.statistics = data;
              if (data.length < 4) {
                fill = (function() {
                  _results = [];
                  for (var _i = 0, _ref = 4 - data.length; 0 <= _ref ? _i <= _ref : _i >= _ref; 0 <= _ref ? _i++ : _i--){ _results.push(_i); }
                  return _results;
                }).apply(this);
                _results1 = [];
                for (_j = 0, _len = fill.length; _j < _len; _j++) {
                  i = fill[_j];
                  _results1.push($scope.profile.statistics.push({}));
                }
                return _results1;
              }
            });
            $scope.user.age = (new Date() - Date.parse($scope.user.birthday)) / 31536000000 |  0;
            return setRatio(user.participatedCount, user.wonCouponsCount);
          }
        });
        $scope.$emit('requireUser');
      }
      return $scope.flipCoupon = function(coupon) {
        return coupon.flip = !coupon.flip;
      };
    }
  ]);

  hwPlay.controller('CouponCtrl', [
    '$scope', '$location', 'CoreAPI', function($scope, $location, CoreAPI) {
      var position;
      position = {
        lat: 52.4952592,
        lng: 13.360984
      };
      $scope.coupons = null;
      CoreAPI.post('/player/coupons', position).success(function(data) {
        return $scope.coupons = data.coupons;
      }).error(function() {
        return $scope.coupons = [];
      });
      return $scope.showDetail = function(coupon) {
        $scope.ui.coupon = coupon;
        return $scope.ui.overlay = 'detail';
      };
    }
  ]);

  hwPlay.controller('ChallengeCtrl', [
    '$scope', '$routeParams', '$location', 'CoreAPI', function($scope, $routeParams, $location, CoreAPI) {
      var getChallenges;
      $scope.challenges = null;
      getChallenges = function() {
        var url;
        url = $routeParams.coupon ? '/player/challenges/' + $routeParams.coupon + '/browser' : '/player/coupons/sponsored/browser';
        return CoreAPI.get(url).success(function(data) {
          return $scope.challenges = data.challenges;
        }).error(function() {
          return $location.url('/start').replace();
        });
      };
      getChallenges();
      $scope.flipChallenge = function(challenge) {
        var c, _i, _len, _ref;
        if (!challenge.flip) {
          if (challenge.id) {
            CoreAPI.get('/challenge/leaderboard/' + challenge.id).success(function(data) {
              challenge.leaderboard = data;
              return challenge.fetched = true;
            });
          } else {
            challenge.fetched = true;
          }
        }
        _ref = $scope.challenges;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          c = _ref[_i];
          if (c.id !== challenge.id) {
            c.flip = false;
          }
        }
        return challenge.flip = !challenge.flip;
      };
      $scope.showManual = function(game) {
        $scope.ui.manual = game.description;
        return $scope.ui.overlay = 'manual';
      };
      return $scope.enterChallenge = function(challenge) {
        if (challenge.challenge) {
          if ($routeParams.coupon) {
            return $location.url('/game/' + challenge.id + '/' + $routeParams.coupon).replace();
          } else {
            return $location.url('/game/' + challenge.id + '/' + challenge.campaign._id).replace();
          }
        } else {
          return $location.url('/game/new/' + challenge.game.id + '-' + challenge.campaign._id).replace();
        }
      };
    }
  ]);

  hwPlay.controller('GameCtrl', [
    '$scope', '$routeParams', '$location', 'CoreAPI', 'Socket', function($scope, $routeParams, $location, CoreAPI, Socket) {
      var initSocketListener, params, setGame;
      Socket.check();
      $scope.muteChallenges();
      $scope.loaded = false;
      initSocketListener = function() {
        Socket.on('game/started', function(data) {
          if (data.challengeId === $scope.challenge.challenge) {
            return $scope.$apply(function() {
              return $scope.countdown = $scope.challenge.game.playTime;
            });
          }
        });
        Socket.on('player/joined', function(data) {
          if (data.challengeId === $scope.challenge.challenge) {
            return $scope.$apply(function() {
              return $scope.challenge.leaderboard.push({
                player: data.player,
                score: 0
              });
            });
          }
        });
        Socket.on('challenge/highscore', function(data) {
          if (data.challengeId === $scope.challenge.challenge) {
            return $scope.$apply(function() {
              var index, item, _i, _len, _ref, _results;
              _ref = $scope.challenge.leaderboard;
              _results = [];
              for (index = _i = 0, _len = _ref.length; _i < _len; index = ++_i) {
                item = _ref[index];
                if (data.playerId === item.player.id) {
                  _results.push(item.score = data.score);
                } else {
                  _results.push(void 0);
                }
              }
              return _results;
            });
          }
        });
        Socket.on('player/finished', function(data) {
          if (data.challengeId === $scope.challenge.challenge) {
            return $scope.$apply(function() {
              var index, item, _i, _len, _ref, _results;
              _ref = $scope.challenge.leaderboard;
              _results = [];
              for (index = _i = 0, _len = _ref.length; _i < _len; index = ++_i) {
                item = _ref[index];
                if (data.playerId === item.player.id) {
                  _results.push(item.finished = true);
                } else {
                  _results.push(void 0);
                }
              }
              return _results;
            });
          }
        });
        Socket.on('game/over', function(data) {
          if (data.challengeId === $scope.challenge.challenge) {
            return $scope.$apply(function() {
              return $scope.$broadcast('gameover');
            });
          }
        });
        return Socket.send({
          action: 'listen',
          data: {
            challenges: [$scope.challenge.challenge]
          }
        });
      };
      setGame = function(data) {
        var conf, host, param;
        conf = {
          challenge: data.challenge,
          level: 1,
          key: data.ek
        };
        param = Base64.encode(JSON.stringify(conf));
        host = data.game.browserAttributes[0].url;
        return $scope.host = host + '?' + param;
      };
      if ($routeParams.challenge && $routeParams.coupon) {
        if ($routeParams.challenge === 'new') {
          params = $routeParams.coupon.split('-');
          CoreAPI.put('/challenge/open/' + params[0] + '/' + params[1]).success(function(data) {
            setGame(data);
            $scope.challenge = data;
            initSocketListener();
            return $scope.running = true;
          }).error(function() {
            return $location.url('/start').replace();
          });
        } else {
          CoreAPI.put('/challenge/enter/' + $routeParams.challenge + '/' + $routeParams.coupon).success(function(data) {
            if (data.campaign.affiliatePointsWin) {
              $scope.points = [data.campaign.affiliatePointsWin];
            }
            setGame(data);
            $scope.challenge = data;
            initSocketListener();
            return $scope.running = true;
          }).error(function() {
            return $location.url('/start').replace();
          });
        }
      }
      $scope.startGame = function(score) {
        return CoreAPI.get('/challenge/start/' + $scope.challenge.challenge);
      };
      $scope.sendScore = function(score) {
        return Socket.send({
          action: 'highscore',
          data: score
        });
      };
      $scope.finishGame = function() {
        var result;
        if ($scope.running) {
          Socket.off('game/started');
          Socket.off('player/joined');
          Socket.off('challenge/highscore');
          Socket.off('player/finished');
          Socket.off('game/over');
          result = $scope.challenge;
          result.id = $scope.challenge.challenge;
          CoreAPI.get('/challenge/finish/' + $scope.challenge.challenge);
          $scope.getRunning().success(function(data) {
            if (data[0].id === result.id) {
              return $scope.showResult(data[0]);
            } else {
              return $scope.showResult(result);
            }
          });
          $scope.running = false;
          if ($scope.challenge.campaign.affiliatePointsWin) {
            return $location.url('/sponsored').replace();
          } else {
            return $location.url('/start').replace();
          }
        }
      };
      return $scope.$on('$destroy', function() {
        return Socket.off('game/started');
      });
    }
  ]);

  hwPlay.controller('SignupCtrl', [
    '$scope', '$location', 'CoreAPI', function($scope, $location, CoreAPI) {
      $scope.error = {};
      $scope.profile = {};
      $scope.account = {
        address: [{}]
      };
      if ($location.search().error) {
        $scope.error[$location.search().error] = true;
      }
      return $scope.submitSignup = function() {
        var params;
        params = $scope.search && $scope.search.code ? '/' + $scope.search.code + '/' + $scope.search.entity : '';
        if ($scope.signupForm.$valid) {
          $scope.error = {};
          return CoreAPI.post('/player/signup' + params, $scope.account).success(function() {
            return $scope.showActivation = true;
          }).error(function(data, status) {
            switch (status) {
              case 404:
                return $scope.error.code = true;
              case 450:
                $scope.error.email = true;
                return $scope.error.nick = true;
              case 451:
                return $scope.error.nick = true;
              case 452:
                return $scope.error.email = true;
              default:
                return $scope.error.failed = true;
            }
          });
        }
      };
    }
  ]);

  hwPlay.controller('SocialCtrl', [
    '$scope', '$location', 'CoreAPI', function($scope, $location, CoreAPI) {
      $scope.account = {};
      $scope.friends = {};
      $scope.getFriends = function() {
        return CoreAPI.get('/player/friends/facebook').success(function(data) {
          var player, _i, _len, _ref, _results;
          if (data.players.length === 0) {
            return $location.url('/tour').replace();
          } else {
            $scope.friendList = data;
            $scope.friends.follow = {};
            _ref = data.players;
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              player = _ref[_i];
              _results.push($scope.friends.follow[player._id] = true);
            }
            return _results;
          }
        }).error(function() {
          return $location.url('/tour').replace();
        });
      };
      $scope.followPlayers = function() {
        var checked, player, players, _ref;
        players = [];
        _ref = $scope.friends.follow;
        for (player in _ref) {
          checked = _ref[player];
          if (checked) {
            players.push(player);
          }
        }
        return CoreAPI.put('/player/follow', players).success(function() {
          $scope.user.following = players;
          return $location.url('/tour').replace();
        });
      };
      return $scope.createAccount = function() {
        return CoreAPI.put('/player/me', $scope.account).success(function(response) {
          $scope.setUser(response.data);
          if (!!response.data.facebook) {
            return $scope.getFriends();
          }
        }).error(function() {
          return $scope.error = true;
        });
      };
    }
  ]);

  hwPlay.controller('PasswordCtrl', [
    '$scope', '$routeParams', '$location', 'CoreAPI', function($scope, $routeParams, $location, CoreAPI) {
      $scope.account = {};
      return $scope.changePassword = function() {
        $scope.error = false;
        if ($routeParams.reset && $scope.resetForm.$valid) {
          return CoreAPI.post('/player/account/password/set/' + $routeParams.reset, $scope.account).success(function() {
            $location.url('/');
            return $scope.ui.overlay = 'login';
          }).error(function() {
            return $scope.error = true;
          });
        } else {
          return $scope.error = true;
        }
      };
    }
  ]);

  hwPlay.controller('TourCtrl', [
    '$scope', '$location', 'CoreAPI', function($scope, $location, CoreAPI) {
      $scope.ui.overlay = 'beta';
      return $scope.closeTour = function() {
        CoreAPI.put('/player/tour/seen');
        $scope.ui.step = null;
        return $location.url('/start');
      };
    }
  ]);

  hwPlay.directive('timesince', [
    function() {
      return {
        restrict: 'A',
        scope: {
          timesince: '@'
        },
        link: function($scope, $element, $attrs) {
          var formatDelta;
          formatDelta = function(start, now) {
            var days, hours, minutes, out, timedelta;
            timedelta = now - start;
            if (timedelta > 86400000) {
              days = timedelta / 86400000 | 0;
              if (days > 1) {
                out = 'vor ' + days + ' Tagen';
              } else {
                out = 'vor einem Tag';
              }
              return out;
            } else if (timedelta > 3600000) {
              hours = timedelta / 3600000 | 0;
              if (hours > 1) {
                out = 'vor ' + hours + ' Stunden';
              } else {
                out = 'vor einer Stunde';
              }
              return out;
            } else if (timedelta > 60000) {
              minutes = timedelta / 60000 | 0;
              if (minutes > 1) {
                out = 'vor ' + minutes + ' Minuten';
              } else {
                out = 'vor einer Minute';
              }
              return out;
            } else {
              return out = 'vor wenigen Sekunden';
            }
          };
          $scope.setTime = function(now) {
            if (now.getTime() > $scope.start.getTime()) {
              return $scope.timer = formatDelta($scope.start.getTime(), now.getTime());
            }
          };
          return $attrs.$observe('timesince', function(val) {
            var now;
            if (val) {
              now = new Date();
              $scope.start = new Date(Date.parse(val));
              return $scope.setTime(now);
            }
          });
        }
      };
    }
  ]);

  hwPlay.directive('grid', [
    function() {
      return {
        restrict: 'A',
        scope: true,
        link: function($scope, $element, $attrs) {
          var cols, length, sizes;
          length = 0;
          cols = Math.floor($element.width() / 210);
          sizes = [3, 2, 3, 2, 3, 1, 2, 1, 2, 3, 2, 3, 2, 3, 1];
          $scope.grid = [];
          return $scope.$watch($attrs.grid + '.length', function(val) {
            var c, col, grid, i, index, item, items, overall, part, rest, _i, _j, _len, _len1, _results;
            if (val) {
              col = [];
              grid = [];
              items = $scope.$eval($attrs.grid);
              overall = items.length;
              if (length) {
                items = items.slice(length);
              }
              part = cols < overall ? Math.floor(items.length / cols) : 1;
              rest = items.length - (part * cols);
              for (index = _i = 0, _len = items.length; _i < _len; index = ++_i) {
                item = items[index];
                if ((index % part) === 0) {
                  col = [];
                  grid.push(col);
                }
                if (index >= items.length - rest) {
                  col = grid[items.length - index - 1] ? grid[items.length - index - 1] : [];
                }
                item.size = sizes[(grid.length + 1) * (index + 1) % 14];
                col.push(item);
              }
              length = overall;
              if ($scope.grid.length) {
                _results = [];
                for (i = _j = 0, _len1 = grid.length; _j < _len1; i = ++_j) {
                  c = grid[i];
                  if ($scope.grid[i]) {
                    _results.push($scope.grid[i] = $scope.grid[i].concat(c));
                  } else {
                    _results.push(void 0);
                  }
                }
                return _results;
              } else {
                return $scope.grid = grid;
              }
            }
          });
        }
      };
    }
  ]);

  hwPlay.directive('listScroll', [
    '$window', function($window) {
      return {
        restrict: 'A',
        scope: true,
        link: function($scope, $element, $attrs) {
          var $container, getNext, load;
          load = false;
          $container = $attrs.container ? $($attrs.container) : $(window);
          getNext = function() {
            return $scope.$apply(function() {
              if ($attrs.getNext) {
                return $scope.$eval($attrs.getNext);
              } else {
                return $scope.getNext();
              }
            });
          };
          $scope.$watch($attrs.listScroll + '.length', function(val) {
            var height;
            if (val) {
              height = $container[0].scrollHeight ? $container[0].scrollHeight : $(document).height();
              $container.off('scroll.list').on('scroll.list', function() {
                var top;
                top = $container.scrollTop();
                if ((top + $container.height() > height * 0.8) && !load) {
                  load = true;
                  return getNext();
                }
              });
              return load = false;
            }
          });
          return $scope.$on('$destroy', function() {
            return $container.off('scroll.list');
          });
        }
      };
    }
  ]);

  hwPlay.directive('login', [
    function() {
      return {
        restrict: 'A',
        scope: true,
        link: function($scope, $element, $attrs) {
          return $scope.submitLogin = function() {
            var credentials, field, post, _i, _len;
            $scope.ui.errors.login = false;
            credentials = {};
            post = $element.serializeArray();
            if (post.length > 1) {
              for (_i = 0, _len = post.length; _i < _len; _i++) {
                field = post[_i];
                credentials[field.name] = field.value === 'on' ? true : field.value;
              }
            }
            $element[0].reset();
            return $scope.login(credentials).success(function() {
              return $scope.ui.overlay = null;
            }).error(function() {
              return $scope.ui.errors.login = true;
            });
          };
        }
      };
    }
  ]);

  hwPlay.directive('appHeader', [
    function() {
      return {
        restrict: 'C',
        link: function($scope, $element, $attrs) {
          var close;
          close = function() {
            return $scope.$apply(function() {
              if ($scope.ui.dropdowns.msg) {
                $scope.seenNotifications();
                $scope.ui.overlay = null;
              }
              return $scope.ui.dropdowns = {};
            });
          };
          $scope.ui.dropdowns = {};
          return $scope.dropDown = function(evt, key) {
            if ($scope.ui.dropdowns.msg) {
              $scope.seenNotifications();
              $scope.ui.overlay = null;
            }
            if ($scope.ui.dropdowns[key]) {
              $scope.ui.dropdowns = {};
            } else {
              if (key === 'msg') {
                $scope.ui.overlay = 'notifications';
              }
              $scope.ui.dropdowns = {};
              $scope.ui.dropdowns[key] = true;
              $(document).one('click', close);
            }
            return evt.stopPropagation();
          };
        }
      };
    }
  ]);

  hwPlay.directive('player', [
    function() {
      return {
        restrict: 'A',
        templateUrl: 'playerTmpl',
        transclude: true,
        replace: true
      };
    }
  ]);

  hwPlay.directive('mapWidget', [
    function() {
      return {
        restrict: 'A',
        link: function($scope, $element, $attrs) {
          var initialConf, map, marker;
          initialConf = {
            dragging: false,
            touchZoom: false,
            doubleClickZoom: false,
            scrollWheelZoom: false,
            boxZoom: false,
            keyboard: false,
            attributionControl: false
          };
          $.ajaxSetup({
            cache: true
          });
          marker = null;
          map = null;
          $.getScript('/scripts/vendor/leaflet/leaflet.js').success(function() {
            var pin;
            pin = L.icon({
              iconUrl: '/scripts/vendor/leaflet/images/marker-icon.png',
              iconRetinaUrl: '/scripts/vendor/leaflet/images/marker-icon-2x.png',
              iconSize: [20, 30],
              iconAnchor: [20, 30],
              popupAnchor: [-3, -76],
              shadowUrl: '/scripts/vendor/leaflet/images/marker-shadow.png',
              shadowSize: [30, 40],
              shadowAnchor: [20, 36]
            });
            map = L.map($element[0], initialConf);
            L.tileLayer('http://{s}.tile.cloudmade.com/95838d71054f485f9898613b0745abd5/22677/256/{z}/{x}/{y}.png', {
              attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);
            if (marker) {
              L.marker([marker.lat, marker.long], {
                icon: pin
              }).addTo(map);
              return map.setView([marker.lat, marker.long], 13);
            }
          });
          return $attrs.$observe('mapWidget', function(val) {
            if (val) {
              return marker = $scope.$eval(val);
            }
          });
        }
      };
    }
  ]);

  hwPlay.directive('uiFieldCheck', [
    function() {
      return {
        restrict: 'C',
        scope: true,
        link: function($scope, $element, $attrs) {
          var check;
          check = function() {
            return $scope.$apply(function() {
              return $scope.checked = true;
            });
          };
          $element.find('.input').on('blur.check', check);
          return $scope.$on('$destroy', function() {
            return $element.off('blur.check');
          });
        }
      };
    }
  ]);

  hwPlay.directive('uiInputMatch', [
    function() {
      return {
        restrict: 'A',
        require: 'ngModel',
        link: function($scope, $element, $attrs, Ctrl) {
          var check;
          check = function() {
            var match;
            match = $element.val() === $scope.$eval($attrs.uiInputMatch);
            return Ctrl.$setValidity('match', match);
          };
          $element.on('keyup.match', function() {
            return $scope.$apply(function() {
              return check();
            });
          });
          $scope.$watch($attrs.uiInputMatch, function(val) {
            if (val) {
              return check();
            }
          });
          return $scope.$on('$destroy', function() {
            return $element.off('keyup.match');
          });
        }
      };
    }
  ]);

  hwPlay.directive('uiCarousel', [
    function() {
      return {
        restrict: 'A',
        scope: true,
        link: function($scope, $element, $attrs) {
          $scope.items = [];
          $scope.setView = function() {
            var index, item, _i, _len, _ref;
            _ref = $scope.items;
            for (index = _i = 0, _len = _ref.length; _i < _len; index = ++_i) {
              item = _ref[index];
              if (index === $scope.ui.current) {
                item.klass = 'current';
              } else {
                item.klass = 'hidden';
              }
            }
            if ($scope.items.length > 1) {
              if (($scope.ui.current + 1) < $scope.items.length) {
                $scope.items[$scope.ui.current + 1].klass = 'next';
              } else {
                $scope.items[0].klass = 'next';
              }
            }
            if ($scope.items.length > 2) {
              if ($scope.ui.current > 0) {
                return $scope.items[$scope.ui.current - 1].klass = 'prev';
              } else {
                return $scope.items[$scope.items.length - 1].klass = 'prev';
              }
            }
          };
          $scope.getNext = function() {
            if ($scope.ui.current < ($scope.items.length - 1)) {
              return $scope.ui.current++;
            } else {
              return $scope.ui.current = 0;
            }
          };
          $scope.getPrevious = function() {
            if ($scope.ui.current > 0) {
              return $scope.ui.current--;
            } else {
              return $scope.ui.current = $scope.items.length - 1;
            }
          };
          $scope.select = function(item) {
            if (item.klass === 'current') {
              $scope.showResult(item);
            }
            if (item.klass === 'next') {
              $scope.getNext();
            }
            if (item.klass === 'prev') {
              $scope.getPrevious();
            }
            return $scope.setView();
          };
          return $scope.$watch($attrs.uiCarousel + '.length', function(newVal, oldVal) {
            var items;
            if (newVal) {
              items = $scope.$eval($attrs.uiCarousel);
              $scope.items = items;
              if ($scope.ui.current >= items.length || newVal === 0) {
                $scope.ui.current = 0;
              }
              return $scope.setView();
            }
          });
        }
      };
    }
  ]);

  hwPlay.directive('imageUpload', [
    function() {
      return {
        restrict: 'A',
        scope: true,
        link: function($scope, $element, $attrs) {
          $.ajaxSetup({
            cache: true
          });
          $.getScript('/components/jquery-form/jquery.form.js').success(function() {
            return $element.on('submit.upload', function(evt) {
              evt.preventDefault();
              evt.stopPropagation();
              return $element.ajaxSubmit({
                url: $attrs.action,
                method: 'POST',
                data: {
                  data: {
                    merchant_id: $attrs.imageUpload
                  }
                },
                resetForm: true,
                uploadProgress: function(evt, pos, total, percent) {
                  return $('.loadingbar').width(percent + '%');
                },
                error: function(xhr, status, err) {
                  return $scope.$apply(function() {
                    return $scope.upload(null);
                  });
                },
                beforeSend: function() {
                  return $scope.$apply(function() {
                    return $scope.ui.overlay = 'crop';
                  });
                },
                success: function(data, status, xhr) {
                  var image;
                  if (data) {
                    image = JSON.parse(data);
                    return $scope.$apply(function() {
                      return $scope.upload(image);
                    });
                  }
                }
              });
            });
          });
          $element.find('#file').on('change', function() {
            return $element.submit();
          });
          return $scope.$on('$destroy', function() {
            return $element.off('submit.upload');
          });
        }
      };
    }
  ]);

  hwPlay.directive('imageCrop', [
    '$http', function($http) {
      return {
        restrict: 'A',
        scope: {
          image: '@imageCrop',
          user: '@',
          cancel: '&onCancel',
          update: '&onSave'
        },
        link: function($scope, $element, $attrs) {
          var calculateCropping, jcrop, jcropOptions;
          jcropOptions = {
            allowSelect: false,
            bgOpacity: 0.4,
            boxWidth: 600,
            boxHeight: 400,
            minSize: [100, 100],
            aspectRatio: 1
          };
          jcrop = null;
          $.ajaxSetup({
            cache: true
          });
          $scope.init = function() {
            var image;
            $.getScript('/components/jcrop/js/jquery.Jcrop.min.js');
            return image = $element.find('.target').on('load', function() {
              var height, select, tl, width, x;
              $scope.$apply(function() {
                return $scope.loaded = true;
              });
              height = image.height();
              width = image.width();
              if (height > width) {
                x = width / 6 * 4 | 0;
                tl = [width / 6 | 0, (height - x) / 2 | 0];
              } else {
                x = height / 6 * 4 | 0;
                tl = [(width - x) / 2 | 0, height / 6 | 0];
              }
              select = tl.concat([tl[0] + x, tl[1] + x]);
              jcropOptions.setSelect = select;
              return image.Jcrop(jcropOptions, function() {
                return jcrop = this;
              });
            });
          };
          calculateCropping = function() {
            var coordinates, cropping, zoom;
            coordinates = jcrop.tellSelect();
            zoom = $element.find('.target').attr('data-zoom') ||  1;
            zoom = parseFloat(zoom);
            cropping = [coordinates.x, coordinates.y, coordinates.w, coordinates.h, 130, 130];
            return cropping;
          };
          $scope.save = function() {
            var cropping, url;
            url = $scope.image.split('/').slice(-1)[0];
            cropping = calculateCropping();
            return $http.post('/services/merchant/crop', {
              data: {
                image: url,
                merchant_id: $scope.user,
                crop: cropping
              }
            }).success(function(response) {
              $scope.update()(response.data);
              return $scope.cancel();
            });
          };
          $scope.saveCoordinates = function(type, width, height) {
            var coordinates;
            coordinates = jcrop.tellSelect();
            $scope[type + 'Coordinates'] = coordinates;
            $scope[type + 'Preview'] = calculateStyle(width, height, coordinates);
            return $scope.cancel();
          };
          return $scope.$on('$destroy', function() {
            return typeof jcrop.destroy === "function" ? jcrop.destroy() : void 0;
          });
        }
      };
    }
  ]);

  hwPlay.directive('game', [
    '$window', function($window) {
      return {
        restrict: 'A',
        link: function($scope, $element, $attrs) {
          var $countdown, countdown, receiveMessage, setTimer, timedelta, timer;
          timer = null;
          timedelta = null;
          $countdown = $('#countdown');
          countdown = function() {
            if (timedelta > 0) {
              return setTimer(timedelta--);
            } else {
              return $window.clearInterval(timer);
            }
          };
          setTimer = function(timedelta) {
            var minutes, seconds;
            minutes = timedelta / 60 | 0;
            seconds = timedelta - (minutes * 60);
            if (seconds < 10) {
              seconds = '0' + seconds;
            }
            return $countdown.text(minutes + ':' + seconds);
          };
          receiveMessage = function(evt) {
            var msg;
            msg = JSON.parse(evt.data);
            if (msg.action === 'startGame') {
              $scope.startGame();
            }
            if (msg.action === 'updateScore') {
              $scope.sendScore(msg.score);
            }
            if (msg.action === 'finishGame') {
              return $scope.finishGame();
            }
          };
          $attrs.$observe('game', function(val) {
            var game;
            if (val) {
              game = $('<iframe src="' + val + '" frameborder="0" name="game" class="game"></iframe>');
              return game.appendTo($element).on('load', function(evt) {
                return $scope.$apply(function() {
                  return $scope.loaded = true;
                });
              });
            }
          });
          $window.addEventListener('message', receiveMessage, false);
          $scope.$watch('countdown', function(val) {
            if (val) {
              timedelta = val;
              setTimer(timedelta);
              return timer = $window.setInterval(countdown, 1000);
            }
          });
          $scope.$on('gameover', function() {
            return game.postMessage('gameover', '*');
          });
          return $scope.$on('$destroy', function() {
            if (timer) {
              $window.clearInterval(timer);
            }
            return $window.removeEventListener('message', receiveMessage, false);
          });
        }
      };
    }
  ]);

}).call(this);
