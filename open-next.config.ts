import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// ตั้งค่า default — รัน Next.js บน Cloudflare Workers (รองรับ route handlers ครบ ไม่มีบั๊ก dedup)
export default defineCloudflareConfig({});
