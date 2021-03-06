(function ($) {
    /**
     * Solves Bootstrap and Prototype.js conflict.
     *
     * @link http://jsfiddle.net/dgervalle/hhBc6/
     * @link http://www.softec.lu/site/DevelopersCorner/BootstrapPrototypeConflict
     */
    jQuery.noConflict();
    if (Prototype.BrowserFeatures.ElementExtensions) {
        var disablePrototypeJS = function (method, pluginsToDisable) {
                var handler = function (event) {
                    event.target[method] = undefined;
                    setTimeout(function () {
                        delete event.target[method];
                    }, 0);
                };
                pluginsToDisable.each(function (plugin) {
                    jQuery(window).on(method + '.bs.' + plugin, handler);
                });
            },
            pluginsToDisable = ['collapse', 'dropdown', 'modal', 'tooltip', 'popover', 'tab'];
        disablePrototypeJS('show', pluginsToDisable);
        disablePrototypeJS('hide', pluginsToDisable);
    }

    /**
     * Creates a doughnut chart that shows the number of issues per severity.
     * Requires that a DOM <div> element exists with the ID '#severities-chart'.
     */
    view.getSeverityModel(function (pieModel) {
        var severitiesChart = $('#severities-chart').renderPieChart(pieModel.responseJSON, true);
        $('#overview-carousel').on('slid.bs.carousel', function () {
            severitiesChart.resize();
        });
    });
    view.getSeverityModel(function (pieModel) {
        $('#single-severities-chart').renderPieChart(pieModel.responseJSON, false);
    });

    /**
     * Creates a doughnut chart that shows the number of new, fixed and outstanding issues.
     * Requires that a DOM <div> element exists with the ID '#trend-chart'.
     */
    view.getTrendModel(function (pieModel) {
        var trendChart = $('#trend-chart').renderPieChart(pieModel.responseJSON, true);

        $('#overview-carousel').on('slid.bs.carousel', function () {
            trendChart.resize();
        });
    })
    view.getTrendModel(function (pieModel) {
        $('#single-trend-chart').renderPieChart(pieModel.responseJSON, false);
    });

    storeAndRestoreCarousel('overview-carousel');

    /**
     * Creates a build trend chart that shows the number of issues for a couple of builds.
     * Requires that a DOM <div> element exists with the ID '#history-chart'.
     */
    view.getBuildTrend(function (lineModel) {
        var historyChart = renderTrendChart('history-chart', lineModel.responseJSON, true, null);

        $('#trend-carousel').on('slid.bs.carousel', function () {
            historyChart.resize();
        });
    });

    /**
     * Creates a build trend chart that shows the number of issues per tool.
     * Requires that a DOM <div> element exists with the ID '#tools-trend-chart'.
     */
    view.getToolsTrend(function (lineModel) {
        var toolsChart = renderTrendChart('tools-trend-chart', lineModel.responseJSON, true, null);

        $('#trend-carousel').on('slid.bs.carousel', function () {
            toolsChart.resize();
        });
    });

    /**
     * Creates a build trend chart that shows the number of issues colored by the health report ranges.
     * Requires that a DOM <div> element exists with the ID '#health-trend-chart'.
     */
    if ($('#health-trend-chart').length) {
        view.getHealthTrend(function (lineModel) {
            var healthChart = renderTrendChart('health-trend-chart', lineModel.responseJSON, true, null);

            $('#trend-carousel').on('slid.bs.carousel', function () {
                healthChart.resize();
            });
        });
        storeAndRestoreCarousel('trend-carousel');
    }


    /**
     * Create a data table instance for all tables that are marked with class "display".
     */
    $('table.property-table').DataTable({
        pagingType: 'numbers',  // Page number button only
        columnDefs: [{
            targets: 'no-sort', // Columns with class 'no-sort' are not orderable
            orderable: false
        }]
    });

    /**
     * Create data table instances for the detail tables.
     */
    showTable('#issues');
    showTable('#scm');

    /**
     * Activate the tab that has been visited the last time. If there is no such tab, highlight the first one.
     * If the user selects the tab using an #anchor prefer this tab.
     */
    var detailsTabs = $('#tab-details');
    detailsTabs.find('li:first-child a').tab('show');

    var url = document.location.toString();
    if (url.match('#')) {
        var tabName = url.split('#')[1];

        detailsTabs.find('a[href="#' + tabName + '"]').tab('show');
    } else {
        var activeTab = localStorage.getItem('activeTab');
        if (activeTab) {
            detailsTabs.find('a[href="' + activeTab + '"]').tab('show');
        }
    }

    /**
     * Store the selected tab in browser's local storage.
     */
    var tabToggleLink = $('a[data-toggle="tab"]');
    tabToggleLink.on('show.bs.tab', function (e) {
        window.location.hash = e.target.hash;
        var activeTab = $(e.target).attr('href');
        localStorage.setItem('activeTab', activeTab);
    });

    /**
     * Stores the order of every table in the local storage of the browser.
     */
    var allTables = $('#statistics').find('table');
    allTables.on('order.dt', function (e) {
        var table = $(e.target);
        var order = table.DataTable().order();
        var id = table.attr('id');
        localStorage.setItem(id + '#orderBy', order[0][0]);
        localStorage.setItem(id + '#orderDirection', order[0][1]);
    });

    /**
     * Restores the order of every table by reading the local storage of the browser.
     * If no order has been stored yet, the table is skipped.
     * Also saves the default length of the number of table columns.
     */
    allTables.each(function () {
        // Restore order
        var id = $(this).attr('id');
        var orderBy = localStorage.getItem(id + '#orderBy');
        var orderDirection = localStorage.getItem(id + '#orderDirection');
        var dataTable = $(this).DataTable();
        if (orderBy && orderDirection) {
            var order = [orderBy, orderDirection];
            try {
                dataTable.order(order).draw();
            } catch (ignore) { // TODO: find a way to determine the number of columns here
                dataTable.order([[1, 'asc']]).draw();
            }
        }
        // Store paging size
        $(this).on('length.dt', function (e, settings, len) {
            localStorage.setItem(id + '#table-length', len);
        });
        var storedLength = localStorage.getItem(id + '#table-length');
        if ($.isNumeric(storedLength)) {
            dataTable.page.len(storedLength).draw();
        }
    });

    /**
     * Activate tooltips.
     */
    $(function () {
        $('[data-toggle="tooltip"]').tooltip()
    });

    /**
     * Store and restore the selected carousel image in browser's local storage.
     *
     * @param {String} carouselId - ID of the carousel
     */
    function storeAndRestoreCarousel(carouselId) {
        var carousel = $('#' + carouselId);
        carousel.on('slid.bs.carousel', function (e) {
            localStorage.setItem(carouselId, e.to);
        });
        var activeCarousel = localStorage.getItem(carouselId);
        if (activeCarousel) {
            carousel.carousel(parseInt(activeCarousel));
        }
    }

    /**
     * Initializes the specified table.
     *
     * @param {String} id - the ID of the table
     */
    function showTable(id) {
        // Create a data table instance for the issues table. 
        var table = $(id);
        if (table.length) {
            var dataTable = table.DataTable({
                language: {
                    emptyTable: "Loading - please wait ..."
                },
                pagingType: 'numbers',  // Page number button only
                order: [[1, 'asc']],
                columnDefs: [{
                    targets: 0,         // First column contains details button
                    orderable: false
                }]
            });

            // Add event listener for opening and closing details
            table.on('click', 'div.details-control', function () {
                var tr = $(this).parents('tr');
                var row = dataTable.row(tr);

                if (row.child.isShown()) {
                    // This row is already open - close it
                    row.child.hide();
                    tr.removeClass('shown');
                } else {
                    // Open this row
                    row.child($(this).data('description')).show();
                    tr.addClass('shown');
                }
            });

            // Content is loaded on demand: if the active tab shows the table, then content is loaded using Ajax
            var tabToggleLink = $('a[data-toggle="tab"]');
            tabToggleLink.on('show.bs.tab', function (e) {
                var activeTab = $(e.target).attr('href');
                if (activeTab === (id + 'Content') && dataTable.data().length === 0) {
                    view.getTableModel(id, function (t) {
                        (function ($) {
                            var table = $(id).DataTable();
                            table.rows.add(t.responseObject().data).draw()
                        })(jQuery);
                    });
                }
            });
        }
    }
})(jQuery);



