<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="app-title"> {{ tripTitle || activeTripId }} </div><!--廷翰與燁姍的蜜月旅行❤️-->
      <div class="app-subtitle">{{ pageTitle }}</div>

      <!-- 登入列（僅 Google 登入；未登入＝只讀瀏覽模式） -->
      <div class="auth-bar">
        <div class="auth-left">
          <div class="auth-user" v-if="user">
            <div class="auth-dot"></div>

            <img
              class="auth-avatar"
              :src="userAvatar"
              :alt="userLabel"
            />


            <div class="auth-text">
              <div class="auth-name">{{ userLabel }}</div>
              <div class="auth-meta">{{ userMeta }}</div>
            </div>
          </div>

          <div class="auth-user" v-else>
            <div class="auth-dot off"></div>
            <div class="auth-text">
              <div class="auth-name">只讀瀏覽模式</div>
              <div class="auth-meta">知道連結即可查看；要編輯/記帳/勾選清單請先登入</div>
            </div>
          </div>
        </div>

        <div class="auth-right">
          <button v-if="!user" class="btn btn-secondary" @click="loginGoogle">Google 登入</button>
          <button v-if="user" class="btn btn-ghost" @click="logout">登出</button>
          <button
            v-if="user && isMember"
            class="btn btn-ghost"
            type="button"
            @click="openTripModal"
            title="切換/建立旅程"
          >
            旅程
          </button>
          <button
            class="btn btn-ghost"
            type="button"
            @click="exportItineraryJson"
          >
            匯出
          </button>
        </div>
      </div>

      <!-- 線上成員名單（只有登入才顯示） -->

    </header>




    <main class="app-main" ref="appMainEl">

      <!-- =============== 行程頁（任何人可看；登入且是成員才可改） =============== -->
      <section v-if="currentPage === 'itinerary'" class="page">



        <div class="day-tabs">
          <button
            v-for="day in plan"
            :key="day.id"
            class="day-chip"
            :class="{ active: activeDayId === day.id, today: isToday(day.date) }"
            :ref="(el) => setDayChipEl(day.id, el)"
            @click="selectDay(day.id)"

          >
            <div class="chip-top">DAY {{ day.day }}</div>
            <div class="chip-date">{{ day.shortDate || toShortDate(day.date) }}</div>
            <div class="chip-weekday">{{ day.weekday || toWeekday(day.date) }}</div>
          </button>
        </div>

        <div
          v-for="day in plan"
          :key="day.id"
          v-show="activeDayId === day.id"
          class="day-panel"
          @touchstart.passive="onDaySwipeStart($event)"
          @touchmove.passive="onDaySwipeMove($event)"
          @touchend="onDaySwipeEnd"
          @touchcancel="onDaySwipeEnd"
        >

          <!-- ✅ 倒數：獨立區域、字體放大、放在天氣下方、行程上方 -->
          <div class="countdown-card" v-if="honeymoonCountdownText">
            <div class="countdown-big">{{ honeymoonCountdownText }}</div>
          </div>
          <div class="weather-card">
            <div class="weather-left">
              <!-- ✅ 左側資訊 + 右側溫度（同一行），溫度右緣會對齊 metrics 的右緣 -->
              <div class="weather-top">
                <div class="weather-top-left">
                  <div class="weather-city">
                    <span class="pin">📍</span>
                    <span>{{ cityLabel(day.city || getDayCity(day)) }}</span>
                  </div>

                  <div class="modal-hint" style="margin-top:4px;">
                    {{ weatherCitySourceLabel(weatherState.citySource) }}（{{ cityLabel(weatherState.cityKey || (day.city || getDayCity(day))) }}）
                  </div>

                  <div class="weather-desc">
                    <span class="weather-title">{{ weatherState.statusText }}</span>
                    <span class="weather-emoji">{{ weatherState.statusEmoji }}</span>
                  </div>
                </div>

                <div class="weather-temp">
                  <div class="temp-now">{{ weatherState.tNow }}°</div>
                  <div class="temp-range">{{ weatherState.tMin }}° / {{ weatherState.tMax }}°</div>
                </div>
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

              <div class="row-right" style="margin-top:10px;">
                <button class="btn btn-secondary btn-mini" @click="manualRefreshWeatherAndFx">
                  手動更新天氣/匯率
                </button>
              </div>

              <div v-if="weatherState.loading" class="weather-loading">天氣讀取中...</div>
              <div v-if="weatherState.error" class="weather-error">天氣讀取失敗：{{ weatherState.error }}</div>
            </div>
          </div>





          <div class="day-head">
            <h2 class="day-title">🗓️ 第 {{ day.day }} 天（{{ day.date }}）</h2>

            <div class="day-head-actions" v-if="canWrite">
              <button class="btn btn-primary btn-mini" @click="openEventEditor(day.id, null)">新增</button>


            </div>

            


            <div class="day-head-actions" v-else>
              <div class="readonly-hint">
                只讀模式：要新增/編輯行程與筆記，請先以 Google 登入且被加入 members。
              </div>
            </div>
          </div>

          <div v-for="(event, idx) in day.events" :key="idx" class="event-item">
            <!-- ✅ 時間：移到卡片上方（不再有時間軸線條） -->
            <div class="event-time-top">{{ event.time }}</div>

            <!-- ✅ 卡片 + 筆記（同寬、滿版） -->
            <div class="event-stack">
              <div
                class="event-card"
                :draggable="canWrite && eventDrag.armed && eventDrag.dayId === day.id && eventDrag.fromIdx === idx"
                :class="{ dragging: eventDrag.dragging && eventDrag.dayId === day.id && eventDrag.draggingIdx === idx }"
                @dragstart="onEventDragStart(day.id, idx, $event)"
                @dragover="onEventDragOver(day.id, idx, $event)"
                @drop="onEventDrop(day.id, idx, $event)"
                @dragend="onEventDragEnd"
                @click="onEventCardClick(day.id, idx, $event)"
              >
                <div class="event-row">
                  <div class="event-body">
                    <div class="event-loc">{{ event.loc }}</div>
                    <div class="event-stay">⏱️ 停留 {{ event.stay }}</div>
                  </div>

                  <div class="event-actions">
                    <button
                      class="btn btn-secondary btn-mini"
                      type="button"
                      @pointerup.stop
                      @touchend.stop
                      @click.stop="openNavigation(event.loc)"
                      title="導航"
                    >
                      📍
                    </button>

                    <!-- ✅ 有照片才顯示：開啟照片 -->
                    <button
                      v-if="event.photoUrl"
                      class="btn btn-secondary btn-mini"
                      type="button"
                      @pointerup.stop
                      @touchend.stop
                      @click.stop="openEventPhoto(event.photoUrl)"
                      title="開啟照片"
                      aria-label="開啟照片"
                    >
                      🖼️
                    </button>

                    <button
                      class="btn btn-secondary btn-mini"
                      type="button"
                      @pointerup.stop
                      @touchend.stop
                      @click.stop="toggleNote(day.id, idx)"
                      title="筆記"
                    >
                      📝
                    </button>
                  </div>
                </div>

                <!-- ✅ 收合筆記：放在 event-row 後面 => 寬度會吃到整張卡片（包含按鈕下方） -->
                <div v-if="noteExists(event) && !event.showNote" class="note-between">
                  <div class="note-between-body">{{ event.note }}</div>
                </div>

                <div v-if="event.showNote" class="note-panel">
                  <textarea
                    v-model="event.note"
                    class="note-textarea"
                    placeholder="輸入筆記."
                    :disabled="!canWrite"
                  ></textarea>

                  <div class="note-actions">
                    <button
                      v-if="canWrite"
                      class="icon-btn icon-danger"
                      type="button"
                      title="清除本行程筆記"
                      aria-label="清除本行程筆記"
                      @click.stop="clearEventNote(day.id, idx)"
                    >
                      <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          fill="currentColor"
                          d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 7h2v9h-2v-9zm4 0h2v9h-2v-9zM7 10h2v9H7v-9zm1-1h10l-1 13H9L8 9z"
                        />
                      </svg>
                    </button>

                    <button class="btn btn-secondary" @click.stop="collapseAndSaveNote(day.id, idx)">
                      收合
                    </button>
                  </div>

                  <div v-if="!canWrite" class="readonly-hint" style="margin-top:8px;">
                    只讀模式：筆記可看但不可改。
                  </div>
                </div>

              </div>


            </div>
          </div>



          <div v-if="!day.events || day.events.length === 0" class="empty-state">
            這一天還沒有行程內容～先去吃個布丁再回來加🍮
          </div>
        </div>

        <div v-if="!planLoading && plan.length === 0" class="empty-state">
          <div>目前 plan 是空的：trips/{{ activeTripId }}/plan</div>

          <div v-if="canWrite" style="margin-top:10px; display:flex; gap:10px; justify-content:flex-end;">
            <button class="btn btn-primary btn-mini" @click="initPlanDays()">
              初始化行程（建立 DAY1~DAY7）
            </button>
          </div>

          <div v-else style="margin-top:10px; opacity:.75;">
            你已登入但若仍看不到，請確認你在 members 內，且 rules 允許讀取 plan。
          </div>
        </div>


        <!-- 行程編輯 Modal（長按行程跳出） -->
        <div v-if="eventEditor.open" class="modal-overlay" @click.self="closeEventEditor">
          <div class="modal">
            <div class="modal-title">🗓️ 編輯行程</div>
            <div class="modal-subtitle">
              你可以修改地點、停留時間（以及時間）。新增/刪除也在這裡完成。
              <span v-if="!canWrite" style="opacity:.75;">（目前是只讀模式）</span>
            </div>

            <div class="form-grid" style="margin-top:10px;">
              <label class="field">
                <div class="field-label">時間</div>
                <input
                  class="field-input"
                  type="time"
                  v-model="eventEditor.form.time"
                  :disabled="!canWrite"
                />
              </label>

              <label class="field">
                <div class="field-label">停留</div>

                <div class="stay-grid">
                  <select class="field-input" v-model.number="eventEditor.form.stayH" :disabled="!canWrite">
                    <option v-for="h in 24" :key="h-1" :value="h-1">{{ String(h-1).padStart(2,'0') }} 時</option>
                  </select>

                  <select class="field-input" v-model.number="eventEditor.form.stayM" :disabled="!canWrite">
                    <option v-for="m in [0,10,20,30,40,50]" :key="m" :value="m">{{ String(m).padStart(2,'0') }} 分</option>
                  </select>
                </div>
              </label>


              <label class="field field-span">
                <div class="field-label">地點</div>
                <input class="field-input" v-model="eventEditor.form.loc" :disabled="!canWrite" placeholder="例如：大阪城天守閣" />
              </label>
            </div>



            <!-- ✅ 行程照片上傳 -->
            <div style="margin-top:12px;">
              <div style="font-weight:700; margin-bottom:6px;">照片</div>

              <!-- ✅ 原生 input 隱藏：避免顯示「未選擇任何檔案」 -->
              <div class="voucher-row">
                <input
                  id="eventPhotoFileInput"
                  class="voucher-file-hidden"
                  type="file"
                  accept="image/*"
                  @change="onEventPhotoFileChange"
                  :disabled="!canWrite || eventPhotoUploading"
                />

                <!-- ✅ 自訂選檔按鈕（參考預定頁） -->
                <label
                  class="btn btn-secondary btn-mini"
                  :class="{ 'is-disabled': (!canWrite || eventPhotoUploading) }"
                  :for="(!canWrite || eventPhotoUploading) ? null : 'eventPhotoFileInput'"
                >
                  選擇檔案
                </label>

                <!-- ✅ 顯示已選檔名 -->
                <div class="voucher-file-pill">
                  {{ eventPhotoFileName ? ('已選擇：' + eventPhotoFileName) : '' }}
                </div>


                <button
                  class="btn btn-secondary btn-mini"
                  type="button"
                  :disabled="!canWrite || eventPhotoUploading || !eventPhotoFile || !eventEditor.isEdit"
                  @click="uploadEventPhoto"
                >
                  {{ eventPhotoUploading ? `上傳中 ${eventPhotoProgress}%` : (eventEditor.isEdit ? "上傳照片" : "請先儲存後再上傳") }}
                </button>

                <button
                  v-if="eventPhotoUploading"
                  class="btn btn-ghost btn-mini"
                  type="button"
                  @click.stop.prevent="cancelEventPhotoUpload"
                >
                  取消
                </button>

                <button
                  v-if="currentEventPhotoUrl"
                  class="btn btn-ghost btn-mini"
                  type="button"
                  @click="openEventPhoto(currentEventPhotoUrl)"
                >
                  預覽
                </button>

                <!-- ✅ 新增：刪除照片（在預覽右邊） -->
                <button
                  v-if="currentEventPhotoUrl"
                  class="btn btn-danger btn-mini"
                  type="button"
                  @click.stop.prevent="deleteEventPhoto()"
                >
                  刪除
                </button>
              </div>

              <div style="font-size:12px; opacity:.7; margin-top:6px;">
                提醒：行程照片會綁定在該行程（需先按「儲存」建立行程後才能上傳）。
              </div>
            </div>



            <div class="row-right">
              <button class="btn btn-secondary" @click="closeEventEditor">關閉</button>

              <button class="btn btn-primary" @click="saveEventEdit" :disabled="!canWrite">
                儲存
              </button>

              <button
                class="btn btn-danger"
                v-if="eventEditor.isEdit"
                @click="deleteEvent"
                :disabled="!canWrite"
              >
                刪除
              </button>
            </div>


            <div class="modal-hint">
              提醒：只有「登入且在 members」的成員可以儲存。
            </div>
          </div>
        </div>
      </section>

      <!-- =============== 預定頁（任何人可看；登入且成員才可新增/編輯/刪除） =============== -->
      <section
        v-else-if="currentPage === 'booking'"
        class="page"
        @touchstart="onSubSwipeStart($event)"
        @touchend="onBookingSwipeEnd($event)"
      >



        <!-- 上方分類：機票 / 住宿 / 租車 / 憑證（手機下滑置頂） -->
        <div class="booking-sticky">
          <div class="segmented segmented-4">
            <button class="seg-btn" :class="{ active: bookingTab === 'flight' }" @click="bookingTab='flight'" type="button">✈️ 機票</button>
            <button class="seg-btn" :class="{ active: bookingTab === 'hotel' }"  @click="bookingTab='hotel'"  type="button">🏨 住宿</button>
            <button class="seg-btn" :class="{ active: bookingTab === 'car' }"    @click="bookingTab='car'"    type="button">🚗 租車</button>
            <button class="seg-btn" :class="{ active: bookingTab === 'voucher' }"@click="bookingTab='voucher'"type="button">🎫 憑證</button>
          </div>
        </div>


        <div class="card">
          <div class="card-header-row">
            <div class="card-title">📌 預定資訊</div>

            <button class="btn btn-primary btn-mini" v-if="canWrite" @click="openBookingEditor(null)">
              新增
            </button>
          </div>

          <div v-if="!canWrite" class="readonly-hint" style="margin-top:8px;">
            只讀模式：你可以查看預定資料；要新增/編輯/刪除請先 Google 登入且被加入 members。
          </div>

          <div v-if="bookingLoading" class="loading">讀取預定中...</div>
          <div v-else-if="filteredBookings.length === 0" class="empty-state">尚無資料</div>

          <div
            v-for="b in filteredBookings"
            :key="b.id"
          >
            <!-- 🏨 住宿：改成你提供的住宿卡片樣式 -->
            <div v-if="b.type === 'hotel'" class="booking-card booking-stay-card">
              <div class="stay-hero">
                <img
                  v-if="bookingStayCoverUrl(b)"
                  class="stay-hero-img"
                  :src="bookingStayCoverUrl(b)"
                  :alt="b.title || 'stay'"
                  loading="lazy"
                  referrerpolicy="no-referrer"
                />
                <div v-else class="stay-hero-placeholder"></div>

                <button
                  v-if="b.voucherUrl"
                  class="stay-hero-btn"
                  type="button"
                  @click.stop="openBookingVoucher(b)"
                  title="開啟憑證（PDF/照片）"
                >
                  憑證
                </button>

                <div class="stay-hero-overlay">
                  <div class="stay-chip">{{ b.vendor || '住宿' }}</div>
                  <div class="stay-title">{{ b.title || '（未命名）' }}</div>
                </div>
              </div>

              <div class="stay-body">
                <div class="stay-dates">
                  <div class="stay-datebox">
                    <div class="stay-date-label">CHECK-IN</div>
                    <div class="stay-date">{{ b.date || '—' }}</div>
                    <div class="stay-time">{{ bookingStayCheckInTime(b) }}</div>
                  </div>

                  <!-- ✅ 新增：顯示住幾晚（自動計算） -->
                  <div class="stay-nights" v-if="bookingStayNights(b)">
                    {{ bookingStayNights(b) }} 晚
                  </div>

                  <div class="stay-datebox">
                    <div class="stay-date-label">CHECK-OUT</div>
                    <div class="stay-date">{{ bookingStayCheckOutDate(b) || '—' }}</div>
                    <div class="stay-time">{{ bookingStayCheckOutTime(b) }}</div>
                  </div>
                </div>


                <div class="stay-section-head">
                  <div class="stay-section-icon">🗺️</div>
                  <div class="stay-section-title">地點資訊</div>
                </div>

                <!-- ✅ 地點文字 + 導航按鈕：同一列 -->
                <div class="stay-address-row">
                  <div class="stay-address">
                    {{ bookingStayAddress(b) || '—' }}
                  </div>

                  <button
                    class="btn btn-secondary btn-mini stay-nav-btn"
                    type="button"
                    @click.stop="openNavigation(bookingStayAddress(b))"
                    :disabled="!bookingStayAddress(b)"
                    title="用 Google 地圖導航"
                  >
                    📍 導航
                  </button>
                </div>





                <div class="stay-section">
                  <div class="stay-section-head">
                    <div class="stay-section-icon">🧾</div>
                    <div class="stay-section-title">費用明細</div>
                  </div>

                  <div class="stay-cost">
                    <div class="stay-cost-top">
                      <div class="stay-cost-label">
                        總金額<span v-if="bookingStayNights(b)">（{{ bookingStayNights(b) }}晚）</span>
                      </div>
                      <div class="stay-cost-total">
                        {{ b.priceTwd ? `NT$ ${formatNumber(b.priceTwd)}` : '—' }}
                      </div>
                    </div>

                    <div class="stay-cost-rows" v-if="bookingStaySplitCount()">
                      <div class="stay-cost-row">
                        <div class="stay-cost-k">每人分攤（{{ bookingStaySplitCount() }}人）</div>
                        <div class="stay-cost-v">
                          {{ bookingStayPerPerson(b) ? `NT$ ${formatNumber(bookingStayPerPerson(b))}` : '—' }}
                        </div>
                      </div>

                      <div class="stay-cost-row stay-cost-row-green" v-if="bookingStayPerPersonPerNight(b)">
                        <div class="stay-cost-k">每人每晚</div>
                        <div class="stay-cost-v">NT$ {{ formatNumber(bookingStayPerPersonPerNight(b)) }}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 保留原功能：編輯 -->
                <button
                  v-if="canWrite"
                  class="bk2-edit-btn"
                  type="button"
                  @click.stop="openBookingEditor(b)"
                >
                  ✏️編輯
                </button>
              </div>
            </div>

            <!-- 其他類型：維持原本 booking-card2（原封不動搬進來） -->
            <div v-else class="booking-card booking-card2">
              <!-- 上方淡藍區塊（像圖2） -->
              <div class="bk2-topbar">
                <div class="bk2-airline">{{ b.vendor || bookingTypeLabel(b.type) }}</div>

                <div class="bk2-top-actions">
                  <button
                    v-if="b.voucherUrl"
                    class="bk2-mini-btn"
                    type="button"
                    @click.stop="openBookingVoucher(b)"
                    title="開啟憑證（PDF/照片）"
                  >
                    憑證
                  </button>
                </div>
              </div>

              <div class="bk2-code">
                <div class="bk2-code-text">{{ b.code || "—" }}</div>
              </div>

              <div v-if="b.type === 'flight'" class="bk2-route">
                <div class="bk2-col">
                  <div class="bk2-iata">{{ b.from || "—" }}</div>
                  <div class="bk2-time">{{ b.departTime || "—" }}</div>
                  <div class="bk2-chip bk2-chip-green">出發</div>
                </div>

                <div class="bk2-mid">
                  <div class="bk2-duration">{{ b.duration || "—" }}</div>
                  <div class="bk2-plane">✈️</div>
                  <div class="bk2-date">{{ b.date || "—" }}</div>
                </div>

                <div class="bk2-col">
                  <div class="bk2-iata">{{ b.to || "—" }}</div>
                  <div class="bk2-time">{{ b.arriveTime || "—" }}</div>
                  <div class="bk2-chip bk2-chip-orange">抵達</div>
                </div>
              </div>

              <div v-else class="bk2-route bk2-route-simple">
                <div class="bk2-simple-title">{{ b.title || "（未命名）" }}</div>

                <div class="bk2-simple-sub">
                  <span class="bk2-simple-sub-label">{{ b.type === "voucher" ? "使用日期" : "日期" }}</span>
                  <span class="bk2-simple-sub-date">
                    {{
                      (b.type === "voucher" ? (b.usageDate || b.date) : b.date) || "—"
                    }}
                  </span>
                </div>
              </div>

              <!-- ✅ baggage / aircraft：只有機票顯示 -->
              <div class="bk2-meta" v-if="b.type === 'flight'">
                <div class="bk2-meta-item">
                  <div class="bk2-meta-label">行李</div>
                  <div class="bk2-meta-value">{{ b.baggage || "—" }}</div>
                </div>
                <div class="bk2-meta-divider"></div>
                <div class="bk2-meta-item">
                  <div class="bk2-meta-label">航班號碼</div>
                  <div class="bk2-meta-value">{{ b.aircraft || "—" }}</div>
                </div>
              </div>


              <div class="bk2-bottom">
                <div class="bk2-box">
                  <div class="bk2-box-label">價格</div>
                  <div class="bk2-box-value">
                    {{ b.priceTwd ? `NT$${formatNumber(b.priceTwd)}` : "—" }}
                  </div>
                </div>


              </div>

              <button
                v-if="canWrite"
                class="bk2-edit-btn"
                type="button"
                @click.stop="openBookingEditor(b)"
              >
                ✏️編輯
              </button>
            </div>
          </div>

          


        </div>

        <!-- 編輯 Modal -->
        <div v-if="bookingEditor.open" class="modal-overlay" @click.self="closeBookingEditor">
          <div class="modal">
            <div class="modal-title">🧾 編輯預定</div>
            <div class="modal-subtitle">
              類型/代碼/日期/價格等都在這裡維護。
              <span v-if="!canWrite" style="opacity:.75;">（目前只讀）</span>
            </div>

            <div class="form-grid" style="margin-top:10px;">
              <label class="field">
                <div class="field-label">類型</div>
                <select class="field-input" v-model="bookingEditor.form.type" :disabled="!canWrite">
                  <option value="flight">機票</option>
                  <option value="hotel">住宿</option>
                  <option value="car">租車</option>
                  <option value="voucher">憑證</option>
                </select>
              </label>

              <label class="field">
                <div class="field-label">訂位代碼</div>
                <input class="field-input" v-model="bookingEditor.form.code" :disabled="!canWrite" placeholder="例如：BX796" />
              </label>

              <!-- ✅ vendor：住宿不顯示 -->
              <label class="field field-span" v-if="bookingEditor.form.type !== 'hotel'">
                <div class="field-label">航空/商家（vendor）</div>
                <input class="field-input" v-model="bookingEditor.form.vendor" :disabled="!canWrite" placeholder="例如：釜山航空" />
              </label>

              <label class="field field-span" v-if="bookingEditor.form.type !== 'flight'">
                <div class="field-label">標題（住宿/租車/憑證用）</div>
                <input class="field-input" v-model="bookingEditor.form.title" :disabled="!canWrite" placeholder="例如：APA Hotel 難波站" />
              </label>

              <!-- ✅ 住宿：地點（卡片會顯示 + 可用來導航） -->
              <label class="field field-span" v-if="bookingEditor.form.type === 'hotel'">
                <div class="field-label">住宿地點（地址/飯店名）</div>
                <input
                  class="field-input"
                  v-model="bookingEditor.form.address"
                  :disabled="!canWrite"
                  placeholder="例如：APA Hotel Namba / 大阪市中央區..."
                />
              </label>

              <!-- ✅ 日期欄位：依類型顯示
                  - 憑證：使用日期
                  - 住宿：Check-in 日期+時間、Check-out 日期+時間
                  - 其他：日期
              -->
              <template v-if="bookingEditor.form.type === 'voucher'">
                <label class="field">
                  <div class="field-label">使用日期</div>
                  <input class="field-input" type="date" v-model="bookingEditor.form.usageDate" :disabled="!canWrite" />
                </label>
              </template>

              <template v-else-if="bookingEditor.form.type === 'hotel'">
                <label class="field">
                  <div class="field-label">Check-in 日期</div>
                  <input class="field-input" type="date" v-model="bookingEditor.form.date" :disabled="!canWrite" />
                </label>

                <label class="field">
                  <div class="field-label">Check-in 時間</div>
                  <input class="field-input" type="time" v-model="bookingEditor.form.checkInTime" :disabled="!canWrite" />
                </label>

                <label class="field">
                  <div class="field-label">Check-out 日期</div>
                  <input class="field-input" type="date" v-model="bookingEditor.form.checkOutDate" :disabled="!canWrite" />
                </label>

                <label class="field">
                  <div class="field-label">Check-out 時間</div>
                  <input class="field-input" type="time" v-model="bookingEditor.form.checkOutTime" :disabled="!canWrite" />
                </label>
              </template>

              <template v-else>
                <label class="field">
                  <div class="field-label">日期</div>
                  <input class="field-input" type="date" v-model="bookingEditor.form.date" :disabled="!canWrite" />
                </label>
              </template>

              <label class="field">
                <div class="field-label">總價（TWD）</div>
                <input class="field-input" type="number" v-model.number="bookingEditor.form.priceTwd" :disabled="!canWrite" />
              </label>

              <!-- Flight 欄位 -->
              <template v-if="bookingEditor.form.type === 'flight'">
                <label class="field">
                  <div class="field-label">出發地</div>
                  <input class="field-input" v-model="bookingEditor.form.from" :disabled="!canWrite" />
                </label>

                <label class="field">
                  <div class="field-label">抵達地</div>
                  <input class="field-input" v-model="bookingEditor.form.to" :disabled="!canWrite" />
                </label>

                <label class="field">
                  <div class="field-label">出發時間</div>
                  <input class="field-input" type="time" v-model="bookingEditor.form.departTime" :disabled="!canWrite" />
                </label>

                <label class="field">
                  <div class="field-label">抵達時間</div>
                  <input class="field-input" type="time" v-model="bookingEditor.form.arriveTime" :disabled="!canWrite" />
                </label>

                <label class="field">
                  <div class="field-label">飛行時間（例如 02h25m）</div>
                  <input class="field-input" v-model="bookingEditor.form.duration" :disabled="!canWrite" />
                </label>

                <label class="field">
                  <div class="field-label">機型（例如 A321）</div>
                  <input class="field-input" v-model="bookingEditor.form.aircraft" :disabled="!canWrite" />
                </label>
              </template>

              <!-- ✅ 行李欄位：整個移除（住宿編輯介面不再出現） -->


              <label class="field" v-if="bookingEditor.form.type === 'flight'">
                <div class="field-label">行李（例如 15kg）</div>
                <input class="field-input" v-model="bookingEditor.form.baggage" :disabled="!canWrite" />
              </label>


              <label class="field">
                <div class="field-label">購買日（YYYY/MM/DD）</div>
                <input class="field-input" v-model="bookingEditor.form.purchasedAt" :disabled="!canWrite" placeholder="例如：2025/11/14" />
              </label>
            </div>


            <!-- ✅ 住宿封面上傳（只在住宿類型顯示） -->
            <div v-if="bookingEditor.form.type === 'hotel'" class="voucher-uploader" style="margin-top:12px;">
              <div class="field-label" style="font-weight:900;">住宿封面照片</div>

              <div class="voucher-row">
                <!-- 原生 input 隱藏，避免「未選擇任何檔案」 -->
                <input
                  id="bookingCoverFileInput"
                  class="voucher-file-hidden"
                  type="file"
                  accept="image/*"
                  @change="onBookingCoverFileChange"
                  :disabled="!canWrite || bookingCoverUploading"
                />

                <label
                  class="btn btn-secondary btn-mini"
                  :class="{ 'is-disabled': (!canWrite || bookingCoverUploading) }"
                  :for="(!canWrite || bookingCoverUploading) ? null : 'bookingCoverFileInput'"
                >
                  選擇照片
                </label>

                <div class="voucher-file-pill">
                  {{ bookingCoverFileName ? ('已選擇：' + bookingCoverFileName) : '' }}
                </div>

                <button
                  class="btn btn-secondary btn-mini"
                  type="button"
                  @click.stop.prevent="uploadBookingCover"
                  :disabled="!canWrite || bookingCoverUploading || !bookingCoverFile"
                >
                  {{ bookingCoverUploading ? `上傳中... ${bookingCoverProgress}%` : "上傳" }}
                </button>

                <button
                  v-if="bookingCoverUploading"
                  class="btn btn-ghost btn-mini"
                  type="button"
                  @click.stop.prevent="cancelBookingCoverUpload"
                >
                  取消
                </button>

                <button
                  v-if="bookingEditor.form.coverUrl"
                  class="btn btn-ghost btn-mini"
                  type="button"
                  @click.stop="window.open(bookingEditor.form.coverUrl, '_blank')"
                >
                  開啟
                </button>
              </div>

              <div v-if="bookingEditor.form.coverName" class="readonly-hint" style="margin-top:6px;">
                目前封面：{{ bookingEditor.form.coverName }}
              </div>
            </div>


            <!-- ✅ 憑證上傳（PDF/照片；照片自動壓縮） -->
            <div class="voucher-uploader" style="margin-top:12px;">
              <div class="field-label" style="font-weight:900;">憑證（PDF/照片）</div>

              <div class="voucher-row">



                <!-- ✅ 原生 input 隱藏：移除「未選擇任何檔案」 -->
                <input
                  id="bookingVoucherFileInput"
                  class="voucher-file-hidden"
                  type="file"
                  accept="application/pdf,image/*"
                  @change="onBookingVoucherFileChange"
                  :disabled="!canWrite || bookingVoucherUploading"
                />

                <!-- ✅ 自訂選檔按鈕 -->
                
                <label
                  class="btn btn-secondary btn-mini"
                  :class="{ 'is-disabled': (!canWrite || bookingVoucherUploading) }"
                  :for="(!canWrite || bookingVoucherUploading) ? null : 'bookingVoucherFileInput'"
                >
                  選擇檔案
                </label>

                <div class="voucher-file-pill">
                  {{ bookingVoucherFileName ? ('已選擇：' + bookingVoucherFileName) : '' }}
                </div>



                <button
                  class="btn btn-secondary btn-mini"
                  type="button"
                  @click.stop.prevent="uploadBookingVoucher"
                  :disabled="!canWrite || bookingVoucherUploading || !bookingVoucherFile"
                >
                  {{ bookingVoucherUploading ? `上傳中... ${bookingVoucherProgress}%` : "上傳" }}

                </button>
                
                <button
                  v-if="bookingVoucherUploading"
                  class="btn btn-ghost btn-mini"
                  type="button"
                  @click.stop.prevent="cancelBookingVoucherUpload"
                >
                  取消
                </button>

                <button
                  v-if="bookingEditor.form.voucherUrl"
                  class="btn btn-ghost btn-mini"
                  type="button"
                  @click.stop="openBookingVoucher({ voucherUrl: bookingEditor.form.voucherUrl })"
                >
                  開啟
                </button>
              </div>

              <div v-if="!bookingEditor.originId" class="readonly-hint" style="margin-top:8px;">
                尚未建立此筆預定：可直接選檔並按「上傳」，系統會先自動儲存再上傳憑證。
              </div>

              <div v-if="bookingEditor.form.voucherName" class="readonly-hint" style="margin-top:6px;">
                目前憑證：{{ bookingEditor.form.voucherName }}
              </div>
            </div>



            <div class="row-right">
              <button class="btn btn-secondary" @click="closeBookingEditor">關閉</button>

              <button class="btn btn-primary" @click="saveBookingEdit" :disabled="!canWrite || isAnyUploading">
                儲存
              </button>



              <button class="btn btn-danger" v-if="bookingEditor.isEdit" @click="deleteBooking" :disabled="!canWrite">
                刪除
              </button>
            </div>

            <div class="modal-hint">
              提醒：只有「登入且在 members」的成員可以儲存。
            </div>
          </div>
        </div>

      </section>



      <!-- =============== 記帳頁（未登入＝只看明細；登入且成員＝可記帳/編輯） =============== -->
      <section
        v-else-if="currentPage === 'accounting'"
        class="page"
        @touchstart="onSubSwipeStart($event)"
        @touchend="onAccountingSwipeEnd($event)"
      >

        <!-- 分段切換：記帳 / 明細 -->
        <div class="segmented">
          <button
            class="seg-btn"
            :class="{ active: accountingTab === 'entry' }"
            @click="goAccountingEntry"
            type="button"
            :title="!canWrite ? '只讀模式無法記帳，請先登入並加入 members' : ''"
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

        <!-- ===== 記帳輸入（僅成員可用） ===== -->
        <div v-if="accountingTab === 'entry'" class="acc-entry">
          <div class="acc-card">
            <div class="acc-card-title">💰 記帳輸入</div>

            <div v-if="!canWrite" class="empty-state" style="margin:0 0 10px 0;">
              只讀模式：你可以看「明細」，但不能新增/修改記帳。要記帳請先 Google 登入並被加入 members。
            </div>

            <!-- 日期 -->
            <div class="acc-field">
              <div class="acc-label">日期</div>
              <div class="acc-date">
                <input class="acc-input" type="date" v-model="expenseForm.date" :disabled="!canWrite" />
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
                  :disabled="!canWrite"
                >
                  JPY
                </button>
                <button
                  class="acc-pill"
                  :class="{ active: expenseForm.currency === 'TWD' }"
                  @click="expenseForm.currency = 'TWD'"
                  type="button"
                  :disabled="!canWrite"
                >
                  TWD
                </button>
              </div>
            </div>

            <!-- 金額 & 約台幣 -->
            <div class="acc-grid-2">
              <div class="acc-field">
                <div class="acc-label">＊金額</div>
                <input class="acc-input" type="number" v-model="expenseForm.amount" placeholder="" :disabled="!canWrite" />
              </div>

              <div class="acc-field">
                <div class="acc-label">約合台幣</div>
                <input class="acc-input" type="number" :value="approxTwd" disabled />
              </div>
            </div>

            <!-- 支付方式（大阪周遊券 -> 優惠券） -->
            <div class="acc-field">
              <div class="acc-label">支付方式</div>
              <div class="acc-pills">
                <button class="acc-pill small" :class="{ active: uiPayMethod === '現金' }" @click="uiPayMethod='現金'" type="button" :disabled="!canWrite">現金</button>
                <button class="acc-pill small" :class="{ active: uiPayMethod === '信用卡' }" @click="uiPayMethod='信用卡'" type="button" :disabled="!canWrite">信用卡</button>
                <button class="acc-pill small" :class="{ active: uiPayMethod === '優惠券' }" @click="uiPayMethod='優惠券'" type="button" :disabled="!canWrite">優惠券</button>
                <button class="acc-pill small" :class="{ active: uiPayMethod === '行動支付' }" @click="uiPayMethod='行動支付'" type="button" :disabled="!canWrite">行動支付</button>
              </div>
            </div>

            <!-- 地點 -->
            <div class="acc-field">
              <div class="acc-label">地點（選填）</div>
              <input class="acc-input" v-model="uiPlace" placeholder="例如：便利商店" :disabled="!canWrite" />
            </div>


            <!-- 消費項目（移除拍照按鈕） -->
            <div class="acc-field">
              <div class="acc-label">＊消費項目</div>
              <input class="acc-input" v-model="uiItem" placeholder="例如：午餐" :disabled="!canWrite" />
            </div>

            <!-- 成員 -->
            <div class="acc-field">
              <div class="acc-label">成員</div>

              <div v-if="memberChips.length === 0" class="empty-state" style="margin:8px 0 0 0;">
                尚未取得成員名單（請確認你已在 trips/{{ activeTripId }}/members 內）。
              </div>

              <div v-else class="acc-members">
                <button
                  v-for="m in memberChips"
                  :key="m"
                  class="member-pill"
                  :class="{ active: uiMember === m }"
                  @click="uiMember = m"
                  type="button"
                  :disabled="!canWrite"
                >
                  {{ m }}
                </button>
              </div>
            </div>

            <!-- 分類 -->
            <div class="acc-field">
              <div class="acc-label">分類</div>
              <div class="acc-pills">
                <button class="acc-pill small" :class="{ active: expenseForm.category === 'food' }" @click="expenseForm.category='food'" type="button" :disabled="!canWrite">餐飲</button>
                <button class="acc-pill small" :class="{ active: expenseForm.category === 'traffic' }" @click="expenseForm.category='traffic'" type="button" :disabled="!canWrite">交通</button>
                <button class="acc-pill small" :class="{ active: expenseForm.category === 'shopping' }" @click="expenseForm.category='shopping'" type="button" :disabled="!canWrite">購物</button>
                <button class="acc-pill small" :class="{ active: expenseForm.category === 'ticket' }" @click="expenseForm.category='ticket'" type="button" :disabled="!canWrite">門票</button>
                <button class="acc-pill small" :class="{ active: expenseForm.category === 'hotel' }" @click="expenseForm.category='hotel'" type="button" :disabled="!canWrite">住宿</button>
                <button class="acc-pill small" :class="{ active: expenseForm.category === 'other' }" @click="expenseForm.category='other'" type="button" :disabled="!canWrite">其他</button>
              </div>
            </div>

            <!-- 儲存 -->
            <div class="acc-actions">
              <button class="btn btn-primary" @click="addExpenseFromFancy" :disabled="!canWrite || expensesLoading">
                儲存
              </button>

            </div>

            <div class="acc-hint">
              <div v-if="expensesError">同步錯誤：{{ expensesError }}</div>
              <div v-else-if="expensesLoading">同步中…</div>
              <div v-else>點「明細」可以看到列表與總支出。</div>
            </div>
          </div>
        </div>

        <!-- ===== 明細列表（任何人可看） ===== -->
        <div v-else class="acc-detail">
          <div class="sum-card">
            <div class="sum-title">總支出（TWD）</div>
            <div class="sum-amt">NT$ {{ totalTwdFiltered }}</div>

            <div class="sum-sub">
              <div class="sum-sub-left">
                <div class="sum-sub-label">日圓支出</div>
                <div class="sum-sub-value">¥ {{ totalJpyFiltered }}</div>
              </div>
              <div class="sum-sub-right">
              <div class="sum-sub-label">匯率（JPY→TWD｜{{ fxDateLabel }}）</div>
              <div class="sum-sub-value">1：{{ fxJpyToTwdValue.toFixed(4) }}</div>

              </div>
            </div>
          </div>

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

        <div v-if="expenseEditor.open" class="modal-overlay" @click.self="closeExpenseEditor">
          <div class="modal">
            <div class="modal-title">🧾 修改記帳</div>
            <div class="modal-subtitle" v-if="expenseEditor.origin">
              建立者：{{ expenseEditor.origin.displayName || "使用者" }}
              <span v-if="!canEditExpense(expenseEditor.origin)" style="opacity:.75;">（你只能修改自己的）</span>
            </div>

            <div class="form-grid" style="margin-top:10px;">



              <!-- ✅ 日期（依類型顯示）：憑證＝使用日期；住宿＝Check-in + Check-out；其他＝日期 -->
              <label class="field" v-if="bookingEditor.form.type === 'voucher'">
                <div class="field-label">使用日期</div>
                <input
                  class="field-input"
                  type="date"
                  v-model="bookingEditor.form.usageDate"
                  :disabled="!canWrite"
                />
              </label>

              <label class="field" v-else>
                <div class="field-label">
                  {{ bookingEditor.form.type === 'hotel' ? 'Check-in 日期' : '日期' }}
                </div>
                <input
                  class="field-input"
                  type="date"
                  v-model="bookingEditor.form.date"
                  :disabled="!canWrite"
                />
              </label>

              <label class="field" v-if="bookingEditor.form.type === 'hotel'">
                <div class="field-label">Check-out 日期</div>
                <input
                  class="field-input"
                  type="date"
                  v-model="bookingEditor.form.checkOutDate"
                  :disabled="!canWrite"
                />
              </label>

              

              <label class="field">
                <div class="field-label">金額</div>
                <input class="field-input" type="number" v-model.number="expenseEditor.form.amount" :disabled="!canEditExpense(expenseEditor.origin)" />
              </label>

              <!-- ✅ 幣別分格：改成與記帳頁一致 -->
              <div class="field">
                <div class="field-label">幣別</div>
                <div class="acc-pills">
                  <button
                    class="acc-pill"
                    :class="{ active: expenseEditor.form.currency === 'JPY' }"
                    @click="expenseEditor.form.currency = 'JPY'"
                    type="button"
                    :disabled="!canEditExpense(expenseEditor.origin)"
                  >
                    JPY
                  </button>
                  <button
                    class="acc-pill"
                    :class="{ active: expenseEditor.form.currency === 'TWD' }"
                    @click="expenseEditor.form.currency = 'TWD'"
                    type="button"
                    :disabled="!canEditExpense(expenseEditor.origin)"
                  >
                    TWD
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

              <button
                class="btn btn-primary"
                @click="saveExpenseEdit"
                :disabled="!canEditExpense(expenseEditor.origin)"
              >
                儲存
              </button>

              <button
                class="btn btn-danger"
                @click="deleteExpense"
                :disabled="!canEditExpense(expenseEditor.origin)"
              >
                刪除
              </button>
            </div>


            <div class="modal-hint">
              如果你「按儲存/刪除失敗」，通常是：未登入、不是本人、或 rules 不允許。
            </div>
          </div>
        </div>
      </section>

      <!-- =============== 準備頁（任何人可看；登入且成員才可新增/勾選/刪除） =============== -->
      <section
        v-else-if="currentPage === 'prep'"
        class="page"
        @touchstart="onSubSwipeStart($event)"
        @touchend="onPrepSwipeEnd($event)"
      >



      <div class="prep-sticky">
        <div class="segmented backup-sticky">
          <button class="seg-btn" :class="{ active: prepTab === 'todo' }" @click="prepTab='todo'">✅ 待辦</button>
          <button class="seg-btn" :class="{ active: prepTab === 'luggage' }" @click="prepTab='luggage'">🧳 行李</button>
        </div>
      </div>



      <!-- 共用清單 -->
      <div class="card">
        <div class="inline-add">
          <input
            class="field-input"
            v-model="prepInput[prepTab]"
            :placeholder="`新增${prepTabLabel}`"
            :disabled="!canWrite"
          />
          <button class="btn btn-primary" @click="addPrepItem(prepTab)" :disabled="!canWrite">
            新增
          </button>
        </div>

        <div class="list" v-if="prep[prepTab].items.length">
          <div
            class="list-item"
            v-for="it in sortedPrepItems(prepTab)"
            :key="it.id"
            :draggable="canWrite && prepDrag.armedId === it.id"
            :class="{ dragging: prepDrag.draggingId === it.id }"
            @dragstart="onPrepDragStart(prepTab, it, $event)"
            @dragover="onPrepDragOver(prepTab, it, $event)"
            @drop="onPrepDrop(prepTab, it, $event)"
            @dragend="onPrepDragEnd"
            @click="openPrepEditor(prepTab, it, $event)"
          >
            <div class="todo">
              <input
                type="checkbox"
                :disabled="!canWrite"
                v-model="it.done"
                @click.stop
                @change="togglePrepDone(prepTab, it)"
              />

              <div class="prep-textwrap">
                <div class="prep-text" :class="{ done: it.done }">{{ it.text }}</div>
                <div v-if="(it.note || '').trim()" class="prep-note">{{ it.note }}</div>
              </div>
            </div>
          </div>



        </div>

        <div v-else class="empty-state">尚無項目</div>
      </div>


      <!-- ✅ 準備頁：點選項目後的編輯/刪除/儲存 Modal -->
      <div v-if="prepEditor.open" class="modal-overlay" @click.self="closePrepEditor">
        <div class="modal">
          <div class="modal-title">✏️ 編輯{{ prepTabLabelMap[prepEditor.kind] }}</div>
          <div class="modal-subtitle">
            點選項目後在這裡修改；列表上不再顯示獨立的編輯/刪除按鈕。
            <span v-if="!canWrite" style="opacity:.75;">（目前只讀）</span>
          </div>

          <div class="form-grid" style="margin-top:10px;">
            <label class="field field-span">
              <div class="field-label">選項文字</div>
              <input class="field-input" v-model="prepEditor.form.text" :disabled="!canWrite" />
            </label>

            <label class="field field-span">
              <div class="field-label">備註</div>
              <textarea class="field-input" rows="3" v-model="prepEditor.form.note" :disabled="!canWrite"></textarea>
            </label>
          </div>

          <div class="modal-actions">
            <button class="btn btn-ghost" type="button" @click="closePrepEditor">取消</button>

            <button
              v-if="canWrite"
              class="btn btn-danger"
              type="button"
              @click="deletePrepFromEditor"
            >
              刪除
            </button>

            <button
              class="btn btn-primary"
              type="button"
              @click="savePrepEditor"
              :disabled="!canWrite"
            >
              儲存
            </button>
          </div>
        </div>
      </div>

      
      </section>


      <!-- =============== 備用頁（美食 / 地點） =============== -->
      <section
        v-else-if="currentPage === 'backup'"
        class="page"
        @touchstart="onSubSwipeStart($event)"
        @touchend="onBackupSwipeEnd($event)"
      >

      <div class="segmented segmented-3 backup-sticky">
        <button class="seg-btn" :class="{ active: backupTab === 'snacks' }" @click="backupTab='snacks'" type="button">
          🍫 零食
        </button>

        <button class="seg-btn" :class="{ active: backupTab === 'beauty' }" @click="backupTab='beauty'" type="button">
          💄 美妝
        </button>

        <button class="seg-btn" :class="{ active: backupTab === 'shopping' }" @click="backupTab='shopping'" type="button">
          🛍️ 購物
        </button>
      </div>


      <!-- ===== 購物（從準備頁移到備用頁；沿用 trips/{tripId}/prep_shopping） ===== -->






        
        <!-- ===== 零食 / 美妝（同功能） ===== -->
        <div v-if="backupTab === 'snacks' || backupTab === 'beauty' || backupTab === 'shopping'" class="card">

          <div class="row-right" style="margin-top:10px;">
            <!-- ✅ 切換按鈕：清單 / 圖片庫 -->
            <button
              class="btn btn-secondary"
              type="button"
              @click="snackGalleryMode = !snackGalleryMode"
              :disabled="backup[snackLikeKind].loading"
              :title="snackGalleryMode ? '切回清單模式' : '切到圖片庫模式'"
            >
              {{ snackGalleryMode ? "≡" : "∷" }}
            </button>

            <button
              class="btn btn-primary"
              v-if="canWrite"
              @click="openBackupEditor(snackLikeKind, null)"
            >
              新增
            </button>

            <div v-else class="readonly-hint">只讀模式：登入且在 members 才能新增/編輯。</div>
          </div>

          <div v-if="backup[snackLikeKind].loading" class="empty-state">讀取中...</div>
          <div v-else-if="backup[snackLikeKind].error" class="empty-state">讀取失敗：{{ backup[snackLikeKind].error }}</div>

          <div v-else-if="!backup[snackLikeKind].items.length" class="empty-state">
            尚未建立{{ snackLikeKind === 'beauty' ? '美妝' : (snackLikeKind === 'shopping' ? '購物' : '零食') }}口袋名單。
          </div>

          <!-- ✅ 清單模式 -->
          <div v-else-if="!snackGalleryMode" class="list">
            <div
              v-for="it in snackLikeSortedItems"
              :key="it.id"
              class="backup-card"
              @click="openBackupEditor(snackLikeKind, it)"
            >
              <div class="backup-head">
                <div class="backup-head-left">
                  <!-- ✅ 勾選（點這裡不會打開編輯） -->
                  <label class="backup-check" @click.stop>
                    <input
                      class="backup-check-input"
                      type="checkbox"
                      :checked="!!it.done"
                      @change.stop="toggleBackupDone(snackLikeKind, it, $event)"
                    />
                  </label>

                  <div class="backup-title" :class="{ 'is-done': !!it.done }">
                    {{ it.title || '（未命名）' }}
                  </div>
                </div>

                <div class="backup-pills">
                  <!-- ✅ 有上傳圖片才顯示，點了開圖片 -->
                  <button
                    v-if="it.photoUrl"
                    class="btn btn-secondary btn-mini"
                    type="button"
                    @click.stop="openSnackPhoto(it)"
                    title="開啟照片"
                  >
                    🖼️
                  </button>
                </div>
              </div>


              <!-- ✅ 備註 -->
              <div v-if="(it.note || '').trim()" class="backup-note">
                {{ it.note }}
              </div>
            </div>
          </div>

          <!-- ✅ 圖片庫模式（只展示已上傳的照片） -->
          <div v-else class="snack-gallery">
            <div v-if="!snackLikePhotoItems.length" class="empty-state">
              尚未上傳任何{{ snackLikeKind === 'beauty' ? '美妝' : (snackLikeKind === 'shopping' ? '購物' : '零食') }}照片。
            </div>

            <button
              v-for="it in snackLikePhotoItemsSorted"
              :key="it.id"
              type="button"
              class="snack-thumb"
              @click="openSnackPhoto(it)"
              :title="it.title || '開啟照片'"
            >
              <img class="snack-thumb-img" :src="it.photoUrl" :alt="it.title || 'photo'" loading="lazy" />
            </button>
          </div>
        </div>


        






        <!-- ===== 備用 Modal：新增/編輯 ===== -->
        <div v-if="backupEditor.open" class="modal-overlay" @click.self="closeBackupEditor">
          <div class="modal">
            <div class="modal-title">🧷 備用清單</div>
            <div class="modal-subtitle">
              {{ 
                backupEditor.kind === 'food'
                  ? '美食'
                  : (backupEditor.kind === 'snacks'
                      ? '零食'
                      : (backupEditor.kind === 'beauty'
                          ? '美妝'
                          : (backupEditor.kind === 'shopping' ? '購物' : '地點')
                        )
                    )

              }}


              <span v-if="!canWrite" style="opacity:.75;">（目前只讀）</span>
            </div>

            <div class="form-grid" style="margin-top:10px;">
              <label class="field field-span">
                <div class="field-label">名稱</div>
                <input class="field-input" v-model="backupEditor.form.title" :disabled="!canWrite" placeholder="例如：金龍拉麵 / 清水寺" />
              </label>

              <template v-if="backupEditor.kind === 'food'">



              </template>

              <template v-else-if="backupEditor.kind === 'snacks' || backupEditor.kind === 'beauty' || backupEditor.kind === 'shopping'">


                <div class="field field-span">
                  <!-- ✅ 原生 input 隱藏：移除「未選擇任何檔案」 -->
                  <input
                    id="snackPhotoFileInput"
                    class="voucher-file-hidden"
                    type="file"
                    accept="image/*"
                    @change="onSnackPhotoFileChange"
                    :disabled="!canWrite || snackPhotoUploading"
                  />

                  <!-- ✅ 自訂選檔按鈕（複製預定頁） -->
                  <div class="file-picker-row">
                    <label
                      class="btn btn-secondary btn-mini"
                      :class="{ 'is-disabled': (!canWrite || snackPhotoUploading) }"
                      :for="(!canWrite || snackPhotoUploading) ? null : 'snackPhotoFileInput'"
                    >
                      選擇檔案
                    </label>

                    <!-- ✅ 顯示已選檔名（複製預定頁 pill） -->
                    <div class="voucher-file-pill">
                      {{ snackPhotoFileName ? ('已選擇：' + snackPhotoFileName) : '' }}
                    </div>
                  </div> 

                  <div style="display:flex; gap:10px; margin-top:10px; align-items:center; flex-wrap:wrap;">
                    <button
                      class="btn btn-secondary btn-mini"
                      type="button"
                      :disabled="!canWrite || snackPhotoUploading || !snackPhotoFile"
                      @click="uploadSnackPhoto"
                    >
                      {{ snackPhotoUploading ? `上傳中 ${snackPhotoProgress}%` : "上傳照片" }}
                    </button>

                    <button
                      v-if="backupEditor.form.photoUrl"
                      class="btn btn-secondary btn-mini"
                      type="button"
                      @click="openSnackPhoto({ photoUrl: backupEditor.form.photoUrl })"
                    >
                      預覽
                    </button>

                    <!-- ✅ 新增：刪除照片（在預覽右邊） -->
                    <button
                      v-if="backupEditor.form.photoUrl"
                      class="btn btn-danger btn-mini"
                      type="button"
                      @click.stop.prevent="deleteSnackPhoto()"
                    >
                      刪除
                    </button>




                  </div>
                </div>
              </template>



              <template v-else>


                <label class="field field-span">
                  <div class="field-label">營業時間</div>
                  <input class="field-input" v-model="backupEditor.form.hours" :disabled="!canWrite" placeholder="例如：06:00–18:00" />
                </label>
              </template>




              <label class="field field-span" v-if="backupEditor.kind !== 'snacks' && backupEditor.kind !== 'beauty' && backupEditor.kind !== 'shopping'">
                <div class="field-label">mapQuery（Google Maps 搜尋字）</div>
                <input
                  class="field-input"
                  v-model="backupEditor.form.mapQuery"
                  :disabled="!canWrite"
                  placeholder="不填會用名稱當搜尋字"

                />
              </label>


              <label class="field field-span">
                <div class="field-label">備註</div>
                <input class="field-input" v-model="backupEditor.form.note" :disabled="!canWrite" placeholder="例如：晚上10點後人少 / 順路安排" />
              </label>
            </div>

            <div class="row-right">
              <button class="btn btn-secondary" @click="closeBackupEditor">關閉</button>

              <button class="btn btn-primary" @click="saveBackupEdit" :disabled="!canWrite || isAnyUploading">
                儲存
              </button>



              <button class="btn btn-danger" v-if="backupEditor.isEdit" @click="deleteBackupItem" :disabled="!canWrite">
                刪除
              </button>
            </div>

            <div class="modal-hint">
              提醒：只有「登入且在 members」的成員可以儲存。
            </div>
          </div>
        </div>
      </section>

      


      <!-- =============== 新增成員頁 section   =============== -->
      <section v-else-if="currentPage === 'members'" class="page">
        <div class="page-head">

          <div class="page-sub" v-if="isOwner">你是 owner，可新增/刪除與切換讀寫</div>
          <div class="page-sub" v-else>只有 owner 可管理；你目前為{{ canWrite ? "可寫" : "只讀" }}</div>
        </div>

        <div v-if="!membershipChecked" class="empty-state">檢查權限中...</div>

        <div v-else class="member-panel">
            <div class="row-right" style="margin-top:10px; margin-bottom:10px;">
              <button class="btn btn-primary" type="button" @click="openMemberInviteModal">
                新增
              </button>
            </div>
          <!-- 新增成員（只有 owner 顯示）：以 Email 邀請（對方登入後自動加入） -->


          <!-- ✅ 新增成員 Modal（按下「新增成員」才出現） -->
          <div v-if="memberInviteModal.open" class="modal-overlay" @click.self="closeMemberInviteModal">
            <div class="modal">
              <div class="modal-title">新增成員（Email 邀請）</div>
              <div class="modal-subtitle">
                只有 owner 可新增；對方登入後自動加入
              </div>

              <div class="form-grid" style="margin-top:10px;">
                <div class="field">
                  <div class="field-label"">Email（必填）</div>
                  <input
                    class="field-input"
                    v-model="memberForm.email"
                    inputmode="email"
                    placeholder="例如：someone@gmail.com"
                  />
                </div>

                <div class="field">
                  <div class="field-label">顯示名稱（選填）</div>
                  <input class="field-input" v-model="memberForm.displayName" placeholder="例如：燁姍" />
                </div>
              </div>

              <div
                class="option-row"
                :class="{ active: memberForm.canWrite }"
                @click="memberForm.canWrite = !memberForm.canWrite"
              >
                <div class="option-text">
                  允許寫入
                  <div class="option-sub">
                    可新增 / 修改 / 刪除 / 上傳
                  </div>
                </div>

                <input
                  type="checkbox"
                  v-model="memberForm.canWrite"
                  @click.stop
                />
              </div>


              <div class="row-right" style="margin-top:12px; gap:10px;">
                <button class="btn btn-secondary" type="button" @click="closeMemberInviteModal">
                  關閉
                </button>
                <button class="btn btn-primary" type="button" @click="inviteMemberByEmail">
                  送出邀請
                </button>
              </div>

              <div class="modal-hint">
                提示：對方用同一個 Email 以 Google 登入後，會自動加入成員。
              </div>

              <div v-if="invites.length" class="invite-box">

              <div class="invite-title">待加入邀請（{{ invites.length }}）</div>

              <div class="invite-list">
                <div v-for="inv in invites" :key="inv.id" class="invite-row">
                  <div class="invite-main">
                    <div class="invite-email">{{ inv.email }}</div>
                    <div class="invite-sub">
                      {{ inv.displayName || "（未命名）" }} · {{ inv.canWrite ? "可寫入" : "只讀" }}
                    </div>
                  </div>
                </div>
              </div>

              <div class="hint">
                這裡顯示的是 trips/{{ activeTripId }}/invites。對方登入後會自動加入 members。
              </div>
            </div>

            </div>
          </div>



          <!-- 成員清單 -->
          <div class="card">
            <div class="card-title">成員列表（{{ members.length }}）</div>

          <div class="member-list">
            <div v-for="m in members" :key="m.uid" class="member-row">
              <!-- 上排：左（頭像+名字） / 右（可讀/可讀寫切換） -->
              <div class="member-top">
                <div class="member-name">
                  <span class="member-avatar" aria-hidden="true">
                    <img
                      v-if="memberAvatarUrl(m)"
                      class="member-avatar-img"
                      :src="memberAvatarUrl(m)"
                      :alt="(m.displayName || 'member') + ' avatar'"
                      loading="lazy"
                      referrerpolicy="no-referrer"
                    />
                    <span v-else class="member-avatar-fallback">{{ memberAvatarLetter(m) }}</span>
                  </span>

                  <span class="member-name-text">
                    {{ m.displayName || "（未命名）" }}
                  </span>

                  <span v-if="m.role === 'owner'" class="badge badge-owner">👑 Owner</span>
                </div>

                
                <!-- ✅ 右側切換：永遠顯示；任何人都可按（會跳密碼） -->
                <div class="perm-toggle">
                  <button
                    class="toggle-switch"
                    type="button"
                    :class="{ on: !!m.canWrite }"
                    role="switch"
                    :aria-checked="!!m.canWrite"
                    @click="requestToggleMemberWrite(m)"
                  >
                    <span class="toggle-track">
                      <span class="toggle-knob"></span>
                    </span>
                    <span class="toggle-label">{{ m.canWrite ? "可讀寫" : "可讀" }}</span>
                  </button>
                </div>


              </div>

              <!-- 下排：uid + 權限文字 -->
              <div class="member-meta">
                <div class="mono">{{ m.uid }}</div>
                <div class="perm">{{ m.canWrite ? "可讀寫" : "可讀" }}</div>
              </div>

              <!-- 刪除：維持只有 owner 可見 -->
              <div class="member-actions" v-if="isOwner">
                <button class="btn btn-danger" @click="removeMember(m)" type="button" :disabled="m.role === 'owner'">
                  刪除
                </button>
              </div>
            </div>
          </div>



          </div>
        </div>
        <!-- ✅ 成員權限切換：密碼 Modal -->
        <div v-if="memberPermModal.open" class="modal-overlay" @click.self="closeMemberPermModal">
          <div class="modal">
            <div class="modal-title">🔒 輸入密碼</div>
            <div class="modal-subtitle">
              輸入密碼後才可切換「可讀 / 可讀寫」
            </div>

            <div class="form-grid" style="margin-top:10px;">
              <label class="field">
                <div class="field-label">密碼</div>
                <input
                  class="field-input"
                  v-model="memberPermModal.pin"
                  type="password"
                  inputmode="numeric"
                  pattern="[0-9]*"
                  maxlength="8"
                  placeholder="請輸入密碼"
                />
              </label>
            </div>

            <div class="modal-actions">
              <button class="btn btn-ghost" type="button" @click="closeMemberPermModal">取消</button>
              <button class="btn btn-primary" type="button" @click="confirmMemberPermChange">確認切換</button>
            </div>
          </div>
        </div>




      </section>


    </main>



        <!-- ✅ Trip switch / create / settings -->
        <div v-if="tripModal.open" class="modal-overlay" @click.self="closeTripModal">
          <div class="modal">
            <div class="modal-title">🧳 旅程設定</div>
            <div class="modal-subtitle">目前旅程：<b>{{ activeTripId }}</b></div>

            <div class="form-grid" style="grid-template-columns:1fr; margin-top:10px;">

              <!-- ✅ 切換 tripId：下拉式選單（含最近使用） -->
              <label class="field">
                <div class="field-label">切換到 tripId（下拉）</div>
                <select class="field-input" v-model="tripModal.selectedTripId">
                  <option value="">（選擇旅程）</option>
                  <option v-for="tid in tripModal.knownTripIds" :key="tid" :value="tid">
                    {{ tid }}
                  </option>
                </select>
              </label>

              <div class="row-right" style="margin-top:6px;">
                <button
                  class="btn btn-secondary btn-mini"
                  :disabled="!tripModal.selectedTripId"
                  @click="switchTrip(tripModal.selectedTripId)"
                >
                  切換
                </button>
              </div>


              <!-- ✅ 旅途設定：起始日期 + 行程標題 -->
              <div v-if="isOwner" class="card" style="margin-top:10px;">
                <div class="card-title">旅途設定</div>
                <div class="card-subtitle">
                  起始日期會自動推算每一天日期；行程標題確認後不可更改。
                </div>

                <label class="field" style="margin-top:10px;">
                  <div class="field-label">
                    行程標題 <span style="color:#b02a37; font-weight:1000;">（必填）</span>
                  </div>
                  <input
                    class="field-input"
                    v-model.trim="tripModal.title"
                    placeholder="例如：蜜月京都大阪 2026"
                  />
                  <div class="modal-hint" style="margin-top:6px;">
                    💡 提示：旅程標題新增後不可修改
                  </div>
                </label>


                <label class="field" style="margin-top:10px;">
                  <div class="field-label">起始日期</div>
                  <input class="field-input" v-model="tripModal.startDate" type="date" />
                </label>

                <div class="form-grid" style="grid-template-columns:1fr 1fr; gap:10px; margin-top:10px;">
                  <label class="field">
                    <div class="field-label">天數（1~31）</div>
                    <input
                      class="field-input"
                      v-model.number="tripModal.days"
                      type="number"
                      min="1"
                      max="31"
                      inputmode="numeric"
                    />
                  </label>

                  <div class="field">
                    <div class="field-label">結束日期（自動）</div>
                    <input class="field-input" :value="tripModal.endDate" type="text" readonly />
                  </div>
                </div>

                <label class="field" style="margin-top:10px;">
                  <div class="field-label">天氣地區（旅程預設）</div>
                  <select class="field-input" v-model="tripModal.weatherCity">
                    <option value="">（自動：依當天/地點判斷）</option>
                    <option v-for="c in supportedWeatherCities" :key="c.key" :value="c.key">
                      {{ c.label }}
                    </option>
                  </select>
                  <div class="modal-hint" style="margin-top:6px;">
                    ✅ 為避免「輸入不支援城市 → 又回大阪」，這裡只允許選支援的城市。
                  </div>
                </label>










                <div class="row-right" style="margin-top:10px;">
                  <button
                    class="btn btn-primary btn-mini"
                    :disabled="!user || !tripModal.startDate || !tripModal.title"
                    @click="applyAndConfirmTripSettings"
                    title="一次完成：套用行程日期 + 儲存旅程設定"
                  >
                    建立
                  </button>
                </div>


                <div class="modal-hint" v-if="!user">
                  需要先登入才能寫入旅程設定。
                </div>
              </div>



              <div class="modal-actions">
                <button class="btn btn-ghost" @click="closeTripModal">關閉</button>
              </div>
            </div>
          </div>
        </div>



<nav class="bottom-nav bottom-nav-6">
  <button
    type="button"
    class="nav-item"
    :class="{ active: currentPage === 'itinerary' }"
    @click.stop="goPage('itinerary')"
  >
    <div class="nav-icon">🗓️</div>
    <div class="nav-label">行程</div>
  </button>

  <button
    type="button"
    class="nav-item"
    :class="{ active: currentPage === 'booking' }"
    @click.stop="goPage('booking')"
  >
    <div class="nav-icon">🗂️</div>
    <div class="nav-label">預定</div>
  </button>

  <button
    type="button"
    class="nav-item"
    :class="{ active: currentPage === 'accounting' }"
    @click.stop="goPage('accounting')"
  >
    <div class="nav-icon">🧾</div>
    <div class="nav-label">記帳</div>
  </button>

  <button
    type="button"
    class="nav-item"
    :class="{ active: currentPage === 'prep' }"
    @click.stop="goPage('prep')"
  >
    <div class="nav-icon">🎒</div>
    <div class="nav-label">準備</div>
  </button>

  <button
    type="button"
    class="nav-item"
    :class="{ active: currentPage === 'backup' }"
    @click.stop="goPage('backup')"
  >
    <div class="nav-icon">🧷</div>
    <div class="nav-label">備用</div>
  </button>


  <button
    class="nav-item"
    :class="{ active: currentPage === 'members' }"
    @click="goPage('members')"
    type="button"
  >
    <div class="nav-icon">👥</div>
    <div class="nav-label">成員</div>
  </button>



</nav>



  </div>



</template>

<script setup>

import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, nextTick } from "vue";


import { db } from "./firebase";

import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  FieldPath,
  orderBy,
  updateDoc,
  addDoc,
  serverTimestamp,
  setDoc,
  onSnapshot,
  deleteDoc,
} from "firebase/firestore";


import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";


import { getStorage, ref as sRef, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";










/* ===================== 固定預設行程 ===================== */

// ✅ 你要「改回 DEFAULT_TRIP_ID」：這裡就是唯一來源
const DEFAULT_TRIP_ID = "HM-8F3K2A";

// ✅ 允許切換旅程，所以要用 let（後面 switchTrip / createNewTrip 會重新指定）
let activeTripId = localStorage.getItem("activeTripId") || DEFAULT_TRIP_ID;

// ✅ 目前旅程標題（跟著 activeTripId 變動）
const tripTitle = ref("");

// ✅ Trip meta（旅途設定）：startDate / title lock
const tripMeta = reactive({
  startDate: "",
  days: 0,
  titleLocked: false,
  weatherCity: "", // ✅ 天氣預設地區（Key：Osaka/Kyoto...）
});

const tripModal = reactive({
  open: false,
  // switch
  selectedTripId: "",
  knownTripIds: [],

  // settings
  startDate: "",
  endDate: "",
  title: "",
  titleLocked: false,
  days: 7,

  // weather
  weatherCity: "", // ✅ 旅程層級預設天氣地區（可輸入中英）
});



/* ===================== Auth ===================== */
const auth = getAuth();
const storage = getStorage();
// ✅ Debug：讓你可以在瀏覽器 Console 用 window.__auth 直接查看 currentUser
window.__auth = auth;
window.__getUid = () => auth.currentUser?.uid;
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
  return user.value.displayName || "使用者";
});

const userAvatar = computed(() => {
  if (!user.value) return DEFAULT_AVATAR;
  return user.value.photoURL || DEFAULT_AVATAR;
});

const userMeta = computed(() => {
  if (!user.value) return "";
  return "Google 登入";
});

/* ===================== Membership gate（只有寫入功能需要） ===================== */
const membershipChecked = ref(false);
const isMember = ref(false);


// ✅ 自己的 members 文件（包含 canWrite / role）
const myMember = ref(null);

// ✅ 讀寫權限：必須是 members 且 canWrite=true
const canWrite = computed(() => {
  if (!user.value) return false;
  if (!membershipChecked.value) return false;
  if (!isMember.value) return false;
  return !!myMember.value?.canWrite;
});

// ✅ 是否 owner（只有 owner 可管理成員）
const isOwner = computed(() => {
  if (!user.value) return false;
  if (!membershipChecked.value) return false;
  if (!isMember.value) return false;
  return myMember.value?.role === "owner";
});

function canToggleMember(m) {
  if (!user.value?.uid || !m?.uid) return false;

  // owner：可切換任何成員（但 owner 自己不給關閉寫入）
  if (isOwner.value) return m.role !== "owner";

  // 非 owner：只能切換自己
  return m.uid === user.value.uid;
}


/* ===================== Members list（供 UI 成員 chips；只在成員狀態下載入） ===================== */
const members = ref([]); // [{ uid, displayName }]
// ✅ 待加入邀請清單（invites）
const invites = ref([]); // [{ id(email), email, displayName, canWrite, createdAtMs }]
let invitesUnsub = null;

function startInvitesListener() {
  if (invitesUnsub) return;

  const qy = query(
    collection(db, "trips", activeTripId, "invites"),
    orderBy("createdAt", "desc")
  );

  invitesUnsub = onSnapshot(
    qy,
    (snap) => {
      invites.value = snap.docs.map((d) => {
        const data = d.data() || {};
        return {
          id: d.id,
          email: data.email || d.id,
          displayName: data.displayName || "",
          canWrite: !!data.canWrite,
          createdAtMs: data.createdAt?.toMillis ? data.createdAt.toMillis() : 0,
        };
      });
    },
    (err) => {
      console.warn("invites 監聽失敗：", err);
      invites.value = [];
    }
  );
}

function stopInvitesListener() {
  try { if (invitesUnsub) invitesUnsub(); } catch (_) {}
  invitesUnsub = null;
  invites.value = [];
}


const memberChips = computed(() => {
  const names = members.value
    .map((m) => String(m.displayName || "").trim())
    .filter(Boolean);

  return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b, "zh-Hant"));
});


let membersUnsub = null;

function startMembersListener() {
  if (membersUnsub) return;

  const q = query(
    collection(db, "trips", activeTripId, "members"),
    orderBy("updatedAt", "desc")
  );

  membersUnsub = onSnapshot(
    q,
    (snap) => {
      members.value = snap.docs.map((d) => {
        const x = d.data() || {};
        return {
          uid: d.id,
          displayName: x.displayName || "",
          photoURL: x.photoURL || x.photoUrl || "",
          canWrite: (x.canWrite === undefined) ? true : !!x.canWrite, // 相容舊資料
          role: x.role || "member",
        };
      });
    },
    (err) => {
      console.error("members 監聽失敗：", err);
      members.value = [];
    }
  );
}

function stopMembersListener() {
  try { if (membersUnsub) membersUnsub(); } catch (_) {}
  membersUnsub = null;
}



/* ===================== Presence（線上名單：登入才啟用） ===================== */
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
  if (unsubPresence) unsubPresence();

  const q = query(collection(db, "presence"), orderBy("displayName", "asc"));

  unsubPresence = onSnapshot(
    q,
    (snap) => {
      presenceRaw.value = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          displayName: data.displayName || "",
          photoURL: data.photoURL || "",
          lastSeenMs: data.lastSeen?.toMillis ? data.lastSeen.toMillis() : 0,
        };
      });
    },
    (err) => {
      // ✅ 權限不足時不要炸掉整個流程（也方便你在 Console 看清楚）
      console.warn("[presence] onSnapshot failed:", err);
      presenceRaw.value = [];
    }
  );
}


function unsubscribePresence() {
  if (unsubPresence) unsubPresence();
  unsubPresence = null;
  presenceRaw.value = [];
}

const memberForm = ref({
  email: "",
  displayName: "",
  canWrite: true,
});

const memberInviteModal = ref({ open: false });

function openMemberInviteModal() {
  if (!isOwner.value) return alert("只有 owner 可以新增/管理成員。");
  memberInviteModal.value.open = true;
}

function closeMemberInviteModal() {
  memberInviteModal.value.open = false;
  // 順便清掉表單，避免下次打開還殘留
  memberForm.value = { email: "", displayName: "", canWrite: true };
}



// owner：用 Email 建立邀請（對方登入後自動加入）
async function inviteMemberByEmail() {
  if (!isOwner.value) return alert("只有 owner 可以新增/管理成員。");

  const emailKey = String(memberForm.value.email || "").trim().toLowerCase();
  if (!emailKey) return alert("請輸入 email。");

  // 非必要，但可避免輸入怪字元
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailKey)) {
    return alert("Email 格式看起來不正確。");
  }

  const payload = {
    email: emailKey,
    displayName: String(memberForm.value.displayName || "").trim(),
    canWrite: !!memberForm.value.canWrite,
    canwrite: !!memberForm.value.canWrite, // ✅ 向下相容舊欄位

    role: "member",
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  };

  try {
    await setDoc(
      doc(db, "trips", activeTripId, "invites", emailKey),
      payload,
      { merge: true }
    );

    closeMemberInviteModal();
    alert("已送出邀請！對方用同 Email 登入後會自動加入。");
  } catch (e) {
    console.error("inviteMemberByEmail 失敗：", e);
    alert(`邀請失敗：${e?.code || ""}\n${e?.message || String(e)}`);
  }

}

// 登入時：如果此 Email 有邀請，則自動加入 members 並刪除 invite
async function tryClaimInviteOnLogin() {
  const u = user.value;
  if (!u?.uid) return;

  const emailKey = String(u.email || "").trim().toLowerCase();
  if (!emailKey) return;

  try {
    // 已經是 member 就不用做
    const myMemberRef = doc(db, "trips", activeTripId, "members", u.uid);
    const myMemberSnap = await getDoc(myMemberRef);
    if (myMemberSnap.exists()) return;

    // 查 invite
    const invRef = doc(db, "trips", activeTripId, "invites", emailKey);
    const invSnap = await getDoc(invRef);
    if (!invSnap.exists()) return;

    const inv = invSnap.data() || {};
    const invitedCanWrite = (inv.canWrite ?? inv.canwrite);

    // 建立 members/{uid}
    await setDoc(myMemberRef, {
      uid: u.uid,
      displayName: inv.displayName || u.displayName || "",
      canWrite: inv.canWrite === false ? false : true,
      role: "member",
      updatedAt: serverTimestamp(),
      joinedAt: serverTimestamp(),
    }, { merge: true });

    // 刪掉 invite（避免重複加入）
    await deleteDoc(invRef);

    console.log("[INVITE] claimed by", emailKey);
  } catch (e) {
    console.warn("[INVITE] claim failed:", e);
  }
}





async function removeMember(m) {
  if (!isOwner.value) return alert("只有 owner 可以刪除成員。");
  if (!m?.uid) return;

  if (m.role === "owner") return alert("不能刪除 owner。");
  if (m.uid === user.value?.uid) return alert("不能刪除自己（避免把自己踢出去）。");

  // ✅ 密碼保護（8273）
  const pw = prompt("請輸入密碼以刪除成員：");
  if (pw === null) return; // 取消
  if (String(pw).trim() !== "8273") return alert("密碼錯誤，取消刪除。");

  if (!confirm(`確定要刪除成員：${m.displayName || m.uid}？`)) return;

  try {
    await deleteDoc(doc(db, "trips", activeTripId, "members", m.uid));
    alert("刪除成功！");
  } catch (e) {
    console.error("removeMember 失敗：", e);
    alert("刪除失敗（可能是 rules 不允許 / 網路問題）");
  }
}


const memberPermModal = ref({
  open: false,
  target: null,     // 目標 member 物件
  nextCanWrite: false,
  pin: "",
});

function openMemberPermModal(m) {
  memberPermModal.value.open = true;
  memberPermModal.value.target = m;
  memberPermModal.value.nextCanWrite = !m?.canWrite;
  memberPermModal.value.pin = "";
}

function closeMemberPermModal() {
  memberPermModal.value.open = false;
  memberPermModal.value.target = null;
  memberPermModal.value.pin = "";
}

function requestToggleMemberWrite(m) {
  if (!m?.uid) return;
  if (!user.value?.uid) return alert("請先登入。");

  // owner 不允許被關閉（避免把 owner 鎖死）
  if (m.role === "owner") return alert("owner 權限不可切換。");

  // ✅ 你要求「無論是否 owner 都能按」：按了就跳 modal
  // 但為了不讓非 owner 去改別人的權限（會被 rules 擋住），這裡做 UX 防呆：
  if (!isOwner.value && m.uid !== user.value.uid) {
    return alert("你只能切換自己的權限。");
  }

  openMemberPermModal(m);
}

async function confirmMemberPermChange() {
  const pin = String(memberPermModal.value.pin || "").trim();
  if (pin !== "8273") return alert("密碼錯誤，取消切換。");

  const m = memberPermModal.value.target;
  if (!m?.uid) return;

  const nextCanWrite = !!memberPermModal.value.nextCanWrite;

  try {
    await updateDoc(doc(db, "trips", activeTripId, "members", m.uid), {
      canWrite: nextCanWrite,
      updatedAt: serverTimestamp(),
    });

    closeMemberPermModal();
    alert(`已切換為：${nextCanWrite ? "可讀寫" : "可讀"} ✅`);
  } catch (e) {
    console.error("confirmMemberPermChange 失敗：", e);
    alert("更新失敗（可能是 rules 不允許 / 網路問題）");
  }
}





function memberAvatarUrl(m) {
  // 兼容不同欄位命名（你之後若想存 photoURL 進 members doc，也可直接用）
  return String(m?.photoURL || m?.photoUrl || "").trim();
}

function memberAvatarLetter(m) {
  const name = String(m?.displayName || "").trim();
  if (name) return name.slice(0, 1);
  const uid = String(m?.uid || "").trim();
  return uid ? uid.slice(0, 1).toUpperCase() : "M";
}




/* ===================== Pages ===================== */
const currentPage = ref("itinerary");

/* ===================== Booking（預定） ===================== */
const bookingTab = ref("flight"); // flight | hotel | car | voucher
const bookingLoading = ref(false);
const bookings = ref([]); // [{id, type, ...}]
let unsubBookings = null;

function bookingDateKey(d) {
  // d 預期是 "YYYY-MM-DD"；無日期的排到最後
  if (!d) return Infinity;

  // 強制轉字串並只取日期
  const iso = String(d).slice(0, 10);

  // 用正規表示法取代 replaceAll（避免 parser 相容性問題）
  const key = parseInt(iso.replace(/-/g, ""), 10);

  return Number.isFinite(key) ? key : Infinity;
}


function timeKey(t) {
  // "HH:MM" -> minutes；空值排後面
  const s = String(t || "").trim();
  if (!s) return Number.POSITIVE_INFINITY;
  const m = s.match(/^(\d{1,2}):(\d{1,2})$/);
  if (!m) return Number.POSITIVE_INFINITY;
  return Number(m[1]) * 60 + Number(m[2]);
}

const filteredBookings = computed(() => {
  const t = bookingTab.value;

  const list = (bookings.value || []).filter((b) => (b.type || "flight") === t);

  const pickDate = (b) => {
    if (t === "voucher") return b?.usageDate || b?.date || "";
    // ✅ 住宿：用 check-in 日期（b.date）
    if (t === "hotel") return b?.date || "";
    // ✅ 機票/租車：用 b.date
    return b?.date || "";
  };

  const pickTime = (b) => {
    // ✅ 機票：用起飛時間
    if (t === "flight") return b?.departTime || "";
    // ✅ 住宿：用 check-in 時間（沒有就排後面）
    if (t === "hotel") return b?.checkInTime || "";
    // ✅ 其他類型：不特別用時間
    return "";
  };

  return [...list].sort((a, b) => {
    // 1) 日期：越早越前（憑證優先 usageDate）
    const ad = bookingDateKey(pickDate(a));
    const bd = bookingDateKey(pickDate(b));
    if (ad !== bd) return ad - bd;

    // 2) 同一天：依類型取時間（機票 departTime、住宿 checkInTime）
    const at = timeKey(pickTime(a));
    const bt = timeKey(pickTime(b));
    if (at !== bt) return at - bt;

    // 3) createdAt 穩定排序（避免同 key 亂跳）
    const ac = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const bc = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return ac - bc;
  });
});




function bookingTypeLabel(type) {
  if (type === "flight") return "機票";
  if (type === "hotel") return "住宿";
  if (type === "car") return "租車";
  if (type === "voucher") return "憑證";
  return "預定";
}

/* ===================== Booking（住宿卡片）helpers ===================== */
function bookingStayCoverUrl(b) {
  const cover = String(b?.coverUrl || "").trim();
  if (cover) return cover;

  const isImgVoucher = String(b?.voucherType || "") === "image";
  if (isImgVoucher) return String(b?.voucherUrl || "").trim();
  return "";
}

function bookingStayCheckOutDate(b) {
  return String(
    b?.checkOutDate || b?.checkoutDate || b?.checkOut || b?.purchasedAt || ""
  ).trim();
}

function bookingStayCheckInTime(b) {
  return String(b?.checkInTime || b?.checkinTime || "15:00").trim();
}

function bookingStayCheckOutTime(b) {
  return String(b?.checkOutTime || b?.checkoutTime || "11:00").trim();
}

function bookingStayAddress(b) {
  return String(
    b?.address || b?.location || b?.loc || b?.place || b?.from || b?.to || ""
  ).trim();
}

function bookingStaySplitCount() {
  const n = Array.isArray(members.value) ? members.value.length : 0;
  return n > 0 ? n : null; // 只在「已載入 members」時顯示分攤
}

function _ymdToUtcMs(s) {
  const m = String(s || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return NaN;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  return Date.UTC(y, mo, d);
}

function bookingStayNights(b) {
  const checkIn = _ymdToUtcMs(b?.date);
  const checkOut = _ymdToUtcMs(bookingStayCheckOutDate(b));
  if (!Number.isFinite(checkIn) || !Number.isFinite(checkOut)) return null;
  const diff = Math.round((checkOut - checkIn) / 86400000);
  return diff > 0 ? diff : null;
}

function bookingStayPerPerson(b) {
  const total = Number(b?.priceTwd);
  const n = bookingStaySplitCount();
  if (!Number.isFinite(total) || !n) return null;
  return Math.round(total / n);
}

function bookingStayPerPersonPerNight(b) {
  const total = Number(b?.priceTwd);
  const n = bookingStaySplitCount();
  const nights = bookingStayNights(b);
  if (!Number.isFinite(total) || !n || !nights) return null;
  return Math.round(total / (n * nights));
}


const backupTab = ref("snacks"); // food | snacks | beauty | places



// ✅ 零食/美妝/購物：共用同一套 UI 與上傳邏輯
const snackLikeKind = computed(() => {
  if (backupTab.value === "beauty") return "beauty";
  if (backupTab.value === "shopping") return "shopping";
  return "snacks";
});

// ✅ 清單/圖片庫切換
const snackGalleryMode = ref(false);

// ✅ 只收集「有上傳照片」的項目（用於圖片庫展示）
const snackLikePhotoItems = computed(() => {
  const k = snackLikeKind.value;
  const items = backup.value?.[k]?.items || [];
  return items.filter((it) => Boolean(it.photoUrl));
});

// ✅ 依 done 排序：未勾選在上、已勾選在下；同組內用 createdAt 新到舊
function sortBackupByDone(items) {
  const toMs = (t) => (t && typeof t.toMillis === "function" ? t.toMillis() : 0);

  return [...items].sort((a, b) => {
    const ad = !!a.done;
    const bd = !!b.done;
    if (ad !== bd) return ad ? 1 : -1; // done=true 往下
    return toMs(b.createdAt) - toMs(a.createdAt); // 同組內：新到舊
  });
}

// ✅ 零食/美妝/購物：清單模式顯示用（會自動把勾選的放到底部）
const snackLikeSortedItems = computed(() => {
  const k = snackLikeKind.value;
  const items = backup.value?.[k]?.items || [];
  return sortBackupByDone(items);
});

// ✅ 圖片庫也同樣：勾選的放到底部（可選，但一致性更好）
const snackLikePhotoItemsSorted = computed(() => {
  const k = snackLikeKind.value;
  const items = backup.value?.[k]?.items || [];
  return sortBackupByDone(items.filter((it) => Boolean(it.photoUrl)));
});



// ✅ 離開這三個分頁時，自動回到清單模式
watch(backupTab, (v) => {
  if (v !== "snacks" && v !== "beauty" && v !== "shopping") snackGalleryMode.value = false;
});



/* ===================== Backup（備用：美食/地點） ===================== */
const backup = ref({
  food: { items: [], loading: false, error: "" },
  snacks: { items: [], loading: false, error: "" },
  beauty: { items: [], loading: false, error: "" },
  shopping: { items: [], loading: false, error: "" }, // ✅ 新增
  places: { items: [], loading: false, error: "" },
});




let unsubBackupFood = null;
let unsubBackupSnacks = null;
let unsubBackupBeauty = null;
let unsubBackupPlaces = null;
let unsubBackupShopping = null;

function backupCollectionKey(kind) {
  if (kind === "food") return "backup_food";
  if (kind === "snacks") return "backup_snacks";
  if (kind === "beauty") return "backup_beauty";
  if (kind === "shopping") return "prep_shopping"; // ✅ 修正：購物沿用你原本 trips/{tripId}/prep_shopping
  return "backup_places";
}





function subscribeBackup(kind) {
  const key = backupCollectionKey(kind);

  backup.value[kind].loading = true;
  backup.value[kind].error = "";

  // 先用 createdAt 拉資料（穩定、避免要求你建 composite index）
  const qy = query(collection(db, "trips", activeTripId, key), orderBy("createdAt", "desc"));

  const unsub = onSnapshot(
    qy,
    (snap) => {
      let items = snap.docs.map((d) => {
        const data = d.data() || {};
        return {
          id: d.id,
          title: data.title || data.text || "",
          note: data.note || "",
          mapQuery: data.mapQuery || "",
          order: typeof data.order === "number" ? data.order : null,
          createdAt: data.createdAt || null,
          updatedAt: data.updatedAt || null,

          // food
          branch: data.branch || "",
          mustEat: data.mustEat || "",
          queueMins: typeof data.queueMins === "number" ? data.queueMins : null,

          // places
          address: data.address || "",
          hours: data.hours || "",

          // snacks

          photoUrl: data.photoUrl || "",
          photoPath: data.photoPath || "",
          photoName: data.photoName || "",
          photoType: data.photoType || "",
          // ✅ 勾選狀態（未設定視為 false）
          done: !!data.done,
        };
      });



      backup.value[kind].items = items;
      backup.value[kind].loading = false;
    },
    (err) => {
      console.error("讀取 backup 失敗：", err);
      backup.value[kind].items = [];
      backup.value[kind].loading = false;
      backup.value[kind].error = err?.message ? String(err.message) : "未知錯誤";
    }
  );

  if (kind === "food") unsubBackupFood = unsub;
  if (kind === "snacks") unsubBackupSnacks = unsub;
  if (kind === "beauty") unsubBackupBeauty = unsub;
  if (kind === "shopping") unsubBackupShopping = unsub;
  if (kind === "places") unsubBackupPlaces = unsub;

}


function subscribeBackupAll() {
  if (unsubBackupFood) unsubBackupFood();
  if (unsubBackupSnacks) unsubBackupSnacks();
  if (unsubBackupBeauty) unsubBackupBeauty();
  if (unsubBackupPlaces) unsubBackupPlaces();

  
  subscribeBackup("snacks");
  subscribeBackup("beauty");
  subscribeBackup("shopping"); // ✅ 新增
  
}



function unsubscribeBackupAll() {
  if (unsubBackupFood) unsubBackupFood();
  if (unsubBackupSnacks) unsubBackupSnacks();
  if (unsubBackupBeauty) unsubBackupBeauty();
  if (unsubBackupShopping) unsubBackupShopping();
  if (unsubBackupPlaces) unsubBackupPlaces();

  unsubBackupFood = null;
  unsubBackupSnacks = null;
  unsubBackupBeauty = null;
  unsubBackupShopping = null;
  unsubBackupPlaces = null;
}



/* ===== Backup editor modal ===== */
const backupEditor = ref({
  open: false,
  kind: "food", // food | places
  isEdit: false,
  id: "",
  form: {
    title: "",
    note: "",
    mapQuery: "",

    // food

    mustEat: "",
    queueMins: null,

    // snacks
    usageDate: "",
    photoUrl: "",
    photoPath: "",
    photoName: "",
    photoType: "",

    // places

    hours: "",
  },

});



function openBackupEditor(kind, itemOrNull) {
  backupEditor.value.open = true;
  backupEditor.value.kind = kind;

  if (!itemOrNull) {
    backupEditor.value.isEdit = false;
    backupEditor.value.id = "";
    backupEditor.value.form = {
      title: "",
      note: "",
      mapQuery: "",

      mustEat: "",
      queueMins: null,

      usageDate: "",
      photoUrl: "",
      photoPath: "",
      photoName: "",
      photoType: "",


      hours: "",
    };

if (kind === "snacks" || kind === "beauty" || kind === "shopping") {
  snackPhotoFile.value = null;
  snackPhotoProgress.value = 0;
  snackPhotoUploading.value = false;
  snackPhotoFileName.value = "";
  
}



    return;
  }

  backupEditor.value.isEdit = true;
  backupEditor.value.id = itemOrNull.id || "";
  backupEditor.value.form = {
    title: itemOrNull.title || "",
    note: itemOrNull.note || "",
    mapQuery: itemOrNull.mapQuery || "",


    mustEat: itemOrNull.mustEat || "",
    queueMins: typeof itemOrNull.queueMins === "number" ? itemOrNull.queueMins : null,

    usageDate: itemOrNull.usageDate || "",
    photoUrl: itemOrNull.photoUrl || "",
    photoPath: itemOrNull.photoPath || "",
    photoName: itemOrNull.photoName || "",
    photoType: itemOrNull.photoType || "",


    hours: itemOrNull.hours || "",
  };

snackPhotoFile.value = null;
snackPhotoProgress.value = 0;
snackPhotoUploading.value = false;

}

function closeBackupEditor() {
  backupEditor.value.open = false;
}

async function saveBackupEdit(options = { keepOpen: false }) {
  if (!canWrite.value) return alert("只讀模式無法儲存：請先登入並被加入 members。");
  if (isAnyUploading.value && !options?.ignoreUploadCheck) return alert("上傳進行中，請等待上傳完成或按取消後再儲存。");



  const kind = backupEditor.value.kind;
  const key = backupCollectionKey(kind);

  const title = String(backupEditor.value.form.title || "").trim();
  if (!title) return alert("請填寫名稱。");

  const payload = {
    title,
    note: String(backupEditor.value.form.note || "").trim(),
    order: Date.now(),
    updatedAt: serverTimestamp(),
  };

  // ✅ mapQuery：零食 / 美妝 / 購物 不需要；美食/地點才存
  if (kind !== "snacks" && kind !== "beauty" && kind !== "shopping") {
    payload.mapQuery = String(backupEditor.value.form.mapQuery || "").trim();
  }

  if (kind === "food") {
    payload.mustEat = String(backupEditor.value.form.mustEat || "").trim();
    payload.queueMins =
      typeof backupEditor.value.form.queueMins === "number"
        ? backupEditor.value.form.queueMins
        : null;

  } else if (kind === "snacks" || kind === "beauty" || kind === "shopping") {
    // ✅ 零食/美妝/購物：同款「照片欄位」
    payload.photoUrl = String(backupEditor.value.form.photoUrl || "").trim();
    payload.photoPath = String(backupEditor.value.form.photoPath || "").trim();
    payload.photoName = String(backupEditor.value.form.photoName || "").trim();
    payload.photoType = String(backupEditor.value.form.photoType || "").trim();
  } else {
    // ✅ 地點：營業時間
    payload.hours = String(backupEditor.value.form.hours || "").trim();
  }



  try {
    if (backupEditor.value.isEdit && backupEditor.value.id) {
      await updateDoc(doc(db, "trips", activeTripId, key, backupEditor.value.id), payload);
      if (!options.keepOpen) closeBackupEditor();
      return backupEditor.value.id;
    } else {
      const refDoc = await addDoc(collection(db, "trips", activeTripId, key), {
        ...payload,
        createdAt: serverTimestamp(),
      });

      // ✅ 讓「新增後立刻可上傳照片」：把狀態切到 edit
      backupEditor.value.isEdit = true;
      backupEditor.value.id = refDoc.id;

      if (!options.keepOpen) closeBackupEditor();
      return refDoc.id;
    }
  } catch (e) {
    console.error("儲存 backup 失敗：", e);
    alert(`儲存失敗：${e?.code || ""} ${e?.message || e}`);
    return "";
  }
}


async function deleteBackupItem() {
  if (!canWrite.value) return alert("只讀模式無法刪除：請先登入並被加入 members。");
  if (!backupEditor.value.isEdit || !backupEditor.value.id) return;

  const kind = backupEditor.value.kind;
  const key = backupCollectionKey(kind);

  const ok = confirm("確定要刪除這筆嗎？");
  if (!ok) return;

  try {
    await deleteDoc(doc(db, "trips", activeTripId, key, backupEditor.value.id));
    closeBackupEditor();
  } catch (e) {
    console.error("刪除 backup 失敗：", e);
    alert("刪除失敗（可能是 rules 不允許 delete）");
  }
}

// ✅ 備用清單（零食/美妝/購物）：勾選後寫回 done，且 UI 會因排序自動移到底部
async function toggleBackupDone(kind, item, ev) {
  const checked = !!ev?.target?.checked;

  // 先即時反映在 UI（手感更好）
  item.done = checked;

  if (!canWrite.value) {
    // 只讀模式：不允許勾選
    item.done = !checked;
    alert("只讀模式無法勾選：請先登入並被加入 members。");
    return;
  }

  try {
    const key = backupCollectionKey(kind);
    await updateDoc(doc(db, "trips", activeTripId, key, item.id), {
      done: checked,
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    console.error("更新 done 失敗：", e);
    // 失敗就還原
    item.done = !checked;
    alert(`勾選更新失敗：${e?.code || ""} ${e?.message || e}`);
  }
}


// ✅ Bottom nav 點擊回饋（對應 template 的 :class="{ ..., pulse: navPulse === 'xxx' }"）
const navPulse = ref("");

// ✅ 底部切換頁面：桌機 click / 手機 tap 通用
function scrollToTopNow() {
  // 置頂：支援大多數瀏覽器 + 手機 webview
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });

  // 保險：若未來改成容器滾動，也能同步置頂
  const main = document.querySelector(".app-main");
  if (main) main.scrollTop = 0;
}


/* ===== Snacks photo upload ===== */
const snackPhotoFile = ref(null);
const snackPhotoFileName = ref(""); // 顯示用檔名（複製預定頁做法）

const snackPhotoUploading = ref(false);
// ✅ 任何上傳進行中：禁止儲存（憑證/住宿封面/零食照片）
const isAnyUploading = computed(() => {
  return Boolean(
    bookingVoucherUploading.value ||
    bookingCoverUploading.value ||
    snackPhotoUploading.value
  );
});

const snackPhotoProgress = ref(0);

function onSnackPhotoFileChange(ev) {
  const input = ev?.target;
  const f = input?.files?.[0] || null;

  snackPhotoFile.value = f;
  snackPhotoFileName.value = f ? (f.name || "已選擇照片") : "";
  snackPhotoProgress.value = 0;

  // ✅ 保留：修 iOS/部分瀏覽器同檔重選不觸發 change
  if (input) input.value = "";
}


function openSnackPhoto(it) {
  const url = it?.photoUrl || "";
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

async function deleteSnackPhoto() {
  if (!canWrite.value) return alert("只讀模式無法刪除：請先登入並被加入 members。");

  const kind = backupEditor.value.kind;
  if (kind !== "snacks" && kind !== "beauty" && kind !== "shopping") return;

  const key = backupCollectionKey(kind);


  const snackId = backupEditor.value.id;
  const photoUrl = backupEditor.value.form?.photoUrl || "";
  const photoPath = backupEditor.value.form?.photoPath || "";

  if (!photoUrl) return;

  if (!confirm("確定要刪除這張照片嗎？（會同時刪除雲端 Storage 檔案）")) return;

  try {
    // ✅ 1) 刪 Storage（有 photoPath 才刪）
    if (photoPath) {
      try {
        await deleteObject(sRef(storage, photoPath));
      } catch (e) {
        // 檔案可能已不存在：不致命，繼續清 Firestore
        console.warn("deleteObject failed (ignored):", e?.code || e, e);
      }
    }

    // ✅ 2) 清 Firestore（有 id 才能寫回）
    if (snackId) {
      await updateDoc(doc(db, "trips", activeTripId, key, snackId), {
        photoUrl: "",
        photoPath: "",
        photoName: "",
        photoType: "",
        updatedAt: serverTimestamp(),
      });
    }

    // ✅ 3) 清 modal 畫面 / 本地狀態
    backupEditor.value.form.photoUrl = "";
    backupEditor.value.form.photoPath = "";
    backupEditor.value.form.photoName = "";
    backupEditor.value.form.photoType = "";

    snackPhotoFile.value = null;
    snackPhotoProgress.value = 0;

    alert("照片已刪除 ✅");
  } catch (e) {
    console.error("零食照片刪除失敗：", e);
    alert(`刪除失敗：${e?.code || ""} ${e?.message || e}`);
  }
}


async function uploadSnackPhoto() {
  if (!canWrite.value) return alert("只讀模式無法上傳：請先登入並被加入 members。");

  const kind = backupEditor.value.kind;
  if (kind !== "snacks" && kind !== "beauty" && kind !== "shopping") return;

  const key = backupCollectionKey(kind);



  if (!snackPhotoFile.value) return alert("請先選擇圖片檔案。");
  if (snackPhotoUploading.value) return;

  snackPhotoUploading.value = true;
  snackPhotoProgress.value = 0;

  try {
    // ✅ 沒有 id 就先存一筆（keepOpen=true，避免 modal 關掉）
    let snackId = backupEditor.value.id;
    if (!snackId) {
      snackId = await saveBackupEdit({ keepOpen: true, ignoreUploadCheck: true });

      if (!snackId) throw new Error("建立零食資料失敗，無法上傳照片。");
    }

    const file = snackPhotoFile.value;
    const safeName = `${Date.now()}-${String(file.name || "snack").replace(/[^\w.\-]+/g, "_")}`;
    const path = `trips/${activeTripId}/${key}/${snackId}/${safeName}`;


    const storageRef = sRef(storage, path);
    const task = uploadBytesResumable(storageRef, file, {
      contentType: file.type || "image/jpeg",
    });

    await new Promise((resolve, reject) => {
      task.on(
        "state_changed",
        (snap) => {
          const p = snap.totalBytes ? Math.round((snap.bytesTransferred / snap.totalBytes) * 100) : 0;
          snackPhotoProgress.value = p;
        },
        reject,
        resolve
      );
    });

    const url = await getDownloadURL(task.snapshot.ref);

    // ✅ 寫回 Firestore
    await updateDoc(doc(db, "trips", activeTripId, key, snackId), {
      photoUrl: url,
      photoPath: path,
      photoName: safeName,
      photoType: file.type || "",
      updatedAt: serverTimestamp(),
    });

    // ✅ 更新 modal 畫面
    backupEditor.value.form.photoUrl = url;
    backupEditor.value.form.photoPath = path;
    backupEditor.value.form.photoName = safeName;
    backupEditor.value.form.photoType = file.type || "";

    snackPhotoFile.value = null;
    snackPhotoFileName.value = "";
      alert("照片上傳成功 ✅");

  } catch (e) {
    console.error("零食照片上傳失敗：", e);
    alert(`上傳失敗：${e?.code || ""} ${e?.message || e}`);
  } finally {
    snackPhotoUploading.value = false;
  }
}



const VALID_PAGES = new Set(["itinerary", "booking", "accounting", "prep", "tools", "backup", "members"]);




function goPage(page) {
  // 1) 防呆：避免 page 變成 event 或未知字串（未知就會進入 v-if/else-if 鏈外 => 白畫面）
  const next = VALID_PAGES.has(page) ? page : "itinerary";

  // 2) 重複點同頁：給點回饋就好，不切
  if (currentPage.value === next) {
    navPulse.value = next;
    window.setTimeout(() => {
      if (navPulse.value === next) navPulse.value = "";
    }, 260);
    return;
  }

  currentPage.value = next;
  // ✅ 每次切到行程頁：若 plan 內含「今天日期」，自動跳到今天
  if (next === "itinerary") {
    // plan 可能還沒載完：先試一次；沒有就掛起來等 plan 有資料再跳
    pendingAutoJumpToToday.value = !autoSelectTodayDayIfExists();
  }

  // 3) 切頁後：等 DOM 更新完成再置頂（不新增新函式，直接呼叫你原本已存在的 scrollToTopNow）
  nextTick(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      try { scrollToTopNow(); } catch (_) { window.scrollTo({ top: 0, left: 0, behavior: "auto" }); }
    }));
  });

  // 4) 點擊動畫
  navPulse.value = next;
  window.setTimeout(() => {
    if (navPulse.value === next) navPulse.value = "";
  }, 260);

  // 5) 記帳頁切入時的 tab 防呆
  if (next === "accounting") {
    try {
      accountingTab.value = canWrite.value ? "entry" : "detail";
    } catch (e) {
      console.warn("[goPage] accountingTab set failed:", e);
    }
  }
}




/* ===================== Bottom Nav：保險切頁（mobile click 容錯） ===================== */



// ===================== Mobile UX：底部導覽列「類 haptic」回饋 =====================
/*const navPulse = ref("");*/
let navPulseTimer = null;




const pageTitle = computed(() => {
  if (currentPage.value === "itinerary") return "行程";
  if (currentPage.value === "booking") return "預定";
  if (currentPage.value === "accounting") return "記帳";
  if (currentPage.value === "prep") return "準備";
  if (currentPage.value === "tools") return "工具";
  if (currentPage.value === "backup") return "備用";
  if (currentPage.value === "members") return "成員";
  return "";
});


/* ===================== Lifecycle ===================== */

watch(
  () => activeTripId,
  async (newTripId) => {
    await loadTripMetaTitle(newTripId);
  },
  { immediate: true }
);


onMounted(async () => {

  // ===== Mobile: 禁止縮放（pinch / ctrl+wheel）保險 =====
  const preventZoom = (e) => {
    if (e.cancelable) e.preventDefault();
  };

  // iOS Safari pinch gestures
  document.addEventListener("gesturestart", preventZoom, { passive: false });
  document.addEventListener("gesturechange", preventZoom, { passive: false });
  document.addEventListener("gestureend", preventZoom, { passive: false });

  // Desktop trackpad / ctrl+wheel zoom
  document.addEventListener(
    "wheel",
    (e) => {
      if (e.ctrlKey) preventZoom(e);
    },
    { passive: false }
  );

  // 若 runtime 環境沒吃到 index.html 的 viewport，嘗試補寫一次
  const vp = document.querySelector('meta[name="viewport"]');
  if (vp) {
    vp.setAttribute(
      "content",
      "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
    );
  }


// ✅ 未登入也要能看：一進來先載入可公開閱讀的資料（任何一步失敗都不要讓整個 App 掛掉）
try { await loadPlan(); } catch (e) { console.warn("[init] loadPlan failed:", e); }
try { await reloadExpenses(); } catch (e) { console.warn("[init] reloadExpenses failed:", e); }
try { await loadPrepAll(); } catch (e) { console.warn("[init] loadPrepAll failed:", e); }
try { await refreshFxTool(); } catch (e) { console.warn("[init] refreshFxTool failed:", e); }

try { subscribeBookings(); } catch (e) { console.warn("[init] subscribeBookings failed:", e); }



  onAuthStateChanged(auth, async (u) => {
  // ✅ 這行放最上面：不管後面發生什麼錯，都一定先印出登入狀態
  console.log("[AUTH] state =", u ? "SIGNED_IN" : "SIGNED_OUT", "uid =", u?.uid, "email =", u?.email);

  try {
    user.value = u || null;
    

    membershipChecked.value = false;
    isMember.value = false;
    members.value = [];

  if (!user.value) {
    // ✅ 登出：關掉 bookings listener，避免卡在 permission-denied 後永遠空白
    unsubscribeBookings();
    bookings.value = [];
    bookingLoading.value = false;

    stopHeartbeat();
    unsubscribePresence();
    stopInvitesListener();
    membershipChecked.value = true;
    isMember.value = false;

    if (accountingTab.value === "entry") accountingTab.value = "detail";

    console.log("[AUTH] canWrite =", canWrite.value, "(signed out)");
    unsubscribeBackupAll();
    return;
  }

// ✅ 登入：先重建 bookings listener（避免登出時錯誤後 listener 死掉）
subscribeBookings();

// 登入：presence + member 檢查
subscribePresence();
await upsertPresence();
startHeartbeat();

// ✅ 先嘗試吃邀請（用 Email 自動加入）
await tryClaimInviteOnLogin();

await checkMembership();
// ✅ 重要：登入且通過 members 檢查後，重新讀取 plan（避免初次未登入讀取失敗後一直為空）
if (isMember.value) {
  await loadPlan();
}

// ✅ 只有成員才訂閱備用清單（避免一開始 permission-denied 後永遠看不到）
if (isMember.value) {
  subscribeBackupAll();
} else {
  unsubscribeBackupAll();
}

console.log(
  "[AUTH] membershipChecked =",
  membershipChecked.value,
  "isMember =",
  isMember.value,
  "canWrite =",
  canWrite.value
);

// ✅ 成員就訂閱 members 清單（owner / 只讀成員都要能看到）
if (isMember.value) {
  startMembersListener();

  // ✅ 只有 owner 才需要看邀請清單
  if (isOwner.value) startInvitesListener();
  else stopInvitesListener();

  const me = userLabel.value;
  uiMember.value = memberChips.value.includes(me) ? me : memberChips.value[0] || me;
} else {
  stopMembersListener();
  stopInvitesListener();
  members.value = [];

  if (accountingTab.value === "entry") accountingTab.value = "detail";
}


    // 登入：presence + member 檢查
    subscribePresence();
    await upsertPresence();
    startHeartbeat();

    // ✅ 先嘗試吃邀請（用 Email 自動加入）
    await tryClaimInviteOnLogin();

    await checkMembership();
    // ✅ 重要：登入且通過 members 檢查後，重新讀取 plan（避免初次未登入讀取失敗後一直為空）
    if (isMember.value) {
      await loadPlan();
    }


    // ✅ 只有成員才訂閱備用清單（避免一開始 permission-denied 後永遠看不到）
    if (isMember.value) {
      subscribeBackupAll();
    } else {
      unsubscribeBackupAll();
    }


    console.log("[AUTH] membershipChecked =", membershipChecked.value, "isMember =", isMember.value, "canWrite =", canWrite.value);

    // ✅ 成員就訂閱 members 清單（owner / 只讀成員都要能看到）
    // 目的：成員管理頁可以看到清單、記帳的 member chips 也有資料
    if (isMember.value) {
      startMembersListener();

      // ✅ 只有 owner 才需要看邀請清單
      if (isOwner.value) startInvitesListener();
      else stopInvitesListener();

      const me = userLabel.value;
      uiMember.value = memberChips.value.includes(me) ? me : memberChips.value[0] || me;
    } else {
      stopMembersListener();
      stopInvitesListener();
      members.value = [];

      if (accountingTab.value === "entry") accountingTab.value = "detail";
    }


  } catch (e) {
    // ✅ 關鍵：如果登入後任何一段 throw，你之前加在下面的 log 就永遠看不到
    console.error("[AUTH] onAuthStateChanged crashed:", e);
  }
  });

});

onBeforeUnmount(() => {
  unsubscribeBookings();
  stopHeartbeat();
  unsubscribePresence();
  unsubscribePrepAll();
  unsubscribeBackupAll();
  stopMembersListener();

  if (navPulseTimer) clearTimeout(navPulseTimer);
});


/* ===================== Auth actions ===================== */
async function loginGoogle() {
  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
}

async function logout() {
  stopHeartbeat();
  await signOut(auth);
}

async function openTripModal() {
  // ✅ trip switch UI
  tripModal.selectedTripId = activeTripId;

  // ✅ 下拉 trip 清單：localStorage 歷史 + Firestore 你加入過的 trips
  const history = getTripHistory();
  const mine = await fetchMyTripIds();
  const merged = [...new Set([DEFAULT_TRIP_ID, activeTripId, ...history, ...mine].filter(Boolean))];
  tripModal.knownTripIds = merged.slice(0, 30);

  // ✅ 新旅程表單：不要讀現有 activeTripId 的 meta
  // （這裡可視需求改成你想要的預設值）
  tripModal.titleLocked = false;     // 新旅程允許編輯標題
  tripModal.title = "";              // 新旅程標題
  tripModal.startDate = "";          // 新旅程起始日期
  tripModal.days = 7;                // 預設天數
  tripModal.weatherCity = "";        // 新旅程天氣城市（選填）

  tripModal.open = true;
}






function closeTripModal() {
  tripModal.open = false;
}




async function loadTripMetaTitle(tripId) {
  // ✅ 兼容舊呼叫：改讀完整 meta（title/startDate/days/titleLocked）
  await loadTripMeta(tripId);
}

// ✅ 讀取旅程 meta
async function loadTripMeta(tripId) {
  try {
    const snap = await getDoc(doc(db, "trips", tripId, "meta", "info"));
    const data = snap.exists() ? (snap.data() || {}) : {};

    tripTitle.value = String(data.title || "").trim();
    tripMeta.startDate = String(data.startDate || "").trim();
    tripMeta.days = Number(data.days || 0) || 0;
    tripMeta.titleLocked = !!data.titleLocked;
    tripMeta.weatherCity = String(data.weatherCity || "").trim();
  } catch (e) {
    console.error("[loadTripMeta] failed:", e);
    tripTitle.value = "";
    tripMeta.startDate = "";
    tripMeta.days = 0;
    tripMeta.titleLocked = false;
    tripMeta.weatherCity = "";
  }
}

function isoAddDays(ymd, add) {
  if (!ymd) return "";
  const d = new Date(`${ymd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + Number(add || 0));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function computeEndDate(startDate, days) {
  const n = Math.max(1, Math.min(31, Number(days || 1)));
  return startDate ? isoAddDays(startDate, n - 1) : "";
}

// ===================== Trip history（下拉選單資料來源） =====================
function getTripHistory() {
  try {
    const raw = localStorage.getItem("tripIdHistory");
    const arr = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(arr) ? arr.map((s) => String(s || "").trim()).filter(Boolean) : [];

    // 保底：永遠包含預設與目前旅程
    const base = [DEFAULT_TRIP_ID, activeTripId].filter(Boolean);
    const merged = [...base, ...list];

    // unique + keep order
    const seen = new Set();
    const out = [];
    for (const id of merged) {
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
    return out.slice(0, 20); // 最多保留 20 個
  } catch {
    return [DEFAULT_TRIP_ID, activeTripId].filter(Boolean);
  }
}

async function fetchMyTripIds() {
  try {
    const u = auth.currentUser;
    if (!u) return [];

    // 透過 collectionGroup 掃描：trips/{tripId}/members/{uid}
    const qy = query(
      collectionGroup(db, "members"),
      where(FieldPath.documentId(), "==", u.uid)
    );

    const snap = await getDocs(qy);
    const ids = [];

    snap.forEach((d) => {
      // d.ref: .../trips/{tripId}/members/{uid}
      const tripId = d.ref?.parent?.parent?.id;
      if (tripId) ids.push(String(tripId));
    });

    // unique + keep order
    const seen = new Set();
    return ids.filter((x) => {
      if (!x || seen.has(x)) return false;
      seen.add(x);
      return true;
    });
  } catch (e) {
    console.warn("[fetchMyTripIds] failed:", e);
    return [];
  }
}


function pushTripHistory(tripId) {
  const id = String(tripId || "").trim();
  if (!id) return;
  const list = getTripHistory();
  const next = [id, ...list.filter((x) => x !== id)];
  localStorage.setItem("tripIdHistory", JSON.stringify(next.slice(0, 20)));
}



watch(
  () => [tripModal.startDate, tripModal.days],
  () => {
    tripModal.endDate = computeEndDate(tripModal.startDate, tripModal.days);
  }
);

function syncTripModalFromMeta(tripId) {
  // title：若已鎖定，沿用 meta 的 title；否則預填（方便第一次設定）
  tripModal.titleLocked = !!tripMeta.titleLocked;
  tripModal.title = tripTitle.value || "";
  tripModal.startDate = tripMeta.startDate || "";

  // days：優先用 meta.days；沒有就用 plan 長度；再沒有就 7
  const planDays = Array.isArray(plan.value) ? plan.value.length : 0;
  const n = tripMeta.days || planDays || 7;
  tripModal.days = Math.max(1, Math.min(31, Number(n || 7)));
  tripModal.endDate = computeEndDate(tripModal.startDate, tripModal.days);
  tripModal.weatherCity = tripMeta.weatherCity || "";

}

// ✅ 儲存「旅途設定」：title（一次性鎖定）+ startDate + days
async function saveTripSettings(opts = {}) {

  if (!user.value) return;

  const title = String(tripModal.title || "").trim();
  const startDate = String(tripModal.startDate || "").trim();
  const days = Math.max(1, Math.min(31, Number(tripModal.days || 7)));

  if (!title || !startDate) {
    alert("⚠️ 請先填：起始日期 + 行程標題（必填）");
    return;
  }

  // 讀一次目前 meta，決定 title 是否可寫
  const refInfo = doc(db, "trips", activeTripId, "meta", "info");
  const snap = await getDoc(refInfo);
  const cur = snap.exists() ? (snap.data() || {}) : {};
  const alreadyLocked = !!cur.titleLocked;
  const rawWeather = String(tripModal.weatherCity || "").trim();
  const guessedWeather = rawWeather ? (guessCityFromText(rawWeather) || rawWeather) : "";
  const weatherCity = String(weatherCityArg || "").trim();

  const patch = {
    startDate,
    days,
    weatherCity, // ✅ 新增
    updatedAt: serverTimestamp(),
  };


  // 只有未鎖定時才允許寫 title，並在這次鎖定
  if (!alreadyLocked) {
    patch.title = title;
    patch.titleLocked = true;
  }

  await setDoc(refInfo, patch, { merge: true });
  await loadTripMeta(activeTripId);
  syncTripModalFromMeta(activeTripId);
  if (!opts.silent) alert("✅ 已確認旅途設定");
}

// ✅ 一鍵整合：套用行程日期 + 確認旅途設定（只跳一次訊息）
async function applyAndConfirmTripSettings() {
  // ✅ 這裡開始：全部是「建立新旅程」用
  const cleanTitle = String(tripModal.title || "").trim();
  const cleanStart = String(tripModal.startDate || "").trim();
  const n = Number(tripModal.days || 0);

  if (!cleanTitle) {
    alert("請輸入行程標題");
    return;
  }
  if (!cleanStart) {
    alert("請選擇起始日期");
    return;
  }
  if (!Number.isFinite(n) || n < 1 || n > 60) {
    alert("天數請輸入 1~60");
    return;
  }

  // ✅ 呼叫你既有 createNewTrip() 建立新的 tripId
  // 建議：讓 createNewTrip 接收 weatherCity（下面第 3 點會補）
  await createNewTrip(n, cleanStart, cleanTitle, String(tripModal.weatherCity || "").trim());

  tripModal.open = false;
}



// ✅ 把起始日期套用到目前旅程 plan（不改 events，只改每一天 date）
async function applyTripStartDateToPlan(opts = {}) {
  if (!user.value) return;
  const startDate = String(tripModal.startDate || "").trim();
  if (!startDate) return;

  // 以目前 plan 的天數為準（避免一鍵把資料洗掉）
  const days =
    Array.isArray(plan.value) && plan.value.length
      ? plan.value.length
      : Math.max(1, Math.min(31, Number(tripModal.days || 7)));

  for (let d = 1; d <= days; d++) {
    const dayId = `D${d}`;
    await setDoc(
      doc(db, "trips", activeTripId, "plan", dayId),
      { date: isoAddDays(startDate, d - 1), updatedAt: serverTimestamp() },
      { merge: true }
    );
  }

  await setDoc(
    doc(db, "trips", activeTripId, "meta", "info"),
    { startDate, days, updatedAt: serverTimestamp() },
    { merge: true }
  );

  await loadPlan();
  tripModal.endDate = computeEndDate(startDate, days);
  if (!opts.silent) alert("✅ 已套用起始日期到行程日期");
}


async function saveTripTitle(tripId, title) {
  const clean = String(title || "").trim();
  await setDoc(
    doc(db, "trips", tripId, "meta", "info"),
    { title: clean, updatedAt: serverTimestamp() },
    { merge: true }
  );
  tripTitle.value = clean;
}

async function switchTrip(id) {
  const next = String(id || "").trim();
  if (!next) return;

  if (next === activeTripId) {
    tripModal.open = false;
    return;
  }

  // ✅ 先清空舊標題，避免 UI 短暫顯示上一個旅程名稱
  tripTitle.value = "";

  activeTripId = next;
  localStorage.setItem("activeTripId", next);
  tripModal.open = false;

  pushTripHistory(next);

  // ✅ 關鍵：切換後立刻讀取新旅程的 meta，讓 tripTitle 更新
  await loadTripMeta(next);

  // ✅ 切換後立刻重載（避免留在空畫面）
  await rehydrateTripData();
}



function genTripId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let s = "HM-";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

async function createNewTrip(days = 7, startDate = "", title = "", weatherCityArg = "") {


  if (!user.value) return;

  const n = Math.max(1, Math.min(31, Number(days || 7)));
  const cleanStart = String(startDate || "").trim();
  const cleanTitle = String(title || "").trim();
  if (!cleanStart || !cleanTitle) {
    alert("⚠️ 建立新旅程需要：起始日期 + 行程標題（必填）");
    return;
  }

  const newId = genTripId();

  // 先切換到新旅程（後面寫入都用 activeTripId）
  activeTripId = newId;
  localStorage.setItem("activeTripId", newId);
  pushTripHistory(newId);

  // ✅ 1) 建立 members/{uid}（owner）
  const meRef = doc(db, "trips", activeTripId, "members", user.value.uid);
  await setDoc(
    meRef,
    {
      uid: user.value.uid,
      displayName: userLabel.value || "Owner",
      role: "owner",
      canWrite: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  
  // ✅ 2) 建立 plan D1~Dn（依起始日期推算 date）
  for (let d = 1; d <= n; d++) {
    const dayId = `D${d}`;
    await setDoc(
      doc(db, "trips", activeTripId, "plan", dayId),
      {
        day: d,
        date: isoAddDays(cleanStart, d - 1),
        city: "",
        events: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  const rawWeather = String(tripModal.weatherCity || "").trim();
  const guessedWeather = rawWeather ? (guessCityFromText(rawWeather) || rawWeather) : "";
  const weatherCity = String(weatherCityArg || "").trim();

  // ✅ 3) 建立 meta（title 一次性鎖定）
  await setDoc(
    doc(db, "trips", activeTripId, "meta", "info"),
    {
      title: cleanTitle,
      titleLocked: true,
      startDate: cleanStart,
      days: n,
      weatherCity, 
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  tripTitle.value = cleanTitle;
  tripModal.open = false;
  await rehydrateTripData();
}


async function rehydrateTripData() {
  // 先清掉所有 listener / state（避免舊旅程殘留）
  unsubscribeBookings();
  unsubscribeBackupAll();
  stopMembersListener();
  stopInvitesListener();

  bookings.value = [];
  expenses.value = [];
  plan.value = [];
  activeDayId.value = null;

  // 未登入就只停在這（避免 permission-denied）
  if (!user.value) return;

  // ✅ 重新做 membership 檢查 → 再依權限訂閱
  await checkMembership();

  if (isMember.value) {
    await loadPlan();
    subscribeBookings();
    subscribeBackupAll();

    startMembersListener();
    if (isOwner.value) startInvitesListener();
  }
  
}

/* ===================== members 檢查 ===================== */
async function checkMembership() {
  membershipChecked.value = false;
  isMember.value = false;
  myMember.value = null;

  try {
    if (!user.value?.uid) {
      membershipChecked.value = true;
      return;
    }

    const refDoc = doc(db, "trips", activeTripId, "members", user.value.uid);
    const snap = await getDoc(refDoc);

    if (!snap.exists()) {
      isMember.value = false;
      myMember.value = null;
      membershipChecked.value = true;
      return;
    }

    isMember.value = true;

    const data = snap.data() || {};
    // ✅ 相容舊資料：沒 canWrite 就視為 true（避免你原本成員全部突然變只讀）
    myMember.value = {
      uid: data.uid || user.value.uid,
      displayName: data.displayName || user.value.displayName || "使用者",
      canWrite: (data.canWrite === undefined) ? true : !!data.canWrite,
      role: data.role || "member",
    };

    membershipChecked.value = true;
  } catch (e) {
    console.error("checkMembership 失敗：", e);
    // 保守：失敗就當只讀
    isMember.value = false;
    myMember.value = null;
    membershipChecked.value = true;
  }
}


/* ===================== Plan：trips/.../plan ===================== */
const plan = ref([]);
function downloadJsonFile(filename, dataObj) {
  const json = JSON.stringify(dataObj, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

function exportItineraryJson() {
  // ✅ 匯出「整份行程」：plan 內含所有天數（不只目前選到的那天）
  const cleanedPlan = (plan.value || []).map((day) => {
    const events = Array.isArray(day.events) ? day.events : [];
    // 移除 UI 用的 showNote（你存回 Firebase 時也會去掉它）
    const cleanedEvents = events.map(({ showNote, ...rest }) => rest);

    return {
      ...day,
      events: cleanedEvents,
    };
  });

  const payload = {
    schema: "honeymoon-itinerary-v1",
    tripId: activeTripId,
    exportedAt: new Date().toISOString(),
    plan: cleanedPlan,
  };

  const ymd = new Date().toISOString().slice(0, 10);
  const filename = `itinerary_${activeTripId}_${ymd}.json`;

  downloadJsonFile(filename, payload);
  alert("✅ 已匯出整份行程（JSON）");
}

const activeDayId = ref(null);

// ===================== Day Tabs：自動置中 & Today 標示 =====================
const dayChipElMap = new Map();

function setDayChipEl(dayId, el) {
  if (!dayId) return;
  if (el) dayChipElMap.set(dayId, el);
  else dayChipElMap.delete(dayId);
}



function isToday(dateStr) {
  return (dateStr || "") === taipeiTodayYMD();
}

function scrollDayChipIntoCenter(dayId) {
  const el = dayChipElMap.get(dayId);
  if (!el) return;

  const container = el.closest(".day-tabs");
  if (!container) {
    // fallback
    el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    return;
  }

  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const behavior = reduced ? "auto" : "smooth";

  const cRect = container.getBoundingClientRect();
  const eRect = el.getBoundingClientRect();
  const delta = (eRect.left + eRect.width / 2) - (cRect.left + cRect.width / 2);

  container.scrollBy({ left: delta, behavior });
}


const pendingAutoJumpToToday = ref(false);

function taipeiTodayYMD() {
  // ✅ 固定用 Asia/Taipei，避免使用者裝置時區不同造成日期偏差
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const y = parts.find((p) => p.type === "year")?.value || "";
  const m = parts.find((p) => p.type === "month")?.value || "";
  const d = parts.find((p) => p.type === "day")?.value || "";
  return `${y}-${m}-${d}`;
}





function autoSelectTodayDayIfExists() {
  const today = taipeiTodayYMD();
  const hit = (plan.value || []).find((day) => (day?.date || "") === today);
  if (!hit) return false;

  activeDayId.value = hit.id;
  nextTick(() => {
    requestAnimationFrame(() => scrollDayChipIntoCenter(hit.id));
  });

  return true;
}


const planLoading = ref(false);
// ===================== Mobile UX：切換天數回到頂端 =====================
const appMainEl = ref(null);

function scrollToTopSmart() {
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const behavior = reduced ? "auto" : "smooth";

  // 若未來你把 app-main 改成可獨立捲動，這裡會優先捲它
  const el = appMainEl.value;
  if (el && typeof el.scrollTo === "function") {
    el.scrollTo({ top: 0, behavior });
  }

  // 目前你的頁面主要是 window 捲動：確保一定回到頂端
  window.scrollTo({ top: 0, behavior });
  document.documentElement?.scrollTo?.({ top: 0, behavior });
}

function selectDay(dayId) {
  activeDayId.value = dayId;

  // ✅ 切換 day tab 時，把該顆 chip 捲到畫面中間（手機很好用）
  nextTick(() => {
    requestAnimationFrame(() => scrollDayChipIntoCenter(dayId));
  });
}


// ✅ 避免初次 loadPlan 設定 activeDayId 時也觸發（只針對「切換」）
let didInitDayScroll = false;

watch(activeDayId, () => {
  if (currentPage.value !== "itinerary") return;

  if (!didInitDayScroll) {
    didInitDayScroll = true;
    return;
  }

  // 等畫面完成切換後再回頂端（避免切換瞬間抖動）
  requestAnimationFrame(() => scrollToTopSmart());
});

watch([plan, currentPage], () => {
  if (currentPage.value !== "itinerary") return;
  if (!pendingAutoJumpToToday.value) return;

  const ok = autoSelectTodayDayIfExists();
  if (ok) pendingAutoJumpToToday.value = false;
});


/* ===================== Day swipe：左右滑切換天數 ===================== */
// ✅ 只要「水平位移夠大」且「垂直位移不大」，就視為左右滑；避免下滑誤觸切天數
const daySwipe = {
  x0: 0,
  y0: 0,
  dx: 0,
  dy: 0,
  tracking: false,
  locked: false, // 一旦判定是「垂直滑」，就鎖住，不再判定左右滑
};

function onDaySwipeStart(ev) {
  const t = ev?.touches?.[0];
  if (!t) return;

  daySwipe.x0 = t.clientX;
  daySwipe.y0 = t.clientY;
  daySwipe.dx = 0;
  daySwipe.dy = 0;
  daySwipe.tracking = true;
  daySwipe.locked = false;
}

function onDaySwipeMove(ev) {
  if (!daySwipe.tracking) return;
  const t = ev?.touches?.[0];
  if (!t) return;

  daySwipe.dx = t.clientX - daySwipe.x0;
  daySwipe.dy = t.clientY - daySwipe.y0;

  const adx = Math.abs(daySwipe.dx);
  const ady = Math.abs(daySwipe.dy);

  // ✅ 明顯在下滑/上滑：鎖住，避免左右切天數
  if (!daySwipe.locked && ady > 18 && ady > adx) {
    daySwipe.locked = true;
  }
}

/* ===================== Event drag (only via handle) ===================== */
/* ===================== Sub tabs swipe：左右滑切換次要分頁 ===================== */
// ✅ 用在：預定/記帳/準備/備用 的 segmented tabs（等同「行程切換不同旅遊天」）
// 規則：水平位移夠大 + 垂直位移不大；且在輸入框/按鈕/連結上開始滑動時不觸發
const subSwipe = {
  x0: 0,
  y0: 0,
  tracking: false,
};

function isInteractiveTarget(el) {
  if (!el || typeof el.closest !== "function") return false;
  return !!el.closest(
    "input, textarea, select, button, a, .btn, .seg-btn, .acc-pill, .member-pill"
  );
}

function shouldIgnoreSubSwipe(ev) {
  const el = ev?.target instanceof Element ? ev.target : null;
  if (!el) return true;

  // ✅ 任何 modal 開啟時，不做左右滑切 tab（避免編輯中誤觸）
  if (el.closest(".modal-overlay") || el.closest(".modal")) return true;

  // ✅ 在可互動/可輸入的元素上開始滑動，不切 tab（避免誤觸）
  if (isInteractiveTarget(el)) return true;

  return false;
}

function onSubSwipeStart(ev) {
  const t = ev?.touches?.[0];
  if (!t) return;

  if (shouldIgnoreSubSwipe(ev)) {
    subSwipe.tracking = false;
    return;
  }

  subSwipe.x0 = t.clientX;
  subSwipe.y0 = t.clientY;
  subSwipe.tracking = true;
}

function handleSubSwipeEnd(ev, tabs, tabRef) {
  if (!subSwipe.tracking) return;
  subSwipe.tracking = false;

  const t = ev?.changedTouches?.[0] || ev?.touches?.[0];
  if (!t) return;

  const dx = t.clientX - subSwipe.x0;
  const dy = t.clientY - subSwipe.y0;
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);

  // ✅ 位移太小、或主要是上下滑：不切換
  if (adx < 60) return;
  if (ady > 40) return;
  if (ady > adx) return;

  const idx = tabs.indexOf(tabRef.value);
  if (idx === -1) return;

  const nextIdx = dx < 0 ? idx + 1 : idx - 1; // 左滑＝下一頁；右滑＝上一頁
  if (nextIdx < 0 || nextIdx >= tabs.length) return;

  tabRef.value = tabs[nextIdx];
  requestAnimationFrame(() => scrollToTopSmart());
}

const BOOKING_TABS = ["flight", "hotel", "car", "voucher"];
function onBookingSwipeEnd(ev) {
  if (bookingEditor.value?.open) return;
  handleSubSwipeEnd(ev, BOOKING_TABS, bookingTab);
}

const ACCOUNTING_TABS = ["entry", "detail"];
function onAccountingSwipeEnd(ev) {
  if (expenseEditor.value?.open) return;
  handleSubSwipeEnd(ev, ACCOUNTING_TABS, accountingTab);
}

const PREP_TABS = ["todo", "luggage"];
function onPrepSwipeEnd(ev) {
  handleSubSwipeEnd(ev, PREP_TABS, prepTab);
}

const BACKUP_TABS = ["snacks", "beauty", "shopping"];
function onBackupSwipeEnd(ev) {
  if (backupEditor.value?.open) return;
  handleSubSwipeEnd(ev, BACKUP_TABS, backupTab);
}



function onDaySwipeEnd() {
  if (!daySwipe.tracking) return;

  const adx = Math.abs(daySwipe.dx);
  const ady = Math.abs(daySwipe.dy);

  // reset tracking first (避免切換時殘留狀態)
  daySwipe.tracking = false;

  // ✅ 垂直滑或位移太小：不切換
  if (daySwipe.locked) return;
  if (adx < 60 || ady > 30) return;

  // ✅ 找出目前 activeDay 的 index
  const idx = plan.value.findIndex((d) => d.id === activeDayId.value);
  if (idx === -1) return;

  // dx < 0 表示往左滑：下一天；dx > 0 表示往右滑：上一天
  if (daySwipe.dx < 0 && idx < plan.value.length - 1) {
    activeDayId.value = plan.value[idx + 1].id;
  } else if (daySwipe.dx > 0 && idx > 0) {
    activeDayId.value = plan.value[idx - 1].id;
  }
}


/* ===================== Event drag (only via handle) ===================== */
const eventDrag = ref({
  armed: false,
  dayId: "",
  fromIdx: null,
  dragging: false,
  draggingIdx: null,
});

let eventArmTimer = null;

async function togglePrepEdit() {
  if (prepEditMode.value) {
    // ⬇️ 這裡是「儲存」
    await savePrepEditsToFirebase();
  }
  prepEditMode.value = !prepEditMode.value;
}

function armEventDrag(dayId, idx) {
  if (!canWrite.value) return;
  clearTimeout(eventArmTimer);

  // ✅ 長按 180ms 解鎖拖曳
  eventArmTimer = setTimeout(() => {
    eventDrag.value.armed = true;
    eventDrag.value.dayId = dayId;
    eventDrag.value.fromIdx = idx;
  }, 180);
}

function disarmEventDrag() {
  clearTimeout(eventArmTimer);
  eventArmTimer = null;
  eventDrag.value.armed = false;
  eventDrag.value.dayId = "";
  eventDrag.value.fromIdx = null;
}

function onEventDragStart(dayId, idx, ev) {
  if (!canWrite.value) return ev?.preventDefault?.();
  if (!eventDrag.value.armed || eventDrag.value.dayId !== dayId || eventDrag.value.fromIdx !== idx) {
    return ev?.preventDefault?.();
  }

  eventDrag.value.dragging = true;
  eventDrag.value.draggingIdx = idx;

  try {
    ev.dataTransfer.effectAllowed = "move";
    ev.dataTransfer.setData("text/plain", String(idx));
  } catch {}
}

function onEventDragOver(dayId, idx, ev) {
  if (!canWrite.value) return;
  if (!eventDrag.value.dragging || eventDrag.value.dayId !== dayId) return;
  ev.preventDefault();
}

async function onEventDrop(dayId, idx, ev) {
  if (!canWrite.value) return;
  if (!eventDrag.value.dragging || eventDrag.value.dayId !== dayId) return;

  ev.preventDefault();

  const fromIdx = eventDrag.value.fromIdx;
  const toIdx = idx;
  if (fromIdx === null || fromIdx === undefined) return;
  if (fromIdx === toIdx) return;

  const dayObj = plan.value.find((d) => d.id === dayId);
  if (!dayObj || !Array.isArray(dayObj.events)) return;

  const newEvents = [...dayObj.events];
  const [moved] = newEvents.splice(fromIdx, 1);
  newEvents.splice(toIdx, 0, moved);

  // ✅ 先更新畫面
  dayObj.events = newEvents;

  // ✅ 寫回 Firestore（注意去掉 showNote）
  try {
    const dayRef = doc(db, "trips", activeTripId, "plan", dayId);
    const eventsToSave = dayObj.events.map(({ showNote, ...rest }) => rest);
    await updateDoc(dayRef, { events: eventsToSave });
  } catch (e) {
    console.error("更新行程排序失敗：", e);
    alert("更新排序失敗（可能是 rules 不允許 update）");
  } finally {
    onEventDragEnd();
  }
}

function onEventDragEnd() {
  eventDrag.value.dragging = false;
  eventDrag.value.draggingIdx = null;
  disarmEventDrag();
}


async function loadPlan() {
  planLoading.value = true;
  try {
    const q = query(collection(db, "trips", activeTripId, "plan"), orderBy("day", "asc"));
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
      await backfillCityIfMissing(); // 只會在可寫入時真正寫回
      await refreshWeatherForActiveDay();
    } else {
      activeDayId.value = null;
    }
  } catch (e) {
    console.error("讀取 plan 失敗：", e);
  } finally {
    planLoading.value = false;
  }
}





async function initPlanDays() {
  if (!canWrite.value) return alert("只讀模式無法初始化。請先登入並被加入 members。");

  // 用今天當起始日，建立 7 天
  const start = new Date();
  const toYMD = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  try {
    // 連續寫入 7 個 day 文件：D1~D7
    for (let i = 0; i < 7; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const dayId = `D${i + 1}`;

      const dayRef = doc(db, "trips", activeTripId, "plan", dayId);
      await setDoc(
        dayRef,
        {
          day: i + 1,
          date: toYMD(d),
          events: [],
        },
        { merge: true }
      );
    }

    alert("初始化完成：已建立 DAY1~DAY7");
    await loadPlan();
  } catch (e) {
    console.error("初始化 plan 失敗：", e);
    const msg = e?.code ? `${e.code}` : (e?.message || "未知錯誤");
    alert(`初始化失敗：${msg}`);
  }
}



function toggleNote(dayId, idx) {
  const dayObj = plan.value.find((d) => d.id === dayId);
  if (dayObj) dayObj.events[idx].showNote = !dayObj.events[idx].showNote;
}

function noteExists(event) {
  return String(event?.note || "").trim().length > 0;
}

async function collapseAndSaveNote(dayId, idx) {
  const dayObj = plan.value.find((d) => d.id === dayId);
  if (!dayObj) return;

  // 只讀：直接收合（不寫）
  if (!canWrite.value) {
    dayObj.events[idx].showNote = false;
    return;
  }

  try {
    const dayRef = doc(db, "trips", activeTripId, "plan", dayId);
    const eventsToSave = dayObj.events.map(({ showNote, ...rest }) => rest);

    await updateDoc(dayRef, { events: eventsToSave });
    dayObj.events[idx].showNote = false;
  } catch (e) {
    console.error("儲存筆記失敗：", e);
    alert("儲存失敗（請確認你已被加入 members，且 rules 允許更新 plan）");
  }
}

async function clearEventNote(dayId, idx) {
  if (!canWrite.value) return alert("只讀模式無法清除。請先登入並被加入 members。");

  const dayObj = plan.value.find((d) => d.id === dayId);
  if (!dayObj) return;

  const ev = dayObj.events?.[idx];
  if (!ev) return;

  // 沒筆記就不用做事（避免一直跳 confirm）
  if (!noteExists(ev)) return;

  if (!confirm("確定要清除「這一個行程」的筆記？此動作無法復原。")) return;

  // 先更新畫面（體感更快）
  dayObj.events[idx] = { ...ev, note: "", showNote: false };

  try {
    const dayRef = doc(db, "trips", activeTripId, "plan", dayId);

    // 寫回時要去掉 showNote（你原本就是這樣做）
    const eventsToSave = dayObj.events.map(({ showNote, ...rest }) => rest);

    await updateDoc(dayRef, { events: eventsToSave });
  } catch (e) {
    console.error("清除單一筆記失敗：", e);
    alert("清除失敗（可能是 rules 不允許 update / 網路問題）");
  }
}




/*async function clearAllNotes(dayId) {
  if (!canWrite.value) return alert("只讀模式無法清除。請先登入並被加入 members。");
  if (!confirm("確定要清除「這一天」所有筆記？此動作無法復原。")) return;

  const dayObj = plan.value.find((d) => d.id === dayId);
  if (!dayObj) return;

  dayObj.events = (dayObj.events || []).map((e) => ({ ...e, note: "", showNote: false }));

  try {
    const dayRef = doc(db, "trips", activeTripId, "plan", dayId);
    const eventsToSave = dayObj.events.map(({ showNote, ...rest }) => rest);
    await updateDoc(dayRef, { events: eventsToSave });
  } catch (e) {
    console.error("清除筆記失敗：", e);
    alert("清除失敗（可能是 rules 不允許 update）");
  }
}*/

/* ===================== 行程編輯（點一下開啟；滑動不誤觸） ===================== */
const eventEditor = ref({
  open: false,
  dayId: "",
  index: null, // null = 新增
  isEdit: false,
  form: { time: "", loc: "", stayH: 1, stayM: 0 },
});

// ✅ 用「按下→移動判斷→放開」：移動就不觸發；沒移動才視為點擊
let pressStart = { x: 0, y: 0, moved: false, dayId: "", idx: null };

function onEventPressStart(dayId, idx, ev) {
  // ✅ 若正在握把拖曳解鎖中，不要觸發點擊開編輯
  if (eventDrag.value.armed || eventDrag.value.dragging) return;

  // ✅ 關鍵修正：點到互動區（導航/筆記按鈕、輸入框、textarea、select…）就不要啟動「點一下開編輯」
  const el = ev?.target;
  const inInteractive =
    el?.closest?.(
      "button, a, input, textarea, select, option, label, .event-actions, .note-panel, .drag-handle"
    );
  if (inInteractive) return;

  const p = getPoint(ev);
  pressStart.x = p.x;
  pressStart.y = p.y;
  pressStart.moved = false;
  pressStart.dayId = dayId;
  pressStart.idx = idx;
}



function onEventPressMove(ev) {
  if (!pressStart.dayId) return;

  const p = getPoint(ev);
  const dx = Math.abs(p.x - pressStart.x);
  const dy = Math.abs(p.y - pressStart.y);

  // ✅ 超過門檻就視為「正在滑動/捲動」，避免誤觸
  if (dx > 10 || dy > 10) pressStart.moved = true;
}

// 桌機：mousemove 同樣判斷（避免拖移時誤開）
function onEventPressMouseMove(ev) {
  if (!pressStart.dayId) return;

  const p = getPoint(ev);
  const dx = Math.abs(p.x - pressStart.x);
  const dy = Math.abs(p.y - pressStart.y);

  if (dx > 6 || dy > 6) pressStart.moved = true;
}

function onEventPressEnd() {
  if (!canWrite.value) {
    pressStart.dayId = "";
    return;
  }

  // ✅ 沒有移動才視為「點一下」→ 開啟編輯
  if (!pressStart.moved && pressStart.dayId) {
    openEventEditor(pressStart.dayId, pressStart.idx);
  }

  // reset
  pressStart.dayId = "";
  pressStart.idx = null;
  pressStart.moved = false;
}






function getPoint(ev) {
  const t = ev?.touches?.[0] || ev?.changedTouches?.[0];
  if (t) return { x: t.clientX, y: t.clientY };
  return { x: ev?.clientX ?? 0, y: ev?.clientY ?? 0 };
}



// ✅ 手機/桌機都可靠：用 click 開編輯；點到互動元件則不開
function onEventCardClick(dayId, idx, ev) {
  if (!canWrite.value) return;

  const el = ev?.target;
  const inInteractive =
    el?.closest?.(
      "button, a, input, textarea, select, option, label, .event-actions, .note-panel, .drag-handle"
    );

  if (inInteractive) return;

  openEventEditor(dayId, idx);
}






function openEventEditor(dayId, idx) {
  const dayObj = plan.value.find((d) => d.id === dayId);
  if (!dayObj) return;

  const isEdit = idx !== null && idx !== undefined;
  const ev = isEdit ? dayObj.events[idx] : { time: "", loc: "", stay: "", note: "" };

  const parsedStay = parseStayToHM(ev.stay);

  eventEditor.value.open = true;
  eventEditor.value.dayId = dayId;
  eventEditor.value.index = isEdit ? idx : null;
  eventEditor.value.isEdit = isEdit;
    // ✅ 每次打開編輯器都重置照片選擇狀態
  eventPhotoFile.value = null;
  eventPhotoFileName.value = "";

  eventPhotoUploading.value = false;
  eventPhotoProgress.value = 0;
  eventPhotoTask = null;

  eventEditor.value.form = {
    time: String(ev.time || ""),
    loc: String(ev.loc || ""),
    stayH: parsedStay.h,
    stayM: parsedStay.m,
  };
}


function closeEventEditor() {
  eventEditor.value.open = false;
  eventEditor.value.dayId = "";
  eventEditor.value.index = null;
  eventEditor.value.isEdit = false;
  eventPhotoFile.value = null;
  eventPhotoFileName.value = "";

  eventPhotoUploading.value = false;
  eventPhotoProgress.value = 0;
  eventPhotoTask = null;

  eventEditor.value.form = { time: "", loc: "", stayH: 1, stayM: 0 };
}

async function saveEventEdit() {
  if (!canWrite.value) return alert("只讀模式無法儲存。請先登入並被加入 members。");

  const dayId = eventEditor.value.dayId;
  const idx = eventEditor.value.index;
  const dayObj = plan.value.find((d) => d.id === dayId);
  if (!dayObj) return;

  const time = String(eventEditor.value.form.time || "").trim();
  const loc = String(eventEditor.value.form.loc || "").trim();
  const stayH = Number(eventEditor.value.form.stayH);
  const stayM = Number(eventEditor.value.form.stayM);

  if (!Number.isFinite(stayH) || stayH < 0) return alert("停留小時不正確。");
  if (!Number.isFinite(stayM) || stayM < 0) return alert("停留分鐘不正確。");

  const stay = `${String(stayH).padStart(2, "0")}時${String(stayM).padStart(2, "0")}分`;
  const newEvBase = { time, loc, stay };

  // ✅ 先備份（如果 Firestore 寫入失敗，要能回滾）
  const before = dayObj.events.map((e) => ({ ...e }));

  try {
    // ✅ 先更新 UI（讓手感快），但失敗會回滾
    if (idx === null || idx === undefined) {
      dayObj.events.push({ ...newEvBase, note: "", showNote: false, photoUrl: "", photoPath: "" });
    } else {
      const oldNote = String(dayObj.events[idx]?.note || "");
      const oldPhotoUrl = String(dayObj.events[idx]?.photoUrl || "");
      const oldPhotoPath = String(dayObj.events[idx]?.photoPath || "");

      dayObj.events[idx] = {
        ...newEvBase,
        note: oldNote,
        showNote: false,
        photoUrl: oldPhotoUrl,
        photoPath: oldPhotoPath,
      };
    }


    // ✅ 每次儲存後依時間重排
    sortDayEvents(dayObj);

    const dayRef = doc(db, "trips", activeTripId, "plan", dayId);
    const eventsToSave = dayObj.events.map(({ showNote, ...rest }) => rest);

    await updateDoc(dayRef, { events: eventsToSave });


    closeEventEditor();
    alert("儲存成功！");
    } catch (e) {
      // 回滾 UI
      dayObj.events = before;

      console.error("儲存行程失敗：", e);
      const msg = e?.code ? `${e.code}` : (e?.message || "未知錯誤");
      alert(`儲存失敗：${msg}`);
    }

}

async function deleteEvent() {
  if (!canWrite.value) return alert("只讀模式無法刪除。請先登入並被加入 members。");
  if (!eventEditor.value.isEdit) return;
  if (!confirm("確定要刪除此行程？")) return;

  const dayId = eventEditor.value.dayId;
  const idx = eventEditor.value.index;
  const dayObj = plan.value.find((d) => d.id === dayId);
  if (!dayObj) return;

  // ✅ 備份供回滾
  const before = dayObj.events.map((e) => ({ ...e }));

  try {
    // ✅ 先更新 UI（手感快），失敗就回滾
    dayObj.events.splice(idx, 1);

    const dayRef = doc(db, "trips", activeTripId, "plan", dayId);
    const eventsToSave = dayObj.events.map(({ showNote, ...rest }) => rest);

    await updateDoc(dayRef, { events: eventsToSave });

    closeEventEditor();
    alert("刪除成功！");
  } catch (e) {
    // 回滾 UI
    dayObj.events = before;

    console.error("刪除行程失敗：", e);
    const msg = e?.code ? `${e.code}` : (e?.message || "未知錯誤");
    alert(`刪除失敗：${msg}`);
  }

}


/* ===================== Honeymoon countdown ===================== */
const honeymoonCountdownText = computed(() => {
  const start = getHoneymoonStartISO();
  if (!start) return "";

  const days = daysUntil(start);

  // ✅ 天數 <= 0（含當天 / 已出發）就隱藏
  if (days <= 0) return "";

  return `距離旅行  ${days}天`;
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
  return diffDays; // ✅ 讓 computed 可以判斷 <= 0 直接隱藏
}

/* ===================== Weather (open-meteo) ===================== */
const CITY_COORDS = {
  Busan: { name: "Busan", lat: 35.1796, lon: 129.0756, tz: "Asia/Seoul" },
  Osaka: { name: "Osaka", lat: 34.6937, lon: 135.5023, tz: "Asia/Tokyo" },
  Kyoto: { name: "Kyoto", lat: 35.0116, lon: 135.7681, tz: "Asia/Tokyo" },
  Kobe: { name: "Kobe", lat: 34.6901, lon: 135.1955, tz: "Asia/Tokyo" },
  Nara: { name: "Nara", lat: 34.6851, lon: 135.8049, tz: "Asia/Tokyo" },

  // ✅ Taiwan
  Penghu: { name: "Penghu", lat: 23.5711, lon: 119.5794, tz: "Asia/Taipei" },
  Taipei: { name: "Taipei", lat: 25.0375, lon: 121.5637, tz: "Asia/Taipei" },
  Taichung: { name: "Taichung", lat: 24.1477, lon: 120.6736, tz: "Asia/Taipei" },
  Kaohsiung: { name: "Kaohsiung", lat: 22.6273, lon: 120.3014, tz: "Asia/Taipei" },
};

const supportedWeatherCities = computed(() => {
  const ORDER = [
    "Penghu",
    "Taipei",
    "Taichung",
    "Kaohsiung",
    "Osaka",
    "Kyoto",
    "Kobe",
    "Nara",
    "Busan",
  ];

  const keys = ORDER.filter((k) => CITY_COORDS[k]).concat(
    Object.keys(CITY_COORDS).filter((k) => !ORDER.includes(k))
  );

  return keys.map((k) => ({ key: k, label: cityLabel(k) }));
});


function getDayCity(day) {
  return getWeatherCityInfo(day).key;
}

function getWeatherCityInfo(day) {
  // 1) 當天明確指定
  if (day?.city && CITY_COORDS[day.city]) {
    return { key: day.city, source: "day" };
  }

  // 2) 從當天第一個行程地點推測
  const firstLoc = day?.events?.[0]?.loc ? String(day.events[0].loc) : "";
  const guess = guessCityFromText(firstLoc);
  if (guess && CITY_COORDS[guess]) {
    return { key: guess, source: "guess" };
  }

  // 3) 旅程層級預設（Trip settings）
  if (tripMeta.weatherCity && CITY_COORDS[tripMeta.weatherCity]) {
    return { key: tripMeta.weatherCity, source: "trip" };
  }

  // 4) 系統預設
  return { key: "Osaka", source: "default" };
}

function weatherCitySourceLabel(source) {
  if (source === "day") return "來源：當天指定";
  if (source === "guess") return "來源：行程地點推測";
  if (source === "trip") return "來源：旅程預設";
  return "來源：系統預設";
}



function cityLabel(cityKey) {
  const k = String(cityKey || "").trim();
  if (k === "Penghu") return "澎湖";
  if (k === "Taipei") return "台北";
  if (k === "Taichung") return "台中";
  if (k === "Kaohsiung") return "高雄";
  if (k === "Osaka") return "大阪";
  if (k === "Kyoto") return "京都";
  return k; // 其他城市維持原樣
}


function guessCityFromText(text) {
  const t = String(text || "").toLowerCase();
  // Taiwan
  if (t.includes("penghu") || t.includes("澎湖")) return "Penghu";
  if (t.includes("taipei") || t.includes("台北") || t.includes("臺北")) return "Taipei";
  if (t.includes("taichung") || t.includes("台中") || t.includes("臺中")) return "Taichung";
  if (t.includes("kaohsiung") || t.includes("高雄")) return "Kaohsiung";
  if (t.includes("busan") || t.includes("釜山")) return "Busan";
  if (t.includes("osaka") || t.includes("大阪")) return "Osaka";
  if (t.includes("kyoto") || t.includes("京都")) return "Kyoto";
  if (t.includes("kobe") || t.includes("神戶")) return "Kobe";
  if (t.includes("nara") || t.includes("奈良")) return "Nara";
  return "";
}

async function backfillCityIfMissing() {
  if (!canWrite.value) return;

  const tasks = [];
  for (const day of plan.value) {
    if (day.city) continue;
    const guessed = getDayCity(day) || "Osaka";
    day.city = guessed;

    const dayRef = doc(db, "trips", activeTripId, "plan", day.id);
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
  cityKey: "",
  citySource: "default",

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


function ensurePrepShoppingSubscribed() {
  // ✅ 避免重複訂閱造成多個 onSnapshot（會抖/會漏記憶體）
  if (unsubPrepShopping) return;
  subscribePrepList("shopping");
}

watch(currentPage, async (p) => {
  if (p === "itinerary") await resortItineraryByTime(); // ✅ 切回行程頁就依時間重排
  if (p === "accounting") await reloadExpenses();
  if (p === "prep") await loadPrepAll();
  if (p === "tools") await refreshFxTool();

  // ✅ 你把「購物」搬到備用頁後：進備用頁也要確保訂閱購物資料
  if (p === "backup") {
    if (backupTab.value === "shopping") ensurePrepShoppingSubscribed();
  }
});

// ✅ 在備用頁內切到「購物」時也要訂閱
watch(backupTab, (t) => {
  if (currentPage.value !== "backup") return;
  if (t === "shopping") ensurePrepShoppingSubscribed();
});


function timeToMinutes(t) {
  const s = String(t || "").trim();
  if (!s) return Number.POSITIVE_INFINITY;

  // 支援 "HH:MM" / "H:MM" / "HH：MM"
  let m = s.match(/^(\d{1,2})\s*[:：]\s*(\d{1,2})$/);
  if (m) return Number(m[1]) * 60 + Number(m[2]);

  // 支援 "HH時MM分"
  m = s.match(/^(\d{1,2})\s*時\s*(\d{1,2})\s*分$/);
  if (m) return Number(m[1]) * 60 + Number(m[2]);

  return Number.POSITIVE_INFINITY;
}

function sortDayEvents(dayObj) {
  if (!dayObj?.events?.length) return;

  // 穩定排序：同時間維持原順序
  const decorated = dayObj.events.map((ev, i) => ({ ev, i, tm: timeToMinutes(ev?.time) }));
  decorated.sort((a, b) => (a.tm - b.tm) || (a.i - b.i));
  dayObj.events = decorated.map((x) => x.ev);
}

async function resortItineraryByTime() {
  // ✅ 先做本地排序（畫面立即正確）
  for (const d of plan.value) sortDayEvents(d);

  // ✅ 若可寫入，僅把「當天(activeDay)」的排序結果回寫，避免每次切頁大量寫入
  if (!canWrite.value) return;

  const dayObj = plan.value.find((d) => d.id === activeDayId.value);
  if (!dayObj) return;

  // 若排序前後沒有變化，就不寫入
  const signature = (arr) =>
    JSON.stringify(arr.map(({ showNote, ...rest }) => rest));

  const beforeSig = signature(dayObj.events);
  sortDayEvents(dayObj);
  const afterSig = signature(dayObj.events);
  if (beforeSig === afterSig) return;

  try {
    const dayRef = doc(db, "trips", activeTripId, "plan", dayObj.id);
    const eventsToSave = dayObj.events.map(({ showNote, ...rest }) => rest);
    await updateDoc(dayRef, { events: eventsToSave });
  } catch (e) {
    console.error("依時間排序回寫失敗：", e);
  }
}


async function refreshWeatherForActiveDay() {
  const dayObj = plan.value.find((d) => d.id === activeDayId.value);
  if (!dayObj) return false;

  const info = getWeatherCityInfo(dayObj);
  const cityKey = info.key;
  const city = CITY_COORDS[cityKey] || CITY_COORDS.Osaka;
  weatherState.value.cityKey = cityKey;
  weatherState.value.citySource = info.source || "default";


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

    const { statusText, statusEmoji } = simpleWeatherLabel(
      weatherState.value.precipProb,
      weatherState.value.tMax
    );
    weatherState.value.statusText = statusText;
    weatherState.value.statusEmoji = statusEmoji;

    return true;
  } catch (err) {
    weatherState.value.error = err?.message ? String(err.message) : "未知錯誤";
    return false;
  } finally {
    weatherState.value.loading = false;
  }
}



async function manualRefreshWeatherAndFx() {
  const weatherOk = await refreshWeatherForActiveDay();
  const fxOk = await refreshFxTool();

  const lines = [];

  if (weatherOk) {
    lines.push("✅ 天氣更新成功");
  } else {
    lines.push(`❌ 天氣更新失敗：${weatherState.value.error || "未知錯誤"}`);
  }

  if (fxOk) {
    lines.push(`✅ 匯率更新成功（1 JPY = ${fxToolRate.value} TWD）`);
  } else {
    lines.push(`❌ 匯率更新失敗：已改用預設值 ${DEFAULT_FX_JPY_TO_TWD}`);
  }

  alert(lines.join("\n"));
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
    isFiniteNumber(min) && min <= 8 ? "建議洋蔥式＋外套" :
    isFiniteNumber(min) && min <= 15 ? "薄外套/長袖剛好" :
    isFiniteNumber(max) && max >= 28 ? "短袖為主，注意防曬" :
    "舒適好走為主";

  return `${tempHint}${needsUmbrella ? "，記得帶傘。" : "。"}（鞋子：請選能走 15,000 步的那雙）`;
}

/* ===================== Expenses ===================== */
const expenses = ref(loadLocal("hm_expenses_cache", []));
const expensesLoading = ref(false);
const expensesError = ref("");

const accountingTab = ref("entry"); // ✅ 預設進記帳頁就是「記帳」




function goAccountingEntry() {
  if (!canWrite.value) {
    accountingTab.value = "detail";
    alert("只讀模式無法記帳：請先 Google 登入且被加入 members。");
    return;
  }
  accountingTab.value = "entry";
}


const uiMember = ref("");
const uiPayMethod = ref("現金");
const uiPlace = ref("");
const uiItem = ref("");

const detailMemberFilter = ref("全體");
const detailDateFilter = ref("全部");

// ✅ 你指定的預設：台幣:日幣 = 0.2:1  => 1 JPY = 0.2 TWD
const DEFAULT_FX_JPY_TO_TWD = 0.2;

// 這裡統一存「JPY -> TWD」匯率（1 JPY = ? TWD）
const fxJpyToTwd = ref(null);
const fxCache = new Map();

// 1 JPY = ? TWD（若抓不到就用 0.2）
const fxJpyToTwdValue = computed(() => {
  const v = Number(fxJpyToTwd.value);
  return Number.isFinite(v) && v > 0 ? v : DEFAULT_FX_JPY_TO_TWD;
});

// 1 TWD = ? JPY（反推）
const fxTwdToJpyValue = computed(() => {
  const v = fxJpyToTwdValue.value;
  return v > 0 ? 1 / v : 5; // v=0.2 => 5
});


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

  try {
    // ✅ 改成抓「1 JPY = ? TWD」
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
    console.warn("匯率抓取失敗：", e);
  }

  // ✅ 抓不到就用你指定預設
  fxJpyToTwd.value = DEFAULT_FX_JPY_TO_TWD;
}



watch([accountingTab, detailDateFilter], async () => {
  if (accountingTab.value !== "detail") return;

  const date = detailDateFilter.value === "全部"
    ? new Date().toISOString().slice(0, 10)
    : detailDateFilter.value;

  await loadFxForDate(date);
}, { immediate: true });

const expenseForm = ref({
  date: new Date().toISOString().slice(0, 10),
  amount: "", // ✅ 改成空白
  currency: "JPY",
  category: "food",
  note: "",
});

// ✅ 記帳編輯器（修正 template 使用 expenseEditor.open 但未宣告造成的白畫面）
const expenseEditor = ref({
  open: false,
  origin: null,
  form: {
    id: "",
    date: "",
    amount: 0,
    currency: "JPY",
    category: "other",
    note: "",
  },
});


const approxTwd = computed(() => {
  const amt = Number(expenseForm.value.amount) || 0;
  if (expenseForm.value.currency === "TWD") return Math.round(amt);
  return Math.round(amt * fxJpyToTwdValue.value);
});

async function reloadExpenses() {
  expensesLoading.value = true;
  expensesError.value = "";

  try {
    const q = query(collection(db, "trips", activeTripId, "expenses"), orderBy("createdAt", "desc"));
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

async function addExpenseFromFancy() {
  if (!canWrite.value) return alert("只讀模式無法記帳。請先登入並被加入 members。");
  if (!expenseForm.value.date) return alert("請選日期");

  const amount = Number(expenseForm.value.amount);
  if (!isFiniteNumber(amount) || amount <= 0) return alert("金額要大於 0");
  if (String(uiItem.value || "").trim().length === 0) return alert("請填「消費項目」");

  const memberName = (String(uiMember.value || "").trim() || userLabel.value || "使用者");

  const notePacked = packNote({
    pay: uiPayMethod.value,
    member: memberName,
    place: uiPlace.value,
    item: uiItem.value,
  });

  // ✅ 這裡原本有用到未定義的 f（會讓儲存直接炸掉），移除
  const payload = {
    date: expenseForm.value.date,
    amount: amount,
    currency: expenseForm.value.currency,
    category: expenseForm.value.category,
    note: notePacked,
    uid: user.value.uid,
    displayName: user.value.displayName || "使用者",
    createdAt: serverTimestamp(),
  };

  // ✅ 本機先插一筆（體感更快）
  const localId = `local_${Date.now()}`;
  expenses.value.unshift({ id: localId, ...payload, createdAt: new Date() });
  saveLocal("hm_expenses_cache", expenses.value);

  try {
    await addDoc(collection(db, "trips", activeTripId, "expenses"), payload);
    await reloadExpenses();
    accountingTab.value = "detail";
  } catch (e) {
    expensesError.value = e?.message ? String(e.message) : "寫入失敗";
    alert("已先存本機，但雲端寫入失敗（請檢查 rules / 網路）");
  }

  // ✅ 清空欄位
  expenseForm.value.amount = "";
  uiPlace.value = "";
  uiItem.value = "";
  uiPayMethod.value = "現金";
}


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
  const dates = expenses.value.map((e) => e.date).filter(Boolean);
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
  return Math.round(amt * fxJpyToTwdValue.value);
}

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
  const m1 = s.match(/^\[([^\]]+)\]/);
  const m2 = s.match(/^\[[^\]]+\]\[([^\]]+)\]/);
  const pay = m1 ? m1[1] : "";
  const member = m2 ? m2[1] : "";

  const rest = s.replace(/^\[[^\]]+\](\[[^\]]+\])?\s*/g, "");
  const [place, item] = rest.split("｜");

  return {
    pay,
    member,
    place: item ? place || "" : "",
    item: item ? item || "" : place || "",
  };
}

function displayTitle(e) {
  const p = parsePackedNote(e.note);
  return p.item || e.note || "（無項目）";
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

const bookingEditor = ref({
  open: false,
  isEdit: false,
  originId: "",
  form: {
    type: "flight",
    vendor: "",
    code: "",
    title: "",
    address: "",
    from: "",
    to: "",
    departTime: "",
    arriveTime: "",
    duration: "",
    date: new Date().toISOString().slice(0, 10),

    // ✅ 新增：住宿 check-out、憑證使用日期
    checkInTime: "",
    checkOutDate: "",
    checkOutTime: "",
    usageDate: "",

    baggage: "",
    aircraft: "",
    priceTwd: null,
    purchasedAt: "",

    voucherUrl: "",
    voucherPath: "",
    voucherName: "",
    voucherType: "",
  },
});

function onBookingCardClick(b) {
  if (!canWrite.value) return;
  openBookingEditor(b);
}

function openBookingEditor(b) {
  if (!canWrite.value) {
    bookingEditor.value.open = false;
    return;
  }

  if (!b) {
    const today = new Date().toISOString().slice(0, 10);
    bookingEditor.value.open = true;
    bookingEditor.value.isEdit = false;
    bookingEditor.value.originId = "";
    bookingEditor.value.form = {
      type: bookingTab.value || "flight",
      vendor: "",
      code: "",
      title: "",
      address: "",
      from: "",
      to: "",
      departTime: "",
      arriveTime: "",
      duration: "",
      date: today,

      checkInTime: (bookingTab.value === "hotel" ? "15:00" : ""),
      checkOutDate: "",
      checkOutTime: (bookingTab.value === "hotel" ? "11:00" : ""),
      usageDate: today,


      baggage: "",
      aircraft: "",
      priceTwd: null,
      purchasedAt: "",
      voucherUrl: "",
      voucherPath: "",
      voucherName: "",
      voucherType: "",
      coverUrl: "",
      coverPath: "",
      coverName: "",

    };
    return;
  }

  bookingEditor.value.open = true;
  bookingEditor.value.isEdit = true;
  bookingEditor.value.originId = b.id;
  bookingEditor.value.form = {
    type: b.type || "flight",
    vendor: b.vendor || "",
    code: b.code || "",
    title: b.title || "",
    address: b.address || "",
    from: b.from || "",
    to: b.to || "",
    departTime: b.departTime || "",
    arriveTime: b.arriveTime || "",
    duration: b.duration || "",
    date: b.date || new Date().toISOString().slice(0, 10),

    checkInTime: b.checkInTime || "",
    checkOutDate: b.checkOutDate || "",
    checkOutTime: b.checkOutTime || "",
    usageDate: b.usageDate || "",


    baggage: b.baggage || "",
    aircraft: b.aircraft || "",
    priceTwd: typeof b.priceTwd === "number" ? b.priceTwd : null,
    purchasedAt: b.purchasedAt || "",

    voucherUrl: b.voucherUrl || "",
    voucherPath: b.voucherPath || "",
    voucherName: b.voucherName || "",
    voucherType: b.voucherType || "",
    coverUrl: b.coverUrl || "",
    coverPath: b.coverPath || "",
    coverName: b.coverName || "",
  };
}

function closeBookingEditor() {
  bookingEditor.value.open = false;
  bookingEditor.value.isEdit = false;
  bookingEditor.value.originId = "";
}

async function saveBookingEdit(options = { keepOpen: false }) {
  if (!canWrite.value) return alert("只讀模式無法儲存。請先登入並被加入 members。");
  if (isAnyUploading.value) return alert("上傳進行中，請等待上傳完成或按取消後再儲存。");


  const f = bookingEditor.value.form;
  if (!f.type) return alert("請選類型");

  const type = String(f.type || "flight").trim();

  // ✅ 日期驗證（住宿要 check-out、憑證要使用日期）
  if (type === "voucher") {
    if (!String(f.usageDate || "").trim()) return alert("請填「使用日期」");
  } else {
    if (!String(f.date || "").trim()) return alert("請填日期");
  }
  if (type === "hotel") {
    if (!String(f.checkOutDate || "").trim()) return alert("請填 Check-out 日期");
  }

  const normalizedDate = (type === "voucher")
    ? String(f.usageDate || "").trim()
    : String(f.date || "").trim();

  const payload = {
    type,
    vendor: String(f.vendor || "").trim(),
    code: String(f.code || "").trim(),
    title: String(f.title || "").trim(),
    address: String(f.address || "").trim(),
    from: String(f.from || "").trim(),

    to: String(f.to || "").trim(),
    departTime: String(f.departTime || "").trim(),
    arriveTime: String(f.arriveTime || "").trim(),
    duration: String(f.duration || "").trim(),

    // ✅ date 保持相容（憑證：date 同步為 usageDate）
    date: normalizedDate,
    usageDate: type === "voucher" ? String(f.usageDate || "").trim() : "",
    checkInTime: type === "hotel" ? String(f.checkInTime || "").trim() : "",
    checkOutDate: type === "hotel" ? String(f.checkOutDate || "").trim() : "",
    checkOutTime: type === "hotel" ? String(f.checkOutTime || "").trim() : "",

    baggage: type === "flight" ? String(f.baggage || "").trim() : "",
    aircraft: String(f.aircraft || "").trim(),

    priceTwd: Number.isFinite(Number(f.priceTwd)) ? Number(f.priceTwd) : null,
    purchasedAt: String(f.purchasedAt || "").trim(),

    uid: user.value.uid,
    displayName: user.value.displayName || "使用者",
    updatedAt: serverTimestamp(),
  };

  try {
    if (!bookingEditor.value.isEdit) {
      const docRef = await addDoc(collection(db, "trips", activeTripId, "bookings"), {
        ...payload,
        createdAt: serverTimestamp(),
      });

      bookingEditor.value.originId = docRef.id;
      bookingEditor.value.isEdit = true;
    } else {
      const refDoc = doc(db, "trips", activeTripId, "bookings", bookingEditor.value.originId);
      await updateDoc(refDoc, payload);
    }

    if (!options.keepOpen) closeBookingEditor();
    alert("儲存成功！");
  } catch (e) {
    console.error("儲存 booking 失敗：", e);
    alert("儲存失敗（可能是 rules 不允許 / 網路問題）");
  }
}


async function deleteBooking() {
  if (!canWrite.value) return alert("只讀模式無法刪除。請先登入並被加入 members。");
  if (!bookingEditor.value.isEdit) return;
  if (!confirm("確定要刪除此預定？")) return;

  try {
    const refDoc = doc(db, "trips", activeTripId, "bookings", bookingEditor.value.originId);
    await deleteDoc(refDoc);

    closeBookingEditor();
    alert("刪除成功！");
  } catch (e) {
    console.error("刪除 booking 失敗：", e);
    alert("刪除失敗（多半是 rules 目前不允許 delete）");
  }

}


/* ===================== Booking Cover upload (Storage) ===================== */

/* ===================== Itinerary Event Photo upload (Storage) ===================== */
const eventPhotoFile = ref(null);
const eventPhotoFileName = ref("");
const eventPhotoUploading = ref(false);
const eventPhotoProgress = ref(0);
let eventPhotoTask = null;

const currentEventPhotoUrl = computed(() => {
  const dayId = eventEditor.value?.dayId;
  const idx = eventEditor.value?.index;
  if (!dayId || idx === null || idx === undefined) return "";
  const dayObj = plan.value.find((d) => d.id === dayId);
  const ev = dayObj?.events?.[idx];
  return ev?.photoUrl || "";
});

function onEventPhotoFileChange(ev) {
  const input = ev?.target;
  const f = input?.files?.[0] || null;

  eventPhotoFile.value = f;
  eventPhotoFileName.value = f ? (f.name || "已選擇照片") : "";
  eventPhotoProgress.value = 0;

  // iOS/同檔重選修正：避免第二次選同檔不觸發 change
  if (input) input.value = "";
}


function cancelEventPhotoUpload() {
  try {
    if (eventPhotoTask) eventPhotoTask.cancel();
  } catch (_) {}
}

function openEventPhoto(url) {
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

async function deleteEventPhoto() {
  if (!canWrite.value) return alert("只讀模式無法刪除。請先登入並被加入 members。");

  const dayId = eventEditor.value?.dayId;
  const idx = eventEditor.value?.index;

  if (!dayId || idx === null || idx === undefined) {
    return alert("找不到行程位置（dayId/index），請重開編輯視窗再試一次。");
  }

  const dayObj = plan.value.find((d) => d.id === dayId);
  const ev = dayObj?.events?.[idx];

  if (!ev) return alert("找不到該行程資料，請重開編輯視窗再試一次。");
  if (!ev.photoUrl && !ev.photoPath) return alert("目前沒有可刪除的照片。");

  if (!confirm("確定要刪除這張照片嗎？（會同時刪除雲端 Storage 檔案）")) return;

  try {
    // ✅ 1) 刪 Storage（有 photoPath 才刪）
    if (ev.photoPath) {
      try {
        await deleteObject(sRef(storage, ev.photoPath));
      } catch (e) {
        // 檔案可能已不存在：不致命，繼續清 Firestore
        console.warn("deleteObject failed (ignored):", e?.code || e, e);
      }
    }

    // ✅ 2) 清本地 / UI
    ev.photoUrl = "";
    ev.photoPath = "";

    // ✅ 3) 寫回 Firestore（去掉 showNote）
    const dayRef = doc(db, "trips", activeTripId, "plan", dayId);
    const eventsToSave = dayObj.events.map(({ showNote, ...rest }) => rest);
    await updateDoc(dayRef, { events: eventsToSave });

    alert("照片已刪除 ✅");
  } catch (e) {
    console.error("刪除行程照片失敗：", e);
    alert(`刪除失敗：${e?.code || ""} ${e?.message || e}`);
  }
}



async function uploadEventPhoto() {
  if (!canWrite.value) return alert("只讀模式無法上傳：請先登入並被加入 members。");
  if (!eventPhotoFile.value) return alert("請先選擇照片檔案。");
  if (eventPhotoUploading.value) return;

  const dayId = eventEditor.value.dayId;
  const idx = eventEditor.value.index;

  // 行程 events 是陣列結構：沒有 id 的情況下，先要求使用者儲存，避免綁錯
  if (!dayId || idx === null || idx === undefined) {
    return alert("請先按「儲存」建立/更新行程後，再上傳照片。");
  }

  const dayObj = plan.value.find((d) => d.id === dayId);
  if (!dayObj || !dayObj.events?.[idx]) return alert("找不到該行程，請重開編輯視窗再試一次。");

  try {
    eventPhotoUploading.value = true;
    eventPhotoProgress.value = 0;

    const raw = eventPhotoFile.value;
    // 壓縮成 jpeg，避免手機大圖爆量（你專案已經有 compressImageToJpeg/withTimeout）
    const upFile = await withTimeout(compressImageToJpeg(raw, 1600, 0.8), 20000, "圖片壓縮");

    const safeName = `${Date.now()}-${String(upFile.name || "event").replace(/[^\w.\-]+/g, "_")}`;
    const path = `trips/${activeTripId}/plan_photos/${dayId}/${idx}/${safeName}`;

    const storageRef = sRef(storage, path);
    eventPhotoTask = uploadBytesResumable(storageRef, upFile, {
      contentType: upFile.type || "image/jpeg",
    });

    await new Promise((resolve, reject) => {
      eventPhotoTask.on(
        "state_changed",
        (snap) => {
          const p = snap.totalBytes ? Math.round((snap.bytesTransferred / snap.totalBytes) * 100) : 0;
          eventPhotoProgress.value = p;
        },
        reject,
        resolve
      );
    });

    const url = await getDownloadURL(eventPhotoTask.snapshot.ref);

    // ✅ 更新 UI
    dayObj.events[idx].photoUrl = url;
    dayObj.events[idx].photoPath = path;

    // ✅ 寫回 Firestore（去掉 showNote）
    const dayRef = doc(db, "trips", activeTripId, "plan", dayId);
    const eventsToSave = dayObj.events.map(({ showNote, ...rest }) => rest);
    await updateDoc(dayRef, { events: eventsToSave });

    
    eventPhotoFile.value = null;
    eventPhotoFileName.value = "";

    alert("行程照片上傳成功 ✅");
  } catch (e) {
    console.error("行程照片上傳失敗：", e);
    alert(`上傳失敗：${e?.code || ""} ${e?.message || e}`);
  } finally {
    eventPhotoUploading.value = false;
    eventPhotoTask = null;
  }
}


const bookingCoverFile = ref(null);
const bookingCoverFileName = ref("");
const bookingCoverUploading = ref(false);
const bookingCoverProgress = ref(0);
let bookingCoverTask = null;

function onBookingCoverFileChange(ev) {
  const input = ev?.target;
  const f = input?.files?.[0] || null;

  bookingCoverFile.value = f;
  bookingCoverFileName.value = f ? (f.name || "已選擇照片") : "";

  // iOS/同檔重選修正
  if (input) input.value = "";
}

function cancelBookingCoverUpload() {
  try {
    if (bookingCoverTask) bookingCoverTask.cancel();
  } catch (_) {}
}

async function uploadBookingCover() {
  if (!canWrite.value) return alert("只讀模式無法上傳：請先登入並被加入 members。");
  if (!bookingCoverFile.value) return alert("請先選擇照片檔案。");
  if (bookingCoverUploading.value) return;

  try {
    // ✅ 先確保 bookingId 存在
    if (!bookingEditor.value.originId) {
      await withTimeout(saveBookingEdit({ keepOpen: true }), 20000, "建立預定");
      if (!bookingEditor.value.originId) throw new Error("儲存成功後仍未取得 bookingId（originId）");
    }

    bookingCoverUploading.value = true;
    bookingCoverProgress.value = 0;

    const raw = bookingCoverFile.value;
    const upFile = await withTimeout(compressImageToJpeg(raw, 1600, 0.8), 20000, "圖片壓縮");

    const tripId = activeTripId;
    const bookingId = bookingEditor.value.originId;

    // 固定檔名：cover.jpg（重傳覆蓋）
    const path = `trips/${tripId}/bookings/${bookingId}/cover.jpg`;
    const r = sRef(storage, path);

    bookingCoverTask = uploadBytesResumable(r, upFile, {
      contentType: "image/jpeg",
    });

    await withTimeout(
      new Promise((resolve, reject) => {
        bookingCoverTask.on(
          "state_changed",
          (snap) => {
            if (snap.totalBytes > 0) {
              bookingCoverProgress.value = Math.max(
                1,
                Math.round((snap.bytesTransferred / snap.totalBytes) * 100)
              );
            } else {
              bookingCoverProgress.value = Math.max(1, bookingCoverProgress.value || 1);
            }
          },
          (err) => reject(err),
          () => resolve()
        );
      }),
      120000,
      "上傳封面"
    );

    bookingCoverProgress.value = 100;

    const url = await getDownloadURL(bookingCoverTask.snapshot.ref);

    // ✅ 寫回 Firestore
    const refDoc = doc(db, "trips", activeTripId, "bookings", bookingId);
    const coverName = upFile.name || "cover.jpg";

    await updateDoc(refDoc, {
      coverUrl: url,
      coverPath: path,
      coverName,
      updatedAt: serverTimestamp(),
    });

    // ✅ 同步 modal 表單
    bookingEditor.value.form.coverUrl = url;
    bookingEditor.value.form.coverPath = path;
    bookingEditor.value.form.coverName = coverName;

    alert("封面上傳成功！");
  } catch (e) {
    if (String(e?.code || "").includes("storage/canceled")) {
      alert("已取消上傳。");
    } else {
      console.error("上傳封面失敗：", e);
      alert(`上傳失敗：${e?.message || e}`);
    }
  } finally {
    bookingCoverUploading.value = false;
    bookingCoverProgress.value = 0;
    bookingCoverTask = null;

    bookingCoverFile.value = null;
    bookingCoverFileName.value = "";
  }
}

/* ===================== Booking Voucher upload (Storage) ===================== */
const bookingVoucherFile = ref(null);          // 目前選到的檔案（PDF/圖片）
const bookingVoucherFileName = ref("");        // 顯示用檔名
const bookingVoucherUploading = ref(false);    // boolean
const bookingVoucherProgress = ref(0);         // 0~100
let bookingVoucherTask = null;                 // uploadBytesResumable task（可取消）

// ✅ 任何上傳進行中就視為「不可儲存」


// ✅ 開啟憑證：優先用 voucherUrl；沒有就用 voucherPath 即時換 URL
async function openBookingVoucher(b) {
  try {
    const url = String(b?.voucherUrl || "").trim();
    if (url) return window.open(url, "_blank");

    const path = String(b?.voucherPath || "").trim();
    if (!path) return alert("找不到憑證連結（voucherUrl/voucherPath 都是空的）");

    const freshUrl = await getDownloadURL(sRef(storage, path));
    window.open(freshUrl, "_blank");
  } catch (e) {
    console.error("開啟憑證失敗：", e);
    alert(`開啟失敗：${e?.message || e}`);
  }
}

function onBookingVoucherFileChange(ev) {
  const input = ev?.target;
  const f = input?.files?.[0] || null;

  bookingVoucherFile.value = f;
  bookingVoucherFileName.value = f ? (f.name || "已選擇檔案") : "";

  // ✅ 仍保留：修 iOS/部分瀏覽器同檔重選不觸發 change
  if (input) input.value = "";
}

// 照片壓縮：縮到 maxW=1600，JPEG quality=0.8（通常體積可降 60~90%）
async function compressImageToJpeg(file, maxW = 1600, quality = 0.8) {
  const img = await fileToImage(file);

  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;

  const scale = w > maxW ? (maxW / w) : 1;
  const tw = Math.round(w * scale);
  const th = Math.round(h * scale);

  const canvas = document.createElement("canvas");
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, tw, th);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) throw new Error("圖片壓縮失敗");

  return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
}

function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function withTimeout(promise, ms, label = "操作") {
  let t;
  const timeout = new Promise((_, reject) => {
    t = setTimeout(() => reject(new Error(`${label}逾時（>${ms / 1000}s），請檢查網路或重新上傳）`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
}

function cancelBookingVoucherUpload() {
  try {
    if (bookingVoucherTask) bookingVoucherTask.cancel();
  } catch (_) {}
}

async function uploadBookingVoucher() {
  if (!canWrite.value) return alert("只讀模式無法上傳：請先登入並被加入 members。");
  if (!bookingVoucherFile.value) return alert("請先選擇 PDF 或照片檔案。");
  if (bookingVoucherUploading.value) return;

  try {
    // ✅ 先確保 bookingId 存在（沒有就先儲存一筆預定，並保持 modal 不關）
    if (!bookingEditor.value.originId) {
      await withTimeout(saveBookingEdit({ keepOpen: true }), 20000, "建立預定");
      if (!bookingEditor.value.originId) throw new Error("儲存成功後仍未取得 bookingId（originId）");
    }

    bookingVoucherUploading.value = true;
    bookingVoucherProgress.value = 0;

    const raw = bookingVoucherFile.value;

    // ✅ PDF 原檔上傳；圖片先壓縮成 jpg
    const isPdf = raw.type === "application/pdf" || /\.pdf$/i.test(raw.name);
    const upFile = isPdf
      ? raw
      : await withTimeout(compressImageToJpeg(raw, 1600, 0.8), 20000, "圖片壓縮");

    const tripId = activeTripId;
    const bookingId = bookingEditor.value.originId;

    // ✅ 固定檔名（同類型重傳會覆蓋 update，不會一直堆垃圾檔）
    const objName = isPdf ? "voucher.pdf" : "voucher.jpg";
    const path = `trips/${tripId}/bookings/${bookingId}/${objName}`;

    const r = sRef(storage, path);
    bookingVoucherTask = uploadBytesResumable(r, upFile, {
      contentType: upFile.type || (isPdf ? "application/pdf" : "image/jpeg"),
    });

    await withTimeout(
      new Promise((resolve, reject) => {
        bookingVoucherTask.on(
          "state_changed",
          (snap) => {
            if (snap.totalBytes > 0) {
              bookingVoucherProgress.value = Math.max(
                1,
                Math.round((snap.bytesTransferred / snap.totalBytes) * 100)
              );
            } else {
              bookingVoucherProgress.value = Math.max(1, bookingVoucherProgress.value || 1);
            }
          },
          (err) => reject(err),
          () => resolve()
        );
      }),
      120000,
      "上傳憑證"
    );

    bookingVoucherProgress.value = 100;

    // ✅ 取得下載 URL（會帶 token）
    const url = await getDownloadURL(bookingVoucherTask.snapshot.ref);

    // ✅ 寫回 Firestore（列表/編輯視窗都能開啟）
    const refDoc = doc(db, "trips", activeTripId, "bookings", bookingId);
    const voucherName = upFile.name || objName;
    const voucherType = isPdf ? "pdf" : "image";

    await updateDoc(refDoc, {
      voucherUrl: url,
      voucherPath: path,
      voucherName,
      voucherType,
      voucherSize: upFile.size || null,
      voucherContentType: upFile.type || null,
      updatedAt: serverTimestamp(),
    });

    // ✅ 同步 modal 表單顯示（讓「開啟」按鈕立即可用）
    bookingEditor.value.form.voucherUrl = url;
    bookingEditor.value.form.voucherPath = path;
    bookingEditor.value.form.voucherName = voucherName;
    bookingEditor.value.form.voucherType = voucherType;

    alert("上傳成功！");
  } catch (e) {
    if (String(e?.code || "").includes("storage/canceled")) {
      alert("已取消上傳。");
    } else {
      console.error("上傳憑證失敗：", e);
      alert(`上傳失敗：${e?.message || e}`);
    }
  } finally {
    bookingVoucherUploading.value = false;
    bookingVoucherProgress.value = 0;
    bookingVoucherTask = null;

    bookingVoucherFile.value = null;
    bookingVoucherFileName.value = "";
  }
}



function canEditExpense(e) {
  if (!user.value || !e) return false;
  return canWrite.value && e.uid === user.value.uid;
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
  if (!canEditExpense(origin)) return alert("你只能修改你自己建立的紀錄（且需為 members）。");

  const f = expenseEditor.value.form;
  if (!f.date) return alert("請選日期");
  if (!isFiniteNumber(f.amount) || Number(f.amount) <= 0) return alert("金額要大於 0");

  try {
    const refDoc = doc(db, "trips", activeTripId, "expenses", origin.id);
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
  if (!canEditExpense(origin)) return alert("你只能刪除你自己建立的紀錄（且需為 members）。");
  if (!confirm("確定要刪除此筆記帳？")) return;

  try {
    const refDoc = doc(db, "trips", activeTripId, "expenses", origin.id);
    await deleteDoc(refDoc);
    await reloadExpenses();
    closeExpenseEditor();
    
  } catch (e) {
    console.error("刪除記帳失敗：", e);
    alert("刪除失敗（多半是 rules 目前不允許 delete）");
  }
}

/* ===================== Prep checklists ===================== */
// 是否為編輯模式（Prep 用）
const prepEditMode = ref(false);
// ✅ 只有「有修改」才顯示「儲存」
const prepDirty = ref(false);

// 進入編輯時，記住當下文字（用來判斷是否有改）
const prepOriginalText = ref(new Map());

function beginPrepEditSnapshot(kind, list) {
  // kind: todo/luggage/shopping
  prepOriginalText.value = new Map((list || []).map((it) => [it.id, String(it.text || "")]));
  prepDirty.value = false;
}

function recomputePrepDirty(kind, list) {
  const snap = prepOriginalText.value;
  prepDirty.value = (list || []).some((it) => String(it.text || "") !== String(snap.get(it.id) || ""));
}


/* ===================== Prep item editor (tap to edit) ===================== */
const prepEditor = ref({
  open: false,
  kind: "todo",     // todo/luggage/shopping
  originId: "",
  form: {
    text: "",
    note: "",
  },
});

function openPrepEditor(kind, it, ev) {
  // 拖曳中不開 editor
  if (prepDrag.value?.draggingId) return;

  // 點 checkbox 已 stop，不會走到這裡；這裡再做保險
  const el = ev?.target instanceof Element ? ev.target : null;
  if (el && el.closest("input, textarea, select, button, a, .btn")) return;

  prepEditor.value.open = true;
  prepEditor.value.kind = kind;
  prepEditor.value.originId = it.id;
  prepEditor.value.form = {
    text: it.text || "",
    note: it.note || "",
  };
}

function closePrepEditor() {
  prepEditor.value.open = false;
  prepEditor.value.originId = "";
}

async function savePrepEditor() {
  if (!canWrite.value) return alert("只讀模式無法儲存。請先登入並被加入 members。");
  if (!prepEditor.value.originId) return;

  const kind = prepEditor.value.kind;
  const key = prepCollectionKey(kind);

  const text = String(prepEditor.value.form.text || "").trim();
  const note = String(prepEditor.value.form.note || "").trim();

  if (!text) return alert("選項文字不可空白");

  try {
    const refDoc = doc(db, "trips", activeTripId, key, prepEditor.value.originId);
    await updateDoc(refDoc, {
      text,
      note,
      updatedAt: serverTimestamp(),
    });

    closePrepEditor();
    
  } catch (e) {
    console.error("儲存準備項目失敗：", e);
    alert(`儲存失敗：${e?.message || e}`);
  }
}

async function deletePrepFromEditor() {
  if (!canWrite.value) return;
  if (!prepEditor.value.originId) return;
  if (!confirm("確定要刪除？")) return;

  try {
    const kind = prepEditor.value.kind;
    const key = prepCollectionKey(kind);
    await deleteDoc(doc(db, "trips", activeTripId, key, prepEditor.value.originId));

    closePrepEditor();
    
  } catch (e) {
    console.error("刪除準備項目失敗：", e);
    alert("刪除失敗（多半是 rules 目前不允許 delete）");
  }
}


const prepTab = ref("todo");
const prepInput = ref({ todo: "", luggage: "", shopping: "" });

const prep = ref({
  todo: { items: [] },
  luggage: { items: [] },
  shopping: { items: [] },
});


const prepTabLabelMap = {
  todo: "待辦",
  luggage: "行李",
  shopping: "購物",
};

const prepTabLabel = computed(() => prepTabLabelMap[prepTab.value]);

/* ===================== Prep drag (only via handle) ===================== */
const prepDrag = ref({
  armedId: null,     // 目前「被握把解鎖」可拖的 item id
  draggingId: null,  // 正在拖曳的 item id
  fromId: null,      // drag 起點 id
  kind: null,        // todo/luggage/shopping
});

let prepArmTimer = null;

function armPrepDrag(itemId) {
  if (!canWrite.value) return;
  clearTimeout(prepArmTimer);

  // ✅ 長按 180ms 才解鎖（避免輕觸誤拖）
  prepArmTimer = setTimeout(() => {
    prepDrag.value.armedId = itemId;
  }, 180);
}

function disarmPrepDrag() {
  clearTimeout(prepArmTimer);
  prepArmTimer = null;
  prepDrag.value.armedId = null;
}

function onPrepDragStart(kind, it, ev) {
  if (!canWrite.value) return ev?.preventDefault?.();
  if (prepDrag.value.armedId !== it.id) return ev?.preventDefault?.(); // ✅ 沒握把解鎖不准拖

  prepDrag.value.draggingId = it.id;
  prepDrag.value.fromId = it.id;
  prepDrag.value.kind = kind;

  try {
    ev.dataTransfer.effectAllowed = "move";
    ev.dataTransfer.setData("text/plain", it.id);
  } catch {
    // iOS 部分情境沒有 dataTransfer，不致命
  }
}

function onPrepDragOver(kind, it, ev) {
  if (!canWrite.value) return;
  if (prepDrag.value.kind !== kind) return;
  ev.preventDefault(); // ✅ 允許 drop
  try {
    ev.dataTransfer.dropEffect = "move";
  } catch {}
}

async function onPrepDrop(kind, it, ev) {
  if (!canWrite.value) return;
  if (prepDrag.value.kind !== kind) return;

  ev.preventDefault();

  const fromId = prepDrag.value.fromId;
  const toId = it.id;
  if (!fromId || fromId === toId) return;

  // 以「未完成在上、完成在下」後的 sorted 視覺序為準做換位
  const arr = sortedPrepItems(kind);
  const fromIdx = arr.findIndex((x) => x.id === fromId);
  const toIdx = arr.findIndex((x) => x.id === toId);
  if (fromIdx < 0 || toIdx < 0) return;

  const moved = arr[fromIdx];
  const target = arr[toIdx];

  // ✅ 僅允許在同一區（done 狀態相同）內排序，避免「拖一下就把完成/未完成規則打亂」
  if (!!moved.done !== !!target.done) return;

  // 重新排列陣列
  const newArr = [...arr];
  newArr.splice(fromIdx, 1);
  newArr.splice(toIdx, 0, moved);

  // 重新寫 order：同區塊用等距數字，穩定、不會一直抖
  const base = Date.now();
  const step = 10;
  const sameDone = newArr.filter((x) => !!x.done === !!moved.done);

  // 把同 done 的 items 依出現順序重排 order
  for (let i = 0; i < sameDone.length; i++) {
    const x = sameDone[i];
    const newOrder = base + i * step;

    // 更新本機
    const local = prep.value[kind].items.find((p) => p.id === x.id);
    if (local) local.order = newOrder;

    // 更新雲端
    const key = prepCollectionKey(kind);
    await updateDoc(doc(db, "trips", activeTripId, key, x.id), { order: newOrder });
  }
}

function onPrepDragEnd() {
  prepDrag.value.draggingId = null;
  prepDrag.value.fromId = null;
  prepDrag.value.kind = null;
  disarmPrepDrag();
}


function getPrepOrder(it) {
  return typeof it.order === "number" ? it.order : 0;
}





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
  unsubscribePrepAll();
  clearPrepState();

  subscribePrepList("todo");
  subscribePrepList("luggage");
  subscribePrepList("shopping");
}

function subscribeBookings() {
  if (unsubBookings) unsubBookings();

  bookingLoading.value = true;
  const qy = query(collection(db, "trips", activeTripId, "bookings"), orderBy("createdAt", "desc"));

  unsubBookings = onSnapshot(
    qy,
    (snap) => {
      bookings.value = snap.docs.map((d) => {
        const data = d.data() || {};
        return {
          id: d.id,
          type: data.type || "flight",
          vendor: data.vendor || "",
          code: data.code || "",
          title: data.title || "",
          address: data.address || "",
          from: data.from || "",
          to: data.to || "",
          departTime: data.departTime || "",
          arriveTime: data.arriveTime || "",
          duration: data.duration || "",


          // ✅ 日期 / 時間欄位
          date: data.date || "",
          checkInTime: data.checkInTime || "",
          checkOutDate: data.checkOutDate || "",
          checkOutTime: data.checkOutTime || "",
          usageDate: data.usageDate || "",


          // flight meta（憑證頁會隱藏顯示，但資料可留著）
          baggage: data.baggage || "",
          aircraft: data.aircraft || "",

          priceTwd: typeof data.priceTwd === "number" ? data.priceTwd : null,
          purchasedAt: data.purchasedAt || "",

          // voucher / cover
          voucherUrl: data.voucherUrl || "",
          voucherPath: data.voucherPath || "",
          voucherName: data.voucherName || "",
          voucherType: data.voucherType || "",
          coverUrl: data.coverUrl || "",

          uid: data.uid || "",
          displayName: data.displayName || "",
          createdAt: data.createdAt || null,
        };
      });
      bookingLoading.value = false;
    },
    (err) => {
      console.error("讀取 bookings 失敗：", err);
      bookings.value = [];
      bookingLoading.value = false;
    }
  );
}


function unsubscribeBookings() {
  if (unsubBookings) unsubBookings();
  unsubBookings = null;
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

  const q = query(collection(db, "trips", activeTripId, key), orderBy("createdAt", "desc"));
  const unsub = onSnapshot(
    q,
    (snap) => {
      prep.value[kind].items = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          text: data.text || "",
          note: data.note || "",
          done: !!data.done,
          order: typeof data.order === "number" ? data.order : null, // ✅ 新增：排序用
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
  if (!canWrite.value) return alert("只讀模式無法新增。請先登入並被加入 members。");
  const text = String(prepInput.value[kind] || "").trim();
  if (!text) return;

  try {
    const key = prepCollectionKey(kind);
    await addDoc(collection(db, "trips", activeTripId, key), {
      text,
      note: "",
      done: false,
      order: Date.now(), // ✅ 新增：預設用時間當排序（越新越後）
      uid: user.value.uid,
      displayName: user.value.displayName || "使用者",
      createdAt: serverTimestamp(),
    });

    prepInput.value[kind] = "";
  } catch (e) {
    console.error("新增清單失敗：", e);
    alert("新增失敗（可能是 rules 不允許 create）");
  }
}


async function togglePrepEditMode(kind, list) {
  if (!canWrite.value) return alert("只讀模式無法儲存。請先登入並被加入 members。");

  // 由「編輯」→「儲存」
  if (prepEditMode.value) {
    try {
      const key = prepCollectionKey(kind);

      for (const item of list) {
        await updateDoc(
          doc(db, "trips", activeTripId, key, item.id),
          { text: String(item.text || "").trim(), updatedAt: serverTimestamp() }
        );
      }

      alert("儲存成功！");
    } catch (e) {
      console.error("儲存準備清單失敗：", e);
      alert(`儲存失敗：${e?.code || ""} ${e?.message || e}`);
      return; // 失敗就不要切回檢視模式，避免使用者以為有存到
    }
  }

  prepEditMode.value = !prepEditMode.value;
}




function getPrepOrderValue(it) {
  // order 優先；沒有就用 createdAt；再沒有就當 0
  if (Number.isFinite(Number(it.order))) return Number(it.order);
  const ms = it?.createdAt?.toMillis ? it.createdAt.toMillis() : 0;
  return Number.isFinite(ms) ? ms : 0;
}

function sortedPrepItems(kind) {
  const arr = [...(prep.value?.[kind]?.items || [])];

  // ✅ 規則：未完成在上、已完成在下；同區塊用 order 小到大
  arr.sort((a, b) => {
    if (!!a.done !== !!b.done) return a.done ? 1 : -1;

    const ao = getPrepOrderValue(a);
    const bo = getPrepOrderValue(b);
    if (ao !== bo) return ao - bo;

    return String(a.text || "").localeCompare(String(b.text || ""), "zh-Hant");
  });

  return arr;
}





async function togglePrepDone(kind, item) {
  if (!canWrite.value) return;

  try {
    const key = prepCollectionKey(kind);
    const refDoc = doc(db, "trips", activeTripId, key, item.id);

    // ✅ 勾選後移到底：我們把 order 設成現在時間（越大越後）
    // 取消勾選也給新 order，避免回到很前面造成「跳來跳去」
    const newOrder = Date.now();

    await updateDoc(refDoc, { done: !!item.done, order: newOrder });

    // ✅ 讓 UI 即刻反應（不用等 snapshot）
    item.order = newOrder;
  } catch (e) {
    console.error("更新清單失敗：", e);
    alert("更新失敗（可能是 rules 不允許 update）");
  }
}


async function savePrepEditsToFirebase() {
  if (!canWrite.value) {
    alert("只讀模式無法儲存");
    return;
  }

  const col =
    prepTab.value === "todo"
      ? "prep_todo"
      : prepTab.value === "luggage"
      ? "prep_luggage"
      : "prep_shopping";

  const batch = writeBatch(db);

  prepItems.value.forEach((it) => {
    const ref = doc(db, "trips", tripId.value, col, it.id);
    batch.update(ref, {
      text: it.text,
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();
}


async function deletePrepItem(kind, item) {
  if (!canWrite.value) return;
  if (!confirm("確定要刪除？")) return;

  try {
    const key = prepCollectionKey(kind);
    const refDoc = doc(db, "trips", activeTripId, key, item.id);
    await deleteDoc(refDoc);
  } catch (e) {
    console.error("刪除清單失敗：", e);
    alert("刪除失敗（多半是 rules 目前不允許 delete）");
  }
}

/* ===================== Tools：即時匯率換算器 ===================== */
const fxTool = ref({
  twd: "",
  jpy: "",
  updatedAt: "",
  lock: "twd",
});

// ✅ 工具頁匯率：1 JPY = ? TWD（預設 0.2）
const fxToolRate = ref(DEFAULT_FX_JPY_TO_TWD);
const fxToolUpdating = ref(false);

function nowTimeLabel() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function onFxToolTwdInput() {
  fxTool.value.lock = "twd";

  // ✅ 若使用者清空輸入，另一欄也清空（不要變 0）
  if (fxTool.value.twd === "" || fxTool.value.twd === null || fxTool.value.twd === undefined) {
    fxTool.value.jpy = "";
    return;
  }

  const twd = Number(fxTool.value.twd);
  if (!Number.isFinite(twd)) {
    fxTool.value.jpy = "";
    return;
  }

  const rate = fxToolRate.value || DEFAULT_FX_JPY_TO_TWD;
  fxTool.value.jpy = round2(rate > 0 ? twd / rate : twd / DEFAULT_FX_JPY_TO_TWD);
}

function onFxToolJpyInput() {
  fxTool.value.lock = "jpy";

  // ✅ 若使用者清空輸入，另一欄也清空（不要變 0）
  if (fxTool.value.jpy === "" || fxTool.value.jpy === null || fxTool.value.jpy === undefined) {
    fxTool.value.twd = "";
    return;
  }

  const jpy = Number(fxTool.value.jpy);
  if (!Number.isFinite(jpy)) {
    fxTool.value.twd = "";
    return;
  }

  const rate = fxToolRate.value || DEFAULT_FX_JPY_TO_TWD;
  fxTool.value.twd = round2(jpy * rate);
}



function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

// ✅ 小工具：加 timeout，避免卡住導致你以為「更新失敗」
async function fetchJsonWithTimeout(url, ms = 8000) {
  // ✅ 某些舊 iOS / WebView 可能沒有 fetch
  if (typeof fetch !== "function") {
    throw new Error("fetch is not supported in this environment");
  }

  // ✅ AbortController 不存在時：用 Promise.race 做 timeout（不 abort，但至少不會白畫面）
  const hasAbort = typeof AbortController === "function";

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error("timeout")), ms);
  });

  if (!hasAbort) {
    const res = await Promise.race([fetch(url), timeoutPromise]);
    if (!res || !res.ok) throw new Error(`HTTP ${res?.status || "unknown"}`);
    return await res.json();
  }

  // ✅ 支援 AbortController：正常 abort timeout
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await Promise.race([fetch(url, { signal: ctrl.signal }), timeoutPromise]);
    if (!res || !res.ok) throw new Error(`HTTP ${res?.status || "unknown"}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}


async function refreshFxTool() {
  try {
    // 依序嘗試多個來源（提高成功率）
    const sources = [
      {
        name: "open.er-api.com",
        url: "https://open.er-api.com/v6/latest/JPY",
        pick: (data) => Number(data?.rates?.TWD),
      },
      {
        name: "frankfurter.app",
        url: "https://api.frankfurter.app/latest?from=JPY&to=TWD",
        pick: (data) => Number(data?.rates?.TWD),
      },
      {
        // 最後才用你原本的來源（有些情況會回空或被限制）
        name: "exchangerate.host",
        url: "https://api.exchangerate.host/latest?base=JPY&symbols=TWD",
        pick: (data) => Number(data?.rates?.TWD),
      },
    ];

    let lastErr = null;

    for (const s of sources) {
      try {
        const data = await fetchJsonWithTimeout(s.url, 8000);
        const rate = s.pick(data);

        if (Number.isFinite(rate) && rate > 0) {
          // ✅ 工具/行程頁：更新即時匯率
          fxToolRate.value = Math.round(rate * 10000) / 10000;
          fxTool.value.updatedAt = nowTimeLabel();

          // ✅ 同步：記帳「明細」匯率顯示也要跟著更新（今天/全部的情況）
          const todayISO = new Date().toISOString().slice(0, 10);
          fxCache.set(todayISO, fxToolRate.value); // 讓 loadFxForDate(今天) 直接吃最新值，不再抓舊資料

          if (detailDateFilter.value === "全部" || detailDateFilter.value === todayISO) {
            fxJpyToTwd.value = fxToolRate.value;   // 明細上那行匯率文字立即更新
          }

          // 依照最後輸入欄位重新計算另一邊
          if (fxTool.value.lock === "jpy") onFxToolJpyInput();
          else onFxToolTwdInput();

          return true; // ✅ 成功
        }


        throw new Error("匯率資料無效");
      } catch (e) {
        lastErr = new Error(`[${s.name}] ${e?.message || e}`);
        // 失敗就換下一個來源
      }
    }

    // 全部來源都失敗
    throw lastErr || new Error("所有匯率來源皆失敗");

  } catch (e) {
    console.warn("工具頁匯率抓取失敗，改用預設值：", e);

    fxToolRate.value = DEFAULT_FX_JPY_TO_TWD; // 回退預設
    fxTool.value.updatedAt = nowTimeLabel();

    // ✅ 同步：就算失敗回退預設，明細顯示也要更新（避免卡在舊值）
    const todayISO = new Date().toISOString().slice(0, 10);
    fxCache.set(todayISO, fxToolRate.value);

    if (detailDateFilter.value === "全部" || detailDateFilter.value === todayISO) {
      fxJpyToTwd.value = fxToolRate.value;
    }

    return false;
  }


}


async function updateExchangeRate() {
  const ok = await refreshFxTool();
  if (ok) {
    alert(`✅ 匯率更新成功（1 JPY = ${fxToolRate.value} TWD）`);
  } else {
    alert(`❌ 匯率更新失敗：已改用預設值 ${DEFAULT_FX_JPY_TO_TWD}`);
  }
}

async function manualRefreshFxTool() {
  if (fxToolUpdating.value) return;

  fxToolUpdating.value = true;
  try {
    const ok = await refreshFxTool();

    const lines = [];
    if (ok) {
      lines.push(`✅ 匯率更新成功（1 JPY = ${fxToolRate.value} TWD）`);
    } else {
      lines.push(`❌ 匯率更新失敗：已改用預設值 ${DEFAULT_FX_JPY_TO_TWD}`);
    }

    alert(lines.join("\n"));
  } catch (e) {
    alert(`❌ 匯率更新失敗：${e?.message || e}`);
  } finally {
    fxToolUpdating.value = false;
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

function parseStayToHM(stayStr) {
  const s = String(stayStr || "");
  const m = s.match(/(\d+)\s*時\s*(\d+)\s*分/);
  if (m) return { h: Math.max(0, Number(m[1]) || 0), m: Math.max(0, Number(m[2]) || 0) };

  // 兼容像 "01:30" 之類格式（若未來有人手動輸入）
  const m2 = s.match(/^(\d{1,2}):(\d{1,2})$/);
  if (m2) return { h: Number(m2[1]) || 0, m: Number(m2[2]) || 0 };

  return { h: 1, m: 0 };
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

/* ✅ 手機：優先允許垂直捲動，避免左右滑判定干擾下滑 */
.day-panel{
  touch-action: pan-y;

  /* ✅ 保證最後一個行程不會被 bottom nav 壓到，手機一定點得到 */
  padding-bottom: calc(110px + env(safe-area-inset-bottom));
}



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

/* 工具頁：匯率換算器標題與更新按鈕同列 */
.card-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.itinerary-top-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-bottom: 10px;
  flex-wrap: wrap; /* ✅ 小手機也不會超出畫面 */
}

</style>


