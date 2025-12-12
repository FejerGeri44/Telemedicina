const sql = require('../config/db.config');
const {supabaseAdmin} = require("../utils/supabaseAdmin");

const UserRepository = {
  async create({
                 email, name, role,
                 phoneNumber = null,
                 address = null,
                 pictureUrl = null,
                 authUid = null,
                 passwordHash = null
               }, client = sql) {
    const [row] = await client`
      INSERT INTO users ("email", "name", "role", "phoneNumber", "address", "pictureUrl", "authUid")
      VALUES (${email}, ${name}, ${role}, ${phoneNumber}, ${address}, ${pictureUrl}, ${authUid})
      RETURNING id, email, name, role,
               "phoneNumber" AS "phoneNumber",
               address,
               "pictureUrl"  AS "pictureUrl",
               "authUid"     AS "authUid"
    `;
    return row;
  },

  async findById(id, client = sql) {
    const [row] = await client`
      SELECT id, email, name, role,
             "phoneNumber" AS "phoneNumber",
             address,
             "pictureUrl"  AS "pictureUrl",
             "authUid"     AS "authUid"
      FROM users
      WHERE id = ${id}
    `;
    return row || null;
  },

  async findByEmail(email, client = sql) {
    const [row] = await client`
      SELECT id, email, name, role,
             "phoneNumber" AS "phoneNumber",
             address,
             "pictureUrl"  AS "pictureUrl",
             "authUid"     AS "authUid"
      FROM users
      WHERE email = ${email}
      LIMIT 1
    `;
    return row || null;
  },

  async findByAuthUid(authUid, client = sql) {
    const [row] = await client`
      SELECT id, email, name, role,
             "phoneNumber" AS "phoneNumber",
             address,
             "pictureUrl"  AS "pictureUrl",
             "authUid"     AS "authUid"
      FROM users
      WHERE "authUid" = ${authUid}
      LIMIT 1
    `;
    return row || null;
  },

  async deleteById(id, client = sql) {
    const [row] = await client`
      DELETE FROM users
      WHERE id = ${id}
        RETURNING id, "authUid"
    `;

    if (!row) return false;

    if (row.authUid) {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(row.authUid);

      if (error) {
        console.error('Hiba a Supabase Auth user törlésekor:', error);
      }
    }

    return true;
  },
};

module.exports = UserRepository;
