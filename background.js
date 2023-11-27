var tabArr = [];

chrome.runtime.onInstalled.addListener((reason) => {
	if (reason === chrome.runtime.OnInstalledReason.INSTALL) {
		chrome.tabs.create({
			url: "popup.html"
		});
	}
	// TODO: Add existing tabs to tabArr, check for dups
});

// REMOVE TAB LISTENER
chrome.tabs.onRemoved.addListener(function (tabID) {
	try {
		// Find the index of the tab in the array
		const index = tabArr.findIndex(tab => tab.id === tabID);
		// Remove the tab from the array
		if (index !== -1) {
			tabArr.splice(index, 1);
		}
	}
	catch (error) {
		console.log("[Tabtivity] ERROR:", error);
	}
	console.log(tabArr);
});

// CREATE TAB LISTENER
chrome.tabs.onCreated.addListener(function (newTab) {
	// Sometimes this function gets called too quickly, and url is ''
	const tabInfo = {
		id: newTab.id,
		url: newTab.url === '' ? newTab.pendingUrl : newTab.url
	};

	const isDuplicate = tabArr.some(tab => tab.url === tabInfo.url);
	if (isDuplicate && !tabInfo.url.includes('://newtab')) {
		chrome.tabs.remove(tabInfo.id, function () {
			console.log("Closed duplicate tab:", tabInfo.id);
		});
	} else {
		tabArr.push(tabInfo);
	}

	console.log(tabArr);
});
