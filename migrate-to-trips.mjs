// migrate-to-trips.mjs
// 用途：把舊 collection honeymoonPlan 的每天文件搬到 trips/{tripId}/plan/{dayId}
// 你現在是 ESM 專案，所以用 import 寫法

import admin from "firebase-admin";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// === 你要改的參數 ===
const OLD_COLLECTION = "honeymoonPlan";   // 舊的每天資料 collection 名稱
const TRIP_ID = "HM-8F3K2A";              // 你的 tripId
const SERVICE_ACCOUNT_FILENAME = "serviceAccountKey.json"; // 你下載的服務帳戶 key 檔名
// ====================

// 取得 __dirname（ESM 沒有內建，所以自己算）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 讀取 service account json（只在本機，不上傳 GitHub）
const serviceAccountPath = path.join(__dirname, SERVICE_ACCOUNT_FILENAME);
if (!fs.existsSync(serviceAccountPath)) {
  console.error("❌ 找不到 serviceAccountKey.json，請把檔案放在專案根目錄：", serviceAccountPath);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

// 初始化 Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

function makeDayId(dayNumber) {
  return `day-${String(dayNumber).padStart(2, "0")}`;
}

async function run() {
  console.log("Start migrate...");
  console.log("Old collection:", OLD_COLLECTION);
  console.log("New path:", `trips/${TRIP_ID}/plan/*`);

  // 1) 讀舊資料
  const snap = await db.collection(OLD_COLLECTION).get();
  console.log("Found old docs:", snap.size);

  // 2) 建立 meta（可選）
  await db.collection("trips").doc(TRIP_ID).collection("meta").doc("info").set(
    {
      title: "蜜月旅行",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      migratedFrom: OLD_COLLECTION,
    },
    { merge: true }
  );

  // 3) 批次寫入 plan
  let batch = db.batch();
  let opCount = 0;
  let migrated = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data();

    const dayNumber = Number(data.day);
    const dayId = Number.isFinite(dayNumber) ? makeDayId(dayNumber) : docSnap.id;

    // 若你想搬家時順便補 city（沒資料就預設 Osaka）
    const city = data.city ? data.city : "Osaka";

    const targetRef = db
      .collection("trips")
      .doc(TRIP_ID)
      .collection("plan")
      .doc(dayId);

    batch.set(
      targetRef,
      {
        ...data,
        city,
        tripId: TRIP_ID,
        sourceDocId: docSnap.id,
        migratedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    opCount += 1;
    migrated += 1;

    // Firestore batch 上限 500
    if (opCount >= 450) {
      await batch.commit();
      batch = db.batch();
      opCount = 0;
      console.log("Committed partial batch, migrated:", migrated);
    }
  }

  if (opCount > 0) {
    await batch.commit();
  }

  console.log("✅ Migration done. Total migrated:", migrated);
  console.log("Now you should update frontend paths to trips/{tripId}/plan & trips/{tripId}/expenses");
}

run().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
