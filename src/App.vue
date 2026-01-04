<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="app-title">❤️ 廷翰與燁姍的蜜月旅行</div>
      <div class="app-subtitle">{{ pageTitle }}</div>

      <!-- 登入列 -->
      <div class="auth-bar">
        <div class="auth-left">
          <div class="auth-user" v-if="user">
            <div class="auth-dot"></div>

            <!-- ✅ Google 頭像（匿名則 fallback） -->
            <img
              class="auth-avatar"
              :src="userAvatar"
              :alt="userLabel"
              referrerpolicy="no-referrer"
            />

            <div class="auth-text">
              <div class="auth-name">{{ userLabel }}</div>
              <!-- ✅ 不顯示 UID，改顯示登入方式 -->
              <div class="auth-meta">{{ userMeta }}</div>
            </div>
          </div>

          <div class="auth-user" v-else>
            <div class="auth-dot off"></div>
            <div class="auth-text">
              <div class="auth-name">尚未登入</div>
              <div class="auth-meta">請先登入才能查看行程</div>
            </div>
          </div>
        </div>

        <div class="auth-right">
          <button v-if="!user" class="btn btn-secondary" @click="loginGoogle">Google 登入</button>
          <button v-if="!user" class="btn btn-secondary" @click="loginAnon">匿名登入</button>
          <button v-if="user" class="btn btn-ghost" @click="logout">登出</button>
        </div>
      </div>

      <!-- ✅ 線上成員名單（多登入者同時顯示名稱＋頭像） -->
      <div class="presence-bar" v-if="presenceList.length">
        <div class="presence-title">目前線上</div>
        <div class="presence-list">
          <div class="presence-item" v-for="p in presenceList" :key="p.id">
            <img
              class="presence-avatar"
              :src="p.photoURL || DEFAULT_AVATAR"
              :alt="p.displayName || '使用者'"
              referrerpolicy="no-referrer"
            />
            <div class="presence-name">
              {{ p.displayName || "使用者" }}
              <span v-if="p.isMe" class="presence-badge">你</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ✅ 2) 預設行程提示拿掉：trip-hint 整段不顯示 -->
      <!-- （已移除） -->
    </header>

    <main class="app-main">
      <!-- 未登入 -->
      <section v-if="!user" class="page">
        <div class="card">
          <div class="card-title">🔐 請先登入</div>
          <div class="card-subtitle">登入後會自動進入預設行程，不需要輸入行程代碼。</div>
        </div>
      </section>

      <!-- 已登入但尚未加入 members -->
      <section v-else-if="user && !membershipChecked" class="page">
        <div class="card">
          <div class="card-title">⏳ 權限檢查中</div>
          <div class="card-subtitle">正在確認你是否已被加入行程成員名單…</div>
          <div class="empty-state">如果你看到這個一直轉圈，通常是網路或 rules 設定問題。</div>
        </div>
      </section>

      <section v-else-if="user && membershipChecked && !isMember" class="page">
        <div class="card">
          <div class="card-title">⛔ 你尚未被加入這個行程</div>
          <div class="card-subtitle">
            這是「方案 A」：不輸入行程代碼，但也不允許陌生人自己加入。<br />
            請把你的 UID 貼給行程管理者（owner）加入 members 名單。
          </div>

          <div class="uid-box">
            <div class="uid-label">你的 UID</div>
            <div class="uid-value">{{ user.uid }}</div>
            <div class="uid-actions">
              <button class="btn btn-primary" @click="copyUid">一鍵複製 UID</button>
              <button class="btn btn-secondary" @click="recheckMembership">重新檢查</button>
            </div>
          </div>

          <div class="card-subtitle" style="margin-top:10px;">
            加入後你就能看到：<br />
            plan：<b>trips/{{ DEFAULT_TRIP_ID }}/plan</b><br />
            expenses：<b>trips/{{ DEFAULT_TRIP_ID }}/expenses</b>
          </div>
        </div>
      </section>

      <!-- 已加入 members：正式功能頁 -->
      <section v-else-if="user && membershipChecked && isMember && currentPage === 'itinerary'" class="page">
        <div class="day-tabs">
          <button
            v-for="day in plan"
            :key="day.id"
            class="day-chip"
            :class="{ active: activeDayId === day.id }"
            @click="activeDayId = day.id"
          >
            <div class="chip-top">DAY {{ day.day }}</div>
            <div class="chip-date">{{ day.shortDate || toShortDate(day.date) }}</div>
            <div class="chip-weekday">{{ day.weekday || toWeekday(day.date) }}</div>
          </button>
        </div>

        <div v-for="day in plan" :key="day.id" v-show="activeDayId === day.id" class="day-panel">
          <div class="weather-card">
            <div class="weather-left">
              <div class="weather-city">
                <span class="pin">📍</span>
                <span>{{ day.city || getDayCity(day) }}</span>
              </div>

              <div class="weather-desc">
                <span class="weather-title">{{ weatherState.statusText }}</span>
                <span class="weather-emoji">{{ weatherState.statusEmoji }}</span>
              </div>

              <div class="weather-metrics">
                <div class="metric">
                  <div class="metric-value">{{ weatherState.precipProb }}%</div>
                  <div class="metric-label">降雨機率</div>
                </div>

                <div class="metric">
                  <div class="metric-value">{{ weatherState.wind }}{{ weatherState.windUnit }}</div>
                  <div class="metric-label">風速</div>
                </div>

                <div class="metric">
                  <div class="metric-value">{{ weatherState.sunrise }}</div>
                  <div class="metric-label">日出</div>
                </div>
              </div>

              <div class="outfit-card">
                <div class="outfit-icon">👕</div>
                <div class="outfit-text">
                  <div class="outfit-title">穿搭建議</div>
                  <div class="outfit-desc">{{ outfitAdvice(weatherState.tMin, weatherState.tMax, weatherState.precipProb) }}</div>
                </div>
              </div>

              <div v-if="weatherState.loading" class="weather-loading">天氣讀取中...</div>
              <div v-if="weatherState.error" class="weather-error">天氣讀取失敗：{{ weatherState.error }}</div>
            </div>

            <div class="weather-right">
              <div class="temp-now">{{ weatherState.tNow }}°</div>
              <div class="temp-range">{{ weatherState.tMin }}° / {{ weatherState.tMax }}°</div>
            </div>
          </div>

          <h2 class="day-title">📅 第 {{ day.day }} 天（{{ day.date }}）</h2>

          <div v-for="(event, idx) in day.events" :key="idx" class="event-card">
            <div class="event-row">
              <div class="event-time">{{ event.time }}</div>

              <div class="event-body">
                <div class="event-loc">{{ event.loc }}</div>
                <div class="event-stay">⏱️ 停留 {{ event.stay }}</div>
              </div>

              <div class="event-actions" v-if="!event.showNote">
                <button class="btn btn-secondary" @click="openNavigation(event.loc)">導航</button>
                <button class="btn btn-primary" @click="toggleNote(day.id, idx)">筆記</button>
              </div>
            </div>

            <div v-if="event.showNote" class="note-panel">
              <textarea v-model="event.note" class="note-textarea" placeholder="輸入筆記..."></textarea>

              <div class="note-actions">
                <button class="btn btn-primary" @click="saveNote(day.id, idx)">儲存</button>
                <button class="btn btn-secondary" @click="toggleNote(day.id, idx)">收合</button>
              </div>
            </div>
          </div>

          <div v-if="!day.events || day.events.length === 0" class="empty-state">
            這一天還沒有行程內容～先去吃個布丁再回來加🍮
          </div>
        </div>

        <div v-if="planLoading" class="loading">讀取行程中... 💖</div>
        <div v-if="!planLoading && plan.length === 0" class="empty-state">
          目前 plan 是空的：trips/{{ DEFAULT_TRIP_ID }}/plan
        </div>
      </section>

      <section v-else-if="user && membershipChecked && isMember && currentPage === 'accounting'" class="page">
        <div class="card">
          <div class="card-title">💰 記帳（多人共用）</div>
          <div class="card-subtitle">
            儲存位置：<b>trips/{{ DEFAULT_TRIP_ID }}/expenses</b><br />
            <span v-if="expensesLoading">同步中…</span>
            <span v-if="expensesError">同步錯誤：{{ expensesError }}</span>
          </div>

          <div class="form-grid">
            <label class="field">
              <div class="field-label">日期</div>
              <input class="field-input" type="date" v-model="expenseForm.date" />
            </label>

            <label class="field">
              <div class="field-label">金額</div>
              <input class="field-input" type="number" v-model.number="expenseForm.amount" placeholder="例如 1200" />
            </label>

            <label class="field">
              <div class="field-label">幣別</div>
              <select class="field-input" v-model="expenseForm.currency">
                <option value="JPY">JPY（日圓）</option>
                <option value="TWD">TWD（台幣）</option>
              </select>
            </label>

            <label class="field">
              <div class="field-label">分類</div>
              <select class="field-input" v-model="expenseForm.category">
                <option value="food">餐飲</option>
                <option value="traffic">交通</option>
                <option value="shopping">購物</option>
                <option value="ticket">門票</option>
                <option value="hotel">住宿</option>
                <option value="other">其他</option>
              </select>
            </label>

            <label class="field field-span">
              <div class="field-label">備註</div>
              <input class="field-input" v-model="expenseForm.note" placeholder="例如：一蘭、地鐵一日券..." />
            </label>
          </div>

          <div class="row-right">
            <button class="btn btn-primary" @click="addExpense">＋ 新增</button>
            <button class="btn btn-secondary" @click="reloadExpenses">重新同步</button>
            <button class="btn btn-secondary" @click="clearExpensesLocalOnly">清空本機快取</button>
          </div>

          <div class="card-subtitle" style="margin-top:10px;">
            每筆會寫入：<b>uid</b> + <b>displayName</b>（可追責）。<br />
            ※ 依 rules：只有本人能更新自己的紀錄；刪除暫時鎖住（避免誤刪）。
          </div>
        </div>

        <div class="card">
          <div class="card-title">📊 統計</div>

          <div class="stats">
            <div class="stat">
              <div class="stat-value">{{ totalByCurrency.JPY }}</div>
              <div class="stat-label">JPY 總支出</div>
            </div>
            <div class="stat">
              <div class="stat-value">{{ totalByCurrency.TWD }}</div>
              <div class="stat-label">TWD 總支出</div>
            </div>
            <div class="stat">
              <div class="stat-value">{{ expenses.length }}</div>
              <div class="stat-label">筆數</div>
            </div>
          </div>

          <div v-if="expenses.length === 0" class="empty-state">
            還沒有任何記帳～錢包今天很有自制力🧘
          </div>

          <div v-else class="list">
            <div v-for="e in expenses" :key="e.id" class="list-item">
              <div class="li-main">
                <div class="li-title">
                  {{ e.date }}｜{{ categoryLabel(e.category) }}
                  <span style="opacity:.65;">｜{{ e.displayName || "使用者" }}</span>
                </div>
                <div class="li-sub">{{ e.note || "（無備註）" }}</div>
              </div>

              <div class="li-amount">{{ e.amount }} {{ e.currency }}</div>
            </div>
          </div>
        </div>
      </section>

      <section v-else-if="user && membershipChecked && isMember && currentPage === 'prep'" class="page">
        <div class="card">
          <div class="card-title">🎒 準備</div>
          <div class="card-subtitle">（此頁先保留，你要我接 trips/{{ DEFAULT_TRIP_ID }}/meta 再說）</div>
        </div>
      </section>
    </main>

    <!-- 底部導覽 -->
    <nav class="bottom-nav">
      <button class="nav-item" :class="{ active: currentPage === 'itinerary' }" @click="currentPage = 'itinerary'">
        <div class="nav-icon">🗓️</div>
        <div class="nav-label">行程</div>
      </button>

      <button class="nav-item" :class="{ active: currentPage === 'accounting' }" @click="currentPage = 'accounting'">
        <div class="nav-icon">🧾</div>
        <div class="nav-label">記帳</div>
      </button>

      <button class="nav-item" :class="{ active: currentPage === 'prep' }" @click="currentPage = 'prep'">
        <div class="nav-icon">🎒</div>
        <div class="nav-label">準備</div>
      </button>
    </nav>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { db } from "./firebase";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  updateDoc,
  addDoc,
  serverTimestamp,
  setDoc,
  onSnapshot,
} from "firebase/firestore";

import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  signOut,
} from "firebase/auth";

/* ===================== ✅ 方案 A：固定預設行程 ===================== */
const DEFAULT_TRIP_ID = "HM-8F3K2A";

/* ===================== Auth ===================== */
const auth = getAuth();
const user = ref(null);

/* ✅ 預設頭像（匿名/無 photoURL 時用） */
const DEFAULT_AVATAR =
  "data:image/svg+xml;base64," +
  btoa(`
  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
    <rect width="100%" height="100%" fill="#f2f2f2"/>
    <circle cx="32" cy="26" r="12" fill="#c9c9c9"/>
    <rect x="14" y="42" width="36" height="16" rx="8" fill="#c9c9c9"/>
  </svg>`);

/* ✅ 顯示名稱 */
const userLabel = computed(() => {
  if (!user.value) return "";
  return user.value.displayName || (user.value.isAnonymous ? "匿名使用者" : "使用者");
});

/* ✅ 顯示頭像（Google photoURL 優先） */
const userAvatar = computed(() => {
  if (!user.value) return DEFAULT_AVATAR;
  return user.value.photoURL || DEFAULT_AVATAR;
});

/* ✅ 取代 UID 顯示：改成登入方式/狀態 */
const userMeta = computed(() => {
  if (!user.value) return "";
  if (user.value.isAnonymous) return "匿名登入";
  return "Google 登入";
});

/* ===================== Presence（線上名單） ===================== */
/**
 * Firestore 無 RTDB onDisconnect，所以用「lastSeen + 心跳」
 * 判定在線：lastSeen 距今 <= ONLINE_WINDOW 秒
 */
const presenceRaw = ref([]);
const ONLINE_WINDOW_SEC = 120;
let heartbeatTimer = null;
let unsubPresence = null;

const presenceList = computed(() => {
  const meUid = user.value?.uid || "";
  const now = Date.now();

  // 只顯示在線者（也可改成顯示全部，這裡符合你「同時顯示名稱」的直覺需求）
  return presenceRaw.value
    .map((p) => {
      const lastSeenMs = p.lastSeenMs || 0;
      const isOnline = lastSeenMs > 0 && now - lastSeenMs <= ONLINE_WINDOW_SEC * 1000;
      return { ...p, isOnline, isMe: p.id === meUid };
    })
    .filter((p) => p.isOnline)
    .sort((a, b) => (a.displayName || "").localeCompare(b.displayName || "", "zh-Hant"));
});

async function upsertPresence() {
  if (!user.value) return;

  await setDoc(
    doc(db, "presence", user.value.uid),
    {
      displayName: userLabel.value,
      photoURL: user.value.photoURL || "",
      lastSeen: serverTimestamp(),
    },
    { merge: true }
  );
}

function startHeartbeat() {
  stopHeartbeat();
  heartbeatTimer = setInterval(() => {
    upsertPresence().catch(() => {});
  }, 30_000);
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function subscribePresence() {
  // 依 displayName 排序（UI 好看）
  const q = query(collection(db, "presence"), orderBy("displayName", "asc"));
  unsubPresence = onSnapshot(q, (snap) => {
    presenceRaw.value = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        displayName: data.displayName || "",
        photoURL: data.photoURL || "",
        lastSeenMs: data.lastSeen?.toMillis ? data.lastSeen.toMillis() : 0,
      };
    });
  });
}

/* ===================== Membership gate ===================== */
const membershipChecked = ref(false);
const isMember = ref(false);

/* ===================== Pages ===================== */
const currentPage = ref("itinerary");
const pageTitle = computed(() => {
  if (currentPage.value === "itinerary") return "行程";
  if (currentPage.value === "accounting") return "記帳";
  if (currentPage.value === "prep") return "準備";
  return "";
});

onMounted(() => {
  // ✅ 訂閱線上名單（只要頁面開著就可看）
  subscribePresence();

  onAuthStateChanged(auth, async (u) => {
    user.value = u || null;

    membershipChecked.value = false;
    isMember.value = false;

    // 登出：清資料
    if (!user.value) {
      stopHeartbeat();
      plan.value = [];
      activeDayId.value = null;
      expenses.value = [];
      return;
    }

    // ✅ 登入：寫 presence + 心跳
    await upsertPresence();
    startHeartbeat();

    // 登入：先檢查自己是否在 members
    await checkMembership();

    // 是成員才載入資料
    if (isMember.value) {
      await loadPlan();
      await reloadExpenses();
    }
  });
});

onBeforeUnmount(() => {
  stopHeartbeat();
  if (unsubPresence) unsubPresence();
});

async function loginGoogle() {
  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
}

async function loginAnon() {
  await signInAnonymously(auth);
}

async function logout() {
  stopHeartbeat();
  await signOut(auth);
}

/* ===================== members 檢查 ===================== */
async function checkMembership() {
  if (!user.value) return;

  membershipChecked.value = false;
  isMember.value = false;

  try {
    const memberRef = doc(db, "trips", DEFAULT_TRIP_ID, "members", user.value.uid);
    const snap = await getDoc(memberRef);

    isMember.value = snap.exists();
  } catch (e) {
    console.error("檢查 members 失敗：", e);
    isMember.value = false;
  } finally {
    membershipChecked.value = true;
  }
}

async function recheckMembership() {
  await checkMembership();
  if (isMember.value) {
    await loadPlan();
    await reloadExpenses();
  }
}

async function copyUid() {
  try {
    await navigator.clipboard.writeText(user.value.uid);
    alert("已複製 UID！");
  } catch {
    alert("複製失敗，請手動選取 UID 複製。");
  }
}

/* ===================== Plan：trips/HM-8F3K2A/plan ===================== */
const plan = ref([]);
const activeDayId = ref(null);
const planLoading = ref(false);

async function loadPlan() {
  if (!user.value || !isMember.value) return;

  planLoading.value = true;
  try {
    const q = query(collection(db, "trips", DEFAULT_TRIP_ID, "plan"), orderBy("day", "asc"));
    const snap = await getDocs(q);

    plan.value = snap.docs.map((d) => {
      const data = d.data();
      return {
        ...data,
        id: d.id,
        events: (data.events || []).map((ev) => ({
          ...ev,
          note: ev.note || "",
          showNote: false,
        })),
      };
    });

    if (plan.value.length > 0) {
      activeDayId.value = plan.value[0].id;
      await backfillCityIfMissing();
      await refreshWeatherForActiveDay();
    } else {
      activeDayId.value = null;
    }
  } catch (e) {
    console.error("讀取 plan 失敗：", e);
    alert("讀取行程失敗（可能是 rules 擋住或網路問題）");
  } finally {
    planLoading.value = false;
  }
}

function toggleNote(dayId, idx) {
  const dayObj = plan.value.find((d) => d.id === dayId);
  if (dayObj) dayObj.events[idx].showNote = !dayObj.events[idx].showNote;
}

async function saveNote(dayId, idx) {
  const dayObj = plan.value.find((d) => d.id === dayId);
  if (!dayObj) return;

  try {
    const dayRef = doc(db, "trips", DEFAULT_TRIP_ID, "plan", dayId);
    const eventsToSave = dayObj.events.map(({ showNote, ...rest }) => rest);

    await updateDoc(dayRef, {
      events: eventsToSave,
    });

    alert("筆記已儲存！");
    dayObj.events[idx].showNote = false;
  } catch (e) {
    console.error("儲存筆記失敗：", e);
    alert("儲存失敗（請確認 rules：成員才可更新 plan）");
  }
}

/* ===================== City backfill（可留可刪） ===================== */
const CITY_COORDS = {
  Busan: { name: "Busan", lat: 35.1796, lon: 129.0756, tz: "Asia/Seoul" },
  Osaka: { name: "Osaka", lat: 34.6937, lon: 135.5023, tz: "Asia/Tokyo" },
  Kyoto: { name: "Kyoto", lat: 35.0116, lon: 135.7681, tz: "Asia/Tokyo" },
  Kobe: { name: "Kobe", lat: 34.6901, lon: 135.1955, tz: "Asia/Tokyo" },
  Nara: { name: "Nara", lat: 34.6851, lon: 135.8049, tz: "Asia/Tokyo" },
};

function getDayCity(day) {
  if (day.city) return day.city;
  const firstLoc = day?.events?.[0]?.loc ? String(day.events[0].loc) : "";
  const guess = guessCityFromText(firstLoc);
  return guess || "Osaka";
}

function guessCityFromText(text) {
  const t = String(text || "").toLowerCase();
  if (t.includes("busan") || t.includes("釜山")) return "Busan";
  if (t.includes("osaka") || t.includes("大阪")) return "Osaka";
  if (t.includes("kyoto") || t.includes("京都")) return "Kyoto";
  if (t.includes("kobe") || t.includes("神戶")) return "Kobe";
  if (t.includes("nara") || t.includes("奈良")) return "Nara";
  return "";
}

async function backfillCityIfMissing() {
  if (!isMember.value) return;

  const tasks = [];
  for (const day of plan.value) {
    if (day.city) continue;

    const guessed = getDayCity(day) || "Osaka";
    day.city = guessed;

    const dayRef = doc(db, "trips", DEFAULT_TRIP_ID, "plan", day.id);
    tasks.push(updateDoc(dayRef, { city: guessed }));
  }

  if (tasks.length > 0) {
    try {
      await Promise.all(tasks);
    } catch (e) {
      console.error("補 city 失敗：", e);
    }
  }
}

/* ===================== Weather (open-meteo) ===================== */
const weatherState = ref({
  loading: false,
  error: "",
  tNow: "-",
  tMin: "-",
  tMax: "-",
  precipProb: "-",
  wind: "-",
  windUnit: "km/h",
  sunrise: "--:--",
  statusText: "天氣資訊",
  statusEmoji: "⛅",
});

watch(activeDayId, async () => {
  if (user.value && isMember.value && currentPage.value === "itinerary") {
    await refreshWeatherForActiveDay();
  }
});

watch(currentPage, async (p) => {
  if (!user.value || !isMember.value) return;
  if (p === "itinerary") await refreshWeatherForActiveDay();
  if (p === "accounting") await reloadExpenses();
});

async function refreshWeatherForActiveDay() {
  const dayObj = plan.value.find((d) => d.id === activeDayId.value);
  if (!dayObj) return;

  const cityKey = dayObj.city || getDayCity(dayObj);
  const city = CITY_COORDS[cityKey] || CITY_COORDS.Osaka;

  weatherState.value.loading = true;
  weatherState.value.error = "";

  try {
    const targetISO = toISODate(dayObj.date);
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${city.lat}` +
      `&longitude=${city.lon}` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,wind_speed_10m_max` +
      `&current=temperature_2m` +
      `&timezone=${encodeURIComponent(city.tz)}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    const tNow = data?.current?.temperature_2m;
    weatherState.value.tNow = isFiniteNumber(tNow) ? Math.round(tNow) : "-";

    const times = data?.daily?.time || [];
    const idx = targetISO ? times.indexOf(targetISO) : 0;
    const pick = idx >= 0 ? idx : 0;

    const tMax = data?.daily?.temperature_2m_max?.[pick];
    const tMin = data?.daily?.temperature_2m_min?.[pick];
    const pp = data?.daily?.precipitation_probability_max?.[pick];
    const wind = data?.daily?.wind_speed_10m_max?.[pick];
    const sunrise = data?.daily?.sunrise?.[pick];

    weatherState.value.tMax = isFiniteNumber(tMax) ? Math.round(tMax) : "-";
    weatherState.value.tMin = isFiniteNumber(tMin) ? Math.round(tMin) : "-";
    weatherState.value.precipProb = isFiniteNumber(pp) ? Math.round(pp) : "-";
    weatherState.value.wind = isFiniteNumber(wind) ? Math.round(wind) : "-";
    weatherState.value.sunrise = sunrise ? toHHMM(sunrise) : "--:--";

    const { statusText, statusEmoji } = simpleWeatherLabel(weatherState.value.precipProb, weatherState.value.tMax);
    weatherState.value.statusText = statusText;
    weatherState.value.statusEmoji = statusEmoji;
  } catch (err) {
    weatherState.value.error = err?.message ? String(err.message) : "未知錯誤";
  } finally {
    weatherState.value.loading = false;
  }
}

function simpleWeatherLabel(precipProb, tMax) {
  const p = Number(precipProb);
  const t = Number(tMax);
  if (isFiniteNumber(p) && p >= 60) return { statusText: "可能下雨", statusEmoji: "🌧️" };
  if (isFiniteNumber(p) && p >= 30) return { statusText: "偶爾有雨", statusEmoji: "🌦️" };
  if (isFiniteNumber(t) && t >= 28) return { statusText: "偏熱晴朗", statusEmoji: "☀️" };
  if (isFiniteNumber(t) && t <= 10) return { statusText: "偏冷晴朗", statusEmoji: "❄️" };
  return { statusText: "晴朗或多雲", statusEmoji: "⛅" };
}

function outfitAdvice(tMin, tMax, precipProb) {
  const min = Number(tMin);
  const max = Number(tMax);
  const p = Number(precipProb);

  const needsUmbrella = isFiniteNumber(p) && p >= 40;
  const tempHint =
    (isFiniteNumber(min) && min <= 8) ? "建議洋蔥式＋外套" :
    (isFiniteNumber(min) && min <= 15) ? "薄外套/長袖剛好" :
    (isFiniteNumber(max) && max >= 28) ? "短袖為主，注意防曬" :
    "舒適好走為主";

  return `${tempHint}${needsUmbrella ? "，記得帶傘。" : "。"}（鞋子：請選能走 15,000 步的那雙）`;
}

/* ===================== Expenses：trips/HM-8F3K2A/expenses ===================== */
const expenses = ref(loadLocal("hm_expenses_cache", []));
const expensesLoading = ref(false);
const expensesError = ref("");

const expenseForm = ref({
  date: new Date().toISOString().slice(0, 10),
  amount: 0,
  currency: "JPY",
  category: "food",
  note: "",
});

async function reloadExpenses() {
  if (!user.value || !isMember.value) return;

  expensesLoading.value = true;
  expensesError.value = "";

  try {
    const q = query(collection(db, "trips", DEFAULT_TRIP_ID, "expenses"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);

    expenses.value = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        date: data.date || "",
        amount: data.amount || 0,
        currency: data.currency || "JPY",
        category: data.category || "other",
        note: data.note || "",
        uid: data.uid || "",
        displayName: data.displayName || "",
        createdAt: data.createdAt || null,
      };
    });

    saveLocal("hm_expenses_cache", expenses.value);
  } catch (e) {
    expensesError.value = e?.message ? String(e.message) : "未知錯誤";
    expenses.value = loadLocal("hm_expenses_cache", []);
  } finally {
    expensesLoading.value = false;
  }
}

async function addExpense() {
  if (!user.value || !isMember.value) return alert("你尚未被加入行程，不能記帳");
  if (!expenseForm.value.date) return alert("請選日期");
  if (!isFiniteNumber(expenseForm.value.amount) || Number(expenseForm.value.amount) <= 0) return alert("金額要大於 0");

  const payload = {
    date: expenseForm.value.date,
    amount: Number(expenseForm.value.amount),
    currency: expenseForm.value.currency,
    category: expenseForm.value.category,
    note: (expenseForm.value.note || "").trim(),
    uid: user.value.uid,
    displayName: user.value.displayName || (user.value.isAnonymous ? "匿名使用者" : "使用者"),
    createdAt: serverTimestamp(),
  };

  const localId = `local_${Date.now()}`;
  expenses.value.unshift({ id: localId, ...payload, createdAt: new Date() });
  saveLocal("hm_expenses_cache", expenses.value);

  try {
    await addDoc(collection(db, "trips", DEFAULT_TRIP_ID, "expenses"), payload);
    await reloadExpenses();
  } catch (e) {
    expensesError.value = e?.message ? String(e.message) : "寫入失敗";
    alert("已先存本機，但雲端寫入失敗（請檢查 rules / 網路）");
  }

  expenseForm.value.amount = 0;
  expenseForm.value.note = "";
}

function clearExpensesLocalOnly() {
  if (!confirm("確定要清空『本機快取』？（雲端不會刪）")) return;
  saveLocal("hm_expenses_cache", []);
  expenses.value = [];
}

const totalByCurrency = computed(() => {
  let jpy = 0;
  let twd = 0;
  for (const e of expenses.value) {
    if (e.currency === "JPY") jpy += Number(e.amount) || 0;
    if (e.currency === "TWD") twd += Number(e.amount) || 0;
  }
  return { JPY: formatNumber(jpy), TWD: formatNumber(twd) };
});

function categoryLabel(c) {
  const map = {
    food: "餐飲",
    traffic: "交通",
    shopping: "購物",
    ticket: "門票",
    hotel: "住宿",
    other: "其他",
  };
  return map[c] || "其他";
}

/* ===================== Utils ===================== */
function openNavigation(destination) {
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`;
  window.open(url, "_blank");
}

function toISODate(dateStr) {
  if (!dateStr) return "";
  const s = String(dateStr).trim();
  if (s.includes("-")) return s.slice(0, 10);
  const parts = s.split("/");
  if (parts.length !== 3) return "";
  const [y, m, d] = parts;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function toShortDate(dateStr) {
  if (!dateStr) return "";
  const s = String(dateStr).trim();
  const parts = s.includes("/") ? s.split("/") : s.split("-");
  if (parts.length < 3) return s;
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!isFiniteNumber(m) || !isFiniteNumber(d)) return s;
  return `${m}/${d}`;
}

function toWeekday(dateStr) {
  const iso = toISODate(dateStr);
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  const map = ["日", "一", "二", "三", "四", "五", "六"];
  return `週${map[d.getDay()]}`;
}

function toHHMM(dateTimeStr) {
  const s = String(dateTimeStr || "");
  const t = s.split("T")[1] || "";
  return t.slice(0, 5) || "--:--";
}

function isFiniteNumber(v) {
  return Number.isFinite(Number(v));
}

function loadLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function formatNumber(n) {
  return (Number(n) || 0).toLocaleString("en-US");
}
</script>

<style scoped>
.auth-bar {
  margin-top: 10px;
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
}

.auth-user {
  display: flex;
  gap: 10px;
  align-items: center;
}

.auth-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #20c997;
}
.auth-dot.off {
  background: rgba(0, 0, 0, 0.25);
}

.auth-avatar {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  object-fit: cover;
  border: 2px solid rgba(0, 0, 0, 0.06);
}

.auth-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.auth-name {
  font-weight: 900;
  font-size: 12px;
}
.auth-meta {
  font-size: 11px;
  opacity: 0.65;
}

/* ✅ 線上成員 */
.presence-bar {
  margin-top: 10px;
  display: flex;
  gap: 10px;
  align-items: center;
  font-size: 12px;
  opacity: 0.9;
}

.presence-title {
  font-weight: 900;
  opacity: 0.75;
}

.presence-list {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.presence-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.04);
}

.presence-avatar {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  object-fit: cover;
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.presence-name {
  font-weight: 900;
}

.presence-badge {
  margin-left: 6px;
  font-size: 11px;
  opacity: 0.7;
}

/* （你原本的 trip-hint 已移除） */

.uid-box {
  margin-top: 12px;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 18px;
  padding: 12px;
}

.uid-label {
  font-size: 12px;
  font-weight: 900;
  opacity: 0.7;
}

.uid-value {
  margin-top: 6px;
  font-size: 12px;
  font-weight: 1000;
  word-break: break-all;
  padding: 10px;
  border-radius: 14px;
  background: #fff;
  border: 2px solid rgba(0, 0, 0, 0.06);
}

.uid-actions {
  margin-top: 10px;
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

/* 統計保底 */
.stats {
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.stat {
  background: rgba(0, 0, 0, 0.04);
  border-radius: 16px;
  padding: 10px;
  text-align: center;
}
.stat-value {
  font-weight: 1000;
  font-size: 16px;
}
.stat-label {
  margin-top: 4px;
  font-size: 11px;
  opacity: 0.75;
  font-weight: 800;
}
</style>
