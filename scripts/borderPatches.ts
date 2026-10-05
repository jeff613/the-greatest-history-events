import type { Box, Patch } from './patchBorders';

/**
 * The source's Iron Age Near East, redrawn whole: its Assyria is a rump of the empire, and the
 * Kingdom of David and Solomon and the Hittites had been gone for centuries.
 */
const IRON_AGE_NEAR_EAST = ['Assyria', 'Babylonia', 'Kingdom of David and Solomon', 'Hittites', 'Phrygians'];
/** The source keeps the Sasanians in Iran, and the caliphate west of it, half a century after the conquest. */
const ARAB_CONQUEST = ['Umayyad Caliphate', 'Sasanian Empire', 'Sasanian dependencies'];

/**
 * The source draws Warmia, a Polish prince-bishopric on the Baltic coast, as a piece of the Austrian Empire.
 */
const WARMIA = { polity: 'Austrian Empire', within: [19, 53, 21.5, 55] as Box, as: 'Warmia', ruler: 'Polish–Lithuanian Commonwealth' };

/**
 * Where historical-basemaps has the wrong shape for a snapshot, or no snapshot at all inside a
 * polity's lifetime, the borders are patched with shapes from Cliopatria for that exact year.
 * Keyed by snapshot year; a patch with a `base` creates a snapshot the source does not have.
 */
export const BORDER_PATCHES: Record<number, Patch> = {
  // Hammurabi's Babylonia; Ur had fallen two and a half centuries earlier.
  [-1750]: { base: -2000, remove: ['Ur'], add: { Babylonia: 'Babylonia' } },
  [-1000]: {
    remove: ['Kingdom of David and Solomon', 'Hittites'],
    add: { 'Kingdom of Israel': 'Kingdom of Israel', 'Neo-Hittite states': 'Neo-Hittite states' },
  },
  [-700]: {
    remove: IRON_AGE_NEAR_EAST,
    add: { 'Neo-Assyrian Empire': 'Neo-Assyrian Empire', Phrygia: 'Phrygia', Lydia: 'Lydia' },
  },
  [-560]: {
    base: -700,
    remove: IRON_AGE_NEAR_EAST,
    add: { 'Neo-Babylonian Empire': 'Neo-Babylonian Empire', 'Median Kingdom': 'Median Empire', Lydia: 'Lydia' },
  },
  // Antigonus fell at Ipsus in 301 BC; Lysimachus and Seleucus divided his kingdom.
  [-300]: {
    remove: ['Kingdom of Antigonus', 'Kingdom of Lysimachus', 'Seleucid Kingdom', 'Ptolemaic Kingdom'],
    add: {
      'Kingdom of Lysimachus': 'Kingdom of Lysimachus',
      'Seleucid Empire': 'Seleucid Kingdom',
      'Ptolemaic Kingdom': 'Ptolemaic Kingdom',
    },
  },
  // The Qin Empire between unification and its fall; the Han and Nan-Yue came after it.
  // Âu Lạc, in the Red River delta, was the state of the Dong Son culture.
  [-210]: { base: -200, remove: ['Han Empire', 'Nan-Yue'], add: { 'Qin Dynasty': 'Qin Empire', 'Âu Lạc': 'Âu Lạc' } },
  // The source still gives the Seleucids Iran and Mesopotamia, lost to Parthia decades earlier, and
  // draws the Kushan and Mauryan empires, one not yet founded and one already gone.
  [-100]: {
    remove: ['Seleucid Kingdom', 'Parthia', 'Kushan Empire', 'Mauryan Empire'],
    add: {
      'Parthian Empire': 'Parthian Empire',
      'Seleucid Empire': 'Seleucid Kingdom',
      Yuezhi: 'Yuezhi',
      'Indo-Greeks': 'Indo-Greek Kingdom',
      'Indo-Scythians': 'Indo-Scythians',
      'Shunga Empire': 'Shunga Empire',
      'Satavahana Dynasty': 'Satavahana dynasty',
    },
  },
  // The Kushans at their height; the source shows a fragment, then nothing.
  [100]: { remove: ['Kushan Empire', 'Suren Kingdom'], add: { 'Kushan Empire': 'Kushan Empire' } },
  [200]: { remove: ['Suren Kingdom'], add: { 'Kushan Empire': 'Kushan Empire' } },
  [250]: {
    base: 200,
    remove: ['Han', 'Parthian Empire', 'Suren Kingdom'],
    add: {
      'Cao Wei': 'Wei',
      'Shu Han': 'Shu',
      'Eastern Wu': 'Wu',
      'Sasanian Empire': 'Sasanian Empire',
      'Western Kushans': 'Kushan Empire',
      'Eastern Kushans': 'Kushan Empire',
    },
  },
  [500]: { add: { 'White Huns': 'Hephthalites' } },
  [600]: { add: { 'Western Göktürks': 'Western Gokturk Khaganate' } },
  // The source's Visigothic Kingdom is a northern strip: it gives Iberia to the Umayyads before 711.
  // In 650 the Tang held the eastern steppe; the Turks only regained it in 682.
  [650]: {
    base: 700,
    remove: [...ARAB_CONQUEST, 'Eastern Roman Empire', 'Visigothic Kingdom', 'Sui Empire', 'Göktürks'],
    add: {
      'Rashidun Caliphate': 'Rashidun Caliphate',
      'Byzantine Empire': 'Eastern Roman Empire',
      'Visigothic Kingdom': 'Visigothic Kingdom',
      'Tang Dynasty': 'Tang Empire',
    },
  },
  [700]: {
    remove: [...ARAB_CONQUEST, 'Visigothic Kingdom'],
    add: { 'Umayyad Caliphate': 'Umayyad Caliphate', 'Visigothic Kingdom': 'Visigothic Kingdom', Srivijaya: 'Srivijaya Empire' },
  },
  // Egypt and Syria under the Tulunids; the Tarim oases under Qocho after the Tibetan Empire broke up.
  [900]: { add: { Tulunids: 'Tulunids', 'Qocho Kingdom': 'Qocho' } },
  [1000]: { add: { 'Kara-Khanids': 'Kara-Khanid Khanate' } },
  // Sukhothai was founded in 1238; in 1100 this was Pagan, which had absorbed the Pyu and Mon lands.
  [1100]: { remove: ['Kingdom of Sukhotai', 'Pyu state', 'Mon state'], add: { 'Pagan Kingdom': 'Pagan Kingdom' } },
  // The source keeps the Liao (fallen 1125), a Song Empire that still holds the north (lost 1127)
  // and the Fatimids (ended 1171).
  [1200]: {
    remove: ['Liao', 'Song Empire', 'Fatimid Caliphate'],
    add: { 'Great Jin': 'Jin Empire', 'Southern Song': 'Song Empire', 'Ayyubid Sultanate': 'Ayyubid Sultanate' },
  },
  [1300]: { remove: ['Srivijaya Empire', 'Kediri'], add: { Majapahit: 'Majapahit' } },
  // The source still draws the Yuan realm, 32 years after the Ming drove the Mongols north, a Delhi
  // Sultanate that rules all India two years after Timur sacked Delhi, and the Cholas and Srivijaya.
  [1400]: {
    remove: ['Great Khanate', 'Sultanate of Delhi', 'Chola Empire', 'Pandya state', 'Srivijaya Empire', 'Kediri'],
    add: {
      'Ming Dynasty': 'Ming Empire',
      'Northern Yuan': 'Northern Yuan',
      Joseon: 'Joseon',
      'Tughlaq Dynasty': 'Sultanate of Delhi',
      'Bahmani Sultanate': 'Bahmani Sultanate',
      'Vijayanagara Empire': 'Vijayanagara',
      'Sultanate of Bengal': 'Bengal Sultanate',
      'Jaunpur Sultanate': 'Jaunpur Sultanate',
      Majapahit: 'Majapahit',
    },
  },
  // The source runs the Chagatai Khanate from Central Asia to Manchuria; Mongolia was the Northern Yuan's.
  [1492]: {
    remove: ['Chagatai Khanate'],
    add: { Moghulistan: 'Moghulistan', 'Mongol Khanate': 'Northern Yuan', 'Inca Empire': 'Inca Empire' },
  },
  [1500]: { remove: ['Chagatai Khanate'], add: { Moghulistan: 'Moghulistan', 'Mongol Khanate': 'Northern Yuan' } },
  [1530]: { add: { 'Mongol Khanate': 'Northern Yuan' } },
  // Akbar's empire at its extent in 1600; the source shows less than half of it.
  [1600]: { remove: ['Mughal Empire'], add: { 'Mughal Empire': 'Mughal Empire' } },
  [1650]: { relabel: [WARMIA] },
  // The last Ming loyalists were defeated by 1683, and the Khalkha Mongols submitted in 1691.
  [1700]: { relabel: [WARMIA], remove: ['Post-Ming Warlords', 'Manchu Empire'], add: { 'Qing Dynasty': 'Qing Empire' } },
  [1715]: { relabel: [WARMIA] },
  // The source stretches the Marathas to Kashmir, over the Sikh and Durrani lands.
  [1815]: {
    remove: ['Maratha Confederacy', 'Afghanistan'],
    add: { 'Maratha Empire': 'Maratha Confederacy', 'Sikh Empire': 'Sikh Empire', 'Durrani Empire': 'Durrani Empire' },
  },
  // Upper Burma stayed independent until 1885.
  [1878]: { add: { Burma: 'Kingdom of Burma' } },
  [1880]: { add: { Burma: 'Kingdom of Burma' } },
  // The source's Africa in 1900 is still the one before the Scramble.
  [1900]: {
    remove: ['Ethiopia'],
    add: {
      'British Africa': 'British Africa',
      'French Africa': 'French Africa',
      'German Africa': 'German Africa',
      'Italian Africa': 'Italian Africa',
      'Kingdom of Portugal': 'Portugal',
      'Belgian Congo': 'Congo Free State',
      'Ethiopian Empire': 'Ethiopia',
    },
  },
  [1930]: {
    remove: ["Emirate of Bin Shal'an", 'Hejaz', 'Hail'],
    add: { 'Kingdom of Hejaz and Nejd': 'Kingdom of Hejaz and Nejd' },
  },
  // Partition came in 1947; in 1945 this was one British possession.
  [1945]: { merge: { 'British Raj': { from: ['India', 'Pakistan', 'Bangladesh'], ruler: 'United Kingdom' } } },
  [1960]: {
    remove: ['Vietnam'],
    add: { 'Democratic Republic of Vietnam': 'North Vietnam', 'Republic of Vietnam': 'South Vietnam' },
  },
};
