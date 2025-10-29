const PatientFile = 'chatbots/patient-assistant/patient-assistant.json';
const DoctorFile = 'chatbots/doctor-assistant/doctor-assistant.json';

exports.getPatientAssistantConfig = async (req, res) => {
  try {
    const bucket = admin.storage().bucket();
    const [exists] = await bucket.file(PatientFile).exists();
    if (!exists) {
      return res.status(404).json({ message: 'A konfigurációs fájl nem található a Storage-ban.' });
    }

    const [buffer] = await bucket.file(PatientFile).download();
    const json = JSON.parse(buffer.toString('utf-8'));
    return res.status(200).json(json);
  } catch (err) {
    console.error('getPatientAssistantConfig hiba:', err);
    return res.status(500).json({ message: 'Nem sikerült lekérni a konfigurációt.' });
  }
};

exports.getDoctorAssistantConfig = async (req, res) => {
  try {
    const bucket = admin.storage().bucket();
    const [exists] = await bucket.file(DoctorFile).exists();
    if (!exists) {
      return res.status(404).json({ message: 'A konfigurációs fájl nem található a Storage-ban.' });
    }

    const [buffer] = await bucket.file(DoctorFile).download();
    const json = JSON.parse(buffer.toString('utf-8'));
    return res.status(200).json(json);
  } catch (err) {
    console.error('getDoctorAssistantConfig hiba:', err);
    return res.status(500).json({ message: 'Nem sikerült lekérni a konfigurációt.' });
  }
};

function eqId(a, b) {
  if (a == null || b == null) return false;
  return String(a) === String(b); // 0 == "0" is ok
}

function coercePatterns(val) {
  if (Array.isArray(val)) return val.map(String).map(s => s.trim()).filter(Boolean);
  if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(Boolean);
  return undefined;
}

exports.updateAiRules = async (req, res) => {
  try {
    const { role, kind, id, patch } = req.body || {};
    if (!kind || typeof patch !== 'object' || patch == null) {
      return res.status(400).json({ message: 'Hiányzó vagy hibás body (kind/patch).' });
    }

    const bucket  = admin.storage().bucket();
    const fileKey = role === 'doctor' ? DoctorFile : PatientFile;

    const [exists] = await bucket.file(fileKey).exists();
    if (!exists) return res.status(404).json({ message: 'A konfigurációs fájl nem található.' });

    const [buffer] = await bucket.file(fileKey).download();
    const cfg = JSON.parse(buffer.toString('utf-8'));

    // Védőkorlátok az elvárt blokkokra
    cfg.greeting = cfg.greeting ?? {};
    cfg.fallback = cfg.fallback ?? {};
    cfg.intents  = Array.isArray(cfg.intents) ? cfg.intents : [];

    let updated = false;

    switch (kind) {
      // --- szöveg blokkok ---
      case 'greetingText': {
        const text = (patch.text ?? patch.quickStartText ?? patch.value);
        if (typeof text === 'string' && text.trim() !== '') {
          cfg.greeting.quickStartText = text.trim();
          updated = true;
        }
        break;
      }
      case 'fallbackText': {
        const text = (patch.text ?? patch.suggestionText ?? patch.value);
        if (typeof text === 'string' && text.trim() !== '') {
          cfg.fallback.suggestionText = text.trim();
          updated = true;
        }
        break;
      }

      // --- greeting quickstarts (ikon, label, prompt, id) ---
      case 'greeting':
      case 'quickStart': {
        const list = Array.isArray(cfg.greeting.quickStarts) ? cfg.greeting.quickStarts : [];
        const idx = list.findIndex(qs => eqId(qs.id, id) || eqId(qs.label, id)); // ha label azonosít
        if (idx < 0) return res.status(404).json({ message: 'QuickStart nem található.' });

        const allowed = ['icon', 'label', 'prompt', 'id'];
        for (const k of Object.keys(patch)) {
          if (allowed.includes(k)) { list[idx][k] = patch[k]; updated = true; }
        }
        cfg.greeting.quickStarts = list;
        break;
      }

      // --- fallback suggestions (ikon, label, id) ---
      case 'fallback':
      case 'suggestion': {
        const list = Array.isArray(cfg.fallback.suggestions) ? cfg.fallback.suggestions : [];
        const idx = list.findIndex(s => eqId(s.id, id) || eqId(s.label, id));
        if (idx < 0) return res.status(404).json({ message: 'Suggestion nem található.' });

        const allowed = ['icon', 'label', 'id'];
        for (const k of Object.keys(patch)) {
          if (allowed.includes(k)) { list[idx][k] = patch[k]; updated = true; }
        }
        cfg.fallback.suggestions = list;
        break;
      }

      // --- intent (response, patterns, id, priority) ---
      case 'intent':
      case 'pattern': {
        const list = cfg.intents;
        const idx = list.findIndex(it => eqId(it.id, id));
        if (idx < 0) return res.status(404).json({ message: 'Intent nem található.' });

        const it = list[idx];

        if (typeof patch.response === 'string' && patch.response.trim() !== '') {
          it.response = patch.response.trim(); updated = true;
        }
        if ('patterns' in patch) {
          const pats = coercePatterns(patch.patterns);
          if (pats && pats.length) { it.patterns = pats; updated = true; }
        }
        if (typeof patch.id === 'number' || typeof patch.id === 'string') {
          it.id = patch.id; updated = true;
        }
        if (typeof patch.priority === 'number') {
          it.priority = patch.priority; updated = true;
        }
        break;
      }

      default:
        return res.status(400).json({ message: `Ismeretlen kind: ${kind}` });
    }

    if (!updated) {
      return res.status(200).json({ message: 'Nincs módosítás.' });
    }

    await bucket.file(fileKey).save(JSON.stringify(cfg, null, 2), {
      metadata: { contentType: 'application/json' },
      validation: false,
    });

    return res.status(200).json({ message: 'OK', updated: true });
  } catch (err) {
    console.error('updateAiRules hiba:', err);
    return res.status(500).json({ message: 'Nem sikerült frissíteni a konfigurációt.' });
  }
};

function getMaxIntentId(intents) {
  let max = -1;
  for (const it of intents || []) {
    const raw = it?.id;
    let n = Number.isFinite(raw) ? Number(raw) : NaN;
    if (!Number.isFinite(n) && typeof raw === 'string') {
      const m = raw.match(/\d+/g);
      n = m ? Number(m[m.length - 1]) : NaN;
    }
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max;
}

exports.createIntent = async (req, res) => {
  try {
    const {
      role,
      patterns,
      response,
      priority
    } = req.body || {};

    if (typeof response !== 'string' || response.trim() === '') {
      return res.status(400).json({ message: 'A response kötelező (nem lehet üres).' });
    }

    const bucket  = admin.storage().bucket();
    const fileKey = role === 'doctor' ? DoctorFile : PatientFile;

    const [exists] = await bucket.file(fileKey).exists();
    if (!exists) {
      return res.status(404).json({ message: 'A konfigurációs fájl nem található.' });
    }

    const [buffer] = await bucket.file(fileKey).download();
    const cfg = JSON.parse(buffer.toString('utf-8'));

    if (!Array.isArray(cfg.intents)) cfg.intents = [];

    const maxId  = getMaxIntentId(cfg.intents);
    const nextId = maxId + 1;

    const newIntent = {
      id: nextId,
      patterns: coercePatterns(patterns),
      response: String(response).trim()
    };
    if (typeof priority === 'number') newIntent.priority = priority;

    cfg.intents.push(newIntent);

    await bucket.file(fileKey).save(JSON.stringify(cfg, null, 2), {
      metadata: { contentType: 'application/json; charset=utf-8' }
    });

    return res.status(201).json({
      message: 'Intent created',
      intent: newIntent
    });
  } catch (err) {
    console.error('createIntent hiba:', err);
    return res.status(500).json({ message: 'Nem sikerült létrehozni az intentet.' });
  }
};

exports.deleteAiRule = async (req, res) => {
  try {
    const { role, type, id } = req.body || {};
    if (!type || (id === undefined || id === null)) {
      return res.status(400).json({ message: 'Hiányzó type vagy id.' });
    }

    const bucket  = admin.storage().bucket();
    const fileKey = role === 'doctor' ? DoctorFile : PatientFile;

    const [exists] = await bucket.file(fileKey).exists();
    if (!exists) return res.status(404).json({ message: 'Konfiguráció nem található.' });

    const [buffer] = await bucket.file(fileKey).download();
    const cfg = JSON.parse(buffer.toString('utf-8'));

    let found = false;

    if (type === 'intent') {
      if (!Array.isArray(cfg.intents)) cfg.intents = [];
      const before = cfg.intents.length;
      cfg.intents = cfg.intents.filter(it => !eqId(it?.id, id));
      found = cfg.intents.length !== before;
    } else if (type === 'quickStart') {
      const list = Array.isArray(cfg.greeting?.quickStarts) ? cfg.greeting.quickStarts : [];
      const before = list.length;
      cfg.greeting = cfg.greeting || {};
      cfg.greeting.quickStarts = list.filter(qs => !(eqId(qs?.id, id) || eqId(qs?.label, id)));
      found = cfg.greeting.quickStarts.length !== before;
    } else if (type === 'suggestion') {
      const list = Array.isArray(cfg.fallback?.suggestions) ? cfg.fallback.suggestions : [];
      const before = list.length;
      cfg.fallback = cfg.fallback || {};
      cfg.fallback.suggestions = list.filter(s => !(eqId(s?.id, id) || eqId(s?.label, id)));
      found = cfg.fallback.suggestions.length !== before;
    } else {
      return res.status(400).json({ message: `Ismeretlen type: ${type}` });
    }

    if (!found) {
      return res.status(404).json({ message: 'A megadott elem nem található.' });
    }

    await bucket.file(fileKey).save(JSON.stringify(cfg, null, 2), {
      metadata: { contentType: 'application/json; charset=utf-8' }
    });

    return res.status(200).json({ deleted: true });
  } catch (err) {
    console.error('deleteAiRule hiba:', err);
    return res.status(500).json({ message: 'Nem sikerült törölni az elemet.' });
  }
};
