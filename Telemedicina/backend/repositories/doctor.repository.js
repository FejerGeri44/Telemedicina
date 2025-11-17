const sql = require('../config/db.config');

const DoctorRepository = {
  async create({ userId, speciality, introduction = null, avgRating = 0, registDate, status }, client = sql) {
      const [row] = await client`
      INSERT INTO doctors ("userId", speciality, introduction, "avgRating", "registDate", status)
      VALUES (${userId}, ${speciality}, ${introduction}, ${avgRating}, ${registDate}, ${status})
        RETURNING id,
        "userId" AS "userId",
        speciality, introduction,
        "avgRating" AS "avgRating",
        "registDate" AS "registDate",
        status
    `;
    return row;
  },

  async getDoctorWithUserById(doctorId, client = sql) {
    const [row] = await client`
      SELECT
        d.id AS doctor_id,
        d."userId" AS doctor_user_id,
        d.speciality,
        d.introduction,
        d."avgRating" AS avg_rating,
        d.status AS doctor_status,

        u.id AS user_id,
        u.email AS user_email,
        u.name AS user_name,
        u.role AS user_role,
        u."phoneNumber" AS user_phone_number,
        u.address AS user_address,
        u."pictureUrl" AS user_picture_url

      FROM doctors d
             JOIN users u ON d."userId" = u.id
      WHERE d.id = ${doctorId}
        LIMIT 1
    `;

    if (!row) {
      return null;
    }
    return {
      user: {
        id: row.user_id,
        email: row.user_email,
        name: row.user_name,
        role: row.user_role,
        phoneNumber: row.user_phone_number,
        address: row.user_address,
        pictureUrl: row.user_picture_url,
      },
      doctor: {
        id: row.doctor_id,
        userId: row.doctor_user_id,
        speciality: row.speciality,
        introduction: row.introduction,
        avgRating: row.avg_rating,
        status: row.doctor_status,
      },
    };
  },

  async getByUserId(userId, client = sql) {
      const [row] = await client`
      SELECT id, "userId" AS "userId", speciality, introduction,
             "avgRating" AS "avgRating", "registDate" AS "registDate", status
      FROM doctors
      WHERE "userId" = ${userId}
    `;
    return row || null;
  },

  async listApprovedDoctorsWithUser(client = sql) {
    const rows = await client`
      SELECT
        d.id AS doctor_id,
        d."userId" AS doctor_user_id,
        d.speciality,
        d.introduction,
        d."avgRating" AS avg_rating,
        d.status AS doctor_status,
        d."registDate" AS regist_date,

        u.id AS user_id,
        u.email AS user_email,
        u.name AS user_name,
        u.role AS user_role,
        u."phoneNumber" AS user_phone_number,
        u.address AS user_address,
        u."pictureUrl" AS user_picture_url

      FROM doctors d
      JOIN users u ON d."userId" = u.id
      WHERE d.status = 'Approved'
      ORDER BY d.id ASC
    `;

    return rows.map(row => ({
      user: {
        id: row.user_id,
        email: row.user_email,
        name: row.user_name,
        role: row.user_role,
        phoneNumber: row.user_phone_number,
        address: row.user_address,
        pictureUrl: row.user_picture_url,
      },
      doctor: {
        id: row.doctor_id,
        userId: row.doctor_user_id,
        speciality: row.speciality,
        introduction: row.introduction,
        avgRating: row.avg_rating,
        registDate: row.regist_date,
        status: row.doctor_status,
      },
    }));
  },
};

module.exports = DoctorRepository;
