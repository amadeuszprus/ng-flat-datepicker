(function () {

    'use strict';

    /**
     * @desc Datepicker directive
     */

    angular
        .module('ngFlatDatepicker', [])
        .directive('ngFlatDatepicker', ngFlatDatepickerDirective);

    function ngFlatDatepickerDirective($templateCache, $compile, $document, datesCalculator) {
        return {
            restrict: 'A',
            require: 'ngModel',
            scope: {
                config: '=datepickerConfig'
            },
            link: function (scope, element, attrs, ngModel) {

                var template = angular.element($templateCache.get('datepicker.html'));
                var backdropTemplate = angular.element($templateCache.get('backdrop.html'));
                var dateSelected = '';
                var today = moment.utc();
                var body = document.getElementsByTagName('body')[0];

                // Default options
                var defaultConfig = {
                    allowFuture: true,
                    dateFormat: null,
                    minDate: null,
                    maxDate: null,
                    style: {},
                    forceDisplayElement: true,
                    backdrop: true
                };

                // Apply and init options
                scope.config = angular.extend(defaultConfig, scope.config);
                if (angular.isDefined(scope.config.minDate)) moment.utc(scope.config.minDate).subtract(1, 'day');
                if (angular.isDefined(scope.config.maxDate)) moment.utc(scope.config.maxDate).add(1, 'day');

                // Data
                scope.calendarCursor = today;
                scope.currentWeeks = [];
                scope.daysNameList = datesCalculator.getDaysNames();
                scope.monthsList = moment.months();
                scope.yearsList = datesCalculator.getYearsList();

                // Display
                scope.pickerDisplayed = false;

                scope.$watch(function () {
                    return ngModel.$modelValue;
                }, function (value) {
                    if (value) {
                        dateSelected = scope.calendarCursor = moment.utc(value, scope.config.dateFormat);
                    }
                });

                scope.$watch(function () {
                    return scope.pickerDisplayed
                }, function (value) {
                    if (value) {
                        init();
                    } else {
                        destroy();
                    }
                });

                scope.$watch('calendarCursor', function (val) {
                    scope.currentWeeks = getWeeks(val);
                });

                /**
                 * @deprecated
                 * ClickOutside, handle all clicks outside the DatePicker when visible
                 */
                element.bind('click', function (e) {
                    scope.$apply(function () {
                        scope.pickerDisplayed = true;
                        $document.on('click', onDocumentClick);
                    });
                });

                function getCoords(elem) {
                    var box = elem[0].getBoundingClientRect();
                    console.log(elem, elem[0].getBoundingClientRect());
                    return {
                        top: box.top + pageYOffset + elem[0].offsetHeight,
                        left: box.left + pageXOffset
                    };
                }

                /**
                 * @deprecated
                 * Display the previous month in the datepicker
                 * @return {}
                 */
                function onDocumentClick(e) {
                    if (template !== e.target && !template[0].contains(e.target) && e.target !== element[0]) {
                        $document.off('click', onDocumentClick);
                        scope.$apply(function () {
                            scope.calendarCursor = dateSelected ? dateSelected : today;
                            scope.pickerDisplayed = scope.showMonthsList = scope.showYearsList = false;
                        });
                    }
                }

                /**
                 * Display the previous month in the datepicker
                 * @return {}
                 */
                scope.prevMonth = function () {
                    scope.calendarCursor = moment(scope.calendarCursor).subtract(1, 'months');
                };

                /**
                 * Display the next month in the datepicker
                 * @return {}
                 */
                scope.nextMonth = function nextMonth() {
                    scope.calendarCursor = moment(scope.calendarCursor).add(1, 'months');
                };

                /**
                 * Select a month and display it in the datepicker
                 * @param  {string} month The month selected in the select element
                 * @return {}
                 */
                scope.selectMonth = function selectMonth(month) {
                    scope.showMonthsList = false;
                    scope.calendarCursor = moment(scope.calendarCursor).month(month);
                };

                /**
                 * Select a year and display it in the datepicker depending on the current month
                 * @param  {string} year The year selected in the select element
                 * @return {}
                 */
                scope.selectYear = function selectYear(year) {
                    scope.showYearsList = false;
                    scope.calendarCursor = moment(scope.calendarCursor).year(year);
                };

                /**
                 * Select a day
                 * @param  {[type]} day [description]
                 * @return {[type]}     [description]
                 */
                scope.selectDay = function (day) {
                    if (day.isSelectable && !day.isFuture || (scope.config.allowFuture && day.isFuture)) {
                        resetSelectedDays();
                        day.isSelected = true;
                        ngModel.$setViewValue(moment.utc(day.date).format(scope.config.dateFormat));
                        ngModel.$render();
                        scope.pickerDisplayed = false;
                    }
                };

                $compile(template)(scope);
                $compile(backdropTemplate)(scope);

                /**
                 * Init the directive
                 * @return {}
                 */
                function init() {
                    var target = angular.element(body);
                    scope.config.style = computeStyle();
                    target.addClass('ng-flat-datepicker-backdrop-showing');
                    target.append(template);
                    target.append(backdropTemplate);

                    if (angular.isDefined(ngModel.$modelValue) && moment.isDate(ngModel.$modelValue) && !scope.calendarCursor) {
                        scope.$apply(function () {
                            scope.calendarCursor = ngModel.$modelValue;
                        })
                    }
                }

                function computeStyle(defaults) {
                    var coords = getCoords(element);
                    var top = coords.top + 'px';
                    var bottom = 'auto';

                    if (coords.top + 365 > window.innerHeight && window.innerHeight > 365) {
                        bottom = 0;
                        top = 'auto';
                    }

                    if (scope.config.forceDisplayElement && coords && !coords.top && !coords.left && getComputedStyle(element[0], null).display === 'none') {

                        element.addClass('ng-flat-datepicker-force-display');

                        if (element[0].type && element[0].type === 'hidden') {
                            element[0].type = undefined
                        }

                        return defaults ? defaults : computeStyle({
                            top: top,
                            left: 0,
                            right: 'auto',
                            bottom: bottom,
                            position: 'absolute'
                        })
                    }

                    return {
                        top: top,
                        left: coords.left + 'px',
                        right: 'auto',
                        bottom: bottom,
                        position: 'absolute'
                    };
                }

                /**
                 * Destroy the directive
                 * @return {}
                 */
                function destroy() {
                    var elements = document.getElementsByClassName('ng-flat-datepicker-wrapper');
                    var backdrops = document.getElementsByClassName('ng-flat-datepicker-backdrop');
                    angular.element(body).removeClass('ng-flat-datepicker-backdrop-showing');

                    for (var i = 0; i < elements.length; i++) {
                        elements[i].remove();
                    }
                    for (var i = 0; i < backdrops.length; i++) {
                        backdrops[i].remove();
                    }
                }

                /**
                 * Get all weeks needed to display a month on the Datepicker
                 * @return {array} list of weeks objects
                 */
                function getWeeks(date) {

                    var weeks = [];
                    var date = moment.utc(date);
                    var firstDayOfMonth = moment(date).date(1);
                    var lastDayOfMonth = moment(date).date(date.daysInMonth());

                    var startDay = moment(firstDayOfMonth);
                    var endDay = moment(lastDayOfMonth);
                    // NB: We use weekday() to get a locale aware weekday
                    startDay = firstDayOfMonth.weekday() === 0 ? startDay : startDay.weekday(0);
                    endDay = lastDayOfMonth.weekday() === 6 ? endDay : endDay.weekday(6);

                    var currentWeek = [];

                    for (var start = moment(startDay); start.isBefore(moment(endDay).add(1, 'days')); start.add(1, 'days')) {

                        var afterMinDate = !scope.config.minDate || start.isAfter(scope.config.minDate, 'day');
                        var beforeMaxDate = !scope.config.maxDate || start.isBefore(scope.config.maxDate, 'day');
                        var isFuture = start.isAfter(today);
                        var beforeFuture = scope.config.allowFuture || !isFuture;

                        var day = {
                            date: moment(start).toDate(),
                            isToday: start.isSame(today, 'day'),
                            isInMonth: start.isSame(firstDayOfMonth, 'month'),
                            isSelected: start.isSame(dateSelected, 'day'),
                            isSelectable: afterMinDate && beforeMaxDate && beforeFuture
                        };

                        currentWeek.push(day);

                        if (start.weekday() === 6 || start === endDay) {
                            weeks.push(currentWeek);
                            currentWeek = [];
                        }
                    }

                    return weeks;
                }

                /**
                 * Reset all selected days
                 */
                function resetSelectedDays() {
                    scope.currentWeeks.forEach(function (week, wIndex) {
                        week.forEach(function (day, dIndex) {
                            scope.currentWeeks[wIndex][dIndex].isSelected = false;
                        });
                    });
                }
            }
        };
    }

})();
