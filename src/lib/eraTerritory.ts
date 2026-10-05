import type { FeatureCollection } from 'geojson';
import type { Bar } from '../data/schema';

// Exact names in the border snapshots (after the label fixes), including labels that change across snapshots.
const POLITIES: Record<string, string[]> = {
  'kamakura-shogunate': ['Shogun Japan (Kamakura)'],
  'ashikaga-shogunate': ['Shogun Japan (Ashikaga)', 'Japan', 'Japan (Warring States)'],
  minoan: ['Minoan'], kerma: ['Kerma', 'Kush'], 'egypt-middle-kingdom': ['Egypt'], 'egypt-new-kingdom': ['Egypt'],
  andronovo: ['Andronovo'], 'late-harappan': ['Indus valley civilization'], xia: ['Xia'],
  'old-babylonian-period': ['Babylonia'], 'neo-babylonian': ['Neo-Babylonian Empire'],
  'hittite-empire': ['Hittites'], shang: ['Shang'], mycenaean: ['Greek city-states'], zhou: ['Zhou', 'Zhou states'],
  'vedic-period': ['Vedic Aryans'], olmec: ['Olmec'], kush: ['Kush', 'Meroe'], 'dong-son': ['Âu Lạc'],
  'neo-assyrian': ['Neo-Assyrian Empire'], chavin: ['Chavin'], scythians: ['Scythians', 'Proto-Scythian culture'],
  achaemenid: ['Achaemenid Empire'],
  'classical-greece': ['Greek city-states'], 'roman-republic': ['Roman Republic', 'Rome'],
  maurya: ['Mauryan Empire'], seleucid: ['Seleucid Kingdom'], 'ptolemaic-egypt': ['Ptolemaic Kingdom'],
  parthian: ['Parthia', 'Parthian Empire'], qin: ['Qin Empire'], xiongnu: ['Xiongnu', 'S. Xiongnu', 'Southern Xiongnu'],
  han: ['Han Empire', 'Han'], 'roman-empire': ['Roman Empire', 'Rome', 'Western Roman Empire', 'Eastern Roman Empire',
    'Rome (Constantinus)', 'Rome (Diocletianus)', 'Rome (Galerius)', 'Rome (Maximian)'],
  kushan: ['Kushan Empire', 'Kushan Principalities'], funan: ['Funan'], aksum: ['Axum'], moche: ['Moche'],
  'three-kingdoms': ['Wei', 'Shu', 'Wu'], sasanian: ['Sasanian Empire', 'Sasanian dependencies'],
  'classic-maya': ['Maya chiefdoms and states', 'Maya states', 'Maya city-states'], ghana: ['Empire of Ghana', 'Ghana'],
  gupta: ['Gupta Empire'], byzantine: ['Byzantine Empire', 'Eastern Roman Empire'],
  gokturk: ['Göktürks', 'Western Gokturk Khaganate'], sui: ['Sui Empire'], tiwanaku: ['Tiahuanaco Empire'], tang: ['Tang Empire'],
  rashidun: ['Rashidun Caliphate'], srivijaya: ['Srivijaya Empire'], umayyad: ['Umayyad Caliphate'],
  abbasid: ['Abbasid Caliphate'], heian: ['Japan', 'Yamato', 'Imperial Japan (Fujiwara)'],
  carolingian: ['Carolingian Empire'], khmer: ['Khmer Empire'], chola: ['Chola', 'Chola Empire', 'Cholas'],
  song: ['Song Empire'], 'holy-roman-empire': ['Holy Roman Empire'], seljuk: ['Seljuk Empire', 'Seljuk Caliphate'],
  'great-zimbabwe': ['Great Zimbabwe'],
  'mongol-empire': ['Mongol Empire', 'Great Khanate'], 'delhi-sultanate': ['Sultanate of Delhi'], mali: ['Mali'],
  'golden-horde': ['Golden Horde', 'Khanate of the Golden Horde'], mamluk: ['Mamluke Sultanate'], yuan: ['Yuan Empire', 'Great Khanate'],
  majapahit: ['Majapahit'], ottoman: ['Ottoman Empire', 'Ottoman Sultanate'], vijayanagara: ['Vijayanagara'],
  ming: ['Ming Empire', 'Ming Chinese Empire'], timurid: ['Timurid Empire', 'Timurid Emirates'], kongo: ['Congo'],
  joseon: ['Korea', 'Joseon'], aztec: ['Aztec Empire', 'Mexihcah (Triple Alliance)'], songhai: ['Songhai'],
  safavid: ['Safavid Empire'], 'new-spain': ['Viceroyalty of New Spain'], mughal: ['Mughal Empire'],
  'british-empire': ['England', 'England and Ireland', 'UK', 'United Kingdom', 'Great Britain',
    'United Kingdom of Great Britain and Ireland', 'British East India Company'],
  tokugawa: ['Tokugawa shogunate', 'Japan'], qing: ['Qing Empire', 'Manchu Empire'],
  'united-states': ['United States', 'United States of America'],
  'dutch-east-indies': ['Dutch East Indies', 'Netherlands Indies'],
  'british-raj': ['British Raj'], 'soviet-union': ['USSR'], prc: ['China'],
  gojoseon: ['Gojoseon'], goguryeo: ['Koguryo'], baekje: ['Paekche'], silla: ['Silla'], yamato: ['Yamato'],
  'jin-dynasty': ['Jin'], 'northern-wei': ['Toba Wei'], balhae: ['Parhae', 'Balhae'], liao: ['Liao'],
  'western-xia': ['Xixia'], 'jin-jurchen': ['Jin Empire'], goryeo: ['Korea', 'Goryeo'],
  'empire-of-japan': ['Imperial Japan', 'Empire of Japan'], 'republic-of-china': ['Republic of China', 'China'],
  manchukuo: ['Manchuria'], 'postwar-japan': ['Japan'], 'taiwan-roc': ['Taiwan'],
  'north-korea': ["Korea, Democratic People's Republic of"], 'south-korea': ['Korea, Republic of'],
};

export function territoryFor(geo: FeatureCollection, era: Pick<Bar, 'id' | 'title'>): FeatureCollection {
  const names = POLITIES[era.id] ?? [era.title];
  return {
    type: 'FeatureCollection',
    features: geo.features.filter((feature) =>
      names.includes(feature.properties?.NAME?.trim()) || names.includes(feature.properties?.SUBJECTO?.trim())),
  };
}
