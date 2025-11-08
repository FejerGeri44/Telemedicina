const patient     = require('../repositories/patient.repository');
const doctor      = require('../repositories/doctor.repository');
const admin       = require('../repositories/admin.repository');
const patientTagModel  = require('../repositories/patientTag.repository');

function replaceNullWithNA(obj) {
  const out = {};
  for (const k in obj) out[k] = obj[k] == null ? 'N/A' : obj[k];
  return out;
}

function mapTagRow(row) {
  const tag_name  = (row.tag_name ?? row.tagName ?? row.name ?? '').toString().trim();
  const tag_value = (row.tag_value ?? row.tagValue ?? row.value ?? '').toString().trim();

  return {
    id: row.id ?? row.docId ?? row._id?.toString?.(),
    tag_name,
    tag_value,
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
    const p = await patient.getByUserId(existingUser.id);

    if (p) {
      const patientBase = { kind: 'patient', ...replaceNullWithNA(p) };

      let tags = [];
      try {
        const rows = await patientTagModel.getByPatientId(p.id);
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
    const d = await doctor.getByUserId(existingUser.id);
    related = d ? { kind: 'doctor', ...replaceNullWithNA(d) } : null;

  } else if (existingUser.role === 'admin') {
    const a = await admin.getByUserId(existingUser.id);
    related = a ? { kind: 'admin', ...replaceNullWithNA(a) } : null;
  }

  return { user, related };
}

module.exports = { buildProfile };
