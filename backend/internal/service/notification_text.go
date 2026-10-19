package service

// Notification copy shared by the live deal flow and the demo seed, so both
// build their text from the same deal, user and property rows.

type message struct{ title, body string }

func inviteMsg(landlordShort string) message {
	return message{"คำขอ " + brandName + " ใหม่", "จากคุณ" + landlordShort}
}

func lockedLandlordMsg(totalSatang int64, tenantShort, unit string) message {
	return message{"เงินถูกกันไว้แล้ว", tenantShort + " กันเงิน " + bahtText(totalSatang) + " สำหรับห้อง " + unit}
}

func lockedTenantMsg(totalSatang int64, unit string) message {
	return message{"กันเงินเรียบร้อย",
		"กันเงิน " + bahtText(totalSatang) + " สำหรับห้อง " + unit + " · เงินยังเป็นของคุณจนกว่าจะเข้าอยู่"}
}

func bookingLandlordMsg(feeSatang int64, tenantShort, unit string) message {
	return message{"ได้รับค่าจอง " + bahtText(feeSatang), tenantShort + " ยืนยันดูห้อง " + unit + " แล้ว"}
}

func bookingTenantMsg(feeSatang int64, landlordShort, unit string) message {
	return message{"ปล่อยค่าจองแล้ว " + bahtText(feeSatang),
		"โอนให้ " + landlordShort + " สำหรับห้อง " + unit + " · มัดจำหลักยังกันไว้"}
}

func releasedLandlordMsg(totalSatang int64, tenantShort, unit string) message {
	return message{"ได้รับเงินครบแล้ว " + bahtText(totalSatang), tenantShort + " ยืนยันเข้าอยู่ห้อง " + unit + " แล้ว"}
}

func releasedTenantMsg(totalSatang, mainSatang int64, landlordShort, unit string) message {
	return message{"ดีลเสร็จสมบูรณ์ · ปล่อยครบ " + bahtText(totalSatang),
		"ปล่อยมัดจำหลัก " + bahtText(mainSatang) + " ให้ " + landlordShort + " แล้ว · ดูหลักฐานได้"}
}
