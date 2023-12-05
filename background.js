var tabArr = [];

function checkForDuplicate(tab)
{
	const isDuplicate = tabArr.some(t => t.url === tab.url && t !== tab);
	if (isDuplicate && !tab.url.includes("://newtab") && !tab.url.includes("search?")) {
		chrome.tabs.remove(tab.id, function () {
			console.log("Closed duplicate tab:", tab.id, tab);
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
			// Check if the setting exists in the storage
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
	// Check if the setting is already cached
	if (checkSetting.cache && setting in checkSetting.cache) {
		callback(checkSetting.cache[setting]);
	} else {
		// If not cached, fetch from storage using getSetting
		getSetting(setting, function(value) {

			// Cache the value
			checkSetting.cache = checkSetting.cache || {};
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
});

chrome.runtime.onStartup.addListener(() => {
	// Add existing tabs to tabArr
	chrome.tabs.query({}, function (existingTabs) {
		existingTabs.forEach(function (tab) {
			tabArr.push(tab);
		});
	});

	// Check for duplicate tabs in tabArr
	tabArr.forEach(function (tab) {
		checkForDuplicate(tab);
	});

	console.log("Extension Loaded.\ntabArr: ", tabArr);
});

// CREATE TAB LISTENER
chrome.tabs.onCreated.addListener(function (newTab) {
	tabArr.push(newTab);
});

// UPDATE TAB LISTENER
chrome.tabs.onUpdated.addListener(function (tabID, changeInfo, updatedTab) {
	getSetting('extensionEnabled', function(isEnabled) {
		console.log('Extension enabled ->', isEnabled);

		// Ignore favIcon changes
		if (changeInfo.favIconUrl || changeInfo.title)
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
		}
	}
	catch (error) {
		console.log("[Tabtivity] ERROR:", error);
	}
});
