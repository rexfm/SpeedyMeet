/*
 * background.js runs in the background on Chrome. It has access to manage the windows/tabs.
 * This will start the process to redirect the open tab into the PWA.
 */

let googleMeetWindowId;

chrome.tabs.onUpdated.addListener((tabId, tabChangeInfo, tab) => {
  // when tab is loaded on meet.google.com, attempt to redirect
  if (
    tabChangeInfo.status === 'complete' &&
    tab.url &&
    tab.url.includes('meet.google.com')
  ) {
    // find Google Meet PWA window id
    chrome.windows.getAll(
      { populate: true, windowTypes: ['app'] },
      function (windows) {
        windows.forEach((window) => {
          if (
            window.tabs.length === 1 &&
            window.tabs[0].url.startsWith('https://meet.google.com/')
          ) {
            googleMeetWindowId = window.id;
          }
        });

        if (!googleMeetWindowId) {
          // skipping redirect since PWA isn't open
          // we could inject a button onto the page to inform the user of this
          return;
        }

        // only attempt a redirect when not the PWA
        if (tab.windowId !== googleMeetWindowId) {
          chrome.storage.local.set(
            { originatingTabId: '', queryParams: '' },
            function () {
              let queryParameters = tab.url.split('/')[3].split('?')[0];
              if (queryParameters !== 'new' && queryParameters !== '_meet') {
                // if empty, set the the landing page
                queryParameters = queryParameters ? queryParameters : 'landing';
                console.log(`queryParameters: ${queryParameters}`);
                chrome.storage.local.set({
                  originatingTabId: tabId,
                  queryParams: queryParameters,
                });
              }
            }
          );
        }
      }
    );
  }
});

chrome.storage.onChanged.addListener(function (changes) {
  if (changes['googleMeetOpenedUrl']) {
    // bring Google Meet PWA into focus
    chrome.windows.update(googleMeetWindowId, { focused: true }, function () {
      // close the tab that originally started the process if it wasn't the landing page
      chrome.storage.local.get(
        ['originatingTabId', 'queryParams'],
        function (result) {
          setTimeout(function () {
            if (result.queryParams !== 'landing') {
              chrome.tabs.remove(result.originatingTabId);
            }
          }, 3000);
        }
      );
    });
  }
});
