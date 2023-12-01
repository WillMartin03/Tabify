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
	console.log("changeInfo:", changeInfo);
	const tab = tabArr.findIndex(tab => tab.id === tabID);
	if (changeInfo.status === "complete" && tab !== -1)
	{
		tabArr[tab] = updatedTab;
		checkForDuplicate(tabArr[tab]);
	}
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
