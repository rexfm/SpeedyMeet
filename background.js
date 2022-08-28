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
  });
});

function getGoogleMeetWindow(runIfFound = () => {}) {
  if (googleMeetWindowId) {
    runIfFound();
    return;
  }

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

      if (googleMeetWindowId) {
        runIfFound();
      }
    }
  );
}

chrome.tabs.onUpdated.addListener((tabId, tabChangeInfo, tab) => {
  getGoogleMeetWindow(() => {
    if (tab.url && tab.url.includes('meet.google.com')) {
      // find Google Meet PWA window id
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
            });
          }
        );
      }
    }
  });
});

chrome.storage.onChanged.addListener(function (changes) {
  if (changes['googleMeetOpenedUrl']) {
    // bring Google Meet PWA into focus
    chrome.windows.update(googleMeetWindowId, { focused: true }, function () {
      // close the tab that originally started the process if it wasn't the landing page
      chrome.storage.local.get(
        ['originatingTabId'],
        function ({ originatingTabId }) {
          setTimeout(function () {
            chrome.tabs.remove(originatingTabId);
          }, 0);
        }
      );
    });
  }
});

