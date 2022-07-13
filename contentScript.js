/*
 * contentScript.js is injected onto any meet.google.com page. This has different logic depending on if
 * it is running in the PWA or a normal tab. The PWA portion will redirect it to the correct meeting
 * (if not currently on a meeting). The normal tab will replace the content on the original page
 * informing the user they were redirected to the PWA.
 */

(() => {
  if (isPwa()) {
    let settings = {};
    const settingsToMonitor = [
      'stopVideoOnJoin',
      'stopMicOnJoin',
      'spaceBarToUnmute',
      'skipPreMeeting',
    ];
    chrome.storage.sync.get(settingsToMonitor, (values) => {
      settings = values;
    });
    chrome.storage.onChanged.addListener(function (changes, area) {
      if (area === 'sync') {
        settingsToMonitor.forEach((setting) => {
          if (changes[setting]) {
            settings[setting] = changes[setting].newValue;
          }
        });
      }
    });

    window.onbeforeunload = function (e) {
      if (isOnCall()) {
        e.stopPropagation();
        var message = 'Do you want to leave this page?';
        return message;
      }
    };

    window.onload = function (e) {
      console.log('window.onload');

      const spans = document.querySelectorAll('span');
      for (const s in spans) {
        if (spans[s].outerText === 'Join now') {
          if (settings.stopVideoOnJoin) {
            toggleVideo();
          }

          if (settings.stopMicOnJoin) {
            toggleMute();
          }

          if (settings.skipPreMeeting) {
            setTimeout(() => {
              spans[s].click();
            }, 500);
            console.log('click join now');
          }
        }
      }
    };

    document.addEventListener('keydown', function (e) {
      if (settings.spaceBarToUnmute && e.code === 'Space') {
        if (e.target && ['BODY', 'BUTTON'].includes(e.target.nodeName)) {
          e.preventDefault();
          if (!!getTooltipByName('Turn on microphone (⌘ + d)')) {
            toggleMute();
          }
        }
      }
    });

    document.addEventListener('keyup', function (e) {
      if (settings.spaceBarToUnmute && e.code === 'Space') {
        if (e.target && ['BODY', 'BUTTON'].includes(e.target.nodeName)) {
          e.preventDefault();
          if (!!getTooltipByName('Turn off microphone (⌘ + d)')) {
            toggleMute();
          }
        }
      }
    });

    chrome.storage.onChanged.addListener(function (changes) {
      if (
        changes['queryParams'] &&
        changes['queryParams'].newValue !== '__gmInitialState'
      ) {
        if (isOnCall()) {
          return;
        }

        const qp = changes['queryParams'].newValue;
        const newQueryParams = qp.includes('?')
          ? qp + '&authuser=0'
          : qp + '?authuser=0';

        const currentHref = window.location.href;
        const newHref = 'https://meet.google.com/' + newQueryParams;
        if (currentHref !== newHref) {
          window.location.href = 'https://meet.google.com/' + newQueryParams;
        }

        // close original tab
        chrome.storage.local.set({
          googleMeetOpenedUrl: new Date().toISOString(),
        });
      }
    });
  } else {
    // Normal tab, add listener to replace UI with
    chrome.storage.onChanged.addListener(function (changes) {
      if (changes['originatingTabId'] && changes['originatingTabId'].newValue) {
        // could improve this. it only properly replaces if you navigated to a meet.google.com/some-slug
        // it does not know how to replace the landing page. we could make it look a lot nicer
        document.body.childNodes[1].style.display = 'none';
        const textnode = document.createTextNode('Opening in Google Meet app');
        document.body.appendChild(textnode);
      }
    });
  }
})();

function isPwa() {
  return ['fullscreen', 'standalone', 'minimal-ui'].some(
    (displayMode) =>
      window.matchMedia('(display-mode: ' + displayMode + ')').matches
  );
}

function isOnCall() {
  const icons = document.getElementsByClassName('google-material-icons');
  for (const i in icons) {
    if (icons[i].outerText === 'call_end') {
      return true;
    }
  }

  return false;
}

function getTooltipByName(name) {
  const tooltips = document.querySelectorAll('[role="tooltip"]');
  for (const t in tooltips) {
    if (tooltips[t].outerText === name) {
      return tooltips[t];
    }
  }

  return undefined;
}

function toggleMute() {
  console.log('toggle function');
  document.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'd',
      metaKey: true, // these are here for example's sake.
    })
  );
}

function toggleVideo() {
  document.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'e',
      metaKey: true, // these are here for example's sake.
    })
  );
}
