import { Directive, ElementRef, Input, AfterViewInit, inject } from '@angular/core';
import { AnimationService, type AnimPreset } from '../services/animation.service';

@Directive({
  selector: '[appAnimate]',
  standalone: true,
})
export class AnimateDirective implements AfterViewInit {
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private anim = inject(AnimationService);

  @Input('appAnimate') preset: AnimPreset = 'fade';
  @Input() animateDelay = 0;
  @Input() animateStagger = 0;
  @Input() animateChildren = '';

  ngAfterViewInit() {
    const el = this.host.nativeElement;
    const target =
      this.animateChildren && this.animateStagger
        ? Array.from(el.querySelectorAll<HTMLElement>(this.animateChildren))
        : el;
    if (Array.isArray(target) && !target.length) return;
    this.anim.enter(target, this.preset, {
      delay: this.animateDelay,
      stagger: this.animateStagger,
    });
  }
}
