import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ModalService } from 'src/app/shared/modal/modal.service';
import { CreateDashboardModalComponent } from '../create-dashboard-modal/create-dashboard-modal.component';
import { Board } from 'src/app/shared/models/board.model';
import * as canvaSketcher from '@iuliailies/canva-sketcher';
import { PhotoService } from 'src/app/shared/services/photo.service';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { MinioService } from 'src/app/shared/services/minio.service';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.sass'],
})
export class DashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('zoomableContainer') zoomableContainer!: ElementRef;
  @ViewChild('zoomable') zoomable!: ElementRef;
  board?: Board;
  zoomEnv?: canvaSketcher.ZoomEnvironment;
  panEnv?: canvaSketcher.PanEnvironment;
  photosLoading = false;
  photosError = false;
  zoom: number = 1;
  clusterWidth = 300;
  clusterHeight = 300;
  clusterMargin = 10;

  constructor(
    private modalService: ModalService // private photoService: PhotoService, // private minioService: MinioService, // private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.initializeZoomEnvironment();
    this.sketch();
  }

  initializeZoomEnvironment(): void {
    if (!this.board) return;

    this.zoomEnv = canvaSketcher
      .zoom(
        this.zoomableContainer.nativeElement,
        this.zoomable.nativeElement,
        1
      )
      .apply({
        lowerBound: 0.5,
        upperBound: 2,
        method: {
          type: 'mouse',
          ctrlKey: true,
        },
      })
      .on('zoom', (ev: Event, zoom: number) => {
        ev.preventDefault();
        this.zoom = zoom;
      });

    this.panEnv = this.zoomEnv
      .pannable()
      .on('start', () => {
        this.zoomableContainer.nativeElement.classList.add('panning');
      })
      .on('end', () => {
        this.zoomableContainer.nativeElement.classList.remove('panning');
      });
  }

  sketch(): void {
    if (!this.board || !this.zoomEnv) return;

    const clusters = canvaSketcher.selectAll('.cluster');
    const dragEnv = new canvaSketcher.DragEnvironment().apply(clusters);
    const zoomEnv = this.zoomEnv;
    const panEnv = this.panEnv;

    clusters.on('dblclick', function () {
      zoomEnv
        .focus(
          this,
          {
            transitionDuration: 0.4,
            boundary: 0.05,
          },
          this.querySelector('.action-icon') as HTMLElement,
          {
            key: 'Escape',
          }
        )
        .on('AnimationOpenStart', function () {
          this.element.classList.add('focusing');
          dragEnv.disabled = true;
          panEnv!.disabled = true;
        })
        .on('AnimationOpenEnd', function () {
          this.element.classList.remove('focusing');
          this.element.classList.add('focused');
        })
        .on('AnimationCloseStart', function () {
          this.element.classList.remove('focused');
          dragEnv.disabled = false;
          panEnv!.disabled = false;
        });
    });
  }

  openCreateModal(): void {
    const modalRef = this.modalService.open(CreateDashboardModalComponent);

    modalRef.result.then(
      (resp) => {
        this.board = resp;
        this.arrangeClusters();
        // this.getPhotos();
        // make call assynchronous, such that the clusters can be rendered first
        setTimeout(() => {
          this.initializeZoomEnvironment();
          this.sketch();
        });
      },
      () => {}
    );
  }

  arrangeClusters(): void {
    if (!this.board) {
      return;
    }

    const availableWidth =
      (this.zoomableContainer.nativeElement as HTMLElement).offsetWidth /
      this.zoom;
    const clustersPerRow = Math.floor(
      availableWidth / (this.clusterWidth + this.clusterMargin)
    );

    this.board!.clusters.forEach((cluster, index) => {
      cluster.position.x =
        Math.floor(index % clustersPerRow) *
          (this.clusterWidth + this.clusterMargin) +
        this.clusterMargin;
      cluster.position.y =
        Math.floor(index / clustersPerRow) *
          (this.clusterHeight + this.clusterMargin) +
        this.clusterMargin;
    });
  }
}
