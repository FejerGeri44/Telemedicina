const { db } = require('../index');

exports.col = (name) => db.collection(name);
exports.doc = (name, id) => db.collection(name).doc(String(id));
