/*
  One-time backfill: copy snapshot fields from Appointment -> MedicalRecord
  - prescriptions
  - selectedServices, treatmentNotes, homeCare
  - testServices, testInstructions, testResults, imagingResults, labResults, testImages

  Usage (from project root):
    node dental-clinic-server/scripts/backfill-medical-records.js
*/

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/database');
const { Appointment, MedicalRecord } = require('../src/models');

(async () => {
  try {
    await connectDB();

    const records = await MedicalRecord.find({}).select('_id appointment prescriptions selectedServices testServices');
    let updated = 0;

    for (const mr of records) {
      if (!mr.appointment) continue;
      const appt = await Appointment.findById(mr.appointment).select(
        'prescriptions selectedServices treatmentNotes homeCare testServices testInstructions testResults imagingResults labResults testImages'
      );
      if (!appt) continue;

      // Determine if anything missing
      const needs = {
        prescriptions: !mr.prescriptions || mr.prescriptions.length === 0,
        selectedServices: !mr.selectedServices || mr.selectedServices.length === 0,
        treatmentNotes: mr.treatmentNotes == null || mr.treatmentNotes === '',
        homeCare: mr.homeCare == null || mr.homeCare === '',
        testServices: !mr.testServices || mr.testServices.length === 0,
        testInstructions: mr.testInstructions == null || mr.testInstructions === '',
        testResults: mr.testResults == null || mr.testResults === '',
        imagingResults: mr.imagingResults == null || mr.imagingResults === '',
        labResults: mr.labResults == null || mr.labResults === '',
        testImages: !mr.testImages || mr.testImages.length === 0,
      };

      if (
        needs.prescriptions || needs.selectedServices || needs.treatmentNotes || needs.homeCare ||
        needs.testServices || needs.testInstructions || needs.testResults || needs.imagingResults || needs.labResults || needs.testImages
      ) {
        if (needs.prescriptions && Array.isArray(appt.prescriptions)) mr.prescriptions = appt.prescriptions;
        if (needs.selectedServices && Array.isArray(appt.selectedServices)) mr.selectedServices = appt.selectedServices;
        if (needs.treatmentNotes && appt.treatmentNotes) mr.treatmentNotes = appt.treatmentNotes;
        if (needs.homeCare && appt.homeCare) mr.homeCare = appt.homeCare;
        if (needs.testServices && Array.isArray(appt.testServices)) mr.testServices = appt.testServices;
        if (needs.testInstructions && appt.testInstructions) mr.testInstructions = appt.testInstructions;
        if (needs.testResults && appt.testResults) mr.testResults = appt.testResults;
        if (needs.imagingResults && appt.imagingResults) mr.imagingResults = appt.imagingResults;
        if (needs.labResults && appt.labResults) mr.labResults = appt.labResults;
        if (needs.testImages && Array.isArray(appt.testImages)) mr.testImages = appt.testImages;

        await mr.save();
        updated += 1;
      }
    }

    console.log(`Backfill completed. Updated records: ${updated}`);
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('Backfill error:', err);
    process.exit(1);
  }
})();


