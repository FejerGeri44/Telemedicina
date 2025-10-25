const patientModel     = require('../models/patient.model');
const doctorModel      = require('../models/doctor.model');
const adminModel       = require('../models/admin.model');
const patientTagModel  = require('../models/patientTag.model');

function replaceNullWithNA(obj) {
  const out = {};
  for (const k in obj) out[k] = obj[k] == null ? 'N/A' : obj[k];
  return out;
}

function mapTagRow(row) {
  const name  = (row.tag_name ?? row.tagName ?? row.name ?? '').toString().trim();
  const value = (row.tag_value ?? row.tagValue ?? row.value ?? '').toString().trim();

  return {
    id: row.id ?? row.docId ?? row._id?.toString?.(),
    name,
    value,
  };
}

async function buildProfile(existingUser) {
  const user = {
    id: existingUser.id,
    email: existingUser.email,
    name: existingUser.name,
    role: existingUser.role,
    phoneNumber: existingUser.phoneNumber ?? 'N/A',
    address: existingUser.address ?? 'N/A',
    birthDate: existingUser.birthDate ?? 'N/A',
    pictureUrl: existingUser.pictureUrl ?? 'N/A',
  };

  let related = null;

  if (existingUser.role === 'patient') {
    const p = await patientModel.getByUserId(existingUser.id);

    if (p) {
      const patientBase = { kind: 'patient', ...replaceNullWithNA(p) };

      let tags = [];
      try {
        const rows = await patientTagModel.getPatientTagsByUserId(existingUser.id);
        tags = Array.isArray(rows) ? rows.map(mapTagRow) : [];
      } catch (e) {
        console.error('patient tags fetch failed for user:', existingUser.id, e);
        tags = [];
      }

      related = { ...patientBase, tags };
    } else {
      related = null;
    }

  } else if (existingUser.role === 'doctor') {
    const d = await doctorModel.getByUserId(existingUser.id);
    related = d ? { kind: 'doctor', ...replaceNullWithNA(d) } : null;

  } else if (existingUser.role === 'admin') {
    const a = await adminModel.getByUserId(existingUser.id);
    related = a ? { kind: 'admin', ...replaceNullWithNA(a) } : null;
  }

  return { user, related };
}

module.exports = { buildProfile };
