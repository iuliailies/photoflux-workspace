import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Subject, catchError, finalize, forkJoin, of } from 'rxjs';
import { InspectPhotoModalComponent } from 'src/app/shared/components/inspect-photo-modal/inspect-photo-modal.component';
import {
  TOAST_STATE,
  ToastService,
} from 'src/app/shared/components/toast/toast.service';
import { ModalService } from 'src/app/shared/modal/modal.service';
import { Cluster, PhotoSortType } from 'src/app/shared/models/board.model';
import { Photo, maxCompressedSize } from 'src/app/shared/models/photo.model';
import { MinioService } from 'src/app/shared/services/minio.service';
import { PhotoService } from 'src/app/shared/services/photo.service';
import { StarService } from 'src/app/shared/services/star.service';

@Component({
  selector: 'app-cluster',
  templateUrl: './cluster.component.html',
  styleUrls: ['./cluster.component.sass'],
})
export class ClusterComponent implements OnInit, AfterViewInit {
  @ViewChild('clusterElement') clusterElement!: ElementRef;
  @Input() cluster!: Cluster;
  @Input() focused: boolean = false;
  @Input() sortTypeChangedSubject: Subject<PhotoSortType> =
    new Subject<PhotoSortType>();
  @Output() clusterLoadedFirstTime = new EventEmitter();
  sortType: PhotoSortType = 'created_at';
  photos: Photo[] = [];
  categoryName!: string;
  perfectMatch = false;
  error = false;
  loading = true;
  next?: string;
  focusedOnce = false

  constructor(
    private photoService: PhotoService,
    private starService: StarService,
    private minioService: MinioService,
    private sanitizer: DomSanitizer,
    private toastService: ToastService,
    private modalService: ModalService,
  ) {}

  ngOnInit(): void {
    this.listPhotos();
    this.sortTypeChangedSubject.subscribe((type) => {
      this.resetValues();
      this.sortType = type;
      this.listPhotos();
    });
  }

  ngAfterViewInit(): void {
    (this.clusterElement!.nativeElement as HTMLElement).style.left =
      this.cluster.position.x + 'px';
    (this.clusterElement!.nativeElement as HTMLElement).style.top =
      this.cluster.position.y + 'px';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['focused']) {
      const currentValue = changes['focused'].currentValue;
      const previousValue = changes['focused'].previousValue;

      if (previousValue !== undefined && currentValue !== previousValue && !this.focusedOnce) {
        setTimeout(() => {
          this.focusedOnce = true
        })
        this.listPhotos()
      }
    }
  }


  resetValues(): void {
    this.next = undefined;
    this.photos = [];
    this.error = false;
  }

  listPhotos(): void {
    if (this.next == '' && this.focusedOnce) {
      return;
    }
    this.loading = true;
    this.photoService
      .listPhotos(this.cluster.categoryIds, this.sortType, this.focusedOnce ? this.next : undefined)
      .subscribe(
        (resp) => {
          this.categoryName = resp.categoryName;
          this.perfectMatch = this.cluster.categoryIds.length > 1;
          this.next = resp.next;
          this.getPhotoFiles(resp.data);
        },
        (err) => {
          //TODO: error handling
        }
      );
  }

  getPhotoFiles(photos: Photo[]): void {
    const length = photos.length;
    // TODO: improve, move minio interaction into the service
    const request = photos.map((photo) =>
      this.minioService.getPhoto(this.focusedOnce ? photo.href : photo.href_thumbnail)
    );
    forkJoin(request)
      .pipe(
        finalize(() => {
          this.clusterLoadedFirstTime.emit();
          this.loading = false;
        })
      )
      .subscribe((responses) => {
        // make sure to not overwrite already existing photos right after focus
        if(!this.focusedOnce || !(this.photos.length && !this.photos[0].url)) 
          this.photos.push(...photos);
        (responses as any[]).forEach((resp, index) => {
          if (resp === false) {
            return;
          }
          const respFile = new File([resp], '');
          this.photos[this.photos.length - length + index].file = respFile
          if (!this.focusedOnce) {
            this.photos[this.photos.length - length + index].compressedUrl = this.sanitizeUrl(URL.createObjectURL(respFile));
          } else {
            this.photos[this.photos.length - length + index].url = this.sanitizeUrl(URL.createObjectURL(respFile));
          }
        });
      });
  }

  openPhotoModal(photo: Photo): void {
    if (!this.focused) {
      return;
    }
    const modalRef = this.modalService.open(InspectPhotoModalComponent, {
      size: 'fullscreen',
    });
    modalRef.componentInstance.photo = photo;
  }

  starPhoto(photo: Photo): void {
    this.starService.starPhoto(photo.id).subscribe(
      (resp) => {
        photo.starred = resp;
        photo.numberStars += resp ? 1 : -1;
      },
      (err) => {
        this.toastService.showToast(TOAST_STATE.danger, [
          { toastMessage: `<div>Error starring photo.</div>` },
        ]);
      }
    );
  }

  sanitizeUrl(url: string): string {
    return this.sanitizer.bypassSecurityTrustUrl(url) as string;
  }
}
