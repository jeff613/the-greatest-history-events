import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Entry, Region } from '../data/schema';
import { formatSpan, formatYear } from '../lib/years';
import { CATEGORY_LABELS, REGION_LABELS, REGION_SHORT_LABELS } from '../theme';

export type Language = 'en' | 'zh';
const CHINESE_REGIONS: Record<Region, string> = {
  europe: '欧洲', mena: '中东与北非', 'sub-saharan-africa': '撒哈拉以南非洲',
  'central-asia': '中亚与草原', 'south-asia': '南亚', 'east-asia': '东亚',
  'southeast-asia-oceania': '东南亚与大洋洲', americas: '美洲',
};

export function localizeEntry<T extends Entry>(entry: T, language: Language): T {
  if (language === 'en' || !entry.zh) return entry;
  const { locationName, ...translated } = entry.zh;
  return {
    ...entry, ...translated,
    ...(entry.kind !== 'state' && entry.location && locationName
      ? { location: { ...entry.location, name: locationName } } : {}),
  };
}

function localeValues(language: Language) {
  return {
    language,
    text: (english: string, chinese: string) => language === 'en' ? english : chinese,
    localize: <T extends Entry>(entry: T) => localizeEntry(entry, language),
    formatYear: (year: number) => formatYear(year, language),
    formatSpan: (start: number, end: number | null) => formatSpan(start, end, language),
    regionLabels: language === 'en' ? REGION_LABELS : CHINESE_REGIONS,
    regionShortLabels: language === 'en' ? REGION_SHORT_LABELS : {
      ...CHINESE_REGIONS, mena: '中东', 'sub-saharan-africa': '非洲',
      'central-asia': '中亚草原', 'southeast-asia-oceania': '东南亚',
    },
    categoryLabels: language === 'en' ? CATEGORY_LABELS : {
      politics: '政治、战争与变革', religion: '宗教与哲学', science: '科学与技术',
      culture: '文化与艺术', trade: '贸易与探索',
    },
  };
}

const LocaleContext = createContext({ ...localeValues('en'), setLanguage: (_language: Language) => {} });

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');
  const value = useMemo(() => ({ ...localeValues(language), setLanguage }), [language]);
  useEffect(() => {
    document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN';
    document.title = language === 'en' ? 'The Greatest History' : '世界历史长卷';
  }, [language]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export const useLocale = () => useContext(LocaleContext);
