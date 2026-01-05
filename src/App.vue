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

            <img
              class="auth-avatar"
              :src="userAvatar"
              :alt="userLabel"
              referrerpolicy="no-referrer"
            />

            <div class="auth-text">
              <div class="auth-name">{{ userLabel }}</div>
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

      <!-- 線上成員名單 -->
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

      <!-- 已登入但不是成員 -->
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
        </div>
      </section>

      <!-- =============== 行程頁 =============== -->
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
                  <div class="outfit-desc">
                    {{ outfitAdvice(weatherState.tMin, weatherState.tMax, weatherState.precipProb) }}
                  </div>
                </div>
              </div>

              <!-- 倒數 -->
              <div class="countdown-text" v-if="honeymoonCountdownText">
                {{ honeymoonCountdownText }}
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

          <div v-for="(event, idx) in day.events" :key="idx">
            <div class="event-card">
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

            <div v-if="noteExists(event) && !event.showNote" class="note-between">
              <div class="note-between-title">📝 筆記</div>
              <div class="note-between-body">{{ event.note }}</div>
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

      <!-- =============== 記帳頁（截圖樣式 + 你新需求） =============== -->
      <section v-else-if="user && membershipChecked && isMember && currentPage === 'accounting'" class="page">
        <!-- 分段切換：記帳 / 明細 -->
        <div class="segmented">
          <button
            class="seg-btn"
            :class="{ active: accountingTab === 'entry' }"
            @click="accountingTab = 'entry'"
            type="button"
          >
            🧾 記帳
          </button>

          <button
            class="seg-btn"
            :class="{ active: accountingTab === 'detail' }"
            @click="accountingTab = 'detail'"
            type="button"
          >
            ☰ 明細
          </button>
        </div>

        <!-- ===== 記帳輸入 ===== -->
        <div v-if="accountingTab === 'entry'" class="acc-entry">
          <div class="acc-card">
            <div class="acc-card-title">💰 記帳輸入</div>

            <!-- 日期 -->
            <div class="acc-field">
              <div class="acc-label">日期</div>
              <div class="acc-date">
                <input class="acc-input" type="date" v-model="expenseForm.date" />
              </div>
            </div>

            <!-- 幣別 -->
            <div class="acc-field">
              <div class="acc-label">幣別（預設 {{ expenseForm.currency }}）</div>
              <div class="acc-pills">
                <button
                  class="acc-pill"
                  :class="{ active: expenseForm.currency === 'JPY' }"
                  @click="expenseForm.currency = 'JPY'"
                  type="button"
                >
                  JPY
                </button>
                <button
                  class="acc-pill"
                  :class="{ active: expenseForm.currency === 'TWD' }"
                  @click="expenseForm.currency = 'TWD'"
                  type="button"
                >
                  TWD
                </button>
              </div>
            </div>

            <!-- 金額 & 約台幣 -->
            <div class="acc-grid-2">
              <div class="acc-field">
                <div class="acc-label">＊金額</div>
                <input class="acc-input" type="number" v-model.number="expenseForm.amount" placeholder="0" />
              </div>

              <div class="acc-field">
                <div class="acc-label">約合台幣</div>
                <input class="acc-input" type="number" :value="approxTwd" disabled />
              </div>
            </div>

            <!-- 支付方式（WOWPASS -> 大阪周遊券） -->
            <div class="acc-field">
              <div class="acc-label">支付方式</div>
              <div class="acc-pills">
                <button class="acc-pill small" :class="{ active: uiPayMethod === '現金' }" @click="uiPayMethod='現金'" type="button">現金</button>
                <button class="acc-pill small" :class="{ active: uiPayMethod === '信用卡' }" @click="uiPayMethod='信用卡'" type="button">信用卡</button>
                <button class="acc-pill small" :class="{ active: uiPayMethod === '大阪周遊券' }" @click="uiPayMethod='大阪周遊券'" type="button">大阪周遊券</button>
                <button class="acc-pill small" :class="{ active: uiPayMethod === '行動支付' }" @click="uiPayMethod='行動支付'" type="button">行動支付</button>
              </div>
            </div>

            <!-- 地點 -->
            <div class="acc-field">
              <div class="acc-label">地點（選填）</div>
              <div class="acc-with-icon">
                <span class="acc-icon">📍</span>
                <input class="acc-input" v-model="uiPlace" placeholder="例如：便利商店" />
              </div>
            </div>

            <!-- 消費項目 + 相機 -->
            <div class="acc-grid-photo">
              <div class="acc-field">
                <div class="acc-label">＊消費項目</div>
                <input class="acc-input" v-model="uiItem" placeholder="例如：午餐" />
              </div>

              <button class="acc-camera" type="button" @click="fakeCamera">
                📷
              </button>
            </div>

            <!-- 成員（改成：members 的 Google 名稱清單） -->
            <div class="acc-field">
              <div class="acc-label">成員</div>

              <div v-if="memberChips.length === 0" class="empty-state" style="margin:8px 0 0 0;">
                尚未取得成員名單（請確認 Firestore rules：members read 需允許 isMember(tripId)）。
              </div>

              <div v-else class="acc-members">
                <button
                  v-for="m in memberChips"
                  :key="m"
                  class="member-pill"
                  :class="{ active: uiMember === m }"
                  @click="uiMember = m"
                  type="button"
                >
                  {{ m }}
                </button>
              </div>
            </div>

            <!-- 分類 -->
            <div class="acc-field">
              <div class="acc-label">分類</div>
              <div class="acc-pills">
                <button class="acc-pill small" :class="{ active: expenseForm.category === 'food' }" @click="expenseForm.category='food'" type="button">餐飲</button>
                <button class="acc-pill small" :class="{ active: expenseForm.category === 'traffic' }" @click="expenseForm.category='traffic'" type="button">交通</button>
                <button class="acc-pill small" :class="{ active: expenseForm.category === 'shopping' }" @click="expenseForm.category='shopping'" type="button">購物</button>
                <button class="acc-pill small" :class="{ active: expenseForm.category === 'ticket' }" @click="expenseForm.category='ticket'" type="button">門票</button>
                <button class="acc-pill small" :class="{ active: expenseForm.category === 'hotel' }" @click="expenseForm.category='hotel'" type="button">住宿</button>
                <button class="acc-pill small" :class="{ active: expenseForm.category === 'other' }" @click="expenseForm.category='other'" type="button">其他</button>
              </div>
            </div>

            <!-- 儲存 -->
            <div class="acc-actions">
              <button class="btn btn-primary" @click="addExpenseFromFancy">儲存</button>
            </div>

            <div class="acc-hint">
              <div v-if="expensesError">同步錯誤：{{ expensesError }}</div>
              <div v-else-if="expensesLoading">同步中…</div>
              <div v-else>點「明細」可以看到列表與總支出。</div>
            </div>
          </div>
        </div>

        <!-- ===== 明細列表 ===== -->
        <div v-else class="acc-detail">
          <!-- 總支出黃卡（會跟 成員 + 日期 filter 連動） -->
          <div class="sum-card">
            <div class="sum-title">總支出（TWD）</div>
            <div class="sum-amt">NT$ {{ totalTwdFiltered }}</div>

            <div class="sum-sub">
              <div class="sum-sub-left">
                <div class="sum-sub-label">日圓支出</div>
                <div class="sum-sub-value">¥ {{ totalJpyFiltered }}</div>
              </div>
              <div class="sum-sub-right">
                <div class="sum-sub-label">匯率（{{ fxDateLabel }}）</div>
                <div class="sum-sub-value">1：{{ fxValue.toFixed(4) }}</div>
              </div>
            </div>
          </div>

          <!-- ✅ 日期切換 chips（像行程 tabs） -->
          <div class="day-tabs" style="margin-top:10px;">
            <button
              class="day-chip"
              :class="{ active: detailDateFilter === '全部' }"
              @click="detailDateFilter = '全部'"
              type="button"
            >
              <div class="chip-top">範圍</div>
              <div class="chip-date">全部</div>
              <div class="chip-weekday">總計</div>
            </button>

            <button
              v-for="d in expenseDates"
              :key="d"
              class="day-chip"
              :class="{ active: detailDateFilter === d }"
              @click="detailDateFilter = d"
              type="button"
            >
              <div class="chip-top">日期</div>
              <div class="chip-date">{{ d.slice(5).replace('-', '/') }}</div>
              <div class="chip-weekday">{{ toWeekday(d) }}</div>
            </button>
          </div>

          <div class="detail-title">帳務明細</div>

          <!-- ✅ 成員 filter：全體 + members -->
          <div class="detail-filters">
            <button
              class="filter-pill"
              :class="{ active: detailMemberFilter === '全體' }"
              @click="detailMemberFilter = '全體'"
              type="button"
            >
              全體
            </button>

            <button
              v-for="m in memberChips"
              :key="m"
              class="filter-pill"
              :class="{ active: detailMemberFilter === m }"
              @click="detailMemberFilter = m"
              type="button"
            >
              {{ m }}
            </button>
          </div>

          <!-- 依日期分組 -->
          <div v-if="groupedExpenses.length === 0" class="empty-state">
            沒有符合篩選條件的記帳紀錄。
          </div>

          <div v-else class="detail-groups">
            <div v-for="g in groupedExpenses" :key="g.date" class="detail-group">
              <div class="group-head">
                <div class="group-date">{{ g.date }}</div>
                <div class="group-subtotal">本日小計：NT$ {{ formatNumber(g.subtotalTwd) }}</div>
              </div>

              <div class="group-items">
                <div
                  v-for="e in g.items"
                  :key="e.id"
                  class="detail-item"
                  @click="openExpenseEditor(e)"
                >
                  <div class="di-left">
                    <div class="avatar">
                      {{ avatarLetter(e) }}
                    </div>
                  </div>

                  <div class="di-mid">
                    <div class="di-title">{{ displayTitle(e) }}</div>
                    <div class="di-meta">
                      {{ displayMember(e) }}　
                      <span class="di-dot">•</span>
                      {{ displayPay(e) }}
                    </div>
                  </div>

                  <div class="di-right">
                    <div class="di-amt">
                      {{ currencySymbol(e.currency) }} {{ formatNumber(e.amount) }}
                    </div>
                    <div class="di-approx">
                      ≈ NT$ {{ formatNumber(expenseToTwd(e)) }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="detail-foot">
            <button class="btn btn-secondary" @click="reloadExpenses">重新同步</button>
          </div>
        </div>

        <!-- 記帳編輯 Modal -->
        <div v-if="expenseEditor.open" class="modal-overlay" @click.self="closeExpenseEditor">
          <div class="modal">
            <div class="modal-title">🧾 修改記帳</div>
            <div class="modal-subtitle" v-if="expenseEditor.origin">
              建立者：{{ expenseEditor.origin.displayName || "使用者" }}
              <span v-if="!canEditExpense(expenseEditor.origin)" style="opacity:.75;">（你只能修改自己的）</span>
            </div>

            <div class="form-grid" style="margin-top:10px;">
              <label class="field">
                <div class="field-label">日期</div>
                <input class="field-input" type="date" v-model="expenseEditor.form.date" :disabled="!canEditExpense(expenseEditor.origin)" />
              </label>

              <label class="field">
                <div class="field-label">金額</div>
                <input class="field-input" type="number" v-model.number="expenseEditor.form.amount" :disabled="!canEditExpense(expenseEditor.origin)" />
              </label>

              <div class="field">
                <div class="field-label">幣別</div>
                <div class="currency-pills">
                  <button
                    class="pill"
                    :class="{ active: expenseEditor.form.currency === 'JPY' }"
                    @click="expenseEditor.form.currency = 'JPY'"
                    type="button"
                    :disabled="!canEditExpense(expenseEditor.origin)"
                  >
                    日圓 JPY
                  </button>
                  <button
                    class="pill"
                    :class="{ active: expenseEditor.form.currency === 'TWD' }"
                    @click="expenseEditor.form.currency = 'TWD'"
                    type="button"
                    :disabled="!canEditExpense(expenseEditor.origin)"
                  >
                    台幣 TWD
                  </button>
                </div>
              </div>

              <label class="field">
                <div class="field-label">分類</div>
                <select class="field-input" v-model="expenseEditor.form.category" :disabled="!canEditExpense(expenseEditor.origin)">
                  <option value="food">餐飲</option>
                  <option value="traffic">交通</option>
                  <option value="shopping">購物</option>
                  <option value="ticket">門票</option>
                  <option value="hotel">住宿</option>
                  <option value="other">其他</option>
                </select>
              </label>

              <label class="field field-span">
                <div class="field-label">備註（包含：支付方式/地點/項目/成員）</div>
                <input class="field-input" v-model="expenseEditor.form.note" :disabled="!canEditExpense(expenseEditor.origin)" />
              </label>
            </div>

            <div class="row-right">
              <button class="btn btn-secondary" @click="closeExpenseEditor">關閉</button>
              <button class="btn btn-primary" @click="saveExpenseEdit" :disabled="!canEditExpense(expenseEditor.origin)">儲存修改</button>
            </div>

            <div class="row-right" style="margin-top:10px;">
              <button class="btn btn-danger" @click="deleteExpense" :disabled="!canEditExpense(expenseEditor.origin)">
                刪除此筆
              </button>
            </div>

            <div class="modal-hint">
              若你按「刪除」失敗，多半是 Firestore rules 目前不允許 delete；但 UI 已經做好。
            </div>
          </div>
        </div>
      </section>

      <!-- =============== 準備頁 =============== -->
      <section v-else-if="user && membershipChecked && isMember && currentPage === 'prep'" class="page">
        <div class="card">
          <div class="card-title">🎒 準備清單</div>
          <div class="card-subtitle">
            三個區塊：待辦（Todo）、行李清單、購物清單。支援新增/勾選/刪除，並同步至 Firestore。
          </div>
        </div>

        <div class="checklist-grid">
          <div class="card">
            <div class="card-title">✅ 待辦清單（Todo）</div>

            <div class="inline-add">
              <input class="field-input" v-model="prepInput.todo" placeholder="新增待辦..." />
              <button class="btn btn-primary" @click="addPrepItem('todo')">新增</button>
            </div>

            <div v-if="prep.todo.loading" class="loading">同步中…</div>
            <div v-if="prep.todo.error" class="empty-state">錯誤：{{ prep.todo.error }}</div>

            <div class="list" v-if="prep.todo.items.length">
              <div class="list-item">
                <div class="todo">
                  <b>完成</b>
                </div>
                <div style="font-weight:1000; opacity:.75;">內容</div>
                <div style="width:64px; text-align:right; font-weight:1000; opacity:.75;">刪除</div>
              </div>

              <div class="list-item" v-for="it in prep.todo.items" :key="it.id">
                <label class="todo">
                  <input type="checkbox" v-model="it.done" @change="togglePrepDone('todo', it)" />
                  <span :class="{ done: it.done }">{{ it.text }}</span>
                </label>
                <div style="width:64px; display:flex; justify-content:flex-end;">
                  <button class="btn btn-ghost btn-mini" @click="deletePrepItem('todo', it)">刪除</button>
                </div>
              </div>
            </div>

            <div v-else class="empty-state">尚無待辦事項。</div>
          </div>

          <div class="card">
            <div class="card-title">🧳 行李清單</div>

            <div class="inline-add">
              <input class="field-input" v-model="prepInput.luggage" placeholder="新增行李..." />
              <button class="btn btn-primary" @click="addPrepItem('luggage')">新增</button>
            </div>

            <div v-if="prep.luggage.loading" class="loading">同步中…</div>
            <div v-if="prep.luggage.error" class="empty-state">錯誤：{{ prep.luggage.error }}</div>

            <div class="list" v-if="prep.luggage.items.length">
              <div class="list-item" v-for="it in prep.luggage.items" :key="it.id">
                <label class="todo">
                  <input type="checkbox" v-model="it.done" @change="togglePrepDone('luggage', it)" />
                  <span :class="{ done: it.done }">{{ it.text }}</span>
                </label>
                <div style="width:64px; display:flex; justify-content:flex-end;">
                  <button class="btn btn-ghost btn-mini" @click="deletePrepItem('luggage', it)">刪除</button>
                </div>
              </div>
            </div>

            <div v-else class="empty-state">尚無行李項目。</div>
          </div>

          <div class="card">
            <div class="card-title">🛍️ 購物清單</div>

            <div class="inline-add">
              <input class="field-input" v-model="prepInput.shopping" placeholder="新增購物項目..." />
              <button class="btn btn-primary" @click="addPrepItem('shopping')">新增</button>
            </div>

            <div v-if="prep.shopping.loading" class="loading">同步中…</div>
            <div v-if="prep.shopping.error" class="empty-state">錯誤：{{ prep.shopping.error }}</div>

            <div class="list" v-if="prep.shopping.items.length">
              <div class="list-item" v-for="it in prep.shopping.items" :key="it.id">
                <label class="todo">
                  <input type="checkbox" v-model="it.done" @change="togglePrepDone('shopping', it)" />
                  <span :class="{ done: it.done }">{{ it.text }}</span>
                </label>
                <div style="width:64px; display:flex; justify-content:flex-end;">
                  <button class="btn btn-ghost btn-mini" @click="deletePrepItem('shopping', it)">刪除</button>
                </div>
              </div>
            </div>

            <div v-else class="empty-state">尚無購物項目。</div>
          </div>
        </div>
      </section>

      <!-- =============== 憑證頁 =============== -->
      <section v-else-if="user && membershipChecked && isMember && currentPage === 'receipts'" class="page">
        <div class="card">
          <div class="card-title">📎 憑證</div>
          <div class="card-subtitle">
            可上傳 PDF 或圖片，並顯示憑證列表。<br />
            儲存位置：<b>Storage: trips/{{ DEFAULT_TRIP_ID }}/receipts/</b>；Metadata：<b>trips/{{ DEFAULT_TRIP_ID }}/receipts</b>
          </div>

          <div class="inline-add">
            <input class="field-input" type="file" accept="application/pdf,image/*" @change="onReceiptFilePick" />
            <button class="btn btn-primary" @click="uploadReceipt" :disabled="!receiptUpload.file || receiptUpload.loading">
              {{ receiptUpload.loading ? "上傳中..." : "上傳" }}
            </button>
          </div>

          <div v-if="receiptUpload.error" class="empty-state">上傳失敗：{{ receiptUpload.error }}</div>
        </div>

        <div class="card">
          <div class="card-title">📄 憑證列表</div>
          <div class="card-subtitle">
            <span v-if="receiptsLoading">同步中…</span>
            <span v-if="receiptsError">同步錯誤：{{ receiptsError }}</span>
          </div>

          <div v-if="receipts.length === 0 && !receiptsLoading" class="empty-state">
            還沒有憑證。先把發票/訂單丟進來，之後報帳比較不會「憑空消失」。
          </div>

          <div v-else class="list">
            <a
              v-for="r in receipts"
              :key="r.id"
              class="list-item receipt-item"
              :href="r.url"
              target="_blank"
              rel="noreferrer"
            >
              <div class="li-main">
                <div class="li-title">
                  {{ r.name }}
                  <span style="opacity:.65;">｜{{ r.uploaderName || "使用者" }}</span>
                </div>
                <div class="li-sub">
                  {{ r.type }}｜{{ formatBytes(r.size || 0) }}｜{{ r.date || "" }}
                </div>
              </div>
              <div class="li-amount">開啟</div>
            </a>
          </div>
        </div>
      </section>
    </main>

    <!-- 底部導覽 -->
    <nav class="bottom-nav bottom-nav-4">
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

      <button class="nav-item" :class="{ active: currentPage === 'receipts' }" @click="currentPage = 'receipts'">
        <div class="nav-icon">📎</div>
        <div class="nav-label">憑證</div>
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
  deleteDoc,
} from "firebase/firestore";

import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  signOut,
} from "firebase/auth";

import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

/* ===================== 固定預設行程 ===================== */
const DEFAULT_TRIP_ID = "HM-8F3K2A";

/* ===================== Auth ===================== */
const auth = getAuth();
const user = ref(null);

const DEFAULT_AVATAR =
  "data:image/svg+xml;base64," +
  btoa(`
  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
    <rect width="100%" height="100%" fill="#f2f2f2"/>
    <circle cx="32" cy="26" r="12" fill="#c9c9c9"/>
    <rect x="14" y="42" width="36" height="16" rx="8" fill="#c9c9c9"/>
  </svg>`);

const userLabel = computed(() => {
  if (!user.value) return "";
  return user.value.displayName || (user.value.isAnonymous ? "匿名使用者" : "使用者");
});

const userAvatar = computed(() => {
  if (!user.value) return DEFAULT_AVATAR;
  return user.value.photoURL || DEFAULT_AVATAR;
});

const userMeta = computed(() => {
  if (!user.value) return "";
  if (user.value.isAnonymous) return "匿名登入";
  return "Google 登入";
});

/* ===================== Presence（線上名單） ===================== */
const presenceRaw = ref([]);
const ONLINE_WINDOW_SEC = 120;
let heartbeatTimer = null;
let unsubPresence = null;

const presenceList = computed(() => {
  const meUid = user.value?.uid || "";
  const now = Date.now();
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

/* ===================== Members list（供 UI 成員 chips） ===================== */
const members = ref([]); // [{ uid, displayName }]
const memberChips = computed(() => {
  const names = members.value
    .map((m) => String(m.displayName || "").trim())
    .filter(Boolean);

  return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b, "zh-Hant"));
});

async function loadMembers() {
  if (!user.value || !isMember.value) return;

  try {
    const snap = await getDocs(collection(db, "trips", DEFAULT_TRIP_ID, "members"));
    members.value = snap.docs.map((d) => {
      const data = d.data();
      return {
        uid: d.id,
        displayName: data.displayName || data.name || "",
      };
    });
  } catch (e) {
    console.error("讀取 members 失敗：", e);
    members.value = [];
  }
}

/* ===================== Pages ===================== */
const currentPage = ref("itinerary");
const pageTitle = computed(() => {
  if (currentPage.value === "itinerary") return "行程";
  if (currentPage.value === "accounting") return "記帳";
  if (currentPage.value === "prep") return "準備";
  if (currentPage.value === "receipts") return "憑證";
  return "";
});

/* ===================== Lifecycle ===================== */
onMounted(() => {
  subscribePresence();

  onAuthStateChanged(auth, async (u) => {
    user.value = u || null;

    membershipChecked.value = false;
    isMember.value = false;

    if (!user.value) {
      stopHeartbeat();
      plan.value = [];
      activeDayId.value = null;
      expenses.value = [];
      clearPrepState();
      receipts.value = [];
      members.value = [];
      return;
    }

    await upsertPresence();
    startHeartbeat();

    await checkMembership();

    if (isMember.value) {
      await loadMembers();
      await loadPlan();
      await reloadExpenses();
      await loadPrepAll();
      await reloadReceipts();

      // 記帳 UI 預設成員：選自己（若在清單內），否則選第一個
      const me = userLabel.value;
      uiMember.value = memberChips.value.includes(me) ? me : (memberChips.value[0] || me);
    }
  });
});

onBeforeUnmount(() => {
  stopHeartbeat();
  if (unsubPresence) unsubPresence();
  unsubscribePrepAll();
});

/* ===================== Auth actions ===================== */
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
    await loadMembers();
    await loadPlan();
    await reloadExpenses();
    await loadPrepAll();
    await reloadReceipts();
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

/* ===================== Plan：trips/.../plan ===================== */
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

    await updateDoc(dayRef, { events: eventsToSave });

    alert("筆記已儲存！");
    dayObj.events[idx].showNote = false;
  } catch (e) {
    console.error("儲存筆記失敗：", e);
    alert("儲存失敗（請確認 rules：成員才可更新 plan）");
  }
}

function noteExists(event) {
  return String(event?.note || "").trim().length > 0;
}

/* ===================== Honeymoon countdown ===================== */
const honeymoonCountdownText = computed(() => {
  const start = getHoneymoonStartISO();
  if (!start) return "";
  const days = daysUntil(start);
  return `距離蜜月  ${days}天`;
});

function getHoneymoonStartISO() {
  if (!plan.value.length) return "";
  const first = plan.value[0];
  const iso = toISODate(first?.date || "");
  return iso || "";
}

function daysUntil(isoDate) {
  const today = new Date();
  const today0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const target = new Date(`${isoDate}T00:00:00`);
  const diffMs = target.getTime() - today0.getTime();
  const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  return Math.max(0, diffDays);
}

/* ===================== Weather (open-meteo) ===================== */
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
  if (p === "accounting") {
    await reloadExpenses();
    await loadMembers();
  }
  if (p === "prep") await loadPrepAll();
  if (p === "receipts") await reloadReceipts();
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

/* ===================== Expenses ===================== */
const expenses = ref(loadLocal("hm_expenses_cache", []));
const expensesLoading = ref(false);
const expensesError = ref("");

// 記帳分頁（entry/detail）
const accountingTab = ref("entry");

// Entry UI
const uiMember = ref("");
const uiPayMethod = ref("現金");
const uiPlace = ref("");
const uiItem = ref("");

// 明細 filter：成員 + 日期
const detailMemberFilter = ref("全體");
const detailDateFilter = ref("全部"); // "全部" 或 "YYYY-MM-DD"

// ✅ 匯率：依日期抓 JPY->TWD（fallback 0.2）
const DEFAULT_FX_JPY_TO_TWD = 0.2;

const fxJpyToTwd = ref(null); // number
const fxCache = new Map(); // date -> rate

const fxValue = computed(() => {
  const v = Number(fxJpyToTwd.value);
  return Number.isFinite(v) && v > 0 ? v : DEFAULT_FX_JPY_TO_TWD;
});

// 匯率標籤：顯示用的日期（選全部就用今天）
const fxDateLabel = computed(() => {
  if (detailDateFilter.value === "全部") return new Date().toISOString().slice(0, 10);
  return detailDateFilter.value;
});

async function loadFxForDate(dateISO) {
  if (!dateISO) return;

  if (fxCache.has(dateISO)) {
    fxJpyToTwd.value = fxCache.get(dateISO);
    return;
  }

  // 1) 先嘗試 Google Finance（用 r.jina.ai 取得純文字，通常可避開 CORS）
  // 注意：Google Finance 不提供正式 JSON API，這是「盡力解析」；失敗就走備援。
  try {
    const gfUrl = `https://r.jina.ai/https://www.google.com/finance/quote/JPY-TWD?hl=zh-TW`;
    const res = await fetch(gfUrl);
    if (res.ok) {
      const txt = await res.text();

      // 常見頁面中會出現的數字（例如：0.20xx），用較保守的正則抓第一個合理數值
      // 若你發現抓到不對的數字，可再回來把 regex 調嚴格。
      const m = txt.match(/(?:JPY|Japanese Yen)[^\d]{0,40}(\d+(?:\.\d+)?)/i) || txt.match(/\b0\.\d{2,6}\b/);
      const rate = m ? Number(m[1] || m[0]) : NaN;

      if (Number.isFinite(rate) && rate > 0) {
        fxCache.set(dateISO, rate);
        fxJpyToTwd.value = rate;
        return;
      }
    }
  } catch (e) {
    console.warn("Google 匯率抓取失敗（改走備援）：", e);
  }

  // 2) 備援：exchangerate.host（你原本就有）
  try {
    const url = `https://api.exchangerate.host/${dateISO}?base=JPY&symbols=TWD`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const rate = Number(data?.rates?.TWD);
    if (!Number.isFinite(rate) || rate <= 0) throw new Error("匯率格式錯誤");

    fxCache.set(dateISO, rate);
    fxJpyToTwd.value = rate;
    return;
  } catch (e) {
    console.error("備援匯率抓取也失敗：", e);
  }

  // 3) 最終 fallback：0.2
  fxJpyToTwd.value = DEFAULT_FX_JPY_TO_TWD;
}


// 在明細頁 & 切日期時，抓匯率
watch([accountingTab, detailDateFilter], async () => {
  if (accountingTab.value !== "detail") return;

  const date = detailDateFilter.value === "全部"
    ? new Date().toISOString().slice(0, 10)
    : detailDateFilter.value;

  await loadFxForDate(date);
}, { immediate: true });

const expenseForm = ref({
  date: new Date().toISOString().slice(0, 10),
  amount: 0,
  currency: "JPY",
  category: "food",
  note: "",
});

const approxTwd = computed(() => {
  const amt = Number(expenseForm.value.amount) || 0;
  if (expenseForm.value.currency === "TWD") return Math.round(amt);
  return Math.round(amt * fxValue.value);
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

// ✅ 用「截圖 UI」送出：把（支付方式/地點/項目/成員）打包進 note
async function addExpenseFromFancy() {
  if (!user.value || !isMember.value) return alert("你尚未被加入行程，不能記帳");
  if (!expenseForm.value.date) return alert("請選日期");

  const amount = Number(expenseForm.value.amount);
  if (!isFiniteNumber(amount) || amount <= 0) return alert("金額要大於 0");

  if (String(uiItem.value || "").trim().length === 0) return alert("請填「消費項目」");

  if (memberChips.value.length === 0) {
    return alert("尚未取得成員名單（請先調整 Firestore rules：members read 需允許 isMember(tripId)）");
  }

  const notePacked = packNote({
    pay: uiPayMethod.value,
    member: uiMember.value,
    place: uiPlace.value,
    item: uiItem.value,
  });

  const payload = {
    date: expenseForm.value.date,
    amount: amount,
    currency: expenseForm.value.currency,
    category: expenseForm.value.category,
    note: notePacked,
    uid: user.value.uid,
    displayName: user.value.displayName || (user.value.isAnonymous ? "匿名使用者" : "使用者"),
    createdAt: serverTimestamp(),
  };

  // optimistic
  const localId = `local_${Date.now()}`;
  expenses.value.unshift({ id: localId, ...payload, createdAt: new Date() });
  saveLocal("hm_expenses_cache", expenses.value);

  try {
    await addDoc(collection(db, "trips", DEFAULT_TRIP_ID, "expenses"), payload);
    await reloadExpenses();

    // 送出後切到明細
    accountingTab.value = "detail";
  } catch (e) {
    expensesError.value = e?.message ? String(e.message) : "寫入失敗";
    alert("已先存本機，但雲端寫入失敗（請檢查 rules / 網路）");
  }

  // reset UI
  expenseForm.value.amount = 0;
  uiPlace.value = "";
  uiItem.value = "";
  uiPayMethod.value = "現金";
  // uiMember 保留
}

function fakeCamera() {
  alert("相機按鈕已就位。若要真的上傳照片，我建議直接到「憑證」頁上傳，資料更一致。");
}

/* ===== 明細：依成員篩選 + 依日期篩選 + 依日期分組 ===== */
const filteredExpensesForDetail = computed(() => {
  let list = expenses.value;

  const m = detailMemberFilter.value;
  if (m !== "全體") {
    list = list.filter((e) => {
      const parsed = parsePackedNote(e.note);
      return (parsed.member || "") === m;
    });
  }

  const d = detailDateFilter.value;
  if (d !== "全部") {
    list = list.filter((e) => e.date === d);
  }

  return list;
});

const expenseDates = computed(() => {
  // 日期 chips：從「成員已篩選」後的資料抽日期
  const dates = expenses.value
    .map((e) => e.date)
    .filter(Boolean);
  return Array.from(new Set(dates)).sort((a, b) => b.localeCompare(a));
});

const groupedExpenses = computed(() => {
  const items = [...filteredExpensesForDetail.value].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const map = new Map();

  for (const e of items) {
    const date = e.date || "未知日期";
    if (!map.has(date)) map.set(date, []);
    map.get(date).push(e);
  }

  const res = [];
  for (const [date, list] of map.entries()) {
    const subtotalTwd = list.reduce((sum, e) => sum + expenseToTwd(e), 0);
    res.push({ date, items: list, subtotalTwd });
  }

  res.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return res;
});

/* ===== 總支出（跟篩選連動） ===== */
const totalJpyFiltered = computed(() => {
  const sum = filteredExpensesForDetail.value.reduce((acc, e) => {
    if (e.currency === "JPY") return acc + (Number(e.amount) || 0);
    return acc;
  }, 0);
  return formatNumber(sum);
});

const totalTwdFiltered = computed(() => {
  const sum = filteredExpensesForDetail.value.reduce((acc, e) => acc + expenseToTwd(e), 0);
  return formatNumber(sum);
});

function expenseToTwd(e) {
  const amt = Number(e.amount) || 0;
  if (e.currency === "TWD") return Math.round(amt);
  return Math.round(amt * fxValue.value);
}

/* ===== note pack/unpack（不改 schema） ===== */
function packNote({ pay, member, place, item }) {
  const p = String(pay || "").trim() || "現金";
  const m = String(member || "").trim() || "";
  const pl = String(place || "").trim();
  const it = String(item || "").trim();

  const head = `[${p}]${m ? `[${m}]` : ""}`;
  const body = `${pl ? pl + "｜" : ""}${it}`;
  return `${head} ${body}`.trim();
}

function parsePackedNote(note) {
  const s = String(note || "");
  const m1 = s.match(/^\[([^\]]+)\]/);            // pay
  const m2 = s.match(/^\[[^\]]+\]\[([^\]]+)\]/);  // member (optional)
  const pay = m1 ? m1[1] : "";
  const member = m2 ? m2[1] : "";

  const rest = s.replace(/^\[[^\]]+\](\[[^\]]+\])?\s*/g, "");
  const [place, item] = rest.split("｜");

  return {
    pay,
    member,
    place: item ? (place || "") : "",
    item: item ? (item || "") : (place || ""),
  };
}

function displayTitle(e) {
  const p = parsePackedNote(e.note);
  const base = p.item || (e.note || "（無項目）");
  return base;
}

function displayMember(e) {
  const p = parsePackedNote(e.note);
  return p.member || "全員";
}

function displayPay(e) {
  const p = parsePackedNote(e.note);
  return p.pay || "現金";
}

function avatarLetter(e) {
  const p = parsePackedNote(e.note);
  const name = p.member || e.displayName || "用";
  return String(name).trim().slice(0, 1);
}

function currencySymbol(c) {
  if (c === "JPY") return "¥";
  if (c === "TWD") return "NT$";
  return c || "";
}

/* ===================== Expense editor modal ===================== */
const expenseEditor = ref({
  open: false,
  origin: null,
  form: { id: "", date: "", amount: 0, currency: "JPY", category: "other", note: "" },
});

function canEditExpense(e) {
  if (!user.value || !e) return false;
  return e.uid === user.value.uid;
}

function openExpenseEditor(e) {
  expenseEditor.value.open = true;
  expenseEditor.value.origin = { ...e };
  expenseEditor.value.form = {
    id: e.id,
    date: e.date || "",
    amount: Number(e.amount) || 0,
    currency: e.currency || "JPY",
    category: e.category || "other",
    note: e.note || "",
  };
}

function closeExpenseEditor() {
  expenseEditor.value.open = false;
  expenseEditor.value.origin = null;
}

async function saveExpenseEdit() {
  const origin = expenseEditor.value.origin;
  if (!origin) return;
  if (!canEditExpense(origin)) return alert("你只能修改你自己建立的紀錄。");

  const f = expenseEditor.value.form;
  if (!f.date) return alert("請選日期");
  if (!isFiniteNumber(f.amount) || Number(f.amount) <= 0) return alert("金額要大於 0");

  try {
    const refDoc = doc(db, "trips", DEFAULT_TRIP_ID, "expenses", origin.id);
    await updateDoc(refDoc, {
      date: f.date,
      amount: Number(f.amount),
      currency: f.currency,
      category: f.category,
      note: String(f.note || "").trim(),
    });

    await reloadExpenses();
    closeExpenseEditor();
    alert("已更新！");
  } catch (e) {
    console.error("更新記帳失敗：", e);
    alert("更新失敗（通常是 rules 不允許或網路問題）");
  }
}

async function deleteExpense() {
  const origin = expenseEditor.value.origin;
  if (!origin) return;
  if (!canEditExpense(origin)) return alert("你只能刪除你自己建立的紀錄。");
  if (!confirm("確定要刪除此筆記帳？")) return;

  try {
    const refDoc = doc(db, "trips", DEFAULT_TRIP_ID, "expenses", origin.id);
    await deleteDoc(refDoc);
    await reloadExpenses();
    closeExpenseEditor();
    alert("已刪除！");
  } catch (e) {
    console.error("刪除記帳失敗：", e);
    alert("刪除失敗（多半是 rules 目前不允許 delete）");
  }
}

/* ===================== Prep checklists ===================== */
const prepInput = ref({ todo: "", luggage: "", shopping: "" });

const prep = ref({
  todo: { items: [], loading: false, error: "" },
  luggage: { items: [], loading: false, error: "" },
  shopping: { items: [], loading: false, error: "" },
});

let unsubPrepTodo = null;
let unsubPrepLuggage = null;
let unsubPrepShopping = null;

function clearPrepState() {
  prep.value.todo.items = [];
  prep.value.luggage.items = [];
  prep.value.shopping.items = [];
  prep.value.todo.loading = prep.value.luggage.loading = prep.value.shopping.loading = false;
  prep.value.todo.error = prep.value.luggage.error = prep.value.shopping.error = "";
}

function unsubscribePrepAll() {
  if (unsubPrepTodo) unsubPrepTodo();
  if (unsubPrepLuggage) unsubPrepLuggage();
  if (unsubPrepShopping) unsubPrepShopping();
  unsubPrepTodo = unsubPrepLuggage = unsubPrepShopping = null;
}

async function loadPrepAll() {
  if (!user.value || !isMember.value) return;

  unsubscribePrepAll();
  subscribePrepList("todo");
  subscribePrepList("luggage");
  subscribePrepList("shopping");
}

function prepCollectionKey(kind) {
  if (kind === "todo") return "prep_todo";
  if (kind === "luggage") return "prep_luggage";
  if (kind === "shopping") return "prep_shopping";
  return "prep_todo";
}

function subscribePrepList(kind) {
  const key = prepCollectionKey(kind);
  prep.value[kind].loading = true;
  prep.value[kind].error = "";

  const q = query(collection(db, "trips", DEFAULT_TRIP_ID, key), orderBy("createdAt", "desc"));
  const unsub = onSnapshot(
    q,
    (snap) => {
      prep.value[kind].items = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          text: data.text || "",
          done: !!data.done,
          uid: data.uid || "",
          displayName: data.displayName || "",
          createdAt: data.createdAt || null,
        };
      });
      prep.value[kind].loading = false;
    },
    (err) => {
      prep.value[kind].error = err?.message ? String(err.message) : "未知錯誤";
      prep.value[kind].loading = false;
    }
  );

  if (kind === "todo") unsubPrepTodo = unsub;
  if (kind === "luggage") unsubPrepLuggage = unsub;
  if (kind === "shopping") unsubPrepShopping = unsub;
}

async function addPrepItem(kind) {
  if (!user.value || !isMember.value) return;
  const text = String(prepInput.value[kind] || "").trim();
  if (!text) return;

  try {
    const key = prepCollectionKey(kind);
    await addDoc(collection(db, "trips", DEFAULT_TRIP_ID, key), {
      text,
      done: false,
      uid: user.value.uid,
      displayName: user.value.displayName || (user.value.isAnonymous ? "匿名使用者" : "使用者"),
      createdAt: serverTimestamp(),
    });
    prepInput.value[kind] = "";
  } catch (e) {
    console.error("新增清單失敗：", e);
    alert("新增失敗（可能是 rules 不允許 create）");
  }
}

async function togglePrepDone(kind, item) {
  if (!user.value || !isMember.value) return;
  try {
    const key = prepCollectionKey(kind);
    const refDoc = doc(db, "trips", DEFAULT_TRIP_ID, key, item.id);
    await updateDoc(refDoc, { done: !!item.done });
  } catch (e) {
    console.error("更新清單失敗：", e);
    alert("更新失敗（可能是 rules 不允許 update）");
  }
}

async function deletePrepItem(kind, item) {
  if (!user.value || !isMember.value) return;
  if (!confirm("確定要刪除？")) return;

  try {
    const key = prepCollectionKey(kind);
    const refDoc = doc(db, "trips", DEFAULT_TRIP_ID, key, item.id);
    await deleteDoc(refDoc);
  } catch (e) {
    console.error("刪除清單失敗：", e);
    alert("刪除失敗（多半是 rules 目前不允許 delete）");
  }
}

/* ===================== Receipts ===================== */
const storage = getStorage();

const receiptUpload = ref({ file: null, loading: false, error: "" });

const receipts = ref([]);
const receiptsLoading = ref(false);
const receiptsError = ref("");

function onReceiptFilePick(ev) {
  const f = ev?.target?.files?.[0] || null;
  receiptUpload.value.file = f;
  receiptUpload.value.error = "";
}

async function uploadReceipt() {
  if (!user.value || !isMember.value) return;
  const f = receiptUpload.value.file;
  if (!f) return;

  const isPdf = f.type === "application/pdf";
  const isImage = String(f.type || "").startsWith("image/");
  if (!isPdf && !isImage) return alert("只支援 PDF 或圖片檔案。");

  receiptUpload.value.loading = true;
  receiptUpload.value.error = "";

  try {
    const safeName = String(f.name || "receipt").replace(/[^\w.\-()\s]/g, "_");
    const path = `trips/${DEFAULT_TRIP_ID}/receipts/${Date.now()}_${safeName}`;

    const sRef = storageRef(storage, path);
    await uploadBytes(sRef, f);

    const url = await getDownloadURL(sRef);

    await addDoc(collection(db, "trips", DEFAULT_TRIP_ID, "receipts"), {
      name: safeName,
      type: f.type || (isPdf ? "application/pdf" : "image/*"),
      size: f.size || 0,
      url,
      storagePath: path,
      uid: user.value.uid,
      uploaderName: user.value.displayName || (user.value.isAnonymous ? "匿名使用者" : "使用者"),
      uploadedAt: serverTimestamp(),
      date: new Date().toISOString().slice(0, 10),
    });

    receiptUpload.value.file = null;
    await reloadReceipts();
    alert("上傳成功！");
  } catch (e) {
    console.error("上傳憑證失敗：", e);
    receiptUpload.value.error = e?.message ? String(e.message) : "未知錯誤";
  } finally {
    receiptUpload.value.loading = false;
  }
}

async function reloadReceipts() {
  if (!user.value || !isMember.value) return;

  receiptsLoading.value = true;
  receiptsError.value = "";

  try {
    const q = query(collection(db, "trips", DEFAULT_TRIP_ID, "receipts"), orderBy("uploadedAt", "desc"));
    const snap = await getDocs(q);

    receipts.value = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: data.name || "",
        type: data.type || "",
        size: data.size || 0,
        url: data.url || "",
        storagePath: data.storagePath || "",
        uploaderName: data.uploaderName || "",
        date: data.date || "",
        uploadedAt: data.uploadedAt || null,
      };
    });
  } catch (e) {
    receiptsError.value = e?.message ? String(e.message) : "未知錯誤";
  } finally {
    receiptsLoading.value = false;
  }
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

function formatBytes(bytes) {
  const b = Number(bytes) || 0;
  if (b < 1024) return `${b} B`;
  const kb = b / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
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
</style>
