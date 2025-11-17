const sql = require('../config/db.config');

const UserDocumentRepository = {
  async create(insertObj) {
    const { doctor_id, patient_id, encounter_id, storage_path } = insertObj;
    try {
      const [inserted] = await sql`
        INSERT INTO user_documents
          (doctor_id, patient_id, encounter_id, storage_path)
        VALUES
          (${doctor_id}, ${patient_id}, ${encounter_id}, ${storage_path})
        RETURNING *
      `;

      return inserted || null;

    } catch (err) {
      return null;
    }
  },

  async listDocumentsByPatientWithDetails(patientId) {
    const rows = await sql`
      SELECT
        d.id AS document_id,
        d.doctor_id AS document_doctor_id,
        d.patient_id AS document_patient_id,
        d.encounter_id AS document_encounter_id,
        d.storage_path AS document_storage_path,

        pu.id AS patient_user_id,
        pu.name AS patient_user_name,
        pu.email AS patient_user_email,
        pu.role AS patient_user_role,
        pu."phoneNumber" AS patient_user_phone_number,
        pu.address AS patient_user_address,
        pu."pictureUrl" AS patient_user_picture_url,

        p.gender AS patient_gender,
        p.height AS patient_height,
        p.weight AS patient_weight,
        p."birthDate" AS patient_birth_date,
        p.taj AS patient_taj,
        p."homePhone" AS patient_home_phone,
        p."registDate" AS patient_regist_date,

        du.id AS doctor_user_id,
        du.name AS doctor_user_name,
        du.email AS doctor_user_email,
        du.role AS doctor_user_role,
        du."phoneNumber" AS doctor_user_phone_number,
        du.address AS doctor_user_address,
        du."pictureUrl" AS doctor_user_picture_url,

        doc.id AS doctor_profile_id,
        doc."userId" AS doctor_profile_user_id,
        doc.speciality AS doctor_speciality,
        doc.introduction AS doctor_introduction,
        doc."avgRating" AS doctor_avg_rating,
        doc."registDate" AS doctor_regist_date,
        doc.status AS doctor_status,

        e.diagnosis_id,
        diag.diagnosis_date

      FROM user_documents d
             JOIN patients p ON d.patient_id = p.id
             JOIN users pu ON p."userId" = pu.id
             JOIN doctors doc ON d.doctor_id = doc.id
             JOIN users du ON doc."userId" = du.id
             LEFT JOIN encounters e ON d.encounter_id = e.id
             LEFT JOIN diagnoses diag ON e.diagnosis_id = diag.id

      WHERE d.patient_id = ${patientId}
      ORDER BY d.id ASC
    `;

    return rows.map(row => ({
      document: {
        id: row.document_id,
        doctor_id: row.document_doctor_id,
        patient_id: row.document_patient_id,
        encounter_id: row.document_encounter_id,
        storage_path: row.document_storage_path,
      },
      diagnosis_date: row.diagnosis_date || null,

      patient: {
        user: {
          id: row.patient_user_id,
          name: row.patient_user_name,
          email: row.patient_user_email,
          role: row.patient_user_role,
          phoneNumber: row.patient_user_phone_number,
          address: row.patient_user_address,
          pictureUrl: row.patient_user_picture_url
        },
        patient: {
          id: row.document_patient_id,
          userId: row.patient_user_id,
          gender: row.patient_gender,
          height: row.patient_height,
          weight: row.patient_weight,
          birthDate: row.patient_birth_date,
          taj: row.patient_taj,
          homePhone: row.patient_home_phone,
          registDate: row.patient_regist_date
        },
      },

      doctor: {
        user: {
          id: row.doctor_user_id,
          name: row.doctor_user_name,
          email: row.doctor_user_email,
          role: row.doctor_user_role,
          phoneNumber: row.doctor_user_phone_number,
          address: row.doctor_user_address,
          pictureUrl: row.doctor_user_picture_url
        },
        doctor: {
          id: row.doctor_profile_id,
          userId: row.doctor_profile_user_id,
          speciality: row.doctor_speciality,
          introduction: row.doctor_introduction,
          avgRating: row.doctor_avg_rating,
          registDate: row.doctor_regist_date,
          status: row.doctor_status,
        },
      },
    }));
  },

  async getSignedUrlIfAuthorized({ storagePath, patient_id, supabaseAdmin }) {
    const bucketName = 'user-documents';
    const expiresIn = 300;

    const { data: documentData, error: dbError } = await supabaseAdmin
      .from('user_documents')
      .select('id')
      .eq('storage_path', storagePath)
      .eq('patient_id', patient_id)
      .single();

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        throw { type: 'ForbiddenError', message: 'Nincs jogosultsága ehhez a dokumentumhoz.', code: 403 };
      }
      throw { type: 'DatabaseError', message: 'Adatbázis hiba a tulajdonjog ellenőrzésekor.', error: String(dbError.message || dbError), code: 500 };
    }

    const { data, error } = await supabaseAdmin.storage
      .from(bucketName)
      .createSignedUrl(storagePath, expiresIn);

    if (error) {
      const safeStatus = (parseInt(error.statusCode || 500, 10) >= 400) ? parseInt(error.statusCode || 500, 10) : 500;
      let errorMessage = 'A fájl elérésének hibája.';

      if (safeStatus === 401) {
        errorMessage = 'Hitelesítési hiba a Storage-ban. Ellenőrizd a Service Role kulcsot!';
      } else if (safeStatus === 404) {
        errorMessage = 'A dokumentum nem található a tárolóban. Ellenőrizd az elérési utat.';
      }

      throw { type: 'StorageError', message: errorMessage, error: String(error.message || error), code: safeStatus };
    }

    if (!data || !data.signedUrl) {
      throw { type: 'InternalError', message: 'Nem sikerült aláírt URL-t generálni.', code: 500 };
    }

    return { signedUrl: data.signedUrl };
  }
};

module.exports = UserDocumentRepository;
