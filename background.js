chrome.tabs.onUpdated.addListener((tabId, tab) => {

  if (tab.url && tab.url.includes("meet.google.com")) {
    const queryParameters = tab.url.split("/")[3].split("?")[0];
    const urlParameters = new URLSearchParams(queryParameters);

	  if (queryParameters != 'new' && queryParameters != '_meet'){
    console.log('URL matches');
    console.log(queryParameters);
    console.log(tab.url);
    chrome.storage.local.set({"tabId": tabId}, function(){
	console.log('saved tabId to storage:' + tabId);
    });


    chrome.storage.local.set({"newTab": queryParameters}, function(){
      console.log('saved to storage:' + queryParameters);
    });


	  }
  }
});


chrome.storage.onChanged.addListener(function (changes, namespace) {
  for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
    console.log('CHANGE DETECTED');
    console.log(newValue);
    console.log(
      `Storage key "${key}" in namespace "${namespace}" changed.`,
      `Old value was "${oldValue}", new value is "${newValue}".`
    );
    if (key == 'opened'){
      //attempt to close tab
      console.log('attempt to close tab now');
      chrome.storage.local.get(['tabId'], function(result) {
        console.log('tabId currently is ' + result.tabId);
        console.log(result);
        		   console.log('attempting to close original tab');
        		   setTimeout(function(){chrome.tabs.remove(result.tabId);},3000);
      });
    }
  }
});


