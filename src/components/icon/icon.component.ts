import { Component, ChangeDetectionStrategy, inject, input, computed } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import pin from '../../assets/icons/pin.svg?raw';
import pinActive from '../../assets/icons/pin-active.svg?raw';
import maximize from '../../assets/icons/maximize.svg?raw';
import minimize from '../../assets/icons/minimize.svg?raw';
import folder from '../../assets/icons/folder.svg?raw';
import folderOpen from '../../assets/icons/folder-open.svg?raw';
import page from '../../assets/icons/page.svg?raw';
import packageIcon from '../../assets/icons/package.svg?raw';
import tag from '../../assets/icons/tag.svg?raw';
import search from '../../assets/icons/search.svg?raw';
import gear from '../../assets/icons/gear.svg?raw';
import memo from '../../assets/icons/memo.svg?raw';
import pencil from '../../assets/icons/pencil.svg?raw';
import question from '../../assets/icons/question.svg?raw';
import ruler from '../../assets/icons/ruler.svg?raw';
import laptop from '../../assets/icons/laptop.svg?raw';
import abacus from '../../assets/icons/abacus.svg?raw';
import galaxy from '../../assets/icons/galaxy.svg?raw';
import coffee from '../../assets/icons/coffee.svg?raw';
import blossom from '../../assets/icons/blossom.svg?raw';
import herb from '../../assets/icons/herb.svg?raw';
import star from '../../assets/icons/star.svg?raw';
import fire from '../../assets/icons/fire.svg?raw';
import check from '../../assets/icons/check.svg?raw';
import sparkles from '../../assets/icons/sparkles.svg?raw';
import leaf from '../../assets/icons/leaf.svg?raw';
import cross from '../../assets/icons/cross.svg?raw';
import warning from '../../assets/icons/warning.svg?raw';
import globe from '../../assets/icons/globe.svg?raw';
import octopus from '../../assets/icons/octopus.svg?raw';
import target from '../../assets/icons/target.svg?raw';
import trash from '../../assets/icons/trash.svg?raw';
import heart from '../../assets/icons/heart.svg?raw';
import bell from '../../assets/icons/bell.svg?raw';
import clock from '../../assets/icons/clock.svg?raw';
import calendar from '../../assets/icons/calendar.svg?raw';
import bookmark from '../../assets/icons/bookmark.svg?raw';
import lightbulb from '../../assets/icons/lightbulb.svg?raw';
import lock from '../../assets/icons/lock.svg?raw';
import key from '../../assets/icons/key.svg?raw';
import mail from '../../assets/icons/mail.svg?raw';
import link from '../../assets/icons/link.svg?raw';
import bolt from '../../assets/icons/bolt.svg?raw';
import cloud from '../../assets/icons/cloud.svg?raw';
import sun from '../../assets/icons/sun.svg?raw';
import moon from '../../assets/icons/moon.svg?raw';
import music from '../../assets/icons/music.svg?raw';
import camera from '../../assets/icons/camera.svg?raw';
import brush from '../../assets/icons/brush.svg?raw';
import flag from '../../assets/icons/flag.svg?raw';
import rocket from '../../assets/icons/rocket.svg?raw';
import gift from '../../assets/icons/gift.svg?raw';
import trophy from '../../assets/icons/trophy.svg?raw';
import mapPin from '../../assets/icons/map-pin.svg?raw';
import eye from '../../assets/icons/eye.svg?raw';
import compass from '../../assets/icons/compass.svg?raw';
import home from '../../assets/icons/home.svg?raw';
import user from '../../assets/icons/user.svg?raw';
import download from '../../assets/icons/download.svg?raw';
import share from '../../assets/icons/share.svg?raw';
import plus from '../../assets/icons/plus.svg?raw';
import refresh from '../../assets/icons/refresh.svg?raw';
import image from '../../assets/icons/image.svg?raw';
import table from '../../assets/icons/table.svg?raw';
import expand from '../../assets/icons/expand.svg?raw';
import close from '../../assets/icons/close.svg?raw';
import chevron from '../../assets/icons/chevron.svg?raw';
import menu from '../../assets/icons/menu.svg?raw';

const ICONS = {
  pin,
  'pin-active': pinActive,
  maximize,
  minimize,
  folder,
  'folder-open': folderOpen,
  page,
  package: packageIcon,
  tag,
  search,
  gear,
  memo,
  pencil,
  question,
  ruler,
  laptop,
  abacus,
  galaxy,
  coffee,
  blossom,
  herb,
  star,
  fire,
  check,
  sparkles,
  leaf,
  cross,
  warning,
  globe,
  octopus,
  target,
  trash,
  heart,
  bell,
  clock,
  calendar,
  bookmark,
  lightbulb,
  lock,
  key,
  mail,
  link,
  bolt,
  cloud,
  sun,
  moon,
  music,
  camera,
  brush,
  flag,
  rocket,
  gift,
  trophy,
  'map-pin': mapPin,
  eye,
  compass,
  home,
  user,
  download,
  share,
  plus,
  refresh,
  image,
  table,
  expand,
  close,
  chevron,
  menu,
} satisfies Record<string, string>;

export type IconName = keyof typeof ICONS;

export const ICON_NAMES = Object.keys(ICONS) as IconName[];

export const EMOJI_ICON: Record<string, IconName> = {
  '📌': 'pin',
  '📍': 'pin-active',
  '⬜': 'maximize',
  '📂': 'folder-open',
  '📁': 'folder',
  '⭐': 'star',
  '✅': 'check',
  '🔥': 'fire',
  '❓': 'question',
  '🔍': 'search',
  '📦': 'package',
  '✨': 'sparkles',
  '🍃': 'leaf',
  '📝': 'memo',
  '🎯': 'target',
  '🏷️': 'tag',
  '🌐': 'globe',
  '🐙': 'octopus',
  '📄': 'page',
  '❌': 'cross',
  '☕': 'coffee',
  '🌸': 'blossom',
  '🌿': 'herb',
  '🧮': 'abacus',
  '🌌': 'galaxy',
  '💻': 'laptop',
  '📐': 'ruler',
};


@Component({
  selector: 'app-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="ico" [innerHTML]="svg()"></span>`,
  styles: [`
    :host { display: inline-flex; align-items: center; justify-content: center; line-height: 0; vertical-align: -0.125em; }
    .ico { display: inline-flex; width: 1em; height: 1em; }
    :host ::ng-deep svg { width: 1em; height: 1em; display: block; }
  `],
})
export class IconComponent {
  private sanitizer = inject(DomSanitizer);
  name = input.required<IconName>();
  private cache = new Map<IconName, SafeHtml>();

  svg = computed<SafeHtml>(() => {
    const name = this.name();
    let html = this.cache.get(name);
    if (!html) {
      html = this.sanitizer.bypassSecurityTrustHtml(ICONS[name] ?? '');
      this.cache.set(name, html);
    }
    return html;
  });
}

export function iconFor(emoji: string): IconName {
  return EMOJI_ICON[emoji] ?? 'question';
}
