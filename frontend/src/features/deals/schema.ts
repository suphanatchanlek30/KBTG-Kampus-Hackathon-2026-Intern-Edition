import { z } from "zod";

export const dealDraftSchema = z
  .object({
    propertyId: z.string().min(1),
    totalSatang: z
      .number()
      .int()
      .min(10_000, "ยอดมัดจำรวมต้องอย่างน้อย 100 บาท")
      .max(100_000_000, "ยอดมัดจำรวมสูงเกินไป"),
    bookingFeeSatang: z.number().int().min(100, "ค่าจองต้องมากกว่า 0"),
    /** ISO-8601 +07:00 */
    viewingAt: z.iso.datetime({ offset: true }),
    /** YYYY-MM-DD */
    moveInDate: z.iso.date(),
  })
  .refine((d) => d.bookingFeeSatang < d.totalSatang, {
    path: ["bookingFeeSatang"],
    message: "ค่าจองต้องน้อยกว่ายอดมัดจำรวม",
  })
  .refine((d) => d.moveInDate >= d.viewingAt.slice(0, 10), {
    path: ["moveInDate"],
    message: "วันเข้าอยู่ต้องไม่ก่อนวันนัดดูห้อง",
  });

export type DealDraft = z.infer<typeof dealDraftSchema>;
