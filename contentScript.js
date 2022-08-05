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
      'skipPostMeeting',
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

    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        // pre-meeting observer
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          if (
            mutation.previousSibling &&
            mutation.previousSibling.innerText === 'Join now'
          ) {
            if (settings.stopVideoOnJoin) {
              toggleVideo();
            }

            if (settings.stopMicOnJoin) {
              toggleMute();
            }

            if (settings.skipPreMeeting) {
              setTimeout(() => {
                mutation.previousSibling.children[0].click();
              }, 0);
            }
          }

          // post meeting observer
          mutation.addedNodes.forEach((node) => {
            const innerText = node.innerText || '';
            if (innerText.startsWith('You left the meeting')) {
              const spans = document.querySelectorAll('span');
              for (let i = 0; i < spans.length; i++) {
                const span = spans[i];
                if (span.innerText === 'Return to home screen') {
                  if (settings.skipPostMeeting) {
                    span.click();
                  }
                }
              }
            }
          });
        }
      });
    });

    observer.observe(document, {
      childList: true,
      characterData: true,
      attributes: true,
      subtree: true,
    });

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
    // Skipping logic to inject UX when you redirect away. I think it' a
    // better experience when you just close and redirect as quickly as possible
    //
    // Normal tab, add listener to replace UI with
    // chrome.storage.onChanged.addListener(function (changes) {
    //   if (changes['originatingTabId'] && changes['originatingTabId'].newValue) {
    //     // could improve this. it only properly replaces if you navigated to a meet.google.com/some-slug
    //     // it does not know how to replace the landing page. we could make it look a lot nicer
    //     document.body.childNodes[1].style.display = 'none';
    //     const textnode = document.createTextNode('Opening in Google Meet app');
    //     document.body.appendChild(textnode);
    //   }
    // });
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
      metaKey: true,
    })
  );
}

function toggleVideo() {
  document.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'e',
      metaKey: true,
    })
  );
}
