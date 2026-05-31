const {
  listRows,
  getSingleRow,
  insertRows,
  updateRows,
  uuidv4,
} = require("./supabase.cjs");

const META_CONFIG_ID = "default";
const DEFAULT_API_VERSION = (process.env.META_GRAPH_API_VERSION || "v23.0").trim();
const DEFAULT_SYNC_INTERVAL_MINUTES = clampInterval(process.env.META_SYNC_INTERVAL_MINUTES);

let syncInFlight = null;

function clampInterval(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 60;
  return Math.max(15, Math.min(24 * 60, Math.round(parsed)));
}

function sanitizeMetaConfig(row) {
  if (!row) {
    return {
      configured: false,
      instagramUserId: "",
      enabled: false,
      hasAccessToken: false,
      syncIntervalMinutes: DEFAULT_SYNC_INTERVAL_MINUTES,
      lastSyncedAt: null,
      lastAttemptAt: null,
      lastError: null,
      apiVersion: DEFAULT_API_VERSION,
    };
  }

  return {
    configured: Boolean(row.instagram_user_id && row.access_token),
    instagramUserId: row.instagram_user_id || "",
    enabled: Boolean(row.enabled),
    hasAccessToken: Boolean(row.access_token),
    syncIntervalMinutes: row.sync_interval_minutes || DEFAULT_SYNC_INTERVAL_MINUTES,
    lastSyncedAt: row.last_synced_at || null,
    lastAttemptAt: row.last_attempt_at || null,
    lastError: row.last_error || null,
    apiVersion: DEFAULT_API_VERSION,
  };
}

async function getMetaConfigRow() {
  return getSingleRow("meta_sync_config", {
    select: "*",
    id: `eq.${META_CONFIG_ID}`,
  });
}

async function saveMetaConfig(input) {
  const existing = await getMetaConfigRow();
  const now = new Date().toISOString();
  const instagramUserId = String(input.instagramUserId || existing?.instagram_user_id || "").trim();
  const accessTokenInput = typeof input.accessToken === "string" ? input.accessToken.trim() : "";
  const accessToken = accessTokenInput || existing?.access_token || "";
  const enabled = Boolean(input.enabled);
  const syncIntervalMinutes = clampInterval(input.syncIntervalMinutes ?? existing?.sync_interval_minutes);

  const row = {
    id: META_CONFIG_ID,
    instagram_user_id: instagramUserId || null,
    access_token: accessToken || null,
    enabled: enabled && Boolean(instagramUserId && accessToken),
    sync_interval_minutes: syncIntervalMinutes,
    last_synced_at: existing?.last_synced_at || null,
    last_attempt_at: existing?.last_attempt_at || null,
    last_error: existing?.last_error || null,
    created_at: existing?.created_at || now,
    updated_at: now,
  };

  await insertRows("meta_sync_config", row, {
    onConflict: "id",
    upsert: true,
  });

  return sanitizeMetaConfig(await getMetaConfigRow());
}

async function seedMetaConfigFromEnv() {
  const instagramUserId = String(process.env.META_INSTAGRAM_USER_ID || "").trim();
  const accessToken = String(process.env.META_ACCESS_TOKEN || "").trim();
  const enabled = String(process.env.META_SYNC_ENABLED || "").toLowerCase() === "true";

  if (!instagramUserId || !accessToken) return;

  await saveMetaConfig({
    instagramUserId,
    accessToken,
    enabled,
    syncIntervalMinutes: DEFAULT_SYNC_INTERVAL_MINUTES,
  });
}

async function fetchGraphJson(path, params, accessToken) {
  const url = new URL(`https://graph.facebook.com/${DEFAULT_API_VERSION}/${path.replace(/^\/+/, "")}`);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url);
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.error) {
    const message = json?.error?.message || `Meta request failed (${response.status})`;
    throw new Error(message);
  }

  return json;
}

function readInsightMetric(insights, metricName) {
  const found = Array.isArray(insights)
    ? insights.find((item) => item.name === metricName)
    : null;

  if (!found) return 0;
  if (Array.isArray(found.values) && found.values.length > 0) {
    const value = found.values[0]?.value;
    return typeof value === "number" ? value : Number(value || 0);
  }

  return Number(found.value || 0);
}

async function fetchInsightsForMedia(mediaId, accessToken) {
  const metrics = ["reach", "views", "saved", "shares", "impressions"];

  try {
    const response = await fetchGraphJson(`${mediaId}/insights`, { metric: metrics.join(",") }, accessToken);
    return response.data || [];
  } catch {
    const results = [];
    for (const metric of metrics) {
      try {
        const response = await fetchGraphJson(`${mediaId}/insights`, { metric }, accessToken);
        if (Array.isArray(response.data)) {
          results.push(...response.data);
        }
      } catch {
        // Some metrics are unavailable depending on media type.
      }
    }
    return results;
  }
}

async function fetchAllMedia(instagramUserId, accessToken) {
  const items = [];
  let afterCursor = null;

  do {
    const response = await fetchGraphJson(
      `${instagramUserId}/media`,
      {
        fields: "id,caption,media_product_type,media_type,permalink,timestamp,comments_count,like_count",
        limit: 100,
        after: afterCursor,
      },
      accessToken
    );

    if (Array.isArray(response.data)) {
      items.push(...response.data);
    }

    afterCursor = response?.paging?.cursors?.after || null;
  } while (afterCursor);

  return items;
}

async function fetchAccountProfile(instagramUserId, accessToken) {
  const response = await fetchGraphJson(
    instagramUserId,
    { fields: "username,name" },
    accessToken
  );

  return {
    username: response.username || "",
    accountName: response.name || response.username || "",
  };
}

function mapMediaToDbPost(media, insights, profile, instagramUserId) {
  const views = readInsightMetric(insights, "views") || readInsightMetric(insights, "impressions");

  return {
    id: media.id || uuidv4(),
    post_id: media.id,
    account_id: instagramUserId,
    username: profile.username || null,
    account_name: profile.accountName || null,
    description: media.caption || "",
    duration: 0,
    published_at: media.timestamp || new Date().toISOString(),
    permalink: media.permalink || null,
    post_type: media.media_product_type || media.media_type || "unknown",
    views,
    reach: readInsightMetric(insights, "reach"),
    likes: Number(media.like_count || 0),
    shares: readInsightMetric(insights, "shares"),
    follows: 0,
    comments: Number(media.comments_count || 0),
    saves: readInsightMetric(insights, "saved"),
    updated_at: new Date().toISOString(),
  };
}

async function saveSyncSuccess(processedCount) {
  const now = new Date().toISOString();
  await updateRows("meta_sync_config", {
    last_synced_at: now,
    last_attempt_at: now,
    last_error: null,
    updated_at: now,
  }, {
    id: `eq.${META_CONFIG_ID}`,
  }, { returning: "minimal" });

  return processedCount;
}

async function saveSyncFailure(message) {
  const now = new Date().toISOString();
  await updateRows("meta_sync_config", {
    last_attempt_at: now,
    last_error: message,
    updated_at: now,
  }, {
    id: `eq.${META_CONFIG_ID}`,
  }, { returning: "minimal" });
}

async function syncInstagramFromMeta() {
  if (syncInFlight) return syncInFlight;

  syncInFlight = (async () => {
    const config = await getMetaConfigRow();
    if (!config?.instagram_user_id || !config?.access_token) {
      throw new Error("Configuração da Meta incompleta.");
    }

    try {
      const profile = await fetchAccountProfile(config.instagram_user_id, config.access_token);
      const mediaItems = await fetchAllMedia(config.instagram_user_id, config.access_token);
      const posts = [];

      for (const media of mediaItems) {
        const insights = await fetchInsightsForMedia(media.id, config.access_token);
        posts.push(mapMediaToDbPost(media, insights, profile, config.instagram_user_id));
      }

      if (posts.length > 0) {
        await insertRows("instagram_posts", posts, {
          onConflict: "post_id",
          upsert: true,
        });
      }

      await saveSyncSuccess(posts.length);
      return {
        ok: true,
        processed: posts.length,
        syncedAt: new Date().toISOString(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao sincronizar com a Meta";
      await saveSyncFailure(message);
      throw new Error(message);
    } finally {
      syncInFlight = null;
    }
  })();

  return syncInFlight;
}

function shouldRunScheduledSync(row) {
  if (!row?.enabled || !row.instagram_user_id || !row.access_token) return false;
  const lastReference = row.last_attempt_at || row.last_synced_at;
  if (!lastReference) return true;

  const diffMs = Date.now() - new Date(lastReference).getTime();
  const intervalMs = clampInterval(row.sync_interval_minutes) * 60 * 1000;
  return diffMs >= intervalMs;
}

async function startMetaSyncScheduler() {
  await seedMetaConfigFromEnv();

  setInterval(async () => {
    const row = await getMetaConfigRow();
    if (!shouldRunScheduledSync(row) || syncInFlight) return;

    try {
      await syncInstagramFromMeta();
    } catch (error) {
      console.error("[meta-sync]", error instanceof Error ? error.message : error);
    }
  }, 60 * 1000);
}

module.exports = {
  getMetaConfigRow,
  sanitizeMetaConfig,
  saveMetaConfig,
  syncInstagramFromMeta,
  startMetaSyncScheduler,
};
