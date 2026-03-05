import prisma from '../src/lib/prisma.js'
import { identifyContact } from '../src/services/identityService.js'

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message)
  }
}

const run = async () => {
  const passed = []

  await prisma.contact.deleteMany({})

  const case1 = await identifyContact({ email: 'lorraine@hillvalley.edu', phoneNumber: '123456' })
  const primary1 = case1.contact.primaryContatctId

  assert(case1.contact.emails[0] === 'lorraine@hillvalley.edu', 'Case 1 failed: primary email')
  assert(case1.contact.phoneNumbers[0] === '123456', 'Case 1 failed: primary phone')
  assert(case1.contact.secondaryContactIds.length === 0, 'Case 1 failed: secondary ids should be empty')
  passed.push('Case 1: new contact creates primary')

  const case2 = await identifyContact({ email: 'mcfly@hillvalley.edu', phoneNumber: '123456' })

  assert(case2.contact.primaryContatctId === primary1, 'Case 2 failed: primary id changed')
  assert(case2.contact.emails.includes('lorraine@hillvalley.edu') && case2.contact.emails.includes('mcfly@hillvalley.edu'), 'Case 2 failed: both emails not present')
  assert(case2.contact.phoneNumbers.length === 1 && case2.contact.phoneNumbers[0] === '123456', 'Case 2 failed: phone list mismatch')
  assert(case2.contact.secondaryContactIds.length >= 1, 'Case 2 failed: expected secondary contact')
  passed.push('Case 2: shared phone with new email creates secondary')

  const case3 = await identifyContact({ email: null, phoneNumber: '123456' })
  assert(case3.contact.primaryContatctId === primary1, 'Case 3 failed: phone-only did not resolve same identity')
  passed.push('Case 3: phone-only lookup resolves same identity')

  const case4 = await identifyContact({ email: 'lorraine@hillvalley.edu', phoneNumber: null })
  assert(case4.contact.primaryContatctId === primary1, 'Case 4 failed: email-only did not resolve same identity')
  passed.push('Case 4: email-only lookup resolves same identity')

  const case5a = await identifyContact({ email: 'george@hillvalley.edu', phoneNumber: '919191' })
  const georgePrimary = case5a.contact.primaryContatctId

  const case5b = await identifyContact({ email: 'biffsucks@hillvalley.edu', phoneNumber: '717171' })
  const biffPrimary = case5b.contact.primaryContatctId

  assert(georgePrimary !== biffPrimary, 'Case 5 setup failed: expected two separate primaries')

  const case5c = await identifyContact({ email: 'george@hillvalley.edu', phoneNumber: '717171' })

  assert(case5c.contact.primaryContatctId === georgePrimary, 'Case 5 failed: older primary not retained')
  assert(case5c.contact.secondaryContactIds.includes(biffPrimary), 'Case 5 failed: newer primary not demoted to secondary')
  assert(case5c.contact.emails.includes('george@hillvalley.edu') && case5c.contact.emails.includes('biffsucks@hillvalley.edu'), 'Case 5 failed: merged emails missing')
  assert(case5c.contact.phoneNumbers.includes('919191') && case5c.contact.phoneNumbers.includes('717171'), 'Case 5 failed: merged phone numbers missing')
  passed.push('Case 5: merge two primary clusters, newer becomes secondary')

  const case6 = await identifyContact({ email: 'mcfly@hillvalley.edu', phoneNumber: '123456' })
  assert(case6.contact.secondaryContactIds.length === case2.contact.secondaryContactIds.length, 'Case 6 failed: duplicate secondary created for exact same info')
  passed.push('Case 6: exact repeat request does not create duplicate contact')

  console.log('ALL CASES PASSED')
  for (const line of passed) {
    console.log(`- ${line}`)
  }
}

run()
  .catch((error) => {
    console.error('TEST FAILED')
    console.error(error.message)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
