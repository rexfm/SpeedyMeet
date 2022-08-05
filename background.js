/*
 * background.js runs in the background on Chrome. It has access to manage the windows/tabs.
 * This will start the process to redirect the open tab into the PWA.
 */

let googleMeetWindowId;

// clear referring state on page load
chrome.tabs.onCreated.addListener(() => {
  getGoogleMeetWindow();
  chrome.storage.local.set({
    originatingTabId: '',
    queryParams: '__gmInitialState',
    source: '',
  });
});

function getGoogleMeetWindow() {
  if (!googleMeetWindowId) {
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
      }
    );
  }
}

chrome.tabs.onUpdated.addListener((tabId, tabChangeInfo, tab) => {
  getGoogleMeetWindow();
  if (!googleMeetWindowId) {
    return;
  }

  // Special handling if it's a "/new" URL
  // This allows users to send follow-up slack from the PWA
  if (tab.url && tab.url.includes('meet.google.com/new')) {
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
  } else if (tab.url && tab.url.includes('meet.google.com')) {
    // find Google Meet PWA window id
    // only attempt a redirect when not the PWA
    if (tab.windowId !== googleMeetWindowId) {
      const queryParameters = tab.url.split('/')[3].split('?')[0];
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
          });
        }
      );
    }
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
          setTimeout(function () {
            if (queryParams !== '') {
              chrome.tabs.remove(originatingTabId);
            }
          }, 0);
        }
      );
    });
  }
});
