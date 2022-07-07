(() => {
    console.log('Detected Google Meet');
    console.log(window.document.title);


    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    const fullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
    const minimal = window.matchMedia('(display-mode: minimal-ui)').matches;
    
if (standalone) {
  // Don't run
  console.log('standalone');
} else {
  // Run
}

if (fullscreen) {
  console.log('fullscreen');
  // Don't run
} else {
  // Run
}

if (minimal) {
  console.log('minimal');
	//detected PWA
	//save tab id to Storage
	chrome.storage.local.set({"pwaId": 123}, function(){
	console.log('saved pwaId to storage');
	chrome.storage.local.get(['newTab'], function(result) {
  		console.log('newTab value currently is ' + result.newTab);
		console.log('monitoring for updates now');

		chrome.storage.onChanged.addListener(function (changes, namespace) {
  		for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
 
	 		 console.log(oldValue);
    			console.log(
      			`Storage key "${key}" in namespace "${namespace}" changed.`,
      			`Old value was "${oldValue}", new value is "${newValue}".`
    			);
	  		if (newValue != 'new' && newValue != '_meet') {
		  		console.log('opening new location:');
		  		console.log(newValue);

		  		setTimeout(function(){ 
					window.location.href = "https://meet.google.com/"+newValue+"?authuser=0";
	  				//close original tab
					chrome.storage.local.set({"opened": newValue}, function(){
						console.log('saved OPENED to storage');
					});
				},500);
	  		};

  		}
		});
	});
    	});
} else {
  // Run
	// listen for opened events
	//
	chrome.storage.onChanged.addListener(function (changes, namespace) {
  for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
 
	  console.log('OPEN DETECTED');
	  console.log(newValue);
	  chrome.tabs
    console.log(
      `Storage key "${key}" in namespace "${namespace}" changed.`,
      `Old value was "${oldValue}", new value is "${newValue}".`
    );
	   chrome.storage.local.get(['tabId'], function(result) {
  console.log('tabId currently is ' + result.tabId);
  console.log(result);
    if (key == 'opened'){		   
		   console.log('attempting to close original tab');
		   console.log(document.body.childNodes[1].style.display="none");
		   const textnode = document.createTextNode("Opening in Google Meet app");
		   document.body.appendChild(textnode);
		   chrome.tabs.remove(result.tabId);
    }
});
  }});
}

})();

