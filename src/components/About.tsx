import { useLocale } from '../state/LocaleContext';
import { useEffect, useRef } from 'react';

export function About({ onClose }: { onClose(): void }) {
  const { text } = useLocale();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    // Without preventScroll, a dialog taller than the screen opens scrolled down to the Close button.
    closeRef.current?.focus({ preventScroll: true });
    return () => previous?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="about-backdrop" onClick={onClose}>
      <div
        className="about"
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="about-title">{text('About The Greatest History', '关于世界历史长卷')}</h2>
        <p>{text("A curated focus on Europe and Asia, with major turning points elsewhere, from 2000 BC to AD 2000 on one map, so you can see what was happening in different parts of the world at the same time. The timeline shows three things together for each region: states as solid bars, periods such as wars, movements and influential lives as round-ended pills, and single moments as diamonds above them. Select any of them to read what it was, why it mattered, what it was part of and what happened within it. Approximate or disputed dates are noted in those descriptions. Toggle the region buttons to choose which timelines to compare. Scroll vertically to browse their rows, drag the bands to move through time, use + and - to zoom, drag the top edge of the timeline to make it taller, or press play.", "本地图集以欧洲和亚洲为重点，同时收录世界其他地区的重要转折，将公元前2000年至公元2000年的历史呈现在同一张地图上，方便对照各地在同一时期发生的事情。时间轴按地区展示三类记录：方形长条代表政权，圆角长条代表战争、运动及重要人物生平等历史时期，菱形代表单一事件。选择任一记录，可阅读简介、历史意义、所属历史及其重要事件。近似或有争议的年代会在说明中注明。通过地区按钮选择要对照的时间轴；上下滚动浏览各行，拖动长条区域浏览年代，用 + 和 - 缩放，拖动时间轴上缘调整高度，或点击播放。")}</p>
        <p>{text('Moments appear in three tiers: highlights in the overview, major events when the visible span is 1,500 years or less, and detailed events at 300 years or less. Zooming in keeps the higher tiers visible. Selected moments stay visible regardless of tier; region and type filters still apply. States and periods remain as context at every zoom. These tiers are editorial choices, not a ranking of cultures or peoples.', '事件分为三个层级：全景展示重要转折，显示跨度不超过1500年时增加重大事件，不超过300年时显示详细事件。放大时仍保留更高层级事件。已选事件不受层级限制，但仍受地区与类型筛选控制。政权与时期在各缩放级别保留作为背景。层级属于编辑取舍，并非对文化或民族进行排名。')}</p>
        <p>{text("Borders are approximate. Before the modern era most states had no fixed frontiers, and many overlapped. Treat the shaded areas as a rough picture of who held sway. The map shows the latest available snapshot at or before the selected year, not reconstructed boundaries for every year. Its snapshot date is shown on the map. Physical coastlines and rivers come from a modern base map.", "历史疆界仅为近似示意。近代以前，大多数政权没有固定边界，各方势力也常有重叠。阴影区域大致表示其影响范围。地图显示所选年份当年或之前最近的一份可用疆界快照，并非逐年重建的边界。快照年代会标注在地图上。海岸线与河流来自现代地理底图。")}</p>
        <h3>{text('Sources', '资料来源')}</h3>
        <ul>
          <li>
            {text('Historical borders:', '历史疆界：')}{' '}
            <a href="https://github.com/aourednik/historical-basemaps" target="_blank" rel="noreferrer">
              historical-basemaps
            </a>{' '}
            {text("by André Ourednik and contributors, GPL-3.0. Labels that were wrong for a snapshot's date have been corrected.", '由 André Ourednik 及贡献者编制，采用 GPL-3.0 许可。已修正与快照年代不符的名称。')}
          </li>
          <li>
            {text('Replacement shapes where those borders were out of date, and the snapshots for 1750 BC, 560 BC, 210 BC, AD 250 and AD 650:', '用于替换过时疆界的形状，以及公元前1750年、前560年、前210年、公元250年和650年的快照：')}{' '}
            <a href="https://github.com/Seshat-Global-History-Databank/cliopatria" target="_blank" rel="noreferrer">
              Cliopatria
            </a>{' '}
            {text('by the Seshat Global History Databank,', '由 Seshat 全球历史数据库提供，采用')}{' '}
            <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
              CC BY 4.0
            </a>
            {text(', cut to fit the surrounding borders.', '许可，并裁切以衔接周围疆界。')}
          </li>
          <li>
            {text('Land, lakes and rivers:', '陆地、湖泊与河流：')}{' '}
            <a href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">
              Natural Earth
            </a>{' '}
            {text('(public domain).', '（公有领域）。')}
          </li>
          <li>{text('Type: Cinzel and Cormorant Garamond (SIL Open Font License), with Open Sans (Apache License 2.0) as the fallback for map labels. Map rendering: MapLibre GL JS.', '字体：Cinzel 与 Cormorant Garamond（SIL 开源字体许可），地图标签的备用字体为 Open Sans（Apache 2.0 许可）。中文采用系统中文字体。地图渲染：MapLibre GL JS。')}</li>
          <li>{text('Event descriptions link to Wikipedia for further reading.', '事件说明附有英文维基百科链接，便于延伸阅读。')}</li>
        </ul>
        <button ref={closeRef} onClick={onClose}>
          {text('Close', '关闭')}
        </button>
      </div>
    </div>
  );
}
