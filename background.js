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
    chrome.windows.getAll({ populate: true, windowTypes: ['app'] }, function (windows) {
      windows.forEach((window) => {
        if (window.tabs.length === 1 && window.tabs[0].url.startsWith('https://meet.google.com/')) {
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
          },
        );
      }
    });
  } else if (
    tabChangeInfo.status === 'complete' &&
    tab.url &&
    tab.url.includes('meet.google.com')
  ) {
    // find Google Meet PWA window id
    chrome.windows.getAll({ populate: true, windowTypes: ['app'] }, function (windows) {
      windows.forEach((window) => {
        if (window.tabs.length === 1 && window.tabs[0].url.startsWith('https://meet.google.com/')) {
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
    });
  }
});

chrome.storage.onChanged.addListener(function (changes) {
  if (changes['googleMeetOpenedUrl']) {
    if (!googleMeetWindowId) return;

    // bring Google Meet PWA into focus
    chrome.windows.update(googleMeetWindowId, { focused: true }).catch(() => {
      googleMeetWindowId = undefined;
    });

    // close the tab that originally started the process if it wasn't the landing page
    chrome.storage.local.get(
      ['originatingTabId', 'queryParams', 'source', 'tabCloseTimeout'],
      function ({ originatingTabId, queryParams, source, tabCloseTimeout }) {
        let timeout = (tabCloseTimeout !== undefined ? tabCloseTimeout : 3) * 1000;
        if (source === 'NEW_MEETING') {
          timeout = 0;
        }
        setTimeout(function () {
          if (queryParams !== '') {
            const ids = Array.isArray(originatingTabId)
              ? originatingTabId.filter((id) => typeof id === 'number')
              : typeof originatingTabId === 'number'
                ? [originatingTabId]
                : [];
            ids.forEach((id) => chrome.tabs.remove(id).catch(() => {}));
          }
        }, timeout);
      },
    );
  }
});

// Handle TTS requests from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SPEAK_TEXT') {
    if (chrome.tts) {
      chrome.tts.speak(message.text, {
        rate: message.rate || 1.0,
        pitch: message.pitch || 1.0,
        volume: message.volume || 1.0,
      });
      console.log('TTS: Speaking text:', message.text);
    } else {
      console.warn('TTS not supported');
    }
    sendResponse({ success: true });
  } else if (message.type === 'STOP_TTS') {
    if (chrome.tts) {
      chrome.tts.stop();
      console.log('TTS: Stopped');
    }
    sendResponse({ success: true });
  }
  return true; // Keep message channel open for async response
});
