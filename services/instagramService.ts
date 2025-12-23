
import { InstagramUser } from '../types';

// Chrome tiplerini global olarak kullanabilmek için veya hata almamak için any olarak işaretliyoruz
declare const chrome: any;

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getCookie = (name: string): Promise<string | null> => {
  return new Promise((resolve) => {
    // Chrome ortamında olup olmadığımızı kontrol ediyoruz
    if (typeof chrome === 'undefined' || !chrome.cookies) {
      console.warn("Chrome Cookies API bulunamadı. Eklenti olarak çalıştırın.");
      resolve(null);
      return;
    }
    
    // Hata düzeltmesi: (cookie: any) ekleyerek TS7006 hatasını gideriyoruz
    chrome.cookies.get({ url: 'https://www.instagram.com', name }, (cookie: any) => {
      resolve(cookie ? cookie.value : null);
    });
  });
};

export const afterUrlGenerator = (userId: string, endCursor: string) => {
  const variables = JSON.stringify({
    id: userId,
    include_reel: true,
    fetch_mutual: false,
    first: 50,
    after: endCursor
  });
  return `https://www.instagram.com/graphql/query/?query_hash=3dec7e2c57367ef3da3d987d89f9dbc8&variables=${encodeURIComponent(variables)}`;
};

export const initialUrlGenerator = (userId: string) => {
  const variables = JSON.stringify({
    id: userId,
    include_reel: true,
    fetch_mutual: false,
    first: 50
  });
  return `https://www.instagram.com/graphql/query/?query_hash=3dec7e2c57367ef3da3d987d89f9dbc8&variables=${encodeURIComponent(variables)}`;
};

export async function fetchFollowPage(url: string, csrfToken: string) {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'x-csrftoken': csrfToken,
      'x-requested-with': 'XMLHttpRequest',
      'Accept': '*/*'
    }
  });
  
  if (!response.ok) {
    if (response.status === 429) throw new Error("Çok fazla istek yapıldı. Lütfen biraz bekleyin.");
    throw new Error(`Instagram hatası: ${response.status}`);
  }
  
  return response.json();
}
