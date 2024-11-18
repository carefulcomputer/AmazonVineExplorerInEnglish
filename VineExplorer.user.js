// Externalized Translations
const STRINGS = {
    "markCurrentPageAsSeen": "Mark current page as seen",
    "markAllAsSeen": "Mark all as seen",
    "backToTop": "Back to top",
    "additionalItems": "Additional items",
    "lastChanceAvailable": "Available for all",
    "myPotluck": "My Potluck",
    "moreDetails": "More details",
    "clipboardCopySuccess": "Text has been copied to clipboard.",
    "clipboardCopyError": "Error copying to clipboard:",
    "estimatedTaxPrice": "Tax Price",
    "currentPageShowing": "Showing",
    "outOfResults": "of results",
    "readUp": "Read up",
    "goToTop": "Go to top",
    "newEntries": "New entries",
    "favorites": "Favorites",
    "allProducts": "All products",
    "searchVineProducts": "Search Vine Products",
    "updateDatabase": "Update Database",
    "autoScanInit": "Init Autoscan, please wait...",
    "autoScanSuccess": "Success, cleaning up Database...",
    "autoScanFinished": "Finished Database\nupdate and cleanup\n\nPage reloading incoming... please wait",
    "autoscanRunning": "Autoscan is running...",
    "databaseCleanupFinished": "Finished database update and cleanup",
    "initAutoScan": "Init Autoscan",
    "errorWhileUpdatingProduct": "There was an error while updating a product in the database",
    "notificationNewItems": "New Vine products found",
    "desktopNotificationText": "Amazon Vine Explorer",
    "desktopNotificationSuccess": "Found",
    "items": "items",
};

// Updated Script Code
'use strict';
console.log(`Init Vine Voices Explorer ${AVE_VERSION}`);

/**
 * On which page are we currently? PAGETYPE
 * @type {PAGETYPE}
 */
let currentMainPage;

loadSettings();
fastStyleChanges();

let searchInputTimeout;
let backGroundScanTimeout;

let TimeouteScrollTilesBufferArray = [];
let BackGroundScanIsRunning = false;

// Make some things accessible from the console
unsafeWindow.ave = {
    classes: [
        DB_HANDLER = DB_HANDLER
    ],
    config: SETTINGS,
    event: ave_eventhandler,
};

const database = new DB_HANDLER(DATABASE_NAME, DATABASE_OBJECT_STORE_NAME, DATABASE_VERSION, (res, err) => {
    if (err) {
        console.error(`Something went wrong while initializing the database :'(`);
        return;
    } else {
        let _execLock = false;
        console.log('Let’s check where we are....');
        if (SITE_IS_VINE) {
            console.log('We are on Amazon Vine'); // We are on the Amazon Vine site
            if (SETTINGS.DarkMode) {
                waitForHtmlElmement('body', () => {
                    injectDarkMode();
                });
            }

            const urlParams = new URLSearchParams(window.location.search);
            const aveData = urlParams.get('vine-data');
            let aveShareData = localStorage.getItem('ave-share-details');
            if (aveData || aveShareData) {
                let _data = aveShareData ? JSON.parse(aveShareData) : (aveData ? JSON.parse(aveData) : null);
                waitForHtmlElmement('body', () => {
                    let aveShareElementTmp = document.createElement('div');
                    aveShareElementTmp.style.display = "none";
                    aveShareElementTmp.innerHTML = `
                <span class="a-button a-button-primary vvp-details-btn" id="a-autoid-0">
                <span class="a-button-inner">
                <input data-asin="${_data.asin}" data-is-parent-asin="${_data.isParentAsin}" data-recommendation-id="${_data.recommendationId}" data-recommendation-type="VENDOR_TARGETED" class="a-button-input" type="submit" aria-labelledby="a-autoid-0-announce">
                <span class="a-button-text" aria-hidden="true" id="a-autoid-0-announce">${STRINGS.moreDetails}
                </span>
                </span>
                </span>
                `;
                    document.body.appendChild(aveShareElementTmp);
                    // Wait for the next event cycle to ensure the element is fully rendered
                    setTimeout(() => {
                        aveShareElementTmp.querySelector('input').click();
                        setTimeout(() => {
                            localStorage.removeItem('ave-share-details');
                        }, 200);
                    }, 500);
                });
            }
            addAveSettingsTab();
            addAVESettingsMenu();
            waitForHtmlElmement('.vvp-details-btn', () => {
                if (_execLock) return;
                _execLock = true;
                addBranding();
                detectCurrentPageType();

                let _tileCount = 0;
                const _initialWaitForAllTiles = setInterval(() => {
                    const _count = document.getElementsByClassName('vvp-details-btn').length; // Buttons take a bit more time than tiles
                    if (_count > _tileCount) {
                        _tileCount = _count;
                    } else {
                        clearInterval(_initialWaitForAllTiles);
                        init(true);
                    }
                }, 100);
            });
            waitForHtmlElmement('.vvp-no-offers-msg', () => { // Empty Page
                if (_execLock) return;
                _execLock = true;
                if (SETTINGS.DarkMode) {
                    waitForHtmlElmement('body', () => {
                        injectDarkMode();
                    });
                }
                addBranding();
                init(false);
            });
        } else if (SITE_IS_SHOPPING) {
            console.log('We are on Amazon Shopping'); // We are on normal Amazon shopping
            _execLock = true;
            waitForHtmlElmement('body', () => {
                addBranding(); // For now, only show that the script is active
            });
            useEnrollmentData(); // Function to use enrollment data from URL

            function useEnrollmentData() {
                const urlParams = new URLSearchParams(window.location.search);
                const aveData = urlParams.get('vine-data');
                if (aveData) {
                    const enrollmentData = JSON.parse(decodeURIComponent(aveData));
                    // Redirect to Vine and Open Item
                    localStorage.setItem('ave-share-details', JSON.stringify(enrollmentData));

                    window.open(`${window.location.origin}/vine/vine-items`, '_blank');
                }
            }
        }
    }
});

unsafeWindow.ave.database = database;

// Continuation of the Code

function addLeftSideButtons(forceClean) {
    const _nodesContainer = document.getElementById('vvp-browse-nodes-container');

    if (forceClean) _nodesContainer.innerHTML = '';

    _nodesContainer.appendChild(document.createElement('p')); // A bit of space above our buttons

    const _setAllSeenBtn = createButton(
        STRINGS.markCurrentPageAsSeen,
        'ave-btn-allseen',
        `width: 240px; background-color: ${SETTINGS.BtnColorMarkCurrSiteAsSeen};`,
        () => {
            if (SETTINGS.DebugLevel > 10) console.log('Clicked All Seen Button');
            markAllCurrentSiteProductsAsSeen();
        }
    );

    const _setAllSeenDBBtn = createButton(
        STRINGS.markAllAsSeen,
        'ave-btn-db-allseen',
        `left: 0; width: 240px; background-color: ${SETTINGS.BtnColorMarkAllAsSeen};`,
        () => {
            if (SETTINGS.DebugLevel > 10) console.log('Clicked All Seen Button');
            setTimeout(() => {
                database.getAll().then((prodsArr) => {
                    const _prodsArrLength = prodsArr.length;
                    for (let i = 0; i < _prodsArrLength; i++) {
                        const _currProd = prodsArr[i];
                        _currProd.isNew = false;
                        database.update(_currProd);
                    }
                });
            }, 30);
        }
    );

    const _backToTopBtn = createButton(
        STRINGS.backToTop,
        'ave-btn-backtotop',
        `width: 240px; background-color: ${SETTINGS.BtnColorBackToTop};`,
        () => {
            if (SETTINGS.DebugLevel > 10) console.log('Clicked Back to Top Button');
            window.scrollTo(0, 0);
        }
    );

    _nodesContainer.appendChild(_setAllSeenBtn);
    _nodesContainer.appendChild(_setAllSeenDBBtn);
    _nodesContainer.appendChild(_backToTopBtn);
}

function createButton(text, id, style, clickHandler) {
    const _btnSpan = document.createElement('span');
    _btnSpan.setAttribute('id', id);
    _btnSpan.setAttribute('class', 'a-button a-button-normal a-button-toggle');
    _btnSpan.setAttribute('aria-checked', 'true');
    _btnSpan.style.marginLeft = '0';
    _btnSpan.style.marginTop = '5px';
    _btnSpan.innerHTML = `
        <span class="a-button-inner" style="${style || ''}">
            <span class="a-button-text">${text}</span>
        </span>
    `;
    _btnSpan.addEventListener('click', (ev) => {
        if (clickHandler) {
            clickHandler(ev);
        } else {
            alert(`\n${STRINGS.readUp}\n${STRINGS.goToTop}`);
        }
    });
    return _btnSpan;
}

function updateNewProductsBtn() {
    if (AUTO_SCAN_IS_RUNNING) return;
    if (SETTINGS.DebugLevel > 1) console.log('Called updateNewProductsBtn()');
    database.getNewEntries().then((prodArr) => {
        const _btnBadge = document.getElementById('ave-new-items-btn-badge');
        const _pageTitle = document.title.replace(/^[^\|]*\|/, '').trim();
        const _prodArrLength = prodArr.length;
        if (SETTINGS.DebugLevel > 1) console.log(`updateNewProductsBtn(): Got Database Response: ${_prodArrLength} New Items`);

        if (_prodArrLength > 0) {
            _btnBadge.style.display = 'inline-block';
            _btnBadge.innerText = _prodArrLength;
            document.title = `${_prodArrLength} | ${_pageTitle}`;
        } else {
            _btnBadge.style.display = 'none';
            _btnBadge.innerText = '';
            document.title = `${_pageTitle}`;
        }

        let _notified = false;
        if (SETTINGS.EnableDesktopNotifikation && SETTINGS.DesktopNotifikationKeywords?.length > 0) {
            if (SETTINGS.DebugLevel > 1) console.log(`updateNewProductsBtn(): Inside IF`);

            const _configKeyWords = SETTINGS.DesktopNotifikationKeywords;

            for (let i = 0; i < _prodArrLength; i++) {
                const _prod = prodArr[i];
                const _descFull = _prod.description_full.toLowerCase();

                if (SETTINGS.DebugLevel > 1) console.log(`updateNewProductsBtn(): Search Product Description: ${_descFull} for keys: `, _configKeyWords);
                const _configKeyWordsLength = _configKeyWords.length;

                for (let j = 0; j < _configKeyWordsLength; j++) {
                    const _currKey = _configKeyWords[j].toLowerCase();
                    if (SETTINGS.DebugLevel > 1) console.log(`updateNewProductsBtn(): Searching for Keyword: ${_currKey}`);
                    if (_descFull.includes(_currKey)) {
                        desktopNotifikation(STRINGS.desktopNotificationText, _prod.description_full, _prod.data_img_url, true);
                        _notified = true;
                    }
                    break;
                }
            }
        }
        if (SETTINGS.EnableDesktopNotifikation && !_notified && _prodArrLength > oldCountOfNewItems) {
            if (unixTimeStamp() - lastDesktopNotifikationTimestamp >= SETTINGS.DesktopNotifikationDelay) {
                oldCountOfNewItems = _prodArrLength;
                lastDesktopNotifikationTimestamp = unixTimeStamp();

                desktopNotifikation(
                    STRINGS.desktopNotificationText,
                    `${STRINGS.notificationNewItems}: ${_prodArrLength} ${STRINGS.items}`
                );
            }
        }
    });
}

function desktopNotifikation(title, message, image = null, requireInteraction = null, onClick = () => {}) {
    const _vineLogo = 'https://raw.githubusercontent.com/Amazon-Vine-Explorer/AmazonVineExplorer/main/vine_logo.png';
    const _vineLogoImp = 'https://raw.githubusercontent.com/Amazon-Vine-Explorer/AmazonVineExplorer/dev-main/vine_logo_important.png';
    const _defaultImage = 'https://raw.githubusercontent.com/Amazon-Vine-Explorer/AmazonVineExplorer/dev-main/vine_logo_notification_image.png';

    if (Notification.permission === 'granted') {
        const _notification = new Notification(title, {
            body: message,
            icon: !requireInteraction ? _vineLogo : _vineLogoImp,
            image: image || _defaultImage,
            tag: requireInteraction ? `ave-notify-${Math.round(Math.random() * 10000000)}` : 'ave-notify',
            requireInteraction: requireInteraction,
        });

        _notification.onclick = onClick;
    } else {
        Notification.requestPermission().then(function(permission) {
            if (permission === 'granted') {
                console.log('Notification permission granted!');
                desktopNotifikation(title, message, image, requireInteraction, onClick);
            }
        });
    }
}

function createNavButton(mainID, text, textID, color, onclick, badgeId, badgeValue) {
    const _btn = document.createElement('span');
    _btn.setAttribute('id', mainID);
    _btn.setAttribute('class', 'a-button a-button-normal a-button-toggle');
    _btn.addEventListener('click', onclick);

    const _btnInner = document.createElement('span');
    _btnInner.classList.add('a-button-inner');
    _btnInner.style.backgroundColor = color;
    _btnInner.style.display = 'flex';
    _btn.append(_btnInner);

    const _btnInnerText = document.createElement('span');
    _btnInnerText.setAttribute('id', textID);
    _btnInnerText.classList.add('a-button-text');
    _btnInnerText.innerText = text;
    _btnInner.append(_btnInnerText);

    if (badgeId) {
        const _btnInnerBadge = document.createElement('span');
        _btnInnerBadge.setAttribute('id', badgeId);
        _btnInnerBadge.setAttribute('class', 'a-button-text');
        _btnInnerBadge.style.backgroundColor = 'red';
        _btnInnerBadge.style.color = 'white';
        _btnInnerBadge.style.display = 'inline-block';
        _btnInnerBadge.style.textAlign = 'center';
        _btnInnerBadge.innerText = badgeValue;
        _btnInner.append(_btnInnerBadge);
    }

    return _btn;
}

function init(hasTiles) {
    if (AUTO_SCAN_IS_RUNNING) {
        showAutoScanScreen(`${STRINGS.autoscanRunning} Page (${AUTO_SCAN_PAGE_CURRENT}/${AUTO_SCAN_PAGE_MAX})`);
    }

    const _aveSubpageRequest = getUrlParameter('ave-subpage');
    if (SETTINGS.DebugLevel > 10) console.log(`Got Subpage Parameter`, _aveSubpageRequest);

    if (_aveSubpageRequest) createNewSite(parseInt(_aveSubpageRequest));

    if (hasTiles) {
        const _tiles = document.getElementsByClassName('vvp-item-tile');

        const _tilesLength = _tiles.length;
        const _tilePorms = [];
        for (let i = 0; i < _tilesLength; i++) {
            const _currTile = _tiles[i];
            _currTile.style.cssText = "background-color: yellow;";
            _tilePorms.push(
                parseTileData(_currTile).then((_product) => {
                    if (SETTINGS.DebugLevel > 14) console.log('Parsed tile data:', _product);
                    addStyleToTile(_currTile, _product);
                })
            );
        }
        Promise.allSettled(_tilePorms).then(() => {
            if (INIT_AUTO_SCAN) {
                startAutoScan();
            } else if (AUTO_SCAN_IS_RUNNING) {
                handleAutoScan();
            } else {
                completeDelayedInit();
            }
        });
    } else {
        if (SETTINGS.DebugLevel > 10) console.log(`init(): NO TILES TO PARSE ON THIS SITE => SKIP`);
    }

    if (AUTO_SCAN_IS_RUNNING) return;

    const _searchbarContainer = document.getElementById('vvp-items-button-container');

    _searchbarContainer.appendChild(
        createNavButton(
            'ave-btn-favorites',
            STRINGS.allProducts,
            '',
            SETTINGS.BtnColorAllProducts,
            () => {
                createNewSite(PAGETYPE.ALL);
            }
        )
    );
    _searchbarContainer.appendChild(
        createNavButton(
            'ave-btn-favorites',
            STRINGS.favorites,
            '',
            SETTINGS.BtnColorFavorites,
            () => {
                createNewSite(PAGETYPE.FAVORITES);
            }
        )
    );
    _searchbarContainer.appendChild(
        createNavButton(
            'ave-btn-list-new',
            STRINGS.newEntries,
            'ave-new-items-btn',
            SETTINGS.BtnColorNewProducts,
            () => {
                createNewSite(PAGETYPE.NEW_ITEMS);
            },
            'ave-new-items-btn-badge',
            '-'
        )
    );

    updateNewProductsBtn();

    const _searchBarSpan = document.createElement('span');
    _searchBarSpan.setAttribute('class', 'ave-search-container');
    _searchBarSpan.style.cssText = `margin: 0.5em;`;

    const _searchBarInput = document.createElement('input');
    _searchBarInput.setAttribute('type', 'search');
    _searchBarInput.setAttribute('placeholder', STRINGS.searchVineProducts);
    _searchBarInput.setAttribute('name', 'ave-search');
    _searchBarInput.style.cssText = `width: 30em;`;
    _searchBarInput.addEventListener('keyup', (ev) => {
        const _input = _searchBarInput.value.toLowerCase();
        if (SETTINGS.DebugLevel > 10) console.log(`Updated Input: ${_input}`);
        if (_input.length >= 2) {
            if (searchInputTimeout) clearTimeout(searchInputTimeout);
            searchInputTimeout = setTimeout(() => {
                database.query(_input.split(' ')).then((_objArr) => {
                    if (SETTINGS.DebugLevel > 10) console.log(`Found ${_objArr.length} Items with this Search`);
                    createNewSite(PAGETYPE.SEARCH_RESULT, _objArr);
                    searchInputTimeout = null;
                });
            }, 250);
        }
    });

    _searchBarSpan.appendChild(_searchBarInput);
    _searchbarContainer.appendChild(_searchBarSpan);

    if (SETTINGS.EnableBackgroundScan) initBackgroundScan();

    const _paginationContainer = document.getElementsByClassName('a-pagination')[0];
    if (_paginationContainer) {
        if (SETTINGS.DebugLevel > 10) console.log('Manipulating Pagination');

        const _nextBtn = _paginationContainer.lastChild;
        const _isNextBtnDisabled = _nextBtn.classList.contains('a-disabled');
        const _nextBtnLink = _nextBtn.lastChild.getAttribute('href');
        const _btn = _nextBtn.cloneNode(true);

        const _aveNextPageButtonText = STRINGS.readUp;

        if (!_isNextBtnDisabled) {
            _nextBtn.setAttribute('class', 'a-normal');
        }

        _btn.innerHTML = _aveNextPageButtonText;
        _btn.style.color = 'unset';
        _btn.style.backgroundColor = 'lime';
        _btn.style.borderRadius = '8px';
        _btn.style.cursor = 'pointer';

        _btn.addEventListener('click', () => {
            markAllCurrentSiteProductsAsSeen(() => {
                if (!_nextBtn.classList.contains('a-disabled')) {
                    window.location.href = _nextBtnLink;
                }
            });
        });

        _paginationContainer.appendChild(_btn);
    }
}
