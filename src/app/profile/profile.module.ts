import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfileComponent } from './profile/profile.component';
import { NavComponent } from './nav/nav.component';
import { PhotoModalComponent } from './photo-modal/photo-modal.component';
import { SharedModule } from '../shared/shared.module';
import { PortfolioComponent } from './portfolio/portfolio.component';
import { BoardsComponent } from './boards/boards.component';
import { BoardListItemComponent } from './board-list-item/board-list-item.component';

@NgModule({
  declarations: [ProfileComponent, NavComponent, PhotoModalComponent, PortfolioComponent, BoardsComponent, BoardListItemComponent],
  imports: [CommonModule, SharedModule],
  exports: [ProfileComponent, NavComponent],
})
export class ProfileModule {}
