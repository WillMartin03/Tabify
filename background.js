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

function initializeExtension()
{
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

function checkForDuplicate(tab, preventSwitch=false)
{
	/*
		Extensions can't remove NTP (New Tab Page) tabs.
		Unchecked runtime.lastError: Cannot remove NTP tab.
	*/
	if (tab.url.includes("://newtab"))
		return;

	/*
		! Currently experiencing an issue where bing searches create a new tab,
		! and on that new tab load the same url THEN the next page, which leads
		! to the tab being seen as a duplicate during the process and deleted
		TODO: Make a real solution for this
	*/
	if (tab.url.includes("search?"))
		return;

	/*
		boolean isDuplicate = if any tab url matches current tab url
		boolean pendingDuplicate = if any tab url matches current tab pendingUrl
	*/
	const isDuplicate = tabArr.some(t => t.url === tab.url && t !== tab);
	const pendingDuplicate = tab.pendingUrl !== undefined ? tabArr.some(t => t.url === tab.pendingUrl && t !== tab) : false;

	if (isDuplicate || pendingDuplicate) {
		chrome.tabs.remove(tab.id, function () {
			console.log("Closed duplicate tab:", tab.id, tab);
			if (preventSwitch)
				return;
			const originalTab = tabArr.find(t => t.url === tab.url && t !== tab);
			if (originalTab) {
				chrome.tabs.update(originalTab.id, { active: true }, function(updatedTab) {
					console.log("Setting Active Tab:", updatedTab.id, updatedTab);
				});
			}
		});
	}
}

function getSetting(setting, callback) {
	chrome.storage.sync.get(setting, function(result) {
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
		getSetting(setting, function(value) {

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
	checkSetting('extensionEnabled', function(isEnabled) {

		// Ignore favIcon, title changes, and loading tabs
		if (changeInfo.favIconUrl
			|| changeInfo.title
			|| (changeInfo.status && changeInfo.status === "loading"))
			return;

		console.log("changeInfo:", changeInfo);

		const tab = tabArr.findIndex(tab => tab.id === tabID);
		if (changeInfo.status === "complete" && tab !== -1)
		{
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
		console.log("[Tabtivity] ERROR:", error);
	}
});
