/*
 * background.js runs in the background on Chrome. It has access to manage the windows/tabs.
 * This will start the process to redirect the open tab into the PWA.
 */

let googleMeetWindowId;

// clear referring state on page load
chrome.tabs.onCreated.addListener(() => {
  chrome.storage.local.set({
    originatingTabId: '',
    queryParams: '__gmInitialState',
    source: '',
  });
});

chrome.tabs.onUpdated.addListener((tabId, tabChangeInfo, tab) => {
  if (tab.url && tab.url.includes('meet.google.com/new')) {
    // Special handling if it's a "/new" URL
    // This allows users to send follow-up slack from the PWA
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
          chrome.scripting.executeScript(
            {
              target: { tabId: tab.id },
              injectImmediately: true,
              func: () => {
                window.stop();
              },
            },
            function () {
              const queryParameters = tab.url.split('/')[3];
              chrome.storage.local.set({
                originatingTabId: tabId,
                queryParams: queryParameters,
                source: 'NEW_MEETING',
              });
            }
          );
        }
      }
    );
  } else if (
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
          const parameters = tab.url.split('/')[3];
          if (!parameters.startsWith('new') && !parameters.startsWith('_meet')) {
            // if empty, set the landing page
            chrome.storage.local.set({
              originatingTabId: tabId,
              queryParams: parameters,
            });
          }
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
        ['originatingTabId', 'queryParams', 'source'],
        function ({ originatingTabId, queryParams, source }) {
          let timeout = 3000;
          if (source === 'NEW_MEETING') {
            timeout = 0;
          }
          setTimeout(function () {
            if (queryParams !== '') {
              chrome.tabs.remove(originatingTabId);
            }
          }, timeout);
        }
      );
    });
  }
});
