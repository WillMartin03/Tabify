var tabArr = [];

// LISTENER FOR COMMUNICATION WITH `popup.js`
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	if (request.action === 'updateCache') {
		// Update setting within cache
		checkSetting.cache[request.setting] = request.value;
	} else if (request.action === 'checkAllDuplicates') {
		tabArr.forEach(function (tab) {
			// Check for duplicate tabs in tabArr
			checkForDuplicate(tab, true);
		});
	}
});

function initializeExtension() {
	// Add existing tabs to tabArr
	chrome.tabs.query({}, function (existingTabs) {
		existingTabs.forEach(function (tab) {
			tabArr.push(tab);
			console.log("Add tab", tab.id);
		});
	});

	// Check for duplicate tabs in tabArr
	tabArr.forEach(function (tab) {
		checkForDuplicate(tab);
	});

	console.log("Extension Loaded.\ntabArr: ", tabArr);

	return;
}

function checkForDuplicate(tab, preventSwitch = false) {
	console.log("Checking for duplicate tab:", tab.id, tab);

	// Check to ensure the site is not ignored
	checkSetting('ignoredWebsites', function (ignoredWebsites) {
		if (ignoredWebsites.includes(tab.url))
			return;
	});

	/*
		Extensions can't remove NTP (New Tab Page) tabs.
		Unchecked runtime.lastError: Cannot remove NTP tab.
	*/
	if (tab.url.includes("://newtab"))
		return;

	// For bing, we have to ignore pages that include "search?" because of how it handles search queries
	// This is because when you click on a search result with bing, it opens a new tab with the same url, then processes it.
	// This causes the extension to close the tab, which is not what we want.
	if (tab.url.includes("search?") && tab.url.includes("bing.com"))
		return;

	/*
		boolean var isDuplicate = if any tab url matches current tab url
		boolean const pendingDuplicate = if any tab url matches current tab pendingUrl
	*/
	var isDuplicate = false;
	// If setting "ignoreQueryStrings" is true, isDuplicate checks any url that matches the current url without query strings
	checkSetting('ignoreQueryStrings', function (ignoreQueryStrings) {
		// set isDuplicate to result of check for duplicate tabs without considering query strings if ignoreQueryStrings is true,
		// otherwise check for exact match including query strings
		isDuplicate = ignoreQueryStrings
			? tabArr.some(t => t.url.split("?")[0] === tab.url.split("?")[0] && t !== tab)
			: tabArr.some(t => t.url === tab.url && t !== tab);
	});
	const pendingDuplicate = tab.pendingUrl !== undefined ? tabArr.some(t => t.url === tab.pendingUrl && t !== tab) : false;

	if (isDuplicate || pendingDuplicate) {
		chrome.tabs.remove(tab.id, function () {
			console.log("Closed duplicate tab:", tab.id, tab);
			if (preventSwitch)
				return;
			const originalTab = tabArr.find(t => t.url === tab.url && t !== tab);
			if (originalTab) {
				chrome.tabs.update(originalTab.id, { active: true }, function (updatedTab) {
					console.log("Setting Active Tab:", updatedTab.id, updatedTab);
				});
			}
		});
	}
}

function getSetting(setting, callback) {
	chrome.storage.sync.get(setting, function (result) {
		// Error handling
		if (chrome.runtime.lastError) {
			console.error(chrome.runtime.lastError);
			callback(false);
		} else {
			if (setting in result) {
				// If the setting is found, return its boolean value
				callback(!!result[setting]);
			} else {
				// If the setting is not found, return false
				callback(false);
			}
		}
	});
}

// Function to check setting, either from cache or by fetching from storage
function checkSetting(setting, callback) {
	// Initialize the cache
	checkSetting.cache = checkSetting.cache || {};

	// Check if the setting is already cached
	if (setting in checkSetting.cache) {
		callback(checkSetting.cache[setting]);
	} else {
		// If not cached, fetch from storage using getSetting
		getSetting(setting, function (value) {

			// Cache the value
			checkSetting.cache[setting] = value;

			// Return the value
			callback(value);
		});
	}
}

chrome.runtime.onInstalled.addListener((reason) => {
	// Create welcome page
	if (reason === chrome.runtime.OnInstalledReason.INSTALL) {
		chrome.tabs.create({
			url: "popup.html"
		});
	}
	initializeExtension();
});

chrome.runtime.onStartup.addListener(() => {
	initializeExtension();
});

// CREATE TAB LISTENER
chrome.tabs.onCreated.addListener(function (newTab) {
	tabArr.push(newTab);
	console.log("New tab", newTab.id);
});

// UPDATE TAB LISTENER
chrome.tabs.onUpdated.addListener(function (tabID, changeInfo, updatedTab) {
	checkSetting('extensionEnabled', function (isEnabled) {

		// Ignore favIcon, title changes, and loading tabs
		if (changeInfo.favIconUrl
			|| changeInfo.title
			|| (changeInfo.status && changeInfo.status === "loading"))
			return;

		console.log("changeInfo:", changeInfo);

		const tab = tabArr.findIndex(tab => tab.id === tabID);
		if (changeInfo.status === "complete" && tab !== -1) {
			tabArr[tab] = updatedTab;
			if (isEnabled)
				checkForDuplicate(tabArr[tab]);
		}
	});
});

// REMOVE TAB LISTENER
chrome.tabs.onRemoved.addListener(function (tabID) {
	try {
		// Find the index of the tab in the array
		const index = tabArr.findIndex(tab => tab.id === tabID);
		// Remove the tab from the array
		if (index !== -1) {
			tabArr.splice(index, 1);
			console.log("Removed tab", tabID);
		}
	}
	catch (error) {
		console.log("[Tabify] ERROR:", error);
	}
});
