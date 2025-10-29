const Users = require('../repositories/user.repository');
const Doctors = require('../repositories/doctor.repository');
const Patients = require('../repositories/patient.repository');
const Admins = require('../repositories/admin.repository');
const Appointments = require('../repositories/appointment.repository');
const PatientTags = require('../repositories/patientTag.repository');
const DoctorRatings = require('../repositories/doctorRating.repository');
const Diagnoses = require('../repositories/diagnosis.repository');
const Messages = require('../repositories/message.repository');
const SystemMessages = require('../repositories/systemMessage.repository');

module.exports = {
  Users,
  Doctors,
  Patients,
  Admins,
  Appointments,
  PatientTags,
  DoctorRatings,
  Diagnoses,
  Messages,
  SystemMessages
};
