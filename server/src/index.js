import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import { db, bucket } from "./firebase.js";

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/tenants", async (_req, res) => {
  try {
    const snapshot = await db.collection("tenants").orderBy("createdAt", "desc").get();
    const tenants = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(tenants);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch tenants", error: error.message });
  }
});

app.post("/api/tenants", async (req, res) => {
  try {
    const tenant = {
      ...req.body,
      createdAt: new Date().toISOString()
    };
    const docRef = await db.collection("tenants").add(tenant);
    res.status(201).json({ id: docRef.id, ...tenant });
  } catch (error) {
    res.status(500).json({ message: "Failed to create tenant", error: error.message });
  }
});

app.put("/api/tenants/:tenantId", async (req, res) => {
  try {
    const { tenantId } = req.params;
    await db.collection("tenants").doc(tenantId).update(req.body);
    const updated = await db.collection("tenants").doc(tenantId).get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (error) {
    res.status(500).json({ message: "Failed to update tenant", error: error.message });
  }
});

app.delete("/api/tenants/:tenantId", async (req, res) => {
  try {
    const { tenantId } = req.params;
    await db.collection("tenants").doc(tenantId).delete();
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ message: "Failed to delete tenant", error: error.message });
  }
});

app.post("/api/records", upload.single("meterPhoto"), async (req, res) => {
  try {
    const { tenantId, record } = req.body;
    const parsedRecord = JSON.parse(record);

    let meterPhotoUrl = "";
    if (req.file) {
      const fileName = `meter-photos/${tenantId}-${Date.now()}-${req.file.originalname}`;
      const file = bucket.file(fileName);
      await file.save(req.file.buffer, { contentType: req.file.mimetype });
      await file.makePublic();
      meterPhotoUrl = file.publicUrl();
    }

    const payload = {
      ...parsedRecord,
      tenantId,
      meterPhotoUrl,
      createdAt: new Date().toISOString()
    };

    const docRef = await db.collection("records").add(payload);
    res.status(201).json({ id: docRef.id, ...payload });
  } catch (error) {
    res.status(500).json({ message: "Failed to create record", error: error.message });
  }
});

app.get("/api/tenants/:tenantId/records", async (req, res) => {
  try {
    const { tenantId } = req.params;
    const snapshot = await db
      .collection("records")
      .where("tenantId", "==", tenantId)
      .orderBy("date", "desc")
      .get();
    const records = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch records", error: error.message });
  }
});

app.patch("/api/records/:recordId/pay", async (req, res) => {
  try {
    const { recordId } = req.params;
    await db.collection("records").doc(recordId).update({ paid: req.body.paid });
    const updated = await db.collection("records").doc(recordId).get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (error) {
    res.status(500).json({ message: "Failed to update payment", error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
