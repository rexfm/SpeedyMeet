/*
 * contentScript.js is injected onto any meet.google.com page. This has different logic depending on if
 * it is running in the PWA or a normal tab. The PWA portion will redirect it to the correct meeting
 * (if not currently on a meeting). The normal tab will replace the content on the original page
 * informing the user they were redirected to the PWA.
 */

(() => {
  if (isPwa()) {
    chrome.storage.onChanged.addListener(function (changes) {
      if (changes['queryParams'] && changes['queryParams'].newValue) {
        const icons = document.getElementsByClassName('google-material-icons');
        let onCall = false;
        for (const i in icons) {
          if (icons[i].outerText === 'call_end') {
            onCall = true;
          }
        }

        if (onCall) {
          return;
        }

        window.location.href =
          'https://meet.google.com/' +
          changes['queryParams'].newValue +
          '?authuser=0';

        // close original tab
        chrome.storage.local.set(
          {
            googleMeetOpenedUrl: new Date().toISOString(),
          },
          function () {
            console.log('saved OPENED to storage');
          }
        );
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
