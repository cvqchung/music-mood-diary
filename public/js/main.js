// Parse hash parameters from URL
function getHashParams() {
	var hashParams = {};
	var e, r = /([^&;=]+)=?([^&;]*)/g,
		q = window.location.hash.substring(1);
	while (e = r.exec(q)) {
		hashParams[e[1]] = decodeURIComponent(e[2]);
	}
	return hashParams;
}

// Handle authentication callback messages
var params = getHashParams();

if (params.success) {
	// Clear the hash immediately to prevent loops
	window.location.hash = '';
	// Show success message briefly
	document.getElementById('message').innerHTML = '<p class="success">Authentication successful! Loading your mood diary...</p>';
	// Check auth status instead of reloading
	setTimeout(function() {
		checkAuthStatus();
		document.getElementById('message').innerHTML = '';
	}, 1000);
} else if (params.error) {
	document.getElementById('message').innerHTML = '<p class="error">Error: ' + params.error + '</p>';
}

// Global state
let currentViewDate = null; 	// null = today, or a specific date string
let allAnalyses = [];

// Format time ago helper
function formatTimeAgo(dateString) {
	const now = new Date();
	const then = new Date(dateString);
	const hours = Math.floor((now - then) / (1000 * 60 * 60));
	const minutes = Math.floor((now - then) / (1000 * 60));

	if (hours >= 24) {
		const days = Math.floor(hours / 24);
		return `${days} day${days > 1 ? 's' : ''} ago`;
	}
	if (hours >= 1) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
	if (minutes >= 1) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
	return 'just now';
}

// Render a single mood entry
function renderMoodEntry(data, isToday) {
	const bgGradient = data.mood_gradient || 'linear-gradient(#FAFAFA, #FAFAFA)';
	const trackCount = data.track_count || 0;

	let html = '<div style="padding: 20px; background: ' + bgGradient + '; border-radius: 10px; border: 1px solid #E0E0E0; margin-bottom: 20px;">';

	if (!isToday) {
		html += '<p style="margin: 0 0 10px 0; font-size: 14px; color: #666;"><strong>' + data.date + '</strong></p>';
	}

	html += '<h3 style="margin-top: 0;">Today\'s Mood: ' + data.mood_summary.toUpperCase() + '</h3>';
	html += '<p>' + data.ai_analysis + '</p>';
	html += '<p><small>Based on ' + trackCount + ' recently played track' + (trackCount !== 1 ? 's' : '') + '</small></p>';

	if (data.sample_tracks && data.sample_tracks.length > 0) {
		html += '<h4>Sample tracks analyzed:</h4>';
		data.sample_tracks.forEach(track => {
			html += '<div style="margin: 10px 0;">';
			if (track.album_art_url) {
				html += '<img src="' + track.album_art_url + '" width="50" style="vertical-align: middle; margin-right: 10px;">';
			}
			html += '<span>' + track.track_name + ' - ' + track.artist;
			if (track.play_count && track.play_count > 1) {
				html += ' <strong style="color: #dc3545;">(×' + track.play_count + ')</strong>';
			}
			html += '</span>';
			html += '</div>';
		});
	}

	html += '</div>';
	return html;
}

// Render all mood entries (including today) as expandable/collapsible
function renderHistorySnippets() {
	const historyDiv = document.getElementById('mood-history');

	if (allAnalyses.length === 0) {
		historyDiv.innerHTML = '';
		return;
	}

	let html = '';
	allAnalyses.forEach(analysis => {
		const bgGradient = analysis.mood_gradient || 'linear-gradient(#FAFAFA, #FAFAFA)';
		const isActive = currentViewDate === analysis.date;
		const trackCount = analysis.track_count || 0;

		// If this is the active entry, show full details
		if (isActive) {
			html += '<div class="history-snippet active" style="border: 2px solid #1DB954; padding: 20px; margin: 10px 0; border-radius: 10px; background: ' + bgGradient + ';">';
			html += '<p style="margin: 0 0 10px 0; font-size: 14px; color: #666;"><strong>' + analysis.date + '</strong></p>';
			html += '<h3 style="margin-top: 0;">' + analysis.mood_summary.toUpperCase() + '</h3>';
			html += '<p>' + analysis.ai_analysis + '</p>';
			html += '<p><small>Based on ' + trackCount + ' recently played track' + (trackCount !== 1 ? 's' : '') + '</small></p>';

			if (analysis.sample_tracks && analysis.sample_tracks.length > 0) {
				html += '<h4>Sample tracks analyzed:</h4>';
				analysis.sample_tracks.forEach(track => {
					html += '<div style="margin: 10px 0;">';
					if (track.album_art_url) {
						html += '<img src="' + track.album_art_url + '" width="50" style="vertical-align: middle; margin-right: 10px; border-radius: 4px;">';
					}
					html += '<span>' + track.track_name + ' - ' + track.artist;
					if (track.play_count && track.play_count > 1) {
						html += ' <strong style="color: #dc3545;">(×' + track.play_count + ')</strong>';
					}
					html += '</span>';
					html += '</div>';
				});
			}
			html += '</div>';
		} else {
			// Collapsed snippet
			html += '<div class="history-snippet" data-date="' + analysis.date + '" style="cursor: pointer; border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 10px; background: ' + bgGradient + '; transition: transform 0.2s, box-shadow 0.2s;">';
			html += '<strong>' + analysis.date + '</strong> - ' + analysis.mood_summary + '<br>';
			html += '<em style="color: #666;">' + analysis.ai_analysis.substring(0, 100) + '...</em>';
			html += '</div>';
		}
	}
);

historyDiv.innerHTML = html;

	// Add event delegation for history snippet clicks
	historyDiv.querySelectorAll('.history-snippet[data-date]').forEach(function(snippet) {
		snippet.addEventListener('click', function() {
			viewHistoryEntry(this.getAttribute('data-date'));
		});
	});
}

// View a specific history entry
function viewHistoryEntry(date) {
	currentViewDate = date;
	renderHistorySnippets(); // Re-render to expand the selected entry
}

// Show a loading placeholder for today's entry at the top of history
function showTodayLoadingPlaceholder(today) {
	const historyDiv = document.getElementById('mood-history');

	const loadingPlaceholder = '<div class="history-snippet active" style="border: 2px solid #1DB954; padding: 20px; margin: 10px 0; border-radius: 10px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">' +
		'<p style="margin: 0 0 10px 0; font-size: 14px; color: #fff;"><strong>' + today + '</strong></p>' +
		'<h3 style="margin-top: 0; color: #fff;">🔄 Analyzing your listening today...</h3>' +
		'</div>';

	// Prepend loading placeholder to existing history
	historyDiv.innerHTML = loadingPlaceholder + historyDiv.innerHTML;

	// Set current view to today
	currentViewDate = today;
}

// Load and display today's mood (auto-load on page load)
async function loadTodaysMood() {
	const statusDiv = document.getElementById('mood-status');
	const resultDiv = document.getElementById('mood-result');

	// Get today's date
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');
	const today = `${year}-${month}-${day}`;

	// ALWAYS load history first, so users see past entries immediately
	await loadMoodHistory();

	try {
		// Try to get today's existing analysis first
		const response = await fetch('/api/mood-today');
		const data = await response.json();

		if (data.exists) {
			// Display status
			const timeAgo = formatTimeAgo(data.updated_at);
			statusDiv.innerHTML = '<span style="color: #666;">Last updated: ' + timeAgo + '</span>';

			// Set today as the current view
			currentViewDate = today;

			// Hide the main result div (we'll show everything in history)
			resultDiv.style.display = 'none';

			// Reload history to show today's entry expanded
			await loadMoodHistory();
		} else {
			// No analysis yet - try to generate one
			await analyzeMood();
		}
	} catch (error) {
		resultDiv.innerHTML = '<p class="error">Error loading mood: ' + error.message + '</p>';
	}
}

// Global flag to prevent multiple simultaneous requests
let isAnalyzing = false;

// Analyze mood (refresh button)
async function analyzeMood() {
	// Prevent multiple simultaneous requests
	if (isAnalyzing) return;
	isAnalyzing = true;

	const statusDiv = document.getElementById('mood-status');
	const resultDiv = document.getElementById('mood-result');
	const refreshBtn = document.getElementById('refresh-mood-btn');

	// Disable button
	if (refreshBtn) {
		refreshBtn.disabled = true;
		refreshBtn.style.opacity = '0.5';
		refreshBtn.style.cursor = 'not-allowed';
	}

	statusDiv.innerHTML = '<span style="color: #666;">🔄 Analyzing...</span>';

	// Get today's date
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');
	const today = `${year}-${month}-${day}`;

	// Show loading placeholder in history while analyzing
	showTodayLoadingPlaceholder(today);

	try {
		// Get user's timezone offset in minutes
		const timezoneOffset = -new Date().getTimezoneOffset();

		const response = await fetch('/api/analyze-mood', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ timezoneOffset: timezoneOffset })
		});

		const data = await response.json();

		if (data.success) {
			// Update status
			const timeAgo = data.last_updated ? formatTimeAgo(data.last_updated) : 'just now';

			if (data.cached) {
				statusDiv.innerHTML = '<span style="color: #666;">Last updated: ' + timeAgo + '</span>';
			} else if (data.updated) {
				statusDiv.innerHTML = '<span style="color: #28a745;">✓ Updated just now</span>';
			} else {
				statusDiv.innerHTML = '<span style="color: #28a745;">✓ Analyzed just now</span>';
			}

			// Set today as current view
			currentViewDate = today;

			// Hide main result div
			resultDiv.style.display = 'none';

			// Reload history to include any updates (today will be expanded)
			await loadMoodHistory();

		} else if (data.suggest_recent_day && data.recent_count > 0) {
			// No songs today - remove loading placeholder and show recent day option
			statusDiv.innerHTML = '';
			resultDiv.style.display = 'block';

			// Clear the loading placeholder by re-rendering history
			await loadMoodHistory();

			// Format the date nicely (parse as local date to avoid timezone issues)
			const [year, month, day] = data.recent_date.split('-').map(Number);
			const recentDate = new Date(year, month - 1, day);
			const dateOptions = { weekday: 'long', month: 'short', day: 'numeric' };
			const formattedDate = recentDate.toLocaleDateString('en-US', dateOptions);

			// Check if this date already has an analysis in our history
			const existingAnalysis = allAnalyses.find(a => a.date === data.recent_date);
			const actionText = existingAnalysis ? 'Update' : 'Analyze';
			const descriptionText = existingAnalysis
				? `${data.recent_count} song${data.recent_count !== 1 ? 's' : ''} from your recent listening`
				: `${data.recent_count} song${data.recent_count !== 1 ? 's' : ''}`;

			resultDiv.innerHTML = `
				<div style="padding: 20px; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); border-radius: 10px; border: 1px solid #E0E0E0; text-align: center;">
				<p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">You haven't played any songs yet today.</p>
				<p style="margin: 0 0 15px 0; font-size: 16px; font-weight: 500; color: #333;">${actionText} ${formattedDate} instead? (${descriptionText})</p>
				<button id="analyze-recent-day-btn" data-date="${data.recent_date}" style="padding: 10px 20px; background: #1DB954; color: white; border: none; border-radius: 20px; cursor: pointer; margin: 5px; font-size: 16px; transition: background 0.2s;">${actionText} ${formattedDate}</button>
				<button id="cancel-recent-day-btn" style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 20px; cursor: pointer; margin: 5px; font-size: 16px; transition: background 0.2s;">Cancel</button>
				</div>
			`;

			// Add event listeners for the dynamically created buttons
			document.getElementById('analyze-recent-day-btn').addEventListener('click', function() {
				analyzeRecentDay(this.getAttribute('data-date'));
			});
			document.getElementById('analyze-recent-day-btn').addEventListener('mouseover', function() {
				this.style.background = '#1ed760';
			});
			document.getElementById('analyze-recent-day-btn').addEventListener('mouseout', function() {
				this.style.background = '#1DB954';
			});
			document.getElementById('cancel-recent-day-btn').addEventListener('click', function() {
				cancelRecentDay();
			});
			document.getElementById('cancel-recent-day-btn').addEventListener('mouseover', function() {
				this.style.background = '#555';
			});
			document.getElementById('cancel-recent-day-btn').addEventListener('mouseout', function() {
				this.style.background = '#666';
			});
		} else {
			// Error case - remove loading placeholder
			statusDiv.innerHTML = '';
			resultDiv.style.display = 'block';
			await loadMoodHistory();
			resultDiv.innerHTML = '<p class="error">Error: ' + data.error + '</p>';
		}
	} catch (error) {
		// Error case - remove loading placeholder
		statusDiv.innerHTML = '';
		resultDiv.style.display = 'block';
		await loadMoodHistory();
		resultDiv.innerHTML = '<p class="error">Error: ' + error.message + '</p>';
	} finally {
		// Re-enable button
		isAnalyzing = false;
		if (refreshBtn) {
			refreshBtn.disabled = false;
			refreshBtn.style.opacity = '1';
			refreshBtn.style.cursor = 'pointer';
		}
	}
}

// Analyze a specific recent day
async function analyzeRecentDay(date) {
	const statusDiv = document.getElementById('mood-status');
	const resultDiv = document.getElementById('mood-result');
	statusDiv.innerHTML = '<span style="color: #666;">🔄 Analyzing...</span>';
	resultDiv.style.display = 'none';

	try {
		// Get user's timezone offset in minutes
		const timezoneOffset = -new Date().getTimezoneOffset();

		const response = await fetch('/api/analyze-mood-date', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ date: date, timezoneOffset: timezoneOffset })
		});

		const data = await response.json();

		if (data.success) {
			// Update status
			if (data.cached) {
				statusDiv.innerHTML = '<span style="color: #666;">Showing existing analysis</span>';
			} else {
				statusDiv.innerHTML = '<span style="color: #28a745;">✓ Analyzed ' + date + '</span>';
			}

			// Set the analyzed date as current view
			currentViewDate = date;

			// Hide main result div
			resultDiv.style.display = 'none';

			// Reload history to include the new analysis (will be expanded)
			await loadMoodHistory();
		} else {
			statusDiv.innerHTML = '';
			resultDiv.style.display = 'block';
			resultDiv.innerHTML = '<p class="error">Error: ' + data.error + '</p>';
		}
	} catch (error) {
		statusDiv.innerHTML = '';
		resultDiv.style.display = 'block';
		resultDiv.innerHTML = '<p class="error">Error: ' + error.message + '</p>';
	}
}

// Cancel the recent day suggestion
function cancelRecentDay() {
	const resultDiv = document.getElementById('mood-result');
	resultDiv.style.display = 'none';
}

// Load mood history (background, for snippets)
async function loadMoodHistory() {
	try {
		const response = await fetch('/api/mood-history?limit=30');
		const data = await response.json();
		allAnalyses = data.analyses;
		renderHistorySnippets();
	} catch (error) {
		console.error('Error loading mood history:', error);
	}
}

// Test Spotify API endpoints
async function testAPI(endpoint) {
	const resultDiv = document.getElementById('api-result');
	resultDiv.innerHTML = '<p>Loading...</p>';

	try {
		const response = await fetch(endpoint);
		const data = await response.json();
		resultDiv.innerHTML = '<h3>Result:</h3><pre>' + JSON.stringify(data, null, 2) + '</pre>';
	} catch (error) {
		resultDiv.innerHTML = '<p class="error">Error: ' + error.message + '</p>';
	}
}
