import AsyncStorage from '@react-native-async-storage/async-storage';

const translationCache: Record<string, string> = {};

// Load persisted cache (fire and forget)
AsyncStorage.getItem('bazar_translation_cache').then(data => {
  if (data) Object.assign(translationCache, JSON.parse(data));
}).catch(() => {});

const saveTranslationCache = (() => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return () => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      AsyncStorage.setItem('bazar_translation_cache', JSON.stringify(translationCache)).catch(() => {});
    }, 2000);
  };
})();

type QueueItem = {
  text: string;
  lang: string;
  resolve: (value: string) => void;
};

let queue: QueueItem[] = [];
let queueTimeout: ReturnType<typeof setTimeout> | null = null;

async function processQueue() {
  if (queue.length === 0) return;
  const currentQueue = [...queue];
  queue = [];

  // Group by language
  const byLang: Record<string, QueueItem[]> = {};
  for (const item of currentQueue) {
    if (!byLang[item.lang]) byLang[item.lang] = [];
    byLang[item.lang].push(item);
  }

  for (const lang of Object.keys(byLang)) {
    const items = byLang[lang];
    // deduplicate texts to translate
    const uniqueTexts = Array.from(new Set(items.map(i => i.text)));
    const BATCH_SIZE = 40;

    for (let i = 0; i < uniqueTexts.length; i += BATCH_SIZE) {
      const batchTexts = uniqueTexts.slice(i, i + BATCH_SIZE);
      const combinedText = batchTexts.join('\n');
      
      let translatedBatch: string[] = [];
      try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(combinedText)}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data && data[0]) {
          const fullTranslatedText = data[0].map((x: any) => x[0] || '').join('');
          translatedBatch = fullTranslatedText.split('\n');
        }
      } catch (e) {
        console.warn("Translation service batch error", e);
      }

      let hasNewCache = false;
      batchTexts.forEach((text, idx) => {
        const translatedVal = (translatedBatch[idx] || text).trim();
        const cacheKey = `${lang}_${text}`;
        translationCache[cacheKey] = translatedVal;
        hasNewCache = true;
        
        // resolve all promises for this text
        items.filter(item => item.text === text).forEach(item => {
          item.resolve(translatedVal);
        });
      });
      if (hasNewCache) saveTranslationCache();
    }
  }
}

export function translateString(text: string, lang: string): Promise<string> {
  if (!text || typeof text !== 'string' || text.trim() === '' || !isNaN(Number(text)) || text.startsWith('http')) {
    return Promise.resolve(text);
  }
  
  const cacheKey = `${lang}_${text}`;
  if (translationCache[cacheKey]) {
    return Promise.resolve(translationCache[cacheKey]);
  }

  return new Promise((resolve) => {
    queue.push({ text, lang, resolve });
    if (queueTimeout) clearTimeout(queueTimeout);
    queueTimeout = setTimeout(processQueue, 50); // wait 50ms for more strings to batch
  });
}

// Global batch translator for objects (used by api interceptor)
export const TRANSLATABLE_KEYS = new Set([
  'name', 'description', 'title', 'category', 'status', 'tagline', 
  'message', 'serviceName', 'shortDescription', 'notes', 'speciality', 
  'variantName', 'brand', 'content', 'addressLine'
]);

export async function translateObjectStrings(obj: any, targetLang: string): Promise<any> {
  if (!obj) return obj;
  
  const stringsToTranslate: { ref: any, key: string | number, text: string }[] = [];
  
  function traverse(node: any) {
    if (Array.isArray(node)) {
      node.forEach((item) => {
        if (typeof item === 'object' && item !== null) {
          traverse(item);
        }
      });
    } else if (typeof node === 'object' && node !== null) {
      Object.keys(node).forEach(key => {
        const val = node[key];
        if (typeof val === 'string' && TRANSLATABLE_KEYS.has(key) && isNaN(Number(val)) && val.trim() !== '' && !val.startsWith('http') && !val.includes('://')) {
          stringsToTranslate.push({ ref: node, key, text: val });
        } else if (typeof val === 'object' && val !== null) {
          traverse(val);
        }
      });
    }
  }
  
  traverse(obj);
  
  if (stringsToTranslate.length === 0) return obj;
  
  // Use the global queue so it batches together optimally
  const promises = stringsToTranslate.map(async (item) => {
    const translated = await translateString(item.text, targetLang);
    item.ref[item.key] = translated;
  });
  
  await Promise.all(promises);
  return obj;
}
