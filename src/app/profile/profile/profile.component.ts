import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.sass'],
})
export class ProfileComponent implements OnInit {
  @ViewChild('profile') profile!: ElementRef;
  @Input() isPortfolioOpen: boolean = false;
  @Input() isBoardsOpen: boolean = false;
  @Output() portfolioClosedEvent = new EventEmitter();
  @Output() boardClosedEvent = new EventEmitter();
  defaultWidth = 500;
  width: number = this.defaultWidth;
  appliedWidth: number = this.defaultWidth;

  functionBindings = {
    move: this.handleMouseMove.bind(this),
    up: this.handleMouseUp.bind(this),
  };
  mouseStartXCoordinate = 0;

  constructor() {}

  ngOnInit(): void {
    // extra check, in case there was not enough space for the default width value
    this.width = 500 < window.innerWidth * 0.8 ? 500 : window.innerWidth * 0.8;
    this.appliedWidth = this.width;
  }

  resize(event: MouseEvent): void {
    this.mouseStartXCoordinate = event.x;
    this.width = this.profile.nativeElement.getBoundingClientRect().width;
    this.profile.nativeElement.classList.add('is-dragged');
    document.documentElement.style.cursor = 'col-resize';
    document.addEventListener('mousemove', this.functionBindings.move);
    document.addEventListener('mouseup', this.functionBindings.up);
  }

  handleMouseMove(event: MouseEvent): void {
    const distance = event.x - this.mouseStartXCoordinate;
    this.appliedWidth = this.width + distance;
    document.getSelection()?.removeAllRanges();
  }

  handleMouseUp(): void {
    document.removeEventListener('mousemove', this.functionBindings.move);
    document.removeEventListener('mouseup', this.functionBindings.up);
    this.profile.nativeElement.classList.remove('is-dragged');
    document.documentElement.style.cursor = 'auto';
  }

  closeBoards(): void {
    this.isBoardsOpen = false;
    this.boardClosedEvent.emit();
  }
}
