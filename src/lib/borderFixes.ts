/** A corrected name, or a corrected name with the power that ruled it. */
type Fix = string | [name: string, ruler: string];

const USSR: Fix = ['USSR', 'USSR'];
const RUANDA_URUNDI: Fix = ['Ruanda-Urundi', 'Belgium'];

/** There was no Austrian Empire until 1804. */
const HABSBURG: Record<string, Fix> = { 'Austrian Empire': 'Habsburg Monarchy' };

/** Berber peoples the source records under the Umayyads; in 650 the caliphate had not reached them. */
const INDEPENDENT_BERBERS: Record<string, Fix> = Object.fromEntries(
  ['Barghawata', 'Mauri', 'Aures', 'Warsenis'].map((name) => [name, [name, name]]),
);

/** Modern country names the source uses for colonies between the world wars. */
const INTERWAR: Record<string, Fix> = {
  Botswana: 'Bechuanaland',
  Lesotho: 'Basutoland',
  Malawi: 'Nyasaland',
  Malaysia: 'Malaya',
  'Tanzania, United Republic of': 'Tanganyika',
  'Guinea-Bissau': 'Portuguese Guinea',
  'Equatorial Guinea': 'Spanish Guinea',
  Guyana: 'British Guiana',
  Belize: 'British Honduras',
};

/**
 * Labels in the pinned historical-basemaps data that are wrong for their snapshot's year
 * (anachronisms and misspellings), keyed by snapshot year, then by source NAME.
 * Only labels are corrected here; wrong shapes are replaced by the patches in `scripts/borderPatches.ts`,
 * which run first, so a polity those patches remove needs no fix.
 */
export const LABEL_FIXES: Record<number, Record<string, Fix>> = {
  [-1500]: { Zhoa: 'Shang', 'Kingdom of David and Solomon': 'Canaan' },
  [-1000]: { Zhoa: 'Zhou' },
  [-700]: { Zhoa: 'Zhou' },
  [-560]: { Zhoa: 'Zhou' },
  300: { 'Parthian Empire': 'Sasanian Empire' },
  400: { Persia: ['Sasanian Empire', 'Sasanian Empire'] },
  // The Eastern Jin ended in 420; southern China was under the Southern Qi.
  500: { 'Jin Empire': 'Southern Qi' },
  650: INDEPENDENT_BERBERS,
  700: { 'Sui Empire': 'Tang Empire' },
  800: { Silia: 'Silla' },
  // The Tibetan Empire broke up in the 840s.
  900: { 'Tibetan Empire': 'Tibet' },
  // The Buyids never ruled Sind; the Habbarids did.
  1000: { 'Buyid Emirate': 'Habbarid Emirate' },
  // The Buyids fell in 1062 and the Ghaznavids in 1186; by 1200 the Ghurids held their eastern lands,
  // and western Iran and Iraq were divided among the Seljuks' successors and the Abbasid caliph.
  1200: {
    'Buyid dynasty': 'Kashmir',
    'Buwayhid Emirates': 'Seljuk successor states',
    'Ghaznavid Emirate': 'Ghurid Empire',
    'Khwarazmian dynasty': 'Ghurid Empire',
  },
  1279: { Kediri: 'Singhasari', Ryazan: 'Rus principalities' },
  1300: { Ryazan: 'Rus principalities' },
  1400: { Tibet: ['Tibet', 'Tibet'], 'Shogun Japan (Kamakura)': 'Shogun Japan (Ashikaga)' },
  1492: { Castille: 'Castile', 'White Horde': 'Kazakh Khanate' },
  1500: { Castille: 'Castile', 'White Horde': 'Kazakh Khanate' },
  // The Wattasids fell in 1554.
  1600: { 'Watassid Morocco': 'Saadi Morocco' },
  // What the source calls the Austrian Empire here is only the Habsburg lands outside the Holy Roman Empire,
  // which holds Austria and Bohemia. Naples and Sardinia were Spanish until the War of the Spanish Succession.
  1700: {
    'Austrian Empire': ['Habsburg Hungary', 'Habsburg Hungary'],
    Naples: ['Naples', 'Spanish Habsburg'],
    Sardinia: ['Sardinia', 'Spanish Habsburg'],
  },
  1715: HABSBURG,
  1783: HABSBURG,
  1800: HABSBURG,
  1878: { 'M?ori': 'Māori', 'Sultinate of Zanzibar': 'Sultanate of Zanzibar', 'Kingdom of Brazil': 'Empire of Brazil' },
  1880: { 'Kingdom of Brazil': 'Empire of Brazil' },
  1900: { 'Kingdom of Brazil': ['Brazil', 'Brazil'] },
  1914: {
    Botswana: 'Bechuanaland',
    Lesotho: 'Basutoland',
    Malawi: 'Nyasaland',
    Guyana: 'British Guiana',
    Belize: 'British Honduras',
    'Equatorial Guinea': 'Spanish Guinea',
    Djibouti: 'French Somaliland',
    'Manchu Empire': 'Republic of China',
  },
  1920: {
    ...INTERWAR,
    Ghana: 'Gold Coast',
    'Zaire (Belgium)': 'Belgian Congo',
    Zambia: 'Northern Rhodesia',
    Zimbabwe: 'Southern Rhodesia',
    Iran: 'Persia',
    'Chinese Warlords': 'Republic of China',
    'Far Eastern SSR': 'Far Eastern Republic',
    "Emirate of Bin Shal'an": 'Nejd',
  },
  1930: {
    ...INTERWAR,
    Ghana: 'Gold Coast',
    'Zaire (Belgium)': 'Belgian Congo',
    Zambia: 'Northern Rhodesia',
    Zimbabwe: 'Southern Rhodesia',
    Iran: 'Persia',
    'Chinese Warlords': 'Republic of China',
    'White Russia': USSR,
    'Far Eastern SSR': USSR,
  },
  1938: {
    ...INTERWAR,
    Israel: ['Mandatory Palestine (GB)', 'United Kingdom of Great Britain and Ireland'],
    Jordan: 'Transjordan',
    'Chinese warlords': 'Republic of China',
    Hejaz: 'Saudi Arabia',
    Hail: 'Saudi Arabia',
    "Emirate of Bin Shal'an": 'Saudi Arabia',
    'Mesopotamia (GB)': ['Iraq', 'Iraq'],
    Cambodia: ['Cambodia', 'France'],
    'Cochin China': ['Cochin China', 'France'],
  },
  1945: {
    'Sri Lanka': ['Ceylon', 'United Kingdom'],
    Malaysia: ['Malaya', 'United Kingdom'],
    'United Arab Emirates': ['Trucial States', 'United Kingdom'],
    Israel: ['Mandatory Palestine', 'United Kingdom'],
    Jordan: ['Transjordan', 'United Kingdom'],
    Belize: ['British Honduras', 'United Kingdom'],
    Guyana: ['British Guiana', 'United Kingdom'],
    Botswana: 'Bechuanaland',
    Lesotho: 'Basutoland',
    'Tanzania, United Republic of': 'Tanganyika',
    Namibia: ['South West Africa', 'South Africa'],
    Zaire: ['Belgian Congo', 'Belgium'],
    Rwanda: RUANDA_URUNDI,
    Burundi: RUANDA_URUNDI,
    'Burkina Faso': ['French West Africa', 'France'],
    Benin: ['Dahomey', 'France'],
    Djibouti: ['French Somaliland', 'France'],
    Cameroon: ['French Cameroons', 'France'],
    'Central African Republic': ['Ubangi-Shari', 'France'],
    Congo: ['Middle Congo', 'France'],
    Gabon: ['Gabon', 'France'],
    'Western Sahara': ['Spanish Sahara', 'Spain'],
    'Equatorial Guinea': ['Spanish Guinea', 'Spain'],
    'Cyraneica (UK Lybia)': 'Cyrenaica (UK)',
    'Tripolitana (UK Lybia)': 'Tripolitania (UK)',
    'Fezzan (Frech Lybia)': 'Fezzan (France)',
  },
  1960: {
    Zaire: 'Congo (Léopoldville)',
    Congo: 'Congo (Brazzaville)',
    'Burkina Faso': 'Upper Volta',
    Benin: 'Dahomey',
    'Sri Lanka': 'Ceylon',
    Malaysia: 'Malaya',
    'United Arab Emirates': ['Trucial States', 'United Kingdom'],
    Zambia: ['Northern Rhodesia', 'United Kingdom'],
    Zimbabwe: ['Southern Rhodesia', 'United Kingdom'],
    Malawi: ['Nyasaland', 'United Kingdom'],
    'Tanzania, United Republic of': ['Tanganyika', 'United Kingdom'],
    Botswana: ['Bechuanaland', 'United Kingdom'],
    Lesotho: ['Basutoland', 'United Kingdom'],
    Belize: ['British Honduras', 'United Kingdom'],
    Guyana: ['British Guiana', 'United Kingdom'],
    Namibia: ['South West Africa', 'South Africa'],
    Djibouti: ['French Somaliland', 'France'],
    'Western Sahara': ['Spanish Sahara', 'Spain'],
    'Equatorial Guinea': ['Spanish Guinea', 'Spain'],
    'Guinea-Bissau': ['Portuguese Guinea', 'Portugal'],
    Angola: ['Angola', 'Portugal'],
    Mozambique: ['Mozambique', 'Portugal'],
    Eritrea: ['Eritrea', 'Ethiopia'],
    Tibet: ['Tibet', 'China'],
    // Egypt and Syria were united from 1958 to 1961.
    Egypt: 'United Arab Republic',
    Syria: 'United Arab Republic',
  },
  1994: { Byelarus: 'Belarus' },
  2000: { Byelarus: 'Belarus', Zaire: 'Congo (DRC)', 'Hong Kong': ['Hong Kong', 'China'] },
};

/** Applies the label fix for a snapshot year, if there is one; otherwise returns `props` unchanged. */
export function fixLabel<T extends { NAME: string | null; SUBJECTO: string | null }>(year: number, props: T): T {
  const fix = LABEL_FIXES[year]?.[props.NAME?.trim() ?? ''];
  if (!fix) return props;
  if (typeof fix !== 'string') return { ...props, NAME: fix[0], SUBJECTO: fix[1] };
  // A polity recorded as its own ruler (or with none) keeps ruling itself under the new name.
  const selfRuled = !props.SUBJECTO || props.SUBJECTO.trim() === props.NAME?.trim();
  return { ...props, NAME: fix, SUBJECTO: selfRuled ? fix : props.SUBJECTO };
}
