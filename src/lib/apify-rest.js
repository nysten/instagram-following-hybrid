function apifyToken() {
  return process.env.APIFY_TOKEN || '';
}

function defaultHeaders() {
  return {
    'content-type': 'application/json',
    accept: 'application/json',
    'user-agent': 'instagram-following-hybrid/0.0.1',
  };
}

export async function readInput() {
  const token = apifyToken();
  const storeId = process.env.APIFY_DEFAULT_KEY_VALUE_STORE_ID;
  if (token && storeId) {
    const url = `https://api.apify.com/v2/key-value-stores/${storeId}/records/INPUT?token=${encodeURIComponent(token)}`;
    const res = await fetch(url, { headers: { accept: 'application/json' } });
    if (res.ok) return await res.json();
  }

  if (!process.stdin.isTTY) {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
    if (chunks.length) {
      const text = Buffer.concat(chunks).toString('utf8').trim();
      if (text) return JSON.parse(text);
    }
  }

  return {};
}

export async function pushDatasetItems(items) {
  const token = apifyToken();
  const datasetId = process.env.APIFY_DEFAULT_DATASET_ID;
  if (!token || !datasetId || !Array.isArray(items) || items.length === 0) return;

  const url = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${encodeURIComponent(token)}&clean=true`;
  await fetch(url, {
    method: 'POST',
    headers: defaultHeaders(),
    body: JSON.stringify(items),
  });
}

export async function writeKeyValueRecord(key, value) {
  const token = apifyToken();
  const storeId = process.env.APIFY_DEFAULT_KEY_VALUE_STORE_ID;
  if (!token || !storeId) return;

  const url = `https://api.apify.com/v2/key-value-stores/${storeId}/records/${encodeURIComponent(key)}?token=${encodeURIComponent(token)}`;
  await fetch(url, {
    method: 'PUT',
    headers: defaultHeaders(),
    body: JSON.stringify(value),
  });
}
