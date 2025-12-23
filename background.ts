import * as instaService from './services/instagramService';
import { InstagramUser, ScanStats } from './types';

// Hata düzeltmesi: Chrome eklenti API'sini TypeScript'e tanıtıyoruz
declare const chrome: any;

let isScanning = false;
let stopRequested = false;

chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
  if (message.action === 'START_SCAN') {
    if (!isScanning) {
      startScan(message.config);
    }
    sendResponse({ started: true });
  } else if (message.action === 'STOP_SCAN') {
    stopRequested = true;
    sendResponse({ stopped: true });
  }
  return true;
});

async function startScan(config: any) {
  isScanning = true;
  stopRequested = false;

  let stats: ScanStats = {
    totalFollowed: 0,
    processedCount: 0,
    nonFollowersCount: 0,
    progress: 0,
    status: 'scanning',
    source: 'scan'
  };

  let nonFollowers: InstagramUser[] = [];
  let nextUrl = instaService.initialUrlGenerator(config.userId);
  let hasNextPage = true;

  // Reset storage and the download flag at the start of a new scan
  await chrome.storage.local.set({ 
    currentStats: stats, 
    currentNonFollowers: nonFollowers,
    isDownloaded: false, // Reset download flag for new scan
    lastError: null
  });

  try {
    while (hasNextPage && !stopRequested) {
      const data = await instaService.fetchFollowPage(nextUrl, config.csrfToken);
      const edgeFollow = data.data.user.edge_follow;
      
      if (stats.totalFollowed === 0) {
        stats.totalFollowed = edgeFollow.count;
      }

      const edges = edgeFollow.edges;
      stats.processedCount += edges.length;

      const newNonFollowers = edges
        .filter((edge: any) => !edge.node.follows_viewer)
        .map((edge: any) => edge.node as InstagramUser);

      nonFollowers = [...nonFollowers, ...newNonFollowers];
      stats.nonFollowersCount = nonFollowers.length;
      stats.progress = Math.min(Math.round((stats.processedCount / stats.totalFollowed) * 100), 100);

      // Save to storage so popup can read it
      await chrome.storage.local.set({ 
        currentStats: stats, 
        currentNonFollowers: nonFollowers 
      });

      hasNextPage = edgeFollow.page_info.has_next_page;
      if (hasNextPage) {
        nextUrl = instaService.afterUrlGenerator(config.userId, edgeFollow.page_info.end_cursor);
        await instaService.sleep(config.delayMs + Math.random() * 500);
      }
    }

    stats.status = stopRequested ? 'idle' : 'completed';
    await chrome.storage.local.set({ currentStats: stats });

    if (stats.status === 'completed') {
       chrome.notifications.create({
         type: 'basic',
         iconUrl: 'https://cdn-icons-png.flaticon.com/512/174/174855.png',
         title: 'InstaTrack Pro',
         message: 'Tarama başarıyla tamamlandı! Rapor hazır.'
       });
    }

  } catch (err: any) {
    stats.status = 'error';
    await chrome.storage.local.set({ 
      currentStats: stats, 
      lastError: err.message 
    });
  } finally {
    isScanning = false;
    stopRequested = false;
  }
}