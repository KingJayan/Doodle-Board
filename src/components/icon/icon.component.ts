import { Component, ChangeDetectionStrategy, inject, input, computed } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import pin from '../../assets/icons/pin.svg?raw';
import pinActive from '../../assets/icons/pin-active.svg?raw';
import maximize from '../../assets/icons/maximize.svg?raw';
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

const ICONS = {
  pin,
  'pin-active': pinActive,
  maximize,
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
} satisfies Record<string, string>;

export type IconName = keyof typeof ICONS;

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
