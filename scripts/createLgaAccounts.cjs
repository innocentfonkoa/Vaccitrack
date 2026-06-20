// Uses firebase-admin v11 style imports which work reliably in CJS
const { initializeApp, cert } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const { getFirestore } = require('firebase-admin/firestore')
const fs = require('fs')
const path = require('path')

const serviceAccount = JSON.parse(fs.readFileSync(path.join(__dirname, 'serviceAccountKey.json'), 'utf8'))
console.log('✅ Loaded service account for:', serviceAccount.project_id)

initializeApp({ credential: cert(serviceAccount) })
const auth = getAuth()
const db = getFirestore()

const STATE = 'Kano'
const DEFAULT_PASSWORD = 'VacciTrack2024!'

function lgaToEmail(lga) {
  return lga.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '') + '.lga@vaccitrack.ng'
}

const KANO_LGAS = [
  'Ajingi','Albasu','Bagwai','Bebeji','Bichi','Bunkure','Dala','Dambatta',
  'Dawakin Kudu','Dawakin Tofa','Doguwa','Fagge','Gabasawa','Garko',
  'Garun Malam','Gaya','Gezawa','Gwale','Gwarzo','Kabo','Kano Municipal',
  'Karaye','Kibiya','Kiru','Kumbotso','Kunchi','Kura','Madobi','Makoda',
  'Minjibir','Nassarawa','Rano','Rimin Gado','Rogo','Shanono','Sumaila',
  'Takai','Tarauni','Tofa','Tsanyawa','Tudun Wada','Ungogo','Warawa','Wudil'
]

async function createAccount(lga) {
  const email = lgaToEmail(lga)
  const displayName = lga + ' LGA Staff'
  try {
    let uid
    try {
      const u = await auth.createUser({ email, password: DEFAULT_PASSWORD, displayName })
      uid = u.uid
    } catch (e) {
      if (e.code === 'auth/email-already-exists') {
        const u = await auth.getUserByEmail(email)
        uid = u.uid
        console.log('⚠️  Already exists: ' + lga)
      } else throw e
    }
    await db.collection('staff').doc(uid).set({ displayName, email, role: 'lga_staff', state: STATE, lga })
    console.log('✅ ' + lga.padEnd(20) + ' ' + email)
    return 'ok'
  } catch (e) {
    console.error('❌ ' + lga + ': ' + e.message)
    return 'err'
  }
}

async function main() {
  console.log('\n🚀 Creating ' + KANO_LGAS.length + ' LGA accounts...')
  console.log('Password: ' + DEFAULT_PASSWORD + '\n')
  let ok = 0, err = 0
  for (const lga of KANO_LGAS) {
    const r = await createAccount(lga)
    r === 'ok' ? ok++ : err++
  }
  console.log('\n✅ Created: ' + ok + (err ? '  ❌ Errors: ' + err : ''))
  console.log('Password: ' + DEFAULT_PASSWORD + '\n')
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
