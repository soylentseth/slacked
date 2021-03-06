/**
 * Created by Derek Rada on 12/11/2014.
 */

(function(angular) {


    var DEFAULT_MESSAGES = [{msgStamp: null, name: "Slacked", msg: "No messages"}];
    var ERROR_MESSAGE = [{msgStamp: null, name: "Error", msg: "Error loading data"}];
    var DEFAULT_CHANNELS = [];
    var DEFAULT_GROUPS = [];

    var ngLocationSlackedApp = angular.module('ngLocationSlackedApp', ["ngRoute"]);

    angular.element(document.getElementsByTagName('head')).append(angular.element('<base href="' + window.location.pathname + '" />'));

    ngLocationSlackedApp
        .controller(
        "ngMainController",
        [
            "$scope",
            "$route",
            "$routeParams",
            "$location",
            "$http",
            "$rootScope",
            function ($scope, $route, $routeParams, $location, $http, $rootScope) {

                $scope.$route = $route;
                $scope.$location = $location;
                $scope.$routeParams = $routeParams;
                $scope.startPage = $location.path();
                $scope.startTime = new Date().getTime();

                var user = {
                    loggedIn:    false,
                    userId:      window.localStorage.getItem("slacked:user_selected"),
                    displayName: "Login",
                    channels: [],
                    groups: []
                };

                $rootScope.users = {};
                $rootScope.user = user;
                $rootScope.channels = [];
                $rootScope.groups = [];
                $scope.user = $rootScope.user;

                $rootScope.$on("authenticated",
                               function (event, args) {

                                   console.log("RootScope authenticated");
                                   console.log(args);
                                   $rootScope.$broadcast("updateSideBar", args);
                                   if (($scope.startTime + 2000 < new Date().getTime())) { // If on refresh the user is authenticated load the page they requested instead
                                       $location.path($scope.startPage);
                                   }
                               }
                );

                $http.get("/user/auth")
                    .success(
                    function (data) {
                        if (data && data.success) {
                            console.log("Success /user/auth");
                            console.log(data);
                            $rootScope.user.loggedIn = data.loggedIn;
                            $rootScope.user.userId = data.userId;
                            $rootScope.user.displayName = data.displayName;

                            $scope.$emit("authenticated");
                            console.log($rootScope.user);
                            $location.path($scope.startPage || "/user");
                        } else {
                            console.log("Error /user/auth");
                            console.log(data);
                        }
                    }
                );


            }
        ]
    );

    /**
     *  Sidebar Controller
     */
    ngLocationSlackedApp.controller(
        'ngSidebarController',
        [
            "$scope",
            "$http",
            "$rootScope",
            function ngSidebarController($scope, $http, $rootScope) {

                $scope.channels = DEFAULT_CHANNELS;
                $scope.groups = DEFAULT_GROUPS;

                function refresh(force) {

                    console.log("Refreshing sidebar");
                    // Download channels
                    if (force !== true) {
                        force = false;
                    } else {
                        force = true;
                    }
                    console.log("Force: " + force);

                    $http.get('/channel?force=' + force)
                        .success(
                        function (data) {
                            if (data && data.success) {
                                $scope.channels = data.locations;
                                $rootScope.user.channels = data.locations;
                            }
                        }
                    );
                    // Download groups
                    $http.get('/group?force=' + force)
                        .success(
                        function (data) {
                            if (data && data.success) {
                                $scope.groups = data.locations;
                                $rootScope.user.groups = data.locations;
                            }
                        }
                    );
                }
                $scope.refresh = refresh;
                refresh(true);

                $scope.$on("updateSideBar", function (event, args) {
                    console.log("Recieved updateSideBar from root");
                    console.log(args);
                    $scope.refresh(args);
                }
                );

            }
        ]
    );

    /**
     * Controller for HistoryController (messages)
     */
    ngLocationSlackedApp.controller(
        'locationHistoryController',
        [
            "$scope",
            "$routeParams",
            "$http",
            "$rootScope",
            "$location",
            function locationHistoryController($scope, $routeParams, $http, $rootScope, $location) {

                if (!$rootScope.user || $rootScope.user.loggedIn !== true) {
                    $location.path('/');
                }

                console.log("Inside LocationHistoryController");

                $scope.historyData = {
                    startDate:            0,
                    endDate:              4389369600000,
                    messages:           [],
                    total: 0,
                    isMore: false,
                    nextDate: 0
                };

                $scope.loadPage = function loadPage(nextDate) {

                    var httpRequest = {
                        url: "/history/" +  $routeParams.locationId,
                        method: "GET",
                        params: {
                            start: $scope.historyData.startDate,
                            end: nextDate || $scope.historyData.endDate
                        }
                    };

                    $http(httpRequest)
                        .success(
                        function (data) {
                            if (data && data.success) {
                                $scope.historyData.isMore = data.isMore;
                                $scope.historyData.nextDate = data.nextDate;
                                $scope.historyData.total = data.total;
                                $scope.historyData.messages = cleanMessages(data.data);
                            }
                        }
                    );
                };
                $scope.loadPage()
            }
    ]
    );

    /***
     * Configure routeProvider for angular app
     */
    ngLocationSlackedApp.config(
        ['$routeProvider',
         function ($routeProvider) {
             $routeProvider.
                 when('/history/:locationId', {
                          templateUrl: "partials/messages.html",
                          controller:  "locationHistoryController"
                      }
             ).when('/user', {
                        templateUrl: "partials/user.html",
                        controller: "userController"
             }).when('/',
                     {
                        templateUrl: "partials/index.html",
                        controller: "indexController"
             }).when('/search',
                     {
                         templateUrl: "partials/search.html",
                         controller: "ngSearchController"
             }).otherwise({ redirectTo: "/" });
         }
        ]
    );

    /**
     * Search Controller
     **/
    ngLocationSlackedApp.controller(
        'ngSearchController',
        [
            "$scope",
            "$http",
            "$rootScope",
            "$location",
            "$routeParams",
            function ngSearchController(
                $scope,
                $http,
                $rootScope,
                $location,
                $routeParams) {

                if (!$rootScope.user || $rootScope.user.loggedIn !== true) {
                    $location.path('/');
                }

                $scope.searchData = {
                    term:                 $routeParams.query || "",
                    startDate:            new Date().getTime() - 3600000, // 1 hour
                    endDate:              new Date().getTime(),
                    locations:            [],
                    selectedLocationName: "Location",
                    selectedLocationId: $routeParams.locationId || null,
                    messages:           [],
                    total: 0,
                    isMore: false,
                    nextDate: 0
                };
                if ($routeParams.startDate) {
                    $scope.searchData.startDate = parseInt($routeParams.startDate);
                }
                if ($routeParams.endDate) {
                    $scope.searchData.startDate = parseInt($routeParams.endDate);
                }
                var sDate = new Date($scope.searchData.startDate);
                var startValue = sDate.getFullYear() + "/" + (sDate.getMonth() + 1) + "/" + sDate.getDate() + " " + sDate.getHours() + ":" + sDate.getMinutes();
                var eDate = new Date($scope.searchData.endDate);
                var endValue = eDate.getFullYear() + "/" + (eDate.getMonth() + 1) + "/" + eDate.getDate() + " " + eDate.getHours() + ":" + eDate.getMinutes();

                $('#startDate').datetimepicker(
                    {
                        value: startValue,
                        format: 'Y/m/d H:i',
                        onChangeDateTime: function (time) {
                            $scope.searchData.startDate = time.getTime();
                            console.log("Start Date: " + $scope.searchData.startDate);
                        }
                    }
                );
                $('#endDate').datetimepicker(
                    {
                        value: endValue,
                        format: 'Y/m/d H:i',
                        onChangeDateTime: function (time) {
                            $scope.searchData.endDate = time.getTime();
                            console.log("End Date: " + $scope.searchData.endDate);
                        }
                    }
                );
                $scope.channels = $rootScope.user.channels;
                $scope.groups = $rootScope.user.groups;

                $scope.searchFor = function (endDate) {

                    var httpRequest = {

                        url: "/history/" + $scope.searchData.selectedLocationId,
                        method: "GET",
                        params: {
                            start: $scope.searchData.startDate,
                            end: endDate || $scope.searchData.endDate,
                            query: $scope.searchData.term
                        }
                    };
                    console.log("Searching for stuff");
                    console.log(httpRequest);
                    $http(httpRequest).success(
                      function (data) {

                          if (data && data.success) {
                              $scope.searchData.isMore = data.isMore;
                              $scope.searchData.nextDate = data.nextDate;
                              $scope.searchData.total = data.total;
                              $scope.searchData.messages = cleanMessages(data.data);
                          }
                      }
                    );




                    // var url = "/history/" + $scope.searchData.selectedLocationId;

                    /* $http.post(url, { query: term } )
                        .success(
                        function (data) {
                            if (data && data.success) {
                                $scope.searchData.isMore = data.isMore;
                                $scope.searchData.nextDate = data.nextDate;
                                $scope.searchData.total = data.total;
                                $scope.searchData.messages = cleanMessages(data.data);
                            }
                        }
                    ); */
                };
                $scope.setLocation = function (location) {
                    $scope.searchData.selectedLocationName = location.name;
                    $scope.searchData.selectedLocationId = location.locationId;
                };
            }
        ]
    );

    /**
     *  User Controller
     */
    ngLocationSlackedApp.controller(
        'userController',
        [
            "$scope",
            "$routeParams",
            "$http",
            "$location",
            "$rootScope",
            function userController($scope, $routeParams, $http, $location, $rootScope) {

        if (!$rootScope.user || $rootScope.user.loggedIn !== true) {
            $location.path('/');
        }
        $scope.commands = [{ msg: "!join CHANNEL", desc: "Messaging the bot will force the bot to join the channel<br>Example: !join #general"}];
        $scope.subscribeData = {
            selectedChannels: null
        };
        // channelMulti
        $("#channelMulti").chosen({ width: "100%"});

        $http.get("/channel/all")
            .success(
            function (data) {

                $scope.allChannels = data.channels;
                $rootScope.channels = data.channels;
                setTimeout(function () {
                    $("#channelMulti").trigger("chosen:updated");
                }, 250);
            }
        );
        $scope.alert = {
            hide: true,
            type: "alert-success",
            message: "this works",
            close: function () {
                $scope.alert.hide = true;
                $scope.$apply();
            }
        };

        $scope.forceRefresh = function () {
            console.log("Forced refresh");
           $rootScope.$emit("authenticated", true);
        };

        $scope.subscribeToChannels = function () {
            var chans = $scope.subscribeData.selectedChannels;
            console.log(chans);
            $http.post('/channel/', { channels: chans} )
                .success(
                function (data) {
                    if (data && data.success) {
                        $scope.alert.hide = false;
                        $scope.alert.type = "alert-success";
                        $scope.alert.icon = "glyphicon-ok-circle";
                        $scope.alert.message = "Successfully subscribed to those channels";
                        setTimeout(function () {
                           $scope.alert.hide = true;
                            $scope.$apply();
                        }, 2500);
                    }
                }

            ).error(
                function (data) {
                   console.log(data);
                    $scope.alert.hide = false;
                    $scope.alert.type = "alert-danger";
                    $scope.alert.icon = "glyphicon-exclamation-sign";
                    $scope.alert.message = "Unable to subscribe to channels";
                    setTimeout(function () {
                        $scope.alert.hide = true;
                        $scope.$apply();
                    }, 2500);
                }
            );
        }
    }]);

    /**
     *  Index Controller (first page hit before login)
     */
    ngLocationSlackedApp.controller(
        'indexController',
        [
            "$scope",
            "$routeParams",
            "$http",
            "$location",
            "$rootScope",
            function indexController($scope, $routeParams, $http, $location, $rootScope) {

        // user is logged in load user page instead of the login / sign up page
        if ($rootScope.user && $rootScope.user.loggedIn === true) {
            console.log("redirecting user to '/user'");
            $location.path('/user');

        } else {

            // used as temporary storage to authenticate and control flow
            $scope.authData = {
                token: "",
                step2: false,
                timedWait: false,
                selectedUser: $rootScope.user.userId
            };

            var lastSelected = window.localStorage.getItem("slacked:user_selected");

            if (lastSelected) {
                $scope.authData.selectedUser = lastSelected;
            }

            // Setup chosen input box
            $("#userDropDown").chosen({allow_single_deselect: false, disable_search_threshold: 5, width: "275px", placeholder_text_single: "Select user"});

            $("#userDropDown").on("change", function () {
                setTimeout(function() {
                    $scope.$apply();
                    window.localStorage.setItem("slacked:user_selected", $scope.authData.selectedUser);
                }, 250);
            });

            $scope.startAuthProcess = function() {
                $rootScope.user.userId = $scope.authData.selectedUser;
                console.log("Starting auth process");

                $http.get('/user/auth?userId=' + $rootScope.user.userId).
                    success(
                    function (data) {
                        if (data && data.success === true) {
                            $scope.authData.step2 = true;
                            $scope.authData.timedWait = true;

                            setTimeout(function () {
                                $scope.authData.timedWait = false;
                                $scope.$apply();
                            }, 60000);
                        } else {
                            console.log("Bad request");
                            // TODO notify user
                        }
                    }
                ).error(
                    function (data) {
                        console.log("Error request");
                        // TODO notify user
                    }
                )
            };

            $scope.finishAuthProcess = function(token) {
                var token = token || $scope.authData.token;
                if (token && token.length > 0) {

                    $http.post("/user/auth/" + $rootScope.user.userId, {token: token})
                        .success(
                            function (data) {
                                if (data && data.success == true) {

                                    $scope.token = "";
                                    $rootScope.user.userId = data.userId;
                                    $rootScope.user.loggedIn = true;
                                    $rootScope.user.displayName = data.displayName;
                                    console.log("I logged in here!!");
                                    $scope.$emit("authenticated");
                                    $location.path("/user/");
                                }
                            }
                    );
                }
                console.log(token);
            };

            // get users
            $scope.allUsers = [];

            $http.get("/user/")
                .success(
                function (data) {

                    $scope.allUsers = data.users;
                    $rootScope.users = data.users;
                    setTimeout(function () {
                        $("#userDropDown").trigger("chosen:updated");
                    }, 250);
                }
            );
        }
    }]);



    /***
     * cleanMessages - Adds msg.date and msg.time to the data for $scope.messages helps make it look nice
     * @param data = [{ }] (messages)
     * @returns {Array}
     */
    function cleanMessages(data) {

        var ret = {};
        // { dateId: "20141228" dateString: "December 28, 2014" messages: [] }

        if (data && data.length && data.length > 0) {

            for (var i = 0; i < data.length; i++) {
                var tmp = tsToDateString(data[i].msgStamp);
                data[i].date = tmp.dateString;
                data[i].time = tmp.time;
                if (ret[tmp.dateId]) {
                    ret[tmp.dateId].messages.push(data[i]);
                } else {
                    ret[tmp.dateId] = { dateId: tmp.dateId, dateString: tmp.dateString, messages: [data[i]] };
                }
            }
            var sending = hashToArray(ret);
            sending.total = data.length;
            console.log(sending);
            return sending.sort(function (a, b) {
                return b.dateId - a.dateId;
            });
        }
    }

    /***
     * Turns route parameters into the request url
     * @param param { locationType: "channel | group", locationId: "CXXXXXXX | GXXXXXXX" }
     * @returns {string}
     */
    function makeUrl(param, page) {
        // :locationType/:locationId
        var url = "";
        if (!param.locationType) {
            param.locationType = "channel";
        }
        url = "/" + param.locationType + "/" + param.locationId + "?page=" + page;
        return url;
    }

    /***
     * tsToDateString
     * @param id [number]
     * @returns {Object} = { date: {String}, time: {Time} }
     */
    function tsToDateString(id) {

        var tmp = new Date();
        if (id && typeof id == "number") {
            tmp = new Date(id);
        }
        var dateString = "";
        switch (tmp.getMonth()) {
            case (0):
                dateString = "January";
                break;
            case (1):
                dateString = "February";
                break;
            case (2):
                dateString = "March";
                break;
            case (3):
                dateString = "April";
                break;
            case (4):
                dateString = "May";
                break;
            case (5):
                dateString = "June";
                break;
            case (6):
                dateString = "July";
                break;
            case (7):
                dateString = "August";
                break;
            case (8):
                dateString = "September";
                break;
            case (9):
                dateString = "October";
                break;
            case (10):
                dateString = "November";
                break;
            case (11):
                dateString = "December";
                break;
        }
        dateString += " " + tmp.getDate() + ", " + tmp.getFullYear();
        return {dateId: tmp.getFullYear().toString() + (tmp.getMonth() + 1).toString() + (tmp.getDate().toString()), dateString: dateString, time: tmp.toLocaleTimeString()};
    };


    /***
     * Convert Hash To Array
     * @param obj
     * @returns {Array}
     */
    function hashToArray(obj) {
        var keys = Object.keys(obj) || [];
        var ret = [];
        for (var i = 0; i < keys.length; i++)
        {
            ret.push(obj[keys[i]]);
        }
        return ret;
    };

})(window.angular);