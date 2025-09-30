// Phân tích lỗi validation
const parseTimeToMinutes = (time) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const isFulltimeShift = (startTime, endTime) => {
  return startTime === "07:00" && endTime === "17:00";
};

const isFourHourShift = (startTime, endTime) => {
  return parseTimeToMinutes(endTime) - parseTimeToMinutes(startTime) === 240;
};

const hasRequiredLunchBreak = (startTime, endTime) => {
  const s = parseTimeToMinutes(startTime);
  const e = parseTimeToMinutes(endTime);
  const breakStart = parseTimeToMinutes("11:00");
  const breakEnd = parseTimeToMinutes("13:00");
  return s <= breakStart && e >= breakEnd;
};

const startOfWeek = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d;
};

const endOfWeek = (date) => {
  const s = startOfWeek(date);
  const e = new Date(s);
  e.setDate(e.getDate() + 7);
  return e;
};

// Dữ liệu từ user
const schedules = [
  // Doctor 1: 6 ca part-time (07:00-11:00 và 13:00-17:00)
  { doctor: "507f1f77bcf86cd799439041", date: "2025-10-06", startTime: "07:00", endTime: "11:00" },
  { doctor: "507f1f77bcf86cd799439041", date: "2025-10-07", startTime: "13:00", endTime: "17:00" },
  { doctor: "507f1f77bcf86cd799439041", date: "2025-10-08", startTime: "07:00", endTime: "11:00" },
  { doctor: "507f1f77bcf86cd799439041", date: "2025-10-09", startTime: "13:00", endTime: "17:00" },
  { doctor: "507f1f77bcf86cd799439041", date: "2025-10-10", startTime: "07:00", endTime: "11:00" },
  { doctor: "507f1f77bcf86cd799439041", date: "2025-10-11", startTime: "13:00", endTime: "17:00" },

  // Doctor 2: 6 ca part-time (07:00-11:00 và 13:00-17:00)
  { doctor: "68db4344c83dcacce11aaa9a", date: "2025-10-06", startTime: "13:00", endTime: "17:00" },
  { doctor: "68db4344c83dcacce11aaa9a", date: "2025-10-07", startTime: "07:00", endTime: "11:00" },
  { doctor: "68db4344c83dcacce11aaa9a", date: "2025-10-08", startTime: "13:00", endTime: "17:00" },
  { doctor: "68db4344c83dcacce11aaa9a", date: "2025-10-09", startTime: "07:00", endTime: "11:00" },
  { doctor: "68db4344c83dcacce11aaa9a", date: "2025-10-10", startTime: "13:00", endTime: "17:00" },
  { doctor: "68db4344c83dcacce11aaa9a", date: "2025-10-11", startTime: "07:00", endTime: "11:00" },

  // Doctor 3: 6 ca fulltime (07:00-17:00)
  { doctor: "68db4351c83dcacce11aaa9b", date: "2025-10-06", startTime: "07:00", endTime: "17:00" },
  { doctor: "68db4351c83dcacce11aaa9b", date: "2025-10-07", startTime: "07:00", endTime: "17:00" },
  { doctor: "68db4351c83dcacce11aaa9b", date: "2025-10-08", startTime: "07:00", endTime: "17:00" },
  { doctor: "68db4351c83dcacce11aaa9b", date: "2025-10-09", startTime: "07:00", endTime: "17:00" },
  { doctor: "68db4351c83dcacce11aaa9b", date: "2025-10-10", startTime: "07:00", endTime: "17:00" },
  { doctor: "68db4351c83dcacce11aaa9b", date: "2025-10-11", startTime: "07:00", endTime: "17:00" },

  // Doctor 4: 6 ca fulltime (07:00-17:00)
  { doctor: "68db4427c83dcacce11aaaa4", date: "2025-10-06", startTime: "07:00", endTime: "17:00" },
  { doctor: "68db4427c83dcacce11aaaa4", date: "2025-10-07", startTime: "07:00", endTime: "17:00" },
  { doctor: "68db4427c83dcacce11aaaa4", date: "2025-10-08", startTime: "07:00", endTime: "17:00" },
  { doctor: "68db4427c83dcacce11aaaa4", date: "2025-10-09", startTime: "07:00", endTime: "17:00" },
  { doctor: "68db4427c83dcacce11aaaa4", date: "2025-10-10", startTime: "07:00", endTime: "17:00" },
  { doctor: "68db4427c83dcacce11aaaa4", date: "2025-10-11", startTime: "07:00", endTime: "17:00" }
];

console.log('=== PHÂN TÍCH DỮ LIỆU ===\n');

// Phân tích từng bác sĩ
const byDoctor = new Map();
schedules.forEach(s => {
  if (!byDoctor.has(String(s.doctor))) byDoctor.set(String(s.doctor), []);
  byDoctor.get(String(s.doctor)).push(s);
});

console.log('Số bác sĩ:', byDoctor.size);
console.log('');

for (const [doctorId, doctorSchedules] of byDoctor.entries()) {
  console.log(`Bác sĩ ${doctorId}:`);
  console.log(`  - Tổng số ca: ${doctorSchedules.length}`);
  
  // Kiểm tra fulltime
  const fulltimeShifts = doctorSchedules.filter(s => 
    isFulltimeShift(s.startTime, s.endTime) && hasRequiredLunchBreak(s.startTime, s.endTime)
  );
  console.log(`  - Ca fulltime (07:00-17:00 với nghỉ 11:00-13:00): ${fulltimeShifts.length}`);
  
  // Kiểm tra part-time 4 tiếng
  const fourHourShifts = doctorSchedules.filter(s => isFourHourShift(s.startTime, s.endTime));
  console.log(`  - Ca part-time 4 tiếng: ${fourHourShifts.length}`);
  
  // Kiểm tra từng ca
  console.log('  - Chi tiết các ca:');
  doctorSchedules.forEach(s => {
    const isFull = isFulltimeShift(s.startTime, s.endTime);
    const hasLunch = hasRequiredLunchBreak(s.startTime, s.endTime);
    const is4Hour = isFourHourShift(s.startTime, s.endTime);
    console.log(`    ${s.date} ${s.startTime}-${s.endTime}: ${isFull ? 'Fulltime' : 'Part-time'} ${is4Hour ? '4h' : 'không phải 4h'} ${isFull && hasLunch ? 'có nghỉ trưa' : ''}`);
  });
  console.log('');
}

// Kiểm tra validation logic
console.log('=== KIỂM TRA VALIDATION LOGIC ===\n');

const distinctDoctors = byDoctor.size;
let fulltimeDoctorsMeeting6Days = 0;
let partTimersMeeting6Shifts = 0;
let fulltimeDoctorsWithMoreThan6Days = 0;
let partTimersWithMoreThan6Shifts = 0;

for (const [doctorId, doctorSchedules] of byDoctor.entries()) {
  const fulltimeShifts = doctorSchedules.filter(s => 
    isFulltimeShift(s.startTime, s.endTime) && hasRequiredLunchBreak(s.startTime, s.endTime)
  );
  if (fulltimeShifts.length === 6) {
    fulltimeDoctorsMeeting6Days++;
  } else if (fulltimeShifts.length > 6) {
    fulltimeDoctorsWithMoreThan6Days++;
  }

  const fourHourShifts = doctorSchedules.filter(s => isFourHourShift(s.startTime, s.endTime));
  if (fourHourShifts.length === 6) {
    partTimersMeeting6Shifts++;
  } else if (fourHourShifts.length > 6) {
    partTimersWithMoreThan6Shifts++;
  }
}

console.log('Kết quả validation:');
console.log(`- Tổng số bác sĩ: ${distinctDoctors}`);
console.log(`- Bác sĩ fulltime đúng 6 ngày: ${fulltimeDoctorsMeeting6Days}`);
console.log(`- Bác sĩ part-time đúng 6 ca: ${partTimersMeeting6Shifts}`);
console.log(`- Bác sĩ fulltime nhiều hơn 6 ngày: ${fulltimeDoctorsWithMoreThan6Days}`);
console.log(`- Bác sĩ part-time nhiều hơn 6 ca: ${partTimersWithMoreThan6Shifts}`);

// Kiểm tra lỗi
const errors = [];
if (distinctDoctors >= 4) {
  if (fulltimeDoctorsMeeting6Days < 1) {
    errors.push("Cần tối thiểu 1 bác sĩ fulltime làm đúng 6 ngày/tuần (07:00-17:00, nghỉ 11:00-13:00)");
  }
  if (partTimersMeeting6Shifts < 1) {
    errors.push("Cần tối thiểu 1 bác sĩ part-time làm đúng 6 ca/tuần (mỗi ca 4 tiếng)");
  }
  if (fulltimeDoctorsWithMoreThan6Days > 0) {
    errors.push(`Có ${fulltimeDoctorsWithMoreThan6Days} bác sĩ fulltime làm nhiều hơn 6 ngày/tuần (chỉ được phép 1 bác sĩ làm 6 ngày)`);
  }
  if (partTimersWithMoreThan6Shifts > 0) {
    errors.push(`Có ${partTimersWithMoreThan6Shifts} bác sĩ part-time làm nhiều hơn 6 ca/tuần (chỉ được phép 1 bác sĩ làm 6 ca)`);
  }
}

console.log('\nLỗi được tạo ra:');
errors.forEach(error => console.log(`- ${error}`));
