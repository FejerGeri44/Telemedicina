const sql           = require('../config/db.config');
const UserRepo      = require('../repositories/user.repository');
const PatientRepo   = require('../repositories/patient.repository');
const DoctorRepo    = require('../repositories/doctor.repository');
const AdminRepo     = require('../repositories/admin.repository');

async function createUserWithProfile({
                                       name,
                                       email,
                                       role,
                                       phoneNumber = null,
                                       address     = null,
                                       pictureUrl  = null,

                                       authUid     = null,
                                       passwordHash = null,

                                       profile = {}
                                     }) {
  if (!name || !email || !role) {
    throw new Error('createUserWithProfile: name, email, role kötelező.');
  }

  return await sql.begin(async (trx) => {
    const user = await UserRepo.create({
      email,
      name,
      role,
      phoneNumber,
      address,
      pictureUrl,
      authUid,
      passwordHash
    }, trx);

    if (role === 'patient') {
      const { gender, height=null, weight=null, birthDate, taj, homePhone=null, registDate } = profile;
      await PatientRepo.create({
        userId: user.id,
        gender, height, weight, birthDate, taj, homePhone, registDate
      }, trx);

    } else if (role === 'doctor') {
      const { speciality, introduction=null, avgRating= 0, registDate, status='Pending' } = profile;
      await DoctorRepo.create({
        userId: user.id,
        speciality, introduction, avgRating, registDate, status
      }, trx);

    } else if (role === 'admin') {
      await AdminRepo.create({ userId: user.id, registDate: profile.registDate }, trx);
    }

    return user;
  });
}

module.exports = {
  createUserWithProfile,
};
