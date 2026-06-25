import express from "express";
import pool from '../config/database';

const router = express.Router();

function auth(req: any, res: any, next: any) {
    const apiKey = req.headers["x-api-key"];

    if (!apiKey || apiKey !== process.env.SMS_API_KEY) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    next();
}

router.post("/send", auth, async (req, res) => {
    const { phone, message, studentId, branchId } = req.body;

    if (!phone || !message) {
        return res.status(400).json({ error: "phone and message required" });
    }

    try {
        await pool.query(
            `INSERT INTO sms_logs (
                student_id,
                parent_phone,
                message,
                status,
                sent_at,
                branch_id
            )
            VALUES ($1, $2, $3, 'pending', NULL, $4)`,
            [studentId || null, phone, message, branchId || null]
        );

        return res.json({ success: true });
    } catch (err) {
        console.error("Insert SMS error:", err);
        return res.status(500).json({ error: "DB error" });
    }
});

router.get("/pending", auth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, parent_phone, message
            FROM sms_logs
            WHERE status = 'pending'
            ORDER BY id ASC
            LIMIT 20
        `);

        res.json(result.rows);
    } catch (err) {
        console.error("Fetch pending error:", err);
        res.status(500).json({ error: "DB error" });
    }
});

router.post("/:id/sent", auth, async (req, res) => {
    const { id } = req.params;

    try {
        await pool.query(
            `UPDATE sms_logs
             SET status = 'sent',
                 sent_at = NOW()
             WHERE id = $1`,
            [id]
        );

        res.json({ success: true });
    } catch (err) {
        console.error("Mark sent error:", err);
        res.status(500).json({ error: "DB error" });
    }
});

router.post("/:id/failed", auth, async (req, res) => {
    const { id } = req.params;

    try {
        await pool.query(
            `UPDATE sms_logs
             SET status = 'failed'
             WHERE id = $1`,
            [id]
        );

        res.json({ success: true });
    } catch (err) {
        console.error("Mark failed error:", err);
        res.status(500).json({ error: "DB error" });
    }
});

export default router;